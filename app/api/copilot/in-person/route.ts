import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { buildInPersonRealtimeSystemPrompt, buildInPersonRealtimeUserPrompt } from '@/lib/prompts/copilot_in_person_realtime'
import type { InPersonAPIRequest, InPersonAPIResponse } from '@/lib/copilot/in_person/types'
import {
  generateDeterministicDecoder,
  detectTacticsFromText,
  classifyTacticFromSituation,
} from '@/lib/copilot/in_person/stateEngine'

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

function generateDeterministicFallback(
  request: InPersonAPIRequest
): InPersonAPIResponse {
  const gap = request.dealerCurrentOTD
    ? request.dealerCurrentOTD - request.targetOTD
    : undefined
  const decoder = generateDeterministicDecoder(request.situation || '', request.dealerSaid)
  const tactics = request.dealerSaid
    ? detectTacticsFromText(request.dealerSaid)
    : request.situation
    ? [classifyTacticFromSituation(request.situation)]
    : ['Standard negotiation']

  // Situation-based canned templates
  let sayThis = `I need $${request.targetOTD.toLocaleString()} OTD. Can you show me the breakdown?`
  let ifPushback = "I understand. I still need the full OTD breakdown to make a decision."
  let ifManager = `I need $${request.targetOTD.toLocaleString()} OTD. Can you make that happen?`
  let closingLine = `If you can do $${request.targetOTD.toLocaleString()} OTD, I'm ready to move forward.`

  if (request.situation?.includes('monthly payment') || request.quickAction === 'monthly_payment') {
    sayThis = "I'm focused on the total out-the-door price, not monthly payments. What's your OTD?"
    ifPushback = "I need the OTD number, not monthly payment talk."
  } else if (request.situation?.includes('add-ons') || request.quickAction === 'mandatory_addons') {
    sayThis = "I need to see which add-ons are removable. Can you show me the breakdown?"
    ifPushback = "If add-ons are fixed, let's adjust the sale price to hit my target OTD."
  } else if (request.situation?.includes('sign today') || request.quickAction === 'sign_today') {
    sayThis = `I sign when the OTD sheet matches $${request.targetOTD.toLocaleString()}. Show me the breakdown.`
    closingLine = `I'm ready to sign at $${request.targetOTD.toLocaleString()} OTD.`
  }

  // Respect ladder if locked
  if (request.ladder.locked) {
    if (request.dealerCurrentOTD && request.dealerCurrentOTD > request.ladder.walk) {
      sayThis = `That's above my walk-away number. I need $${request.ladder.agree.toLocaleString()} OTD.`
      closingLine = `I can't go above $${request.ladder.walk.toLocaleString()}. My target is $${request.ladder.agree.toLocaleString()} OTD.`
    } else {
      closingLine = `If you can do $${request.ladder.agree.toLocaleString()} OTD, I'm ready to move forward.`
    }
  }

  // Determine nextMove based on step and context
  let nextMove = 'Request written itemized OTD breakdown'
  if (request.step === 1) {
    if (request.quickAction === 'wont_give') {
      nextMove = 'Stay firm: "I need the written OTD worksheet before we discuss anything else."'
    } else if (request.quickAction === 'monthly_payment') {
      nextMove = 'Redirect: "I\'m focused on the total out-the-door price. Can you print the OTD worksheet?"'
    } else if (request.quickAction === 'has_addons' || request.quickAction === 'mandatory_addons') {
      nextMove = 'Request clarification: "Which add-ons are removable? Show me the breakdown."'
    } else {
      nextMove = 'Get the full itemized OTD breakdown on one sheet before proceeding'
    }
  } else if (request.step === 2) {
    if (!request.dealerCurrentOTD) {
      nextMove = decoder.bestResponse || 'Continue pushing for the written OTD worksheet'
    } else {
      nextMove = decoder.bestResponse || 'Stay firm on your target OTD'
    }
  } else if (request.step === 3) {
    if (!request.dealerCurrentOTD) {
      nextMove = 'You still need the written OTD worksheet. Go back to Step 1 and use those scripts.'
    } else if (!request.targetOTD || request.targetOTD === 0) {
      nextMove = 'Set a target OTD based on the dealer\'s offer, then negotiate from there'
    } else if (gap && gap > 1000) {
      nextMove = 'Request itemized breakdown and negotiate sale price reduction, or walk if they refuse'
    } else if (gap && gap <= 0) {
      nextMove = 'Review breakdown and confirm it matches your target OTD, then close'
    } else {
      nextMove = 'Push for your target OTD using the closing line'
    }
  } else if (request.step === 4) {
    nextMove = 'Update dealer OTD and get new coaching based on the latest offer'
  }
  
  return {
    tacticLabel: tactics[0],
    tacticType,
    nextMove,
    sayThis,
    ifPushback,
    ifManager,
    stopSignal: `Repeat $${request.targetOTD.toLocaleString()} OTD and stay silent.`,
    closingLine,
    redFlags: [
      "They won't provide written OTD breakdown",
      "Pressure to sign today without seeing all fees",
      "Monthly payment focus instead of total price",
    ],
    doNotSay: [
      "What's the monthly payment?",
      "I need to think about it" + (request.dealerCurrentOTD ? '' : ' (without getting OTD first)'),
    ],
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check - support both Bearer token and cookie-based sessions
    let session = null
    let userId: string | null = null
    
    // Try Bearer token first
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const supabase = await createServerClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token)
      if (user && !error) {
        userId = user.id
      }
    }
    
    // Fallback to cookie-based session
    if (!userId) {
      const supabase = await createServerClient()
      const {
        data: { session: cookieSession },
      } = await supabase.auth.getSession()
      if (cookieSession?.user) {
        session = cookieSession
        userId = cookieSession.user.id
      }
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Entitlement check - verify IN_PERSON pack
    let hasInPersonPack = false
    let aiEnabled = false

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
        aiEnabled = !!openai && !!process.env.SUPABASE_SERVICE_ROLE_KEY
      } else {
        // Fallback to client check (dev only)
        const { data: packData } = await supabase
          .from('user_packs')
          .select('pack_id')
          .eq('user_id', userId)
          .eq('pack_id', 'in_person')
          .single()

        hasInPersonPack = !!packData
        aiEnabled = !!openai
      }
    } catch (error) {
      console.error('Error checking pack entitlement:', error)
      // In dev, allow if service key missing
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
    const body: InPersonAPIRequest = await request.json()

    // Validate request schema
    // vehiclePrice, targetOTD, and situation are now optional
    if (
      !body.stateCode ||
      typeof body.step !== 'number' ||
      body.step < 0 ||
      body.step > 4 ||
      !body.ladder ||
      typeof body.ladder.ask !== 'number' ||
      typeof body.ladder.agree !== 'number' ||
      typeof body.ladder.walk !== 'number' ||
      typeof body.ladder.locked !== 'boolean'
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid request schema' },
        { status: 400 }
      )
    }

    // If AI is not enabled, return deterministic fallback
    if (!aiEnabled) {
      const fallback = generateDeterministicFallback(body)
      return NextResponse.json({
        success: true,
        data: fallback,
        aiEnabled: false,
        source: 'deterministic',
      })
    }

    // Build prompts with full deal context
    // Handle optional vehiclePrice and targetOTD (can be 0 or missing)
    const vehiclePriceNum = body.vehiclePrice || 0
    const targetOTDNum = body.targetOTD || 0
    const gap = (body.dealerCurrentOTD && targetOTDNum > 0) ? body.dealerCurrentOTD - targetOTDNum : null
    let trend: 'improving' | 'worsening' | 'stalled' | null = null
    if (body.dealerCurrentOTD && body.lastDealerOTD) {
      if (body.dealerCurrentOTD < body.lastDealerOTD) trend = 'improving'
      else if (body.dealerCurrentOTD > body.lastDealerOTD) trend = 'worsening'
      else trend = 'stalled'
    }
      
      const systemPrompt = buildInPersonRealtimeSystemPrompt(body.ladder, gap, trend)
      const userPrompt = buildInPersonRealtimeUserPrompt(
        vehiclePriceNum,
        targetOTDNum,
        body.dealerCurrentOTD,
        body.lastDealerOTD,
        body.stateCode,
        body.situation,
        body.dealerSaid,
        body.step,
        body.quickAction,
        body.ladder
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

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}')

    // Validate response schema
    const validTacticTypes: InPersonAPIResponse['tacticType'][] = [
      'payment_anchoring',
      'urgency',
      'addons',
      'fees',
      'manager',
      'counter_otd',
      'trade_in_lowball',
      'stalling',
      'standard',
    ]
    
    const requiredFields: (keyof InPersonAPIResponse)[] = [
      'tacticLabel',
      'tacticType',
      'nextMove',
      'sayThis',
      'ifPushback',
      'ifManager',
      'stopSignal',
      'closingLine',
      'redFlags',
      'doNotSay',
    ]

    const missingFields = requiredFields.filter((field) => {
      if (field === 'redFlags' || field === 'doNotSay') {
        return !Array.isArray(aiResponse[field]) || aiResponse[field].length === 0
      }
      return !aiResponse[field]
    })

    if (missingFields.length > 0) {
      // Retry once
      console.warn('In-person response missing fields:', missingFields)
      const retryPrompt =
        userPrompt +
        '\n\nCRITICAL: You must return ALL required fields. Missing: ' +
        missingFields.join(', ')

      try {
        const retryCompletion = await openai!.chat.completions.create({
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
        const stillMissing = requiredFields.filter((field) => {
          if (field === 'redFlags' || field === 'doNotSay') {
            return !Array.isArray(retryResponse[field]) || retryResponse[field].length === 0
          }
          return !retryResponse[field]
        })

        if (stillMissing.length === 0) {
          Object.assign(aiResponse, retryResponse)
        } else {
          // Fallback to deterministic
          console.error('In-person response still invalid after retry, using deterministic fallback')
          const fallback = generateDeterministicFallback(body)
          return NextResponse.json({
            success: true,
            data: fallback,
            aiEnabled: true,
            source: 'deterministic_fallback',
          })
        }
      } catch (retryError) {
        console.error('Retry failed, using deterministic fallback:', retryError)
        const fallback = generateDeterministicFallback(body)
        return NextResponse.json({
          success: true,
          data: fallback,
          aiEnabled: true,
          source: 'deterministic_fallback',
        })
      }
    }

    // Validate and sanitize response
    const response: InPersonAPIResponse = {
      tacticLabel: String(aiResponse.tacticLabel || aiResponse.tactic || 'Standard negotiation').substring(0, 100),
      tacticType: validTacticTypes.includes(aiResponse.tacticType)
        ? aiResponse.tacticType
        : 'standard',
      nextMove: String(aiResponse.nextMove || aiResponse.nextBestMove || '').substring(0, 120),
      sayThis: String(aiResponse.sayThis || '').substring(0, 100),
      ifPushback: String(aiResponse.ifPushback || '').substring(0, 100),
      ifManager: String(aiResponse.ifManager || '').substring(0, 100),
      stopSignal: String(aiResponse.stopSignal || '').substring(0, 80),
      closingLine: String(aiResponse.closingLine || '').substring(0, 100),
      redFlags: Array.isArray(aiResponse.redFlags)
        ? aiResponse.redFlags.slice(0, 3).map((f: string) => String(f).substring(0, 60))
        : [],
      doNotSay: Array.isArray(aiResponse.doNotSay)
        ? aiResponse.doNotSay.slice(0, 2).map((f: string) => String(f).substring(0, 60))
        : [],
    }

    // Validate and enforce guardrails
    if (body.ladder.locked) {
      // Check if response violates locked ladder
      const sayThisAmount = response.sayThis.match(/\$[\d,]+/g)?.map(m => parseFloat(m.replace(/[$,]/g, ''))).filter(a => a > 1000 && a < 200000)
      const closingLineAmount = response.closingLine.match(/\$[\d,]+/g)?.map(m => parseFloat(m.replace(/[$,]/g, ''))).filter(a => a > 1000 && a < 200000)
      
      const violatesLadder = 
        (sayThisAmount && sayThisAmount.some(a => a > body.ladder.walk)) ||
        (closingLineAmount && closingLineAmount.some(a => a > body.ladder.walk)) ||
        (body.dealerCurrentOTD && body.dealerCurrentOTD > body.ladder.walk && !response.sayThis.toLowerCase().includes('walk'))
      
      if (violatesLadder) {
        // Override with ladder-safe version
        if (body.dealerCurrentOTD && body.dealerCurrentOTD > body.ladder.walk) {
          response.sayThis = `That's above my walk-away number of $${body.ladder.walk.toLocaleString()}. I need $${body.ladder.agree.toLocaleString()} OTD.`
          response.closingLine = `I can't go above $${body.ladder.walk.toLocaleString()}. My target is $${body.ladder.agree.toLocaleString()} OTD.`
          response.confidenceLevel = 'red'
          response.confidenceReason = `Dealer is $${(body.dealerCurrentOTD - body.ladder.walk).toLocaleString()} above your walk-away. You should walk.`
        } else {
          response.closingLine = `If you can do $${body.ladder.agree.toLocaleString()} OTD, I'm ready to move forward.`
          response.sayThis = `I need $${body.ladder.agree.toLocaleString()} OTD. Can you show me the breakdown?`
        }
      }
    }
    
    // Enforce: Never discuss monthly payments
    if (response.sayThis.toLowerCase().includes('monthly') || response.sayThis.toLowerCase().includes('payment')) {
      // Redirect to OTD
      response.sayThis = "I'm focused on the total out-the-door price, not monthly payments. What's your OTD?"
    }
    
    // Enforce: Never weaken user position
    const weakPhrases = ['maybe we can', 'perhaps', 'could consider', 'might be able', 'flexible']
    if (weakPhrases.some(phrase => response.sayThis.toLowerCase().includes(phrase))) {
      const targetOTDForMessage = targetOTDNum > 0 ? targetOTDNum : body.targetOTD || 0
      if (targetOTDForMessage > 0) {
        response.sayThis = `I need $${targetOTDForMessage.toLocaleString()} OTD. Can you show me the breakdown?`
      } else {
        response.sayThis = "I need the full OTD breakdown. Can you show me the worksheet?"
      }
    }
    
    // Update confidence based on gap if large (using gap already calculated above)
    if (gap && gap > 1000) {
      response.confidenceLevel = 'red'
      response.confidenceReason = `Dealer is $${gap.toLocaleString()} above target. Large gap - consider walking if they won't negotiate.`
    }

    return NextResponse.json({
      success: true,
      data: response,
      aiEnabled: true,
      source: 'ai',
    })
  } catch (error: any) {
    console.error('Error in in-person copilot:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate response' },
      { status: 500 }
    )
  }
}

