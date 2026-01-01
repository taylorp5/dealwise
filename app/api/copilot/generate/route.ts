import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOpenAIClient } from '@/lib/openai/client'
import { getTaxRateForState } from '@/lib/utils/tax-rates'
import { resolveTaxRate } from '@/lib/utils/tax-lookup'
import { buildFreeCopilotSystemPrompt, buildFreeCopilotUserPrompt } from '@/lib/prompts/copilot_free'
import { buildFirstTimeCopilotSystemPrompt, buildFirstTimeCopilotUserPrompt } from '@/lib/prompts/copilot_first_time'
import { buildInPersonCopilotSystemPrompt, buildInPersonCopilotUserPrompt, classifyDealerTactics } from '@/lib/prompts/copilot_in_person'
import { getPlaybookForGoal, assembleMessage, getLeverageExplanation, buildConfidenceCheck, type PlaybookType } from '@/lib/prompts/negotiation-playbooks'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Support Authorization header (Bearer token) and cookie session
    const authHeader = request.headers.get('authorization')
    let userId: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const {
        data: { user },
      } = await supabase.auth.getUser(token)
      if (user) userId = user.id
    }

    if (!userId) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) userId = session.user.id
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      buyerType,
      stage,
      tone,
      goal,
      vehiclePrice,
      desiredOTD,
      state,
      registrationZip,
      taxRate: providedTaxRate,
      tradeIn,
      tradeInValue,
      preApprovalApr,
      maxMonthly,
      contextText,
      hasCompetitiveOffers,
      hasCarContext,
      hasInPersonPack,
      mode, // Changed from copilotMode to mode
      inPersonSituation,
    } = body

    // Determine mode: use mode from request, validate against entitlements
    let effectiveMode = mode || 'free'
    let entitlementCheck: string = 'none'
    
    // Server-side entitlement validation
    if (effectiveMode === 'in_person' || effectiveMode === 'first_time') {
      // Check user's pack entitlements from database
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (serviceRoleKey) {
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
        
        const packIdToCheck = effectiveMode === 'in_person' ? 'in_person' : 'first_time'
        const { data: userPack } = await adminSupabase
          .from('user_packs')
          .select('is_unlocked')
          .eq('user_id', userId)
          .eq('pack_id', packIdToCheck)
          .single()
        
        // If pack not found or not unlocked, downgrade to free
        if (!userPack || !userPack.is_unlocked) {
          entitlementCheck = `downgraded_to_free_missing_${packIdToCheck}_pack`
          effectiveMode = 'free'
        } else {
          entitlementCheck = `verified_${packIdToCheck}_pack`
        }
      } else {
        // Service role key missing - cannot verify entitlements
        entitlementCheck = 'skipped_missing_service_key'
        // In local dev, still allow but log warning
        console.warn('SUPABASE_SERVICE_ROLE_KEY missing - cannot verify pack entitlements')
      }
    }
    
    const isInPersonMode = effectiveMode === 'in_person'

    // Validate required fields
    if (!vehiclePrice || !state) {
      return NextResponse.json(
        { success: false, error: 'Vehicle price and state are required' },
        { status: 400 }
      )
    }

    // In-person mode requires desiredOTD and situation
    if (effectiveMode === 'in_person') {
      if (!desiredOTD) {
        return NextResponse.json(
          { success: false, error: 'Desired OTD is required for in-person mode' },
          { status: 400 }
        )
      }
      if (!inPersonSituation) {
        return NextResponse.json(
          { success: false, error: 'Situation selection is required for in-person mode' },
          { status: 400 }
        )
      }
    } else if ((goal === 'get_otd' || goal === 'close_today') && !desiredOTD) {
      return NextResponse.json(
        { success: false, error: 'Desired OTD is required for this goal' },
        { status: 400 }
      )
    }

    const openai = getOpenAIClient()
    
    // Use provided tax rate if available, otherwise look it up using same source as frontend
    let taxRate: number
    if (providedTaxRate && (typeof providedTaxRate === 'number' || (typeof providedTaxRate === 'string' && parseFloat(providedTaxRate) > 0))) {
      taxRate = typeof providedTaxRate === 'number' ? providedTaxRate : parseFloat(providedTaxRate)
    } else if (state) {
      // Use the same resolveTaxRate function that frontend pages use
      // This ensures consistent tax rate lookup across all pages
      try {
        const taxRateResult = await resolveTaxRate(state, registrationZip || undefined)
        if (taxRateResult.combinedRate !== undefined) {
          taxRate = taxRateResult.combinedRate
        } else if (taxRateResult.combinedRateRange) {
          // Use midpoint if range is provided
          taxRate = (taxRateResult.combinedRateRange.low + taxRateResult.combinedRateRange.high) / 2
        } else {
          // Fallback to state base rate
          taxRate = taxRateResult.stateBaseRate || getTaxRateForState(state) || 6.5
        }
      } catch (error) {
        // If resolveTaxRate fails, fallback to state base rate
        console.warn('Tax rate lookup failed, using state base rate:', error)
        taxRate = getTaxRateForState(state) || 6.5
      }
    } else {
      // No state provided, use default
      taxRate = 6.5
    }
    
    // Build prompts based on mode using separate prompt files
    let systemPrompt: string
    let userPrompt: string
    
    if (effectiveMode === 'in_person') {
      // Classify dealer tactics from context text
      const detectedTactics = contextText ? classifyDealerTactics(contextText) : []
      
      systemPrompt = buildInPersonCopilotSystemPrompt(
        buyerType,
        stage,
        tone,
        goal,
        vehiclePrice,
        desiredOTD || 0,
        state,
        taxRate,
        inPersonSituation,
        detectedTactics
      )
      userPrompt = buildInPersonCopilotUserPrompt(
        inPersonSituation,
        contextText,
        desiredOTD,
        detectedTactics
      )
    } else if (effectiveMode === 'first_time') {
      // Use playbook system instead of freeform generation
      // Check if dealer mentions monthly payment in context text
      const dealerMentionsMonthlyPayment = contextText ? 
        /monthly\s+payment|payment\s+per\s+month|what.*monthly|monthly\s+amount/i.test(contextText) : false
      
      const playbookType = getPlaybookForGoal(
        goal, 
        stage, 
        buyerType,
        dealerMentionsMonthlyPayment
      )
      const assembledMessage = assembleMessage(
        playbookType,
        tone as 'friendly' | 'neutral' | 'firm',
        goal,
        desiredOTD ? parseFloat(desiredOTD) : undefined,
        preApprovalApr ? parseFloat(preApprovalApr) : undefined,
        maxMonthly ? parseFloat(maxMonthly) : undefined,
        {
          vehiclePrice: parseFloat(vehiclePrice),
          stage,
          hasCompetitiveOffers: hasCompetitiveOffers || false,
          buyerType,
          dealerMentionsMonthlyPayment
        }
      )
      
      // Get leverage explanation from playbook (coach-like, not blog-like)
      const leverageExplanation = getLeverageExplanation(
        playbookType,
        goal,
        !!preApprovalApr,
        hasCompetitiveOffers || false
      )
      
      // Build confidence check
      const confidenceCheck = buildConfidenceCheck(
        desiredOTD ? parseFloat(desiredOTD) : undefined,
        taxRate,
        goal
      )
      
      // Use simplified AI prompt for supporting sections only (pushback scenarios)
      systemPrompt = `You are an expert car buying negotiation coach. Generate realistic pushback scenarios for negotiation messages.

Your job is to provide:
1. If They Push Back (only 2 realistic responses)
2. What NOT to Say Next

The message itself is already assembled from a playbook. The "Why This Works" section is already provided. Focus ONLY on realistic dealer pushback scenarios and what to avoid saying.

Tone: ${tone}
Goal: ${goal}
Stage: ${stage}
Buyer Type: ${buyerType}
${desiredOTD ? `Desired OTD: $${desiredOTD}` : ''}

Your response must be a JSON object with this exact structure:
{
  "ifTheyPushBack": [
    {"dealerReply": "<realistic pushback 1>", "suggestedResponse": "<short email/text response, <= 120 chars>"},
    {"dealerReply": "<realistic pushback 2>", "suggestedResponse": "<short email/text response, <= 120 chars>"}
  ],
  "whatNotToSay": [
    "What's the monthly payment?",
    "I love this car",
    "This is my first time buying"
  ]
}`
      
      userPrompt = `Generate pushback scenarios for this negotiation message:

Message: "${assembledMessage}"

Playbook: ${playbookType}

Provide:
1. If They Push Back (only 2 realistic dealer responses with short email/text replies)
2. What NOT to Say Next (common mistakes to avoid)`
    } else {
      // Free mode
      systemPrompt = buildFreeCopilotSystemPrompt(
        buyerType,
        stage,
        tone,
        goal,
        vehiclePrice,
        desiredOTD,
        state,
        taxRate
      )
      userPrompt = buildFreeCopilotUserPrompt(
        contextText,
        stage,
        desiredOTD,
        goal,
        preApprovalApr,
        maxMonthly,
        hasCompetitiveOffers
      )
    }

    // For first_time mode, we only need AI for supporting sections (not message generation)
    // For other modes, generate full response
    let aiResponse: any = {}
    
    if (effectiveMode === 'first_time') {
      // Only call AI for supporting sections (strategicIntent, explainer, whatHappensNext, guardrails, decisionTree)
      // Message is assembled from playbook, not generated
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      })
      aiResponse = JSON.parse(completion.choices[0].message.content || '{}')
    } else {
      // Free or in-person mode: full AI generation
      const temperature = effectiveMode === 'in_person' ? 0.7 : 0.7
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature,
      })
      aiResponse = JSON.parse(completion.choices[0].message.content || '{}')
    }

    // Ensure messages are within character limits
    const truncateMessage = (msg: string, maxLength: number) => {
      if (!msg) return ''
      if (msg.length <= maxLength) return msg
      return msg.substring(0, maxLength - 3) + '...'
    }

    let response: any

    if (isInPersonMode) {
      // Validate in-person response schema (including new fields)
      const requiredFields = ['sayThis', 'ifPushback', 'ifManager', 'stopSignal', 'closingLine', 'nextMove', 'ladder', 'redFlags', 'doNotSay']
      const missingFields = requiredFields.filter(field => {
        if (field === 'ladder') {
          return !aiResponse.ladder || !aiResponse.ladder.ask || !aiResponse.ladder.agree || !aiResponse.ladder.walk
        }
        return !aiResponse[field]
      })
      
      if (missingFields.length > 0) {
        // Retry once with explicit instruction
        console.warn('In-person response missing fields:', missingFields)
        const retryPrompt = userPrompt + '\n\nCRITICAL: You must return ALL required fields: sayThis, ifPushback, ifManager, stopSignal, closingLine, nextMove, ladder (with ask/agree/walk), redFlags (array of 3), doNotSay (array of 2). Missing fields: ' + missingFields.join(', ')
        
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
            if (field === 'ladder') {
              return !retryResponse.ladder || !retryResponse.ladder.ask || !retryResponse.ladder.agree || !retryResponse.ladder.walk
            }
            return !retryResponse[field]
          })
          if (stillMissing.length === 0) {
            Object.assign(aiResponse, retryResponse)
          } else {
            // Retry failed - build situation-specific fallback
            console.error('In-person response still invalid after retry, using situation-specific fallback')
            const walkAwayOTD = desiredOTD ? desiredOTD + 750 : 0
            
            // Situation-specific fallbacks
            let fallbackSayThis = desiredOTD ? `I need $${desiredOTD} OTD. Can you show me the breakdown?` : "I need the full out-the-door price breakdown."
            let fallbackNextMove = "Wait for their response. If they agree, request written OTD breakdown."
            
            if (inPersonSituation?.includes('monthly payment')) {
              fallbackSayThis = "I'm focused on the total out-the-door price, not monthly payments. What's your OTD?"
              fallbackNextMove = "Wait for OTD breakdown. If they persist with monthly talk, repeat: 'I need the OTD number.'"
            } else if (inPersonSituation?.includes('add-ons')) {
              fallbackSayThis = "I need to see which add-ons are removable. Can you show me the breakdown?"
              fallbackNextMove = "Review breakdown. If add-ons are removable, request removal. If not, offer to adjust sale price."
            } else if (inPersonSituation?.includes('sign today')) {
              fallbackSayThis = desiredOTD ? `I sign when the OTD sheet matches $${desiredOTD}. Show me the breakdown.` : "I sign when the OTD sheet matches my target. Show me the breakdown."
              fallbackNextMove = "Wait for written OTD breakdown. Verify it matches your target before signing."
            }
            
            response = {
              sayThis: fallbackSayThis,
              ifPushback: "I understand. I still need the full OTD breakdown to make a decision.",
              ifManager: desiredOTD ? `I need $${desiredOTD} OTD. Can you make that happen?` : "I need my target OTD. Can you make that happen?",
              stopSignal: desiredOTD ? `Repeat $${desiredOTD} OTD and stay silent.` : "Repeat your target OTD and stay silent.",
              closingLine: desiredOTD ? `If you can do $${desiredOTD} OTD, I'm ready to move forward.` : "I need my target OTD to move forward.",
              nextMove: fallbackNextMove,
              ladder: {
                ask: desiredOTD ? `Ask for $${desiredOTD - 500} OTD` : "Ask for target OTD minus $500",
                agree: desiredOTD ? `Agree at $${desiredOTD} OTD` : "Agree at target OTD",
                walk: desiredOTD ? `Walk at $${walkAwayOTD} OTD` : "Walk at target + $750"
              },
              redFlags: [
                "They won't provide written OTD breakdown",
                "Pressure to sign today without seeing all fees",
                "Monthly payment focus instead of total price"
              ],
              doNotSay: [
                "What's the monthly payment?",
                "I need to think about it" + (desiredOTD ? '' : ' (without getting OTD first)')
              ],
              assumptions: {
                taxBaseRate: taxRate,
                feeAssumptions: 'Doc fee: $150-500, Title/Registration: $50-200',
                disclaimer: 'Tax and fee rules vary by state and locality. Always verify final numbers with the dealer or DMV.',
              },
            }
            return NextResponse.json({ success: true, data: response, effectiveMode, entitlementCheck })
          }
        } catch (retryError) {
          console.error('Retry failed, using situation-specific fallback:', retryError)
          // Build fallback (same as above)
          const walkAwayOTD = desiredOTD ? desiredOTD + 750 : 0
          
          let fallbackSayThis = desiredOTD ? `I need $${desiredOTD} OTD. Can you show me the breakdown?` : "I need the full out-the-door price breakdown."
          let fallbackNextMove = "Wait for their response. If they agree, request written OTD breakdown."
          
          if (inPersonSituation?.includes('monthly payment')) {
            fallbackSayThis = "I'm focused on the total out-the-door price, not monthly payments. What's your OTD?"
            fallbackNextMove = "Wait for OTD breakdown. If they persist with monthly talk, repeat: 'I need the OTD number.'"
          } else if (inPersonSituation?.includes('add-ons')) {
            fallbackSayThis = "I need to see which add-ons are removable. Can you show me the breakdown?"
            fallbackNextMove = "Review breakdown. If add-ons are removable, request removal. If not, offer to adjust sale price."
          } else if (inPersonSituation?.includes('sign today')) {
            fallbackSayThis = desiredOTD ? `I sign when the OTD sheet matches $${desiredOTD}. Show me the breakdown.` : "I sign when the OTD sheet matches my target. Show me the breakdown."
            fallbackNextMove = "Wait for written OTD breakdown. Verify it matches your target before signing."
          }
          
          response = {
            sayThis: fallbackSayThis,
            ifPushback: "I understand. I still need the full OTD breakdown to make a decision.",
            ifManager: desiredOTD ? `I need $${desiredOTD} OTD. Can you make that happen?` : "I need my target OTD. Can you make that happen?",
            stopSignal: desiredOTD ? `Repeat $${desiredOTD} OTD and stay silent.` : "Repeat your target OTD and stay silent.",
            closingLine: desiredOTD ? `If you can do $${desiredOTD} OTD, I'm ready to move forward.` : "I need my target OTD to move forward.",
            nextMove: fallbackNextMove,
            ladder: {
              ask: desiredOTD ? `Ask for $${desiredOTD - 500} OTD` : "Ask for target OTD minus $500",
              agree: desiredOTD ? `Agree at $${desiredOTD} OTD` : "Agree at target OTD",
              walk: desiredOTD ? `Walk at $${walkAwayOTD} OTD` : "Walk at target + $750"
            },
            redFlags: [
              "They won't provide written OTD breakdown",
              "Pressure to sign today without seeing all fees",
              "Monthly payment focus instead of total price"
            ],
            doNotSay: [
              "What's the monthly payment?",
              "I need to think about it" + (desiredOTD ? '' : ' (without getting OTD first)')
            ],
            assumptions: {
              taxBaseRate: taxRate,
              feeAssumptions: 'Doc fee: $150-500, Title/Registration: $50-200',
              disclaimer: 'Tax and fee rules vary by state and locality. Always verify final numbers with the dealer or DMV.',
            },
          }
          return NextResponse.json({ success: true, data: response, effectiveMode, entitlementCheck })
        }
      }
      
      // In-Person Mode Response Structure (new schema with nextMove and ladder)
      const walkAwayOTD = desiredOTD ? desiredOTD + 750 : 0
      
      response = {
        sayThis: truncateMessage(aiResponse.sayThis || (desiredOTD ? `I need $${desiredOTD} OTD. Can you show me the breakdown?` : "I need the full out-the-door price breakdown."), 100),
        ifPushback: truncateMessage(aiResponse.ifPushback || "I understand. I still need the full OTD breakdown to make a decision.", 100),
        ifManager: truncateMessage(aiResponse.ifManager || (desiredOTD ? `I need $${desiredOTD} OTD. Can you make that happen?` : "I need my target OTD. Can you make that happen?"), 100),
        stopSignal: truncateMessage(aiResponse.stopSignal || (desiredOTD ? `Repeat $${desiredOTD} OTD and stay silent.` : "Repeat your target OTD and stay silent."), 80),
        closingLine: truncateMessage(aiResponse.closingLine || (desiredOTD ? `If you can do $${desiredOTD} OTD, I'm ready to move forward.` : "I need my target OTD to move forward."), 100),
        nextMove: truncateMessage(aiResponse.nextMove || "Wait for their response. If they agree, request written OTD breakdown.", 120),
        ladder: aiResponse.ladder && aiResponse.ladder.ask && aiResponse.ladder.agree && aiResponse.ladder.walk
          ? {
              ask: truncateMessage(aiResponse.ladder.ask, 80),
              agree: truncateMessage(aiResponse.ladder.agree, 80),
              walk: truncateMessage(aiResponse.ladder.walk, 80),
            }
          : {
              ask: desiredOTD ? `Ask for $${desiredOTD - 500} OTD` : "Ask for target OTD minus $500",
              agree: desiredOTD ? `Agree at $${desiredOTD} OTD` : "Agree at target OTD",
              walk: desiredOTD ? `Walk at $${walkAwayOTD} OTD` : "Walk at target + $750"
            },
        redFlags: Array.isArray(aiResponse.redFlags) && aiResponse.redFlags.length >= 3
          ? aiResponse.redFlags.slice(0, 3).map((flag: string) => truncateMessage(flag, 60))
          : [
              "They won't provide written OTD breakdown",
              "Pressure to sign today without seeing all fees",
              "Monthly payment focus instead of total price"
            ],
        doNotSay: Array.isArray(aiResponse.doNotSay) && aiResponse.doNotSay.length >= 2
          ? aiResponse.doNotSay.slice(0, 2).map((mistake: string) => truncateMessage(mistake, 60))
          : [
              "What's the monthly payment?",
              "I need to think about it" + (desiredOTD ? '' : ' (without getting OTD first)')
            ],
        assumptions: {
          taxBaseRate: taxRate,
          feeAssumptions: aiResponse.assumptions?.feeAssumptions || 'Doc fee: $150-500, Title/Registration: $50-200',
          disclaimer: aiResponse.assumptions?.disclaimer || 'Tax and fee rules vary by state and locality. Always verify final numbers with the dealer or DMV.',
        },
      }
    } else if (effectiveMode === 'first_time') {
      // First-Time Mode: Use playbook-assembled message
      // Check if dealer mentions monthly payment in context text
      const dealerMentionsMonthlyPayment = contextText ? 
        /monthly\s+payment|payment\s+per\s+month|what.*monthly|monthly\s+amount/i.test(contextText) : false
      
      const playbookType = getPlaybookForGoal(
        goal, 
        stage, 
        buyerType,
        dealerMentionsMonthlyPayment
      )
      const assembledMessage = assembleMessage(
        playbookType,
        tone as 'friendly' | 'neutral' | 'firm',
        goal,
        desiredOTD ? parseFloat(desiredOTD) : undefined,
        preApprovalApr ? parseFloat(preApprovalApr) : undefined,
        maxMonthly ? parseFloat(maxMonthly) : undefined,
        {
          vehiclePrice: parseFloat(vehiclePrice),
          stage,
          hasCompetitiveOffers: hasCompetitiveOffers || false,
          buyerType,
          dealerMentionsMonthlyPayment
        }
      )
      
      const leverageExplanation = getLeverageExplanation(
        playbookType,
        goal,
        !!preApprovalApr,
        hasCompetitiveOffers || false
      )
      
      // Build confidence check
      const confidenceCheck = buildConfidenceCheck(
        desiredOTD ? parseFloat(desiredOTD) : undefined,
        taxRate,
        goal
      )
      
      // Use coach-like explanations from playbook (not AI-generated)
      const whyThisWorksBullets = leverageExplanation.slice(0, 3) // 2-3 bullets max
      
      response = {
        bestNextMessage: truncateMessage(assembledMessage, 800),
        whyThisWorks: whyThisWorksBullets,
        confidenceCheck: confidenceCheck,
        ifTheyPushBack: Array.isArray(aiResponse.ifTheyPushBack) && aiResponse.ifTheyPushBack.length >= 2
          ? aiResponse.ifTheyPushBack.slice(0, 2).map((item: any) => ({
              dealerReply: item.dealerReply || 'Common dealer pushback',
              suggestedResponse: truncateMessage(item.suggestedResponse || 'Short response', 120)
            }))
          : [
              { dealerReply: 'They ask about monthly payments', suggestedResponse: 'I\'m only discussing OTD, not payments. Send the breakdown.' },
              { dealerReply: 'They add fees or raise the price', suggestedResponse: 'Which fees are optional? Remove them and send updated OTD.' }
            ],
        whatNotToSay: Array.isArray(aiResponse.whatNotToSay) && aiResponse.whatNotToSay.length >= 3
          ? aiResponse.whatNotToSay.slice(0, 3)
          : [
              "What's the monthly payment?",
              "I love this car",
              "This is my first time buying"
            ],
        assumptions: {
          taxBaseRate: taxRate,
          feeAssumptions: state ? `Based on ${state} state fees` : '',
          disclaimer: 'This draft is designed for email or text. For live dealership negotiations, switch to the In-Person Negotiation Pack.'
        }
      }
    } else {
      // Free Mode Response Structure
      // Validate response structure
      if (!aiResponse.bestNextMessage) {
        throw new Error('Invalid response format from AI: missing bestNextMessage')
      }
      
      response = {
        bestNextMessage: truncateMessage(aiResponse.bestNextMessage, 800),
        whyThisWorks: aiResponse.whyThisWorks || 'This keeps the conversation focused on total cost (OTD), avoids monthly payment traps, and asks for everything in writing.',
        alternate1: truncateMessage(aiResponse.alternate1 || aiResponse.bestNextMessage, 800),
        alternate2: truncateMessage(aiResponse.alternate2 || aiResponse.bestNextMessage, 800),
        checklist: Array.isArray(aiResponse.checklist) && aiResponse.checklist.length >= 4
          ? aiResponse.checklist.slice(0, 4)
          : [
              'Written itemized OTD (sale price, tax, doc, title/registration)',
              'Full list of dealer add-ons (and whether removable)',
              'VIN / stock number confirmation',
              'Quote expiration / validity window',
            ],
        decisionTree: Array.isArray(aiResponse.decisionTree) && aiResponse.decisionTree.length >= 3
          ? aiResponse.decisionTree.slice(0, 3).map((item: any, index: number) => ({
              dealerReply: item.dealerReply || 'Common dealer response',
              suggestedResponse: truncateMessage(item.suggestedResponse || '', 200),
              isIncomplete: index === 2, // Mark third one as incomplete for upgrade path
            }))
          : [
              {
                dealerReply: "We can't go lower than this",
                suggestedResponse: "I understand. Can you show me the itemized breakdown? I'd like to see where we can adjust fees or add-ons.",
                isIncomplete: false,
              },
              {
                dealerReply: "This price is only good today",
                suggestedResponse: desiredOTD 
                  ? `I appreciate the urgency. If you can do $${desiredOTD} OTD, I can move forward today.`
                  : "I appreciate the urgency. If you can do $[desiredOTD] OTD, I can move forward today.",
                isIncomplete: false,
              },
              {
                dealerReply: "Our fees are higher than expected",
                suggestedResponse: desiredOTD
                  ? `I understand. Can you share a full breakdown of the fees? I'm still targeting $${desiredOTD} OTD.`
                  : "I understand. Can you share a full breakdown of the fees? I'm still targeting $[desiredOTD] OTD.",
                isIncomplete: true,
              },
            ],
        assumptions: {
          taxBaseRate: taxRate,
          feeAssumptions: aiResponse.assumptions?.feeAssumptions || 'Doc fee: $150-500, Title/Registration: $50-200',
          disclaimer: aiResponse.assumptions?.disclaimer || 'Tax and fee rules vary by state and locality. Always verify final numbers with the dealer or DMV.',
        },
      }
    }

    return NextResponse.json({
      success: true,
      data: response,
      effectiveMode,
      entitlementCheck,
    })
  } catch (error: any) {
    console.error('Error generating copilot response:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate response' },
      { status: 500 }
    )
  }
}
