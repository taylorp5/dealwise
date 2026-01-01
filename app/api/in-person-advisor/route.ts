import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { buildInPersonAdvisorSystemPrompt, buildInPersonAdvisorUserPrompt } from '@/lib/prompts/in_person_advisor'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface AdvisorRequest {
  message: string
  context: {
    inPersonSituation?: string | null
    vehiclePrice?: number | null
    desiredOTD?: number | null
    state?: string | null
    dealerSaid?: string | null
    ladder?: { ask: string; agree: string; walk: string } | null
  }
}

interface AdvisorResponse {
  tactic: string
  whatItMeans: string
  sayThisNow: string
  doNext: string
  clarifyingQuestion: string | null
  confidence: 'high' | 'medium' | 'low'
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const supabase = await createServerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Entitlement check - verify IN_PERSON pack
    const userId = session.user.id
    let hasInPersonPack = false

    try {
      // Try service role first (bypasses RLS)
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const serviceClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { persistSession: false } }
        )

        const { data: packData } = await serviceClient
          .from('user_packs')
          .select('pack_id')
          .eq('user_id', userId)
          .eq('pack_id', 'in_person')
          .single()

        hasInPersonPack = !!packData
      } else {
        // Fallback to client check (dev only)
        const { data: packData } = await supabase
          .from('user_packs')
          .select('pack_id')
          .eq('user_id', userId)
          .eq('pack_id', 'in_person')
          .single()

        hasInPersonPack = !!packData
      }
    } catch (error) {
      console.error('Error checking pack entitlement:', error)
      // In dev, allow if service key missing
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        hasInPersonPack = true // Dev fallback
      }
    }

    if (!hasInPersonPack) {
      return NextResponse.json(
        { success: false, error: 'Pack required', code: 'PACK_REQUIRED' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: AdvisorRequest = await request.json()
    const { message, context } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    // Build prompts
    const systemPrompt = buildInPersonAdvisorSystemPrompt()
    const userPrompt = buildInPersonAdvisorUserPrompt(message, context)

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}')

    // Validate response schema
    const requiredFields: (keyof AdvisorResponse)[] = [
      'tactic',
      'whatItMeans',
      'sayThisNow',
      'doNext',
      'clarifyingQuestion',
      'confidence',
    ]

    const missingFields = requiredFields.filter(field => {
      if (field === 'clarifyingQuestion') {
        // clarifyingQuestion can be null, but must be present
        return !(field in aiResponse)
      }
      return !aiResponse[field]
    })

    if (missingFields.length > 0) {
      // Retry once with explicit instruction
      console.warn('Advisor response missing fields:', missingFields)
      const retryPrompt =
        userPrompt +
        '\n\nCRITICAL: You must return ALL required fields: tactic, whatItMeans, sayThisNow, doNext, clarifyingQuestion (can be null), confidence (high|medium|low). Missing fields: ' +
        missingFields.join(', ')

      try {
        const retryCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: retryPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        })

        const retryResponse = JSON.parse(retryCompletion.choices[0].message.content || '{}')

        // Check if retry fixed it
        const stillMissing = requiredFields.filter(field => {
          if (field === 'clarifyingQuestion') {
            return !(field in retryResponse)
          }
          return !retryResponse[field]
        })

        if (stillMissing.length === 0) {
          Object.assign(aiResponse, retryResponse)
        } else {
          // Fallback response
          console.error('Advisor response still invalid after retry, using fallback')
          const fallback: AdvisorResponse = {
            tactic: 'Unknown',
            whatItMeans: 'Unable to analyze. Please provide more context.',
            sayThisNow: "I need a moment to review the numbers. Can you show me the itemized OTD breakdown?",
            doNext: 'Request written OTD breakdown',
            clarifyingQuestion: 'Can you paste what the dealer said, or describe the situation?',
            confidence: 'low',
          }
          return NextResponse.json({ success: true, data: fallback })
        }
      } catch (retryError) {
        console.error('Retry failed, using fallback:', retryError)
        // Use fallback
        const fallback: AdvisorResponse = {
          tactic: 'Unknown',
          whatItMeans: 'Unable to analyze. Please provide more context.',
          sayThisNow: "I need a moment to review the numbers. Can you show me the itemized OTD breakdown?",
          doNext: 'Request written OTD breakdown',
          clarifyingQuestion: 'Can you paste what the dealer said, or describe the situation?',
          confidence: 'low',
        }
        return NextResponse.json({ success: true, data: fallback })
      }
    }

    // Validate and sanitize response
    const response: AdvisorResponse = {
      tactic: String(aiResponse.tactic || 'None').substring(0, 100),
      whatItMeans: String(aiResponse.whatItMeans || '').substring(0, 140),
      sayThisNow: String(aiResponse.sayThisNow || '').substring(0, 300),
      doNext: String(aiResponse.doNext || '').substring(0, 200),
      clarifyingQuestion:
        aiResponse.clarifyingQuestion === null || aiResponse.clarifyingQuestion === undefined
          ? null
          : String(aiResponse.clarifyingQuestion).substring(0, 200),
      confidence: ['high', 'medium', 'low'].includes(aiResponse.confidence)
        ? (aiResponse.confidence as 'high' | 'medium' | 'low')
        : 'medium',
    }

    return NextResponse.json({ success: true, data: response })
  } catch (error: any) {
    console.error('Error in in-person advisor:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get advisor response' },
      { status: 500 }
    )
  }
}






