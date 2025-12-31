import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/openai/client'
import { getScriptWizardPrompts, getBuyerProfile } from '@/lib/prompts/script-wizard'
import { getPackConfig } from '@/lib/packs/config'
import { createServerClient } from '@/lib/supabase/server'
import type { GenerateScriptRequest, GenerateScriptResponse } from '@/lib/types/api'
import type { WizardAnswers } from '@/lib/types/wizard'

export async function POST(request: NextRequest) {
  try {
    // Get user from Supabase session using server client
    const supabase = await createServerClient()
    
    // Check for Authorization header first (if client passes token)
    const authHeader = request.headers.get('authorization')
    let userId: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      // Try to get user from token
      const token = authHeader.replace('Bearer ', '')
      const {
        data: { user },
        error: tokenError,
      } = await supabase.auth.getUser(token)

      if (!tokenError && user) {
        userId = user.id
      }
    }

    // If no user from token, try session from cookies
    if (!userId) {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (session?.user) {
        userId = session.user.id
      } else {
        // Fallback to getUser if getSession fails
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          console.error('Auth error - sessionError:', sessionError)
          console.error('Auth error - userError:', userError)
          return NextResponse.json(
            { 
              success: false, 
              error: 'Unauthorized - Please sign in again',
              details: sessionError?.message || userError?.message 
            }, 
            { status: 401 }
          )
        }

        userId = user.id
      }
    }

    if (!userId) {
      console.error('No userId found after auth check')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateScriptRequest = await request.json()

    if (!body.carContext) {
      return NextResponse.json(
        { success: false, error: 'Missing carContext' },
        { status: 400 }
      )
    }

    // Check if using wizard flow or legacy flow
    const isWizardFlow = !!body.wizardAnswers

    if (!isWizardFlow && (!body.tone || !body.goal)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (tone, goal, or wizardAnswers)' },
        { status: 400 }
      )
    }

    const openai = getOpenAIClient()

    let systemPrompt: string
    let userPrompt: string

    if (isWizardFlow && body.wizardAnswers) {
      // New wizard-based flow
      const buyerType = body.buyerType || 'general'
      const selectedPackId = body.selectedPackId || body.packType
      const packConfig = selectedPackId ? getPackConfig(selectedPackId) : null
      const wizardAnswers: WizardAnswers = {
        ...body.wizardAnswers,
        carContext: body.carContext,
      }

      const prompts = getScriptWizardPrompts({
        wizardAnswers,
        buyerType,
        competitiveOffers: body.competitiveOffers,
        packType: selectedPackId,
        packAnswers: body.packAnswers,
        packEducation: packConfig?.education,
      })
      systemPrompt = prompts.systemPrompt
      userPrompt = prompts.userPrompt
    } else {
      // Legacy flow (backward compatibility)
      systemPrompt = `You are an expert car buying negotiation coach. Your job is to help users write effective negotiation messages to car dealers.

CRITICAL RULES:
1. Write clear, professional messages that get results
2. Adapt your tone to match the user's preference (professional/friendly/firm/casual) while staying effective
3. Be specific - reference the car details provided to show you've done research
4. Be respectful but confident - never aggressive or rude
5. Include a clear call to action based on the user's goal
6. Make the message concise but complete (2-4 paragraphs typically)

Your response must be a JSON object with this exact structure:
{
  "script": "<the complete negotiation message>",
  "keyPoints": [<array of 3-5 key points covered in the script>],
  "tips": [<array of 2-4 additional negotiation tips>]
}`

      const toneDescriptions: Record<string, string> = {
        professional: 'professional and business-like, using formal language',
        friendly: 'warm and personable, building rapport while staying focused',
        firm: 'direct and assertive, showing you mean business without being rude',
        casual: 'conversational and relaxed, but still clear about your goals',
      }

      const goalDescriptions: Record<string, string> = {
        negotiate_price: 'negotiate a better price on the vehicle',
        request_info: 'request more information about the vehicle (history, condition, etc.)',
        schedule_test_drive: 'schedule a test drive',
        make_offer: 'make a specific offer on the vehicle',
        counter_offer: 'counter an offer the dealer has made',
      }

      userPrompt = `Write a negotiation message with these specifications:

Tone: ${toneDescriptions[body.tone!] || body.tone}
Goal: ${goalDescriptions[body.goal!] || body.goal}
Car Context: ${body.carContext}

Generate a complete message that the user can send directly to the dealer. Make it specific to the car details provided and appropriate for the chosen tone and goal.

Return ONLY valid JSON, no other text.`
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    })

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}')

    if (!aiResponse.script) {
      throw new Error('Invalid response format from AI')
    }

    // Create or link to deal
    let dealId = body.dealId

    if (!dealId) {
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert({
          user_id: userId,
          title: 'Negotiation Script',
        })
        .select()
        .single()

      if (dealError) {
        console.error('Error creating deal (continuing anyway):', dealError)
        // Continue without dealId - script generation doesn't require it
      } else {
        dealId = deal.id
      }
    }

    // Prepare raw_input for database
    const rawInput: any = {
      carContext: body.carContext,
    }
    if (isWizardFlow && body.wizardAnswers) {
      rawInput.wizardAnswers = body.wizardAnswers
      rawInput.buyerType = body.buyerType
    } else {
      rawInput.tone = body.tone
      rawInput.goal = body.goal
    }

    // Save analysis to database
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        deal_id: dealId,
        analysis_type: 'script_generation',
        raw_input: rawInput,
        ai_output: aiResponse,
      })
      .select()
      .single()

    if (analysisError) {
      console.error('Error saving analysis (continuing anyway):', analysisError)
      // Continue even if save fails - script generation is the main feature
    }

    // Return success response
    const response: GenerateScriptResponse = {
      success: true,
      analysisId: analysis?.id,
      dealId: dealId,
      data: {
        script: aiResponse.script,
        followUps: aiResponse.followUps || [],
        conversationFlow: aiResponse.conversationFlow || null,
        keyPoints: aiResponse.keyPoints || [],
        tips: aiResponse.tips || [],
        educationalHints: aiResponse.educationalHints || [],
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error generating script:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate script' },
      { status: 500 }
    )
  }
}

