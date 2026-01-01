import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { buildInPersonLiveSystemPrompt, buildInPersonLiveUserPrompt } from '@/lib/prompts/copilot_in_person_live'

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

interface TalkTracksRequest {
  mode: 'in_person_live'
  currentStepIndex: number
  inPersonSituation: string
  dealerSaidText?: string
  vehiclePrice: number
  targetOTD: number
  walkAwayOTD: number
  state: string
  currentDealerOTD?: number
  ladder: { ask: number; agree: number; walk: number; locked: boolean }
  timelineTail?: Array<{ ts: number; who: string; label: string; details?: string }>
}

interface TalkTracksResponse {
  sayThis: string
  ifPushback: string
  ifManager: string
  stopSignal: string
  closingLine: string
  nextMove: string
  ladderSummary: string
  redFlags: string[]
  doNotSay: string[]
}

function generateCannedFallback(request: TalkTracksRequest): TalkTracksResponse {
  const { inPersonSituation, targetOTD, walkAwayOTD, currentDealerOTD, ladder, currentStepIndex } = request
  
  // Situation-specific canned responses that use the user's numbers
  let sayThis = `I need $${targetOTD.toLocaleString()} OTD. Can you show me the breakdown?`
  let ifPushback = "I understand. I still need the full OTD breakdown to make a decision."
  let ifManager = `I need $${targetOTD.toLocaleString()} OTD. Can you make that happen?`
  let closingLine = `If you can do $${targetOTD.toLocaleString()} OTD, I'm ready to move forward.`
  let nextMove = 'Request written itemized OTD breakdown'
  let redFlags: string[] = []
  let doNotSay: string[] = []

  // Situation-specific logic
  if (inPersonSituation.toLowerCase().includes('monthly payment') || inPersonSituation.toLowerCase().includes('monthly')) {
    sayThis = `I'm focused on the total out-the-door price, not monthly payments. What's your OTD?`
    ifPushback = "I need the OTD number, not monthly payment talk. Can you show me the breakdown?"
    nextMove = 'Repeat OTD request and stay silent'
    redFlags = ['They keep pushing monthly payment talk', 'They stretch loan term to make payment seem lower']
    doNotSay = ['Mentioning a monthly payment range', 'Discussing financing terms before OTD is locked']
  } else if (inPersonSituation.toLowerCase().includes('add-on') || inPersonSituation.toLowerCase().includes('addon')) {
    sayThis = `Which add-ons are removable? If they're mandatory, let's adjust the sale price to hit my target OTD of $${targetOTD.toLocaleString()}.`
    ifPushback = "If add-ons are fixed, reduce the sale price to keep OTD at my target."
    nextMove = 'Get written breakdown showing which add-ons are removable'
    redFlags = ['They won\'t show which add-ons are removable', 'They add fees after you agree to a price']
    doNotSay = ['Accepting "mandatory" add-ons without questioning', 'Agreeing to add-ons before seeing OTD']
  } else if (inPersonSituation.toLowerCase().includes('manager')) {
    sayThis = `If you can do $${targetOTD.toLocaleString()} OTD, I'm ready to move forward now.`
    ifManager = `I need $${targetOTD.toLocaleString()} OTD. Can you make that happen?`
    closingLine = `If you can do $${targetOTD.toLocaleString()} OTD, I'm ready to sign.`
    nextMove = 'Repeat target OTD and stay silent'
    redFlags = ['Manager creates fake urgency', 'Manager "can\'t go lower" but won\'t show why']
    doNotSay = ['Explaining or justifying your number', 'Filling the silence with talk']
  } else if (inPersonSituation.toLowerCase().includes('fees') || inPersonSituation.toLowerCase().includes('non-negotiable')) {
    sayThis = `I need to see which fees are negotiable. If they're fixed, let's adjust the sale price to hit my target OTD of $${targetOTD.toLocaleString()}.`
    ifPushback = "If fees are fixed, reduce the sale price to keep OTD at my target."
    nextMove = 'Get itemized fee breakdown in writing'
    redFlags = ['They say "everyone pays this" without explanation', 'Fees increase unexpectedly']
    doNotSay = ['Accepting fees without seeing breakdown', 'Agreeing to fees before OTD is confirmed']
  } else if (inPersonSituation.toLowerCase().includes('counter') || inPersonSituation.toLowerCase().includes('counter offer')) {
    if (currentDealerOTD) {
      const gap = currentDealerOTD - targetOTD
      if (gap > 1000) {
        sayThis = `That's $${gap.toLocaleString()} above my target. I need $${targetOTD.toLocaleString()} OTD.`
        nextMove = 'Push for target OTD or walk if they refuse'
        redFlags = ['Large gap suggests they won\'t negotiate', 'They won\'t show itemized breakdown']
      } else if (gap <= 0) {
        sayThis = `That works. Can you show me the itemized breakdown to confirm?`
        nextMove = 'Review breakdown and confirm it matches, then close'
        redFlags = []
      } else {
        sayThis = `I need $${targetOTD.toLocaleString()} OTD. Can you get there?`
        nextMove = 'Push for target OTD using closing line'
        redFlags = ['They won\'t negotiate further', 'They add fees after counter']
      }
    } else {
      sayThis = `I need $${targetOTD.toLocaleString()} OTD. Can you show me the breakdown?`
      nextMove = 'Get written OTD breakdown before responding'
    }
  }

  // Respect ladder if locked
  if (ladder.locked && currentDealerOTD && currentDealerOTD > ladder.walk) {
    sayThis = `That's above my walk-away number. I need $${ladder.agree.toLocaleString()} OTD.`
    closingLine = `I can't go above $${ladder.walk.toLocaleString()}. My target is $${ladder.agree.toLocaleString()} OTD.`
    nextMove = 'Walk away if they won\'t negotiate to target'
    redFlags = ['Dealer is above walk-away ceiling', 'They won\'t negotiate to target']
  }

  return {
    sayThis,
    ifPushback,
    ifManager,
    stopSignal: `Repeat $${targetOTD.toLocaleString()} OTD and stay silent.`,
    closingLine,
    nextMove,
    ladderSummary: `ASK: $${ladder.ask.toLocaleString()}, AGREE: $${ladder.agree.toLocaleString()}, WALK: $${ladder.walk.toLocaleString()}`,
    redFlags: redFlags.length > 0 ? redFlags : ['They refuse to give written OTD', 'They push monthly payment talk before OTD'],
    doNotSay: doNotSay.length > 0 ? doNotSay : ['Discussing monthly payments before OTD', 'Accepting numbers without written breakdown'],
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
    const body: TalkTracksRequest = await request.json()

    // Validate request schema
    if (
      body.mode !== 'in_person_live' ||
      typeof body.currentStepIndex !== 'number' ||
      body.currentStepIndex < 0 ||
      body.currentStepIndex > 4 ||
      !body.inPersonSituation ||
      typeof body.targetOTD !== 'number' ||
      typeof body.walkAwayOTD !== 'number' ||
      !body.state ||
      !body.ladder ||
      typeof body.ladder.ask !== 'number' ||
      typeof body.ladder.agree !== 'number' ||
      typeof body.ladder.walk !== 'number'
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid request schema', details: process.env.NODE_ENV === 'development' ? JSON.stringify(body) : undefined },
        { status: 400 }
      )
    }

    // If AI is not enabled, return canned fallback
    if (!aiEnabled || !openai) {
      const fallback = generateCannedFallback(body)
      return NextResponse.json({
        success: true,
        data: fallback,
        aiEnabled: false,
        source: 'canned_fallback',
        effectiveMode: 'in_person_live',
      })
    }

    // Build prompts
    const systemPrompt = buildInPersonLiveSystemPrompt()
    const userPrompt = buildInPersonLiveUserPrompt(
      body.inPersonSituation,
      body.dealerSaidText,
      body.vehiclePrice || 0,
      body.targetOTD,
      body.walkAwayOTD,
      body.state,
      body.currentDealerOTD,
      body.ladder,
      body.timelineTail
    )

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

    let aiResponse: TalkTracksResponse
    try {
      aiResponse = JSON.parse(completion.choices[0].message.content || '{}')
    } catch (e) {
      // Retry once
      const retryCompletion = await openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt + '\n\nCRITICAL: Return ONLY valid JSON with ALL required fields: sayThis, ifPushback, ifManager, stopSignal, closingLine, nextMove, ladderSummary, redFlags (array), doNotSay (array).' },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      })
      
      try {
        aiResponse = JSON.parse(retryCompletion.choices[0].message.content || '{}')
      } catch (retryError) {
        // Fallback to canned
        aiResponse = generateCannedFallback(body)
      }
    }

    // Validate response schema - check all required fields
    const requiredFields: (keyof TalkTracksResponse)[] = [
      'sayThis',
      'ifPushback',
      'ifManager',
      'stopSignal',
      'closingLine',
      'nextMove',
      'ladderSummary',
      'redFlags',
      'doNotSay',
    ]

    const missingFields = requiredFields.filter(field => {
      if (field === 'redFlags' || field === 'doNotSay') {
        return !Array.isArray(aiResponse[field]) || aiResponse[field].length === 0
      }
      return !aiResponse[field] || String(aiResponse[field]).trim().length === 0
    })

    if (missingFields.length > 0) {
      // Use canned fallback if validation fails
      console.warn('AI response missing fields:', missingFields)
      aiResponse = generateCannedFallback(body)
    }

    // Sanitize and validate
    const response: TalkTracksResponse = {
      sayThis: String(aiResponse.sayThis || '').substring(0, 150),
      ifPushback: String(aiResponse.ifPushback || '').substring(0, 150),
      ifManager: String(aiResponse.ifManager || '').substring(0, 150),
      stopSignal: String(aiResponse.stopSignal || '').substring(0, 100),
      closingLine: String(aiResponse.closingLine || '').substring(0, 150),
      nextMove: String(aiResponse.nextMove || '').substring(0, 120),
      ladderSummary: String(aiResponse.ladderSummary || '').substring(0, 100),
      redFlags: Array.isArray(aiResponse.redFlags) ? aiResponse.redFlags.slice(0, 3).map(f => String(f).substring(0, 80)) : [],
      doNotSay: Array.isArray(aiResponse.doNotSay) ? aiResponse.doNotSay.slice(0, 2).map(f => String(f).substring(0, 80)) : [],
    }

    return NextResponse.json({
      success: true,
      data: response,
      aiEnabled: true,
      source: 'ai',
      effectiveMode: 'in_person_live',
      debug: process.env.NODE_ENV === 'development' ? {
        situationReceived: !!body.inPersonSituation,
        targetOTDReceived: body.targetOTD > 0,
        dealerOTDReceived: !!body.currentDealerOTD,
        dealerSaidReceived: !!body.dealerSaidText,
      } : undefined,
    })
  } catch (error: any) {
    console.error('Error in talk tracks:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate talk tracks' },
      { status: 500 }
    )
  }
}

