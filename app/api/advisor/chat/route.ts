import { NextRequest } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface IntentClassification {
  intent: 'definition' | 'decision' | 'how_to' | 'negotiation' | 'numbers' | 'app_help' | 'feature_request'
  confidence: number
  redirectTo?: string // Optional feature to redirect to
}

// Intent classification using lightweight heuristics + model fallback
async function classifyIntent(
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<IntentClassification> {
  const lower = userMessage.toLowerCase().trim()

  // Heuristic rules (fast path)
  // IMPORTANT: Check feature requests FIRST before generic intents
  
  // Feature requests - detect when user wants to use specific features (check BEFORE generic how_to)
  // Negotiation/Copilot requests - check for negotiation-related questions first
  // Check for "how do/to/can/should i negotiate" patterns first
  if (
    /how\s+(do|to|can|should)\s+i\s+negotiate/i.test(userMessage) ||
    /how\s+(do|to|can|should)\s+.*negotiate/i.test(userMessage) ||
    /how.*negotiate/i.test(lower) ||
    /how.*respond.*dealer|how.*talk.*dealer|how.*deal.*dealer|how.*handle.*dealer/i.test(lower) ||
    /what.*say.*dealer|what should i say|what to say|how do i say|how to say/i.test(lower) ||
    /negotiation.*copilot|copilot|script|response|reply.*dealer|message.*dealer/i.test(lower) ||
    /word.*for.*word|exact.*words|what.*tell|how.*respond/i.test(lower) ||
    (/(negotiate|negotiation)/i.test(lower) && /(how|what|way|steps|guide|help)/i.test(lower))
  ) {
    return { intent: 'feature_request', confidence: 0.95, redirectTo: 'copilot' }
  }

  // OTD Builder requests
  if (
    /build.*otd|calculate.*otd|otd builder|out.*door.*builder|figure out.*otd|work out.*otd/i.test(lower) ||
    /how.*build.*price|how.*calculate.*total|how.*figure.*total.*cost|how.*work.*out.*otd/i.test(lower)
  ) {
    return { intent: 'feature_request', confidence: 0.9, redirectTo: 'otd_builder' }
  }

  // Definition questions
  if (
    /^(what is|what's|define|explain|tell me about|what does|what are|what do)/i.test(userMessage) ||
    /what is \w+/i.test(userMessage) ||
    /meaning of/i.test(userMessage)
  ) {
    // Check if it's asking for a definition vs decision
    if (
      /should i|can i|do i|would you|recommend|advice|help me decide/i.test(userMessage)
    ) {
      // It's a decision question, not definition
      if (/should i finance|should i buy|should i pay|should i go/i.test(lower)) {
        return { intent: 'decision', confidence: 0.9 }
      }
    }
    return { intent: 'definition', confidence: 0.85 }
  }

  // Decision questions
  if (
    /should i|can i|do i|would you recommend|what should i|help me decide/i.test(userMessage) ||
    /is this.*good|is this.*worth|is this.*deal/i.test(lower)
  ) {
    return { intent: 'decision', confidence: 0.9 }
  }

  // Negotiation questions (specific dealer situations, not general "how to negotiate")
  if (
    /dealer says|they said|non-negotiable|won't budge|refusing|pushing back/i.test(lower)
  ) {
    return { intent: 'negotiation', confidence: 0.85 }
  }

  // Numbers/OTD questions
  if (
    /is.*realistic|is.*reasonable|is.*too high|is.*too low|otd|out.*door|total cost/i.test(lower) ||
    /\$\d+.*realistic|\$\d+.*reasonable/i.test(userMessage)
  ) {
    return { intent: 'numbers', confidence: 0.9 }
  }

  // How-to questions (generic, after feature requests are checked)
  if (/how do|how to|how can|how should|steps to|way to/i.test(userMessage)) {
    return { intent: 'how_to', confidence: 0.85 }
  }

  if (
    /compare.*offers|compare.*deals|multiple.*offers|different.*dealers|which.*better/i.test(lower)
  ) {
    return { intent: 'feature_request', confidence: 0.85, redirectTo: 'comparison' }
  }

  if (
    /pack|library|strategy|advanced.*feature|unlock|specialized/i.test(lower) ||
    /first.*time.*pack|in.*person.*pack/i.test(lower)
  ) {
    return { intent: 'feature_request', confidence: 0.85, redirectTo: 'packs' }
  }

  // App help
  if (/how does.*work|how do i use|what is.*feature|where is/i.test(userMessage)) {
    return { intent: 'app_help', confidence: 0.8 }
  }

  // Model fallback for ambiguous cases
  try {
    const classificationResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Classify the user's question into one of these intents:
- definition: Asking what something means (e.g., "what is APR?")
- decision: Asking for advice on what to do (e.g., "should I finance?")
- how_to: Asking how to do something (e.g., "how do I negotiate?")
- negotiation: Asking what to say to a dealer (e.g., "dealer says fees are non-negotiable")
- numbers: Asking about price/OTD realism (e.g., "is $28k OTD realistic?")
- app_help: Asking how to use the app
- feature_request: Asking to build/calculate OTD, use copilot, compare offers, or access packs (e.g., "how do I build OTD?", "what should I say to dealer?")

If feature_request, also include "redirectTo": "otd_builder" | "copilot" | "comparison" | "packs"

Respond with JSON: {"intent": "...", "confidence": 0.0-1.0, "redirectTo"?: "..."}`,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.3,
      max_tokens: 50,
    })

    const content = classificationResponse.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)
    return {
      intent: parsed.intent || 'decision',
      confidence: parsed.confidence || 0.7,
      redirectTo: parsed.redirectTo,
    }
  } catch (e) {
    // Fallback to decision if classification fails
    return { intent: 'decision', confidence: 0.5 }
  }
}

// Build system prompt based on intent
function buildSystemPrompt(
  intent: IntentClassification['intent'],
  context: any,
  redirectTo?: string
): string {
  const contextBlock = `LISTING CONTEXT:
- Dealer: ${context.dealerName || 'Not specified'}
- State: ${context.state || 'Not specified'}
- Vehicle Price: $${context.vehiclePrice?.toLocaleString() || 'Not specified'}
- Estimated Fair Price: $${context.estimatedFairPrice?.toLocaleString() || 'Not specified'}
- Vehicle Type: ${context.vehicleType || 'Not specified'}
- Trim: ${context.trim || 'Not specified'}
- OTD Confirmed: ${context.hasOTD ? 'Yes' : 'No'}`

  const baseInstructions = `You are the First-Time Buyer Advisor inside a car-buying app.

ADVISOR SCOPE:
- ONLY answer questions related to car pricing, fees, financing, dealer behavior
- If question is educational (APR, OTD, etc.), respond with:
  1. One short explanation (2-3 sentences max)
  2. Two follow-up questions to help apply it to their situation
- NEVER give generic financial advice
- NEVER give investment, retirement, or general money management advice
- Focus ONLY on car buying context

Your role:
- Help first-time car buyers understand what is happening, what is normal, what is risky
- Explain dealer behavior and fees in plain English
- Be conversational, supportive, and educational
- Never assume credit score, debt, goals, etc. If missing and needed, ask.
- Do NOT output pack upsell lines ("unlock pack...") inside the advisor
- Keep tone calm, expert, non-salesy
- Prefer bullets + short paragraphs. Avoid long walls of text.

${contextBlock}

IMPORTANT: Always emphasize OTD (Out-the-Door) price is the only number that matters for comparing deals. Monthly payment can be manipulated by extending loan terms.`

  switch (intent) {
    case 'definition':
      return `${baseInstructions}

For definition questions (what is APR, what is OTD, etc.):
- Provide ONE short explanation (2-3 sentences max)
- Use plain English, avoid jargon
- Connect it to car buying context when relevant
- ALWAYS include TWO follow-up questions to help apply it to their situation
- Example format:
  1. Short explanation
  2. "To help you apply this: [Question 1]"
  3. "[Question 2]"
- Keep it focused on car buying, not general finance
- Do NOT use the "Decision Help" template
- Do NOT give financing recommendations unless specifically asked

Example: "What is APR?" -> Short explanation of APR, then "To help you apply this: What's your target APR range? How does this compare to dealer financing offers?"`

    case 'decision':
      return `${baseInstructions}

For decision questions:
- Ask 2-4 clarifying questions first if key info is missing (credit score range, budget, goals, timeline)
- Then provide a personalized recommendation
- Use bullets for clarity
- Always explain your reasoning
- Never assume information - ask if needed

Example: "Should I finance?" -> Ask about credit score, pre-approval status, goals, then recommend.`

    case 'negotiation':
      return `${baseInstructions}

For negotiation questions:
- Provide HIGH-LEVEL guidance (2-3 sentences) about the tactic or situation
- Explain the dealer tactic if applicable
- Then redirect: "For word-for-word scripts tailored to this situation, use Negotiation Copilot at /copilot/free. It will generate specific responses based on your exact dealer message."
- Do NOT provide detailed scripts or word-for-word responses
- Do NOT replace Negotiation Copilot functionality
- Keep responses brief and redirect clearly

Example: "Dealer says fees are non-negotiable" -> Explain this is a common pressure tactic (1-2 sentences), then redirect to Negotiation Draft Builder for scripts.`

    case 'numbers':
      return `${baseInstructions}

For numbers/OTD questions:
- If asking HOW to build/calculate OTD: Give high-level explanation (2-3 sentences), then redirect: "For detailed OTD calculations with all fees and taxes, use Smart OTD Builder at /calculator."
- If asking about realism/validation: Provide quick sanity check and explain assumptions
- Request missing numbers if needed
- Compare to market averages if helpful
- Use specific numbers from the listing context when available
- Do NOT do detailed step-by-step OTD calculations - redirect to OTD Builder instead`

    case 'how_to':
      return `${baseInstructions}

For how-to questions:
- Provide clear, step-by-step guidance
- Use bullets or numbered lists
- Be specific and actionable
- Reference the listing context when relevant`

    case 'app_help':
      return `${baseInstructions}

For app help questions:
- Explain how to use the feature
- Reference where to find things in the app
- Be concise and helpful`

    case 'feature_request':
      const featureInfo = getFeatureInfo(redirectTo)
      return `${baseInstructions}

CRITICAL GUARDRAIL: The user is asking about a feature that exists elsewhere in DealWise. You MUST redirect them.

Available DealWise Features:
- Negotiation Draft Builder (/copilot/free): Generates word-for-word scripts and responses for dealer messages. Use for specific negotiation scripts.
- Smart OTD Builder (/calculator): Builds detailed out-the-door price calculations with all fees and taxes. Use for precise OTD calculations.
- Offer Comparison (/research?tab=compare): Compares multiple offers side-by-side. Use for comparing different dealer offers.
- Packs (/packs): Specialized negotiation strategies and advanced features. Use for deeper negotiation guidance.

STRICT RULES FOR FEATURE REQUESTS:
1. Give ONLY a brief 1-2 sentence high-level explanation of the concept
2. Then IMMEDIATELY redirect with: "For [specific feature], use [Feature Name] at [route]. It will [brief benefit]."
3. Do NOT provide detailed step-by-step instructions
4. Do NOT provide guides, lists, numbered steps, or comprehensive advice
5. Do NOT generate scripts if asking about Negotiation Draft Builder
6. Do NOT do detailed OTD calculations if asking about OTD Builder
7. Keep your ENTIRE response under 3 sentences total
8. The redirect should be the main focus of your response
9. Do NOT use markdown formatting, bullets, or numbered lists
10. Your response should be plain text, brief, and redirect immediately

${featureInfo ? `\n\nUser is asking about: ${featureInfo.name}\nYou MUST redirect to: ${featureInfo.route}\nBrief description: ${featureInfo.description}\n\nYour response should be:\n1. One sentence explaining the concept\n2. "For [specific feature], use ${featureInfo.name} at ${featureInfo.route}. It will ${featureInfo.description}."` : ''}`

    default:
      return baseInstructions
  }
}

// Get feature information for redirects
function getFeatureInfo(redirectTo?: string): { name: string; route: string; description: string } | null {
  switch (redirectTo) {
    case 'otd_builder':
      return {
        name: 'Smart OTD Builder',
        route: '/calculator',
        description: 'builds detailed out-the-door price calculations with all fees, taxes, and add-ons',
      }
    case 'copilot':
      return {
        name: 'Negotiation Draft Builder',
        route: '/copilot/free',
        description: 'generates word-for-word scripts and responses tailored to your specific dealer messages',
      }
    case 'comparison':
      return {
        name: 'Offer Comparison',
        route: '/research?tab=compare',
        description: 'compares multiple offers side-by-side to help you find the best deal',
      }
    case 'packs':
      return {
        name: 'Packs / Library',
        route: '/packs',
        description: 'unlocks specialized negotiation strategies and advanced features for deeper guidance',
      }
    default:
      return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, context, mode } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid messages array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const userMessage = messages[messages.length - 1]
    if (userMessage.role !== 'user') {
      return new Response(
        JSON.stringify({ error: 'Last message must be from user' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Classify intent
    const intent = await classifyIntent(userMessage.content, messages)

    // Build system prompt based on intent
    const systemPrompt = buildSystemPrompt(intent.intent, context || {}, intent.redirectTo)

    // Prepare messages for OpenAI
    const openaiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10), // Keep last 10 messages for context
    ]

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: openaiMessages,
      temperature: 0.7,
      stream: true,
    })

    // Create a ReadableStream for SSE
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              const data = JSON.stringify({ content })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }
          // Send final done signal
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
          controller.close()
        } catch (error: any) {
          console.error('Streaming error:', error)
          const errorData = JSON.stringify({ error: error.message || 'Stream error' })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('Advisor chat error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

