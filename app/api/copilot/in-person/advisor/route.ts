import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

interface AdvisorRequest {
  mode: 'between_rounds_advisor'
  userInput: string
  context: {
    vehiclePrice?: number
    targetOTD?: number
    walkAwayOTD?: number
    dealerOTD?: number
    state?: string
  }
}

interface AdvisorResponse {
  whatsReallyHappening: string
  whyThisMatters: string
  yourBestMove: string
  exactlyWhatToSay: string
  confidenceSignal: string
}

function buildSystemPrompt(context: AdvisorRequest['context']): string {
  const targetOTD = context.targetOTD || 0
  const walkAwayOTD = context.walkAwayOTD || (targetOTD > 0 ? targetOTD + 1000 : 0)
  const vehiclePrice = context.vehiclePrice || 0
  
  const dealerOTD = context.dealerOTD || null
  const gap = dealerOTD && targetOTD > 0 ? dealerOTD - targetOTD : null
  
  const contextInfo = targetOTD > 0
    ? `BUYER'S NEGOTIATION NUMBERS (TRUST THESE - THEY ARE TRUTH):
- Target OTD: $${targetOTD.toLocaleString()}
- Walk-Away Ceiling: $${walkAwayOTD.toLocaleString()}
${dealerOTD ? `- Dealer Current OTD: $${dealerOTD.toLocaleString()}` : ''}
${gap !== null ? `- Gap: $${Math.abs(gap).toLocaleString()} (${gap > 0 ? 'dealer is above' : 'dealer is below'} your target)` : ''}
${vehiclePrice > 0 ? `- Vehicle Price: $${vehiclePrice.toLocaleString()}` : ''}
${context.state ? `- State: ${context.state}` : ''}

Treat these values as truth. Do not contradict or soften them. Reference them explicitly when relevant.`
    : 'Buyer has not set specific numbers yet. Still provide decisive guidance based on the situation described.'

  return `ROLE

You are a professional car-buying negotiation strategist.

You advise users between dealership interactions, after they have stepped away from the salesperson.
You do not simulate conversation.
You do not ask open-ended questions unless absolutely required.

Your job is to:
- Diagnose the dealer's tactic
- Protect the buyer's leverage
- Tell the buyer exactly what to do next
- Provide one clear script to use

You sound calm, confident, and decisive — never chatty.

${contextInfo}

🚫 ABSOLUTE RULES (NON-NEGOTIABLE)

You must never:
- Ask "Would you like to…"
- Say "You could consider…"
- Provide multiple options
- Explain basic concepts unless they directly affect the next move
- Sound like a chatbot or assistant

You must always:
- Make one recommendation
- Reference the buyer's actual numbers
- Speak with authority
- Reduce anxiety, not add to it

If information is missing, say exactly what is needed — nothing more.

🧠 HOW YOU THINK (INTERNAL)

Before responding, silently determine:
- What tactic the dealer is using
- Whether the buyer currently has leverage
- Whether the buyer should: Hold / Push / Counter / Walk
- What mistake the buyer is most likely to make next

Then respond.

🧾 REQUIRED RESPONSE FORMAT (STRICT)

Every response MUST follow this exact structure as a JSON object with these 5 keys:

{
  "whatsReallyHappening": "🔍 Situation Diagnosis - Explain what the dealer is actually doing, in one or two sentences. Example: 'The dealer is deflecting from OTD by redirecting to monthly payments, which hides total cost and weakens your position.'",
  "whyThisMatters": "⚠️ Why This Matters - Explain the risk if the buyer responds incorrectly. Example: 'If you discuss payments now, you lose control of the total price and make it harder to reduce OTD later.'",
  "yourBestMove": "✅ Correct Move - Give one clear instruction. No alternatives. Example: 'Do not counter. Force a written OTD breakdown before continuing.'",
  "exactlyWhatToSay": "🗣️ Say This (Exact Script) - Provide one message, written confidently and naturally. This must be copy-paste ready. Example: 'I'm only moving forward based on the total out-the-door price. Please send the written OTD breakdown so we can continue.'",
  "confidenceSignal": "🧠 Confidence Check - Reassure the user that this move is correct and reasonable. Example: 'This is standard, professional, and signals that you are a serious buyer — not a difficult one.'"
}

🛑 WHEN TO REFUSE TO ANSWER

If the dealer's response is too vague to diagnose, respond with:
"I need the dealer's exact response or number to give you the correct next move."

Do not add anything else.

🎯 TONE GUIDELINES

Your tone should feel:
- Calm
- Experienced
- Unemotional
- Decisive

You are not cheering, educating, or negotiating for them — you are guiding them through pressure.

🧩 DIFFERENTIATION FROM CHATGPT (IMPORTANT)

Your advice must:
- Reference the buyer's exact numbers${targetOTD > 0 ? ` (Target: $${targetOTD.toLocaleString()}, Walk-away: $${walkAwayOTD.toLocaleString()})` : ''}
- Identify dealership-specific tactics
- Make a decision for the user
- Remove ambiguity

This should feel like:
"Someone who has done this 1,000 times is standing next to me."

Not:
"An assistant helping me think."

✅ SUCCESS CRITERIA

Your response is successful if:
- The user knows exactly what to say next
- The user feels calmer, not more overwhelmed
- The output could be printed and followed step-by-step
- The user would not think "I could've just asked ChatGPT"`
}

