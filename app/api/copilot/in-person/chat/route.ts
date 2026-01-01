import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import type { InPersonAPIRequest } from '@/lib/copilot/in_person/types'

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

interface LiveChatRequest {
  message: string
  dealState: {
    vehiclePrice?: number
    targetOTD?: number
    walkAwayOTD?: number
    dealerCurrentOTD?: number
    lastDealerOTD?: number
    stateCode?: string
    currentSituation?: string
    timelineEvents?: Array<{ ts: number; who: string; label: string; details?: string }>
    ladder?: { ask: number; agree: number; walk: number; locked: boolean }
  }
}

interface LiveChatResponse {
  reply: string
  nextQuestion: string | null
  suggestedTalkTrack: string | null
  updateDealState: { dealerOTD?: number } | null
}

function generateDeterministicChatFallback(request: LiveChatRequest): LiveChatResponse {
  const { message, dealState } = request
  
  // Parse for OTD in message
  const otdMatch = message.match(/\$?([\d,]+)/g)
  let detectedOTD: number | null = null
  if (otdMatch) {
    const amounts = otdMatch.map(m => parseFloat(m.replace(/[$,]/g, ''))).filter(a => a > 1000 && a < 200000)
    if (amounts.length > 0) {
      detectedOTD = amounts[0]
    }
  }
  
  // Simple keyword detection
  const lowerMessage = message.toLowerCase()
  let reply = ''
  let suggestedTalkTrack: string | null = null
  
  if (lowerMessage.includes('monthly') || lowerMessage.includes('payment')) {
    reply = "Stay focused on OTD. Say: 'I'm not discussing monthly payments yet. What's the out-the-door price?'"
    suggestedTalkTrack = "I'm not discussing monthly payments yet. What's the out-the-door price?"
  } else if (lowerMessage.includes('add-on') || lowerMessage.includes('fee')) {
    reply = "Ask which are removable. Say: 'Which add-ons are removable? If they're mandatory, let's adjust the sale price to hit my target OTD.'"
    suggestedTalkTrack = "Which add-ons are removable? If they're mandatory, let's adjust the sale price to hit my target OTD."
  } else if (lowerMessage.includes('manager')) {
    reply = "Stay firm. Repeat your target OTD and wait. Say: 'If you can do $X OTD, I'm ready to move forward now.'"
    if (dealState.targetOTD) {
      suggestedTalkTrack = `If you can do $${dealState.targetOTD.toLocaleString()} OTD, I'm ready to move forward now.`
    }
  } else if (lowerMessage.includes('walk') || lowerMessage.includes('leave')) {
    reply = "If dealer is above your walk-away, walk. Otherwise, repeat your target OTD one more time and wait."
    if (dealState.targetOTD) {
      suggestedTalkTrack = `I need $${dealState.targetOTD.toLocaleString()} OTD. Can you make that happen?`
    }
  } else {
    reply = "Stay focused on your target OTD. Get everything in writing before agreeing to anything."
    if (dealState.targetOTD) {
      suggestedTalkTrack = `I need $${dealState.targetOTD.toLocaleString()} OTD. Can you show me the breakdown?`
    }
  }
  
  return {
    reply,
    nextQuestion: null,
    suggestedTalkTrack,
    updateDealState: detectedOTD ? { dealerOTD: detectedOTD } : null,
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const supabase = await createServerSupabaseClient()
    const authHeader = request.headers.get('authorization')
    let userId: string | null = null
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token)
      if (user && !error) {
        userId = user.id
      }
    }
    
    if (!userId) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        userId = session.user.id
      }
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Entitlement check - verify IN_PERSON pack
    let hasInPersonPack = false
    let aiEnabled = false

    try {
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
        aiEnabled = !!openai && !!process.env.SUPABASE_SERVICE_ROLE_KEY
      } else {
        hasInPersonPack = true // Dev fallback
        aiEnabled = !!openai
      }
    } catch (error) {
      console.error('Error checking pack entitlement:', error)
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        hasInPersonPack = true // Dev fallback
        aiEnabled = !!openai
      }
    }

    if (!hasInPersonPack) {
      return NextResponse.json(
        { success: false, error: 'Pack required', code: 'PACK_REQUIRED' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: LiveChatRequest = await request.json()

    if (!body.message || !body.dealState) {
      return NextResponse.json(
        { success: false, error: 'Invalid request schema' },
        { status: 400 }
      )
    }

    // If AI is not enabled, return deterministic fallback
    if (!aiEnabled || !openai) {
      const fallback = generateDeterministicChatFallback(body)
      return NextResponse.json({
        success: true,
        data: fallback,
        aiEnabled: false,
        source: 'deterministic_fallback',
      })
    }

    // Build prompt for live chat coach
    const gap = (body.dealState.dealerCurrentOTD && body.dealState.targetOTD)
      ? body.dealState.dealerCurrentOTD - body.dealState.targetOTD
      : null
    
    const systemPrompt = `You are a real-time dealership negotiation coach providing short, tactical, spoken-language guidance during in-person negotiations. You are sitting next to the user during the negotiation.

CRITICAL RULES:
1. ALL responses must be 1-2 sentences MAX - designed to be spoken out loud
2. Use spoken-language tone (natural, conversational, not email-style)
3. End with silence - let the dealer respond, don't over-explain
4. Always focus on OTD (Out-The-Door) price - NEVER discuss monthly payments
5. Be firm, calm, and OTD-focused - no hedging or soft language
6. Ask clarifying questions when info is missing (OTD, add-ons, fees, trade-in, financing pressure)
7. Never produce long educational essays
8. Always end with either: (a) a talk track, or (b) a question needed to proceed
9. Always respect the ladder (ASK/AGREE/WALK) if provided
10. Do NOT mention "ChatGPT" or "AI model" - you are a coach, not an AI

CURRENT DEAL STATE:
${body.dealState.targetOTD ? `- Target OTD: $${body.dealState.targetOTD.toLocaleString()}` : 'Target OTD: Not set'}
${body.dealState.walkAwayOTD ? `- Walk-away: $${body.dealState.walkAwayOTD.toLocaleString()}` : 'Walk-away: Not set'}
${body.dealState.dealerCurrentOTD ? `- Dealer OTD: $${body.dealState.dealerCurrentOTD.toLocaleString()}` : 'Dealer OTD: Not provided'}
${gap !== null ? `- Gap: $${gap >= 0 ? '+' : ''}${gap.toLocaleString()}` : '- Gap: Unknown'}
${body.dealState.currentSituation ? `- Situation: ${body.dealState.currentSituation}` : ''}
${body.dealState.ladder ? `- Ladder: ASK $${body.dealState.ladder.ask.toLocaleString()}, AGREE $${body.dealState.ladder.agree.toLocaleString()}, WALK $${body.dealState.ladder.walk.toLocaleString()}` : ''}

${body.dealState.timelineEvents && body.dealState.timelineEvents.length > 0 ? `RECENT TIMELINE:\n${body.dealState.timelineEvents.slice(-3).map(e => `- ${e.label}`).join('\n')}` : ''}

Your response MUST be a JSON object with this EXACT structure:
{
  "reply": "<Your response to the user's question, 1-2 sentences, spoken language, <= 150 chars>",
  "nextQuestion": "<If you need more info, ask ONE clarifying question, <= 100 chars. Otherwise null>",
  "suggestedTalkTrack": "<If you can provide a talk track, give ONE sentence they can say, <= 100 chars. Otherwise null>",
  "updateDealState": "<If message contains a dollar amount that looks like dealer OTD, include { \"dealerOTD\": number }. Otherwise null>"
}

CRITICAL: You MUST return ALL required fields. Missing fields will cause an error.`

    const userPrompt = `USER ASKED: "${body.message}"

Provide short, tactical guidance. If the message contains a dollar amount, it might be a dealer OTD offer - extract it if it's in the 1000-200000 range.

Return ONLY valid JSON with ALL required fields.`

    // Call OpenAI
    const completion = await openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    let aiResponse: LiveChatResponse
    try {
      aiResponse = JSON.parse(completion.choices[0].message.content || '{}')
    } catch (e) {
      // Retry once
      const retryCompletion = await openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt + '\n\nCRITICAL: Return ONLY valid JSON with ALL required fields: reply, nextQuestion, suggestedTalkTrack, updateDealState.' },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      })
      
      try {
        aiResponse = JSON.parse(retryCompletion.choices[0].message.content || '{}')
      } catch (retryError) {
        // Fallback to deterministic
        aiResponse = generateDeterministicChatFallback(body)
      }
    }

    // Validate response schema
    if (!aiResponse.reply) {
      aiResponse = generateDeterministicChatFallback(body)
    }

    // Sanitize and validate
    const response: LiveChatResponse = {
      reply: String(aiResponse.reply || '').substring(0, 150),
      nextQuestion: aiResponse.nextQuestion ? String(aiResponse.nextQuestion).substring(0, 100) : null,
      suggestedTalkTrack: aiResponse.suggestedTalkTrack ? String(aiResponse.suggestedTalkTrack).substring(0, 100) : null,
      updateDealState: aiResponse.updateDealState || null,
    }

    return NextResponse.json({
      success: true,
      data: response,
      aiEnabled: true,
      source: 'ai',
    })
  } catch (error: any) {
    console.error('Error in live chat:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate response' },
      { status: 500 }
    )
  }
}