function buildUserPrompt(userInput: string): string {
  return `What just happened: "${userInput}"

Diagnose the dealer's tactic, determine the correct move, and provide the exact 5-section response format.`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: AdvisorRequest = await request.json()

    if (!body.userInput || !body.userInput.trim()) {
      return NextResponse.json(
        { success: false, error: 'User input is required' },
        { status: 400 }
      )
    }

    if (!openai) {
      // Fallback response - authoritative and decisive
      const targetOTD = body.context.targetOTD || 0
      const fallback: AdvisorResponse = {
        whatsReallyHappening: targetOTD > 0 
          ? `The dealer is using negotiation tactics. Your target is $${targetOTD.toLocaleString()}.`
          : 'The dealer is using standard negotiation tactics.',
        whyThisMatters: 'If you respond incorrectly, you lose leverage on total price.',
        yourBestMove: 'Do not counter yet. Force written OTD before any further discussion.',
        exactlyWhatToSay: targetOTD > 0
          ? `I'm only moving forward based on the total out-the-door price. My target is $${targetOTD.toLocaleString()}. Please send the written OTD breakdown.`
          : 'I need the full out-the-door price in writing. What is it?',
        confidenceSignal: 'This is standard, reasonable, and signals you are a serious buyer.',
      }
      return NextResponse.json({ success: true, data: fallback })
    }

    const systemPrompt = buildSystemPrompt(body.context)
    const userPrompt = buildUserPrompt(body.userInput.trim())

    // Use JSON mode for structured output
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt + '\n\nCRITICAL: Respond ONLY with a JSON object containing exactly these 5 keys: whatsReallyHappening, whyThisMatters, yourBestMove, exactlyWhatToSay, confidenceSignal. No other text, no explanations, no markdown. Pure JSON only.' },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    })

    const responseText = completion.choices[0]?.message?.content || ''

    // Parse JSON response
    let parsed: any = {}
    try {
      parsed = JSON.parse(responseText)
    } catch (e) {
      // If JSON parsing fails, try to extract JSON from text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch (e2) {
          // Fall through to fallback
        }
      }
    }

    // Extract sections with fallbacks
    const whatsReallyHappening = parsed.whatsReallyHappening || parsed['1'] || 'The dealer is using negotiation tactics.'
    const whyThisMatters = parsed.whyThisMatters || parsed['2'] || 'Responding incorrectly could weaken your position.'
    const yourBestMove = parsed.yourBestMove || parsed['3'] || 'Hold firm on your OTD request.'
    const exactlyWhatToSay = parsed.exactlyWhatToSay || parsed['4'] || 'I need the full out-the-door price in writing.'
    const confidenceSignal = parsed.confidenceSignal || parsed['5'] || 'You\'re doing this right.'

    // Validate all sections exist
    if (!whatsReallyHappening || !whyThisMatters || !yourBestMove || !exactlyWhatToSay || !confidenceSignal) {
      // Ultimate fallback - authoritative and decisive
      const targetOTD = body.context.targetOTD || 0
      const fallback: AdvisorResponse = {
        whatsReallyHappening: targetOTD > 0
          ? `The dealer is using negotiation tactics. Your target is $${targetOTD.toLocaleString()}.`
          : 'The dealer is using standard negotiation tactics.',
        whyThisMatters: 'If you respond incorrectly, you lose leverage on total price.',
        yourBestMove: 'Do not counter yet. Force written OTD before any further discussion.',
        exactlyWhatToSay: targetOTD > 0
          ? `I'm only moving forward based on the total out-the-door price. My target is $${targetOTD.toLocaleString()}. Please send the written OTD breakdown.`
          : 'I need the full out-the-door price in writing. What is it?',
        confidenceSignal: 'This is standard, reasonable, and signals you are a serious buyer.',
      }
      return NextResponse.json({ success: true, data: fallback })
    }

    const response: AdvisorResponse = {
      whatsReallyHappening: whatsReallyHappening || 'The dealer is using negotiation tactics.',
      whyThisMatters: whyThisMatters || 'Responding incorrectly could weaken your position.',
      yourBestMove: yourBestMove || 'Hold firm on your OTD request.',
      exactlyWhatToSay: exactlyWhatToSay || 'I need the full out-the-door price in writing.',
      confidenceSignal: confidenceSignal || 'You\'re doing this right.',
    }

    return NextResponse.json({ success: true, data: response })
  } catch (error: any) {
    console.error('[Advisor API] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get advice' },
      { status: 500 }
    )
  }
}

