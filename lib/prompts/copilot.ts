// AI Prompts for Negotiation Co-Pilot

import type { CreateSessionRequest, PackConfig } from '@/lib/types/copilot'

export function generateInitialStrategy(
  sessionData: CreateSessionRequest,
  packConfig: PackConfig
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert car buying negotiation coach. Your job is to help users negotiate the best possible deal on a car purchase.

CRITICAL RULES:
1. Provide educational guidance, not financial or legal advice
2. Never guarantee outcomes - frame suggestions as strategies
3. Be specific and actionable
4. Consider the user's pack type (${packConfig.name}) and tailor advice accordingly
5. Generate clear, copy-ready messages the user can send
6. For in-person negotiations, provide short talk tracks (1-2 sentences max per point)

Your response must be a JSON object with this exact structure:
{
  "strategy": {
    "summary": "<2-3 sentence overview of the negotiation approach>",
    "key_points": ["<point 1>", "<point 2>", "<point 3>"],
    "next_steps": ["<step 1>", "<step 2>", "<step 3>"],
    "checklist": ["<item 1>", "<item 2>", "<item 3>"]
  },
  "script": "<the complete initial message ready to send>",
  "talk_track": "<if in-person, short talking points separated by newlines>"
}`

  let userPrompt = `Generate an initial negotiation strategy and script for this situation:

Pack Type: ${packConfig.name}
${packConfig.description}

Car Information:
${sessionData.car_make ? `Make: ${sessionData.car_make}` : ''}
${sessionData.car_model ? `Model: ${sessionData.car_model}` : ''}
${sessionData.car_year ? `Year: ${sessionData.car_year}` : ''}
${sessionData.asking_price ? `Asking Price: $${sessionData.asking_price}` : ''}
${sessionData.listing_url ? `Listing: ${sessionData.listing_url}` : ''}

User Preferences:
- Payment Method: ${sessionData.payment_method}
${sessionData.max_otd_budget ? `- Max Budget: $${sessionData.max_otd_budget}` : ''}
${sessionData.timeline ? `- Timeline: ${sessionData.timeline}` : ''}
${sessionData.has_trade_in ? `- Has Trade-In: Yes` : '- Has Trade-In: No'}
${sessionData.communication_method ? `- Communication: ${sessionData.communication_method}` : ''}
${sessionData.tone_preference ? `- Tone: ${sessionData.tone_preference}` : ''}
${sessionData.risk_tolerance ? `- Risk Tolerance: ${sessionData.risk_tolerance}` : ''}

${sessionData.payment_method === 'finance' ? `
Financing Details:
${sessionData.max_monthly_payment ? `- Max Monthly Payment: $${sessionData.max_monthly_payment}` : ''}
${sessionData.down_payment ? `- Down Payment: $${sessionData.down_payment}` : ''}
${sessionData.pre_approved ? `- Pre-Approved: Yes${sessionData.pre_approval_rate ? ` (${sessionData.pre_approval_rate}% APR)` : ''}` : '- Pre-Approved: No'}
` : ''}

Generate a personalized strategy and initial message. Make it specific to their situation and pack type.

Return ONLY valid JSON, no other text.`

  return { systemPrompt, userPrompt }
}

export function analyzeDealerMessage(
  sessionData: any,
  messageHistory: any[],
  dealerMessage: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert car buying negotiation coach analyzing dealer messages in real-time.

Your job is to:
1. Explain what tactic the dealer is using (in plain English)
2. Provide a recommended response (copy-ready)
3. Suggest a counter price range if applicable (with rationale)
4. List next questions to ask
5. Provide checklist items for the user

CRITICAL RULES:
- Never guarantee outcomes
- Frame price suggestions as guidance, not recommendations
- Be educational about dealer tactics
- Keep responses concise and actionable
- Consider the full conversation context

Your response must be a JSON object with this exact structure:
{
  "tactic_explanation": "<plain English explanation of what the dealer is doing and why>",
  "recommended_response": "<complete message the user can copy and send>",
  "suggested_counter_range": {
    "min": <number>,
    "max": <number>,
    "rationale": "<why this range makes sense>"
  },
  "next_questions": ["<question 1>", "<question 2>", "<question 3>"],
  "checklist_items": ["<item 1>", "<item 2>", "<item 3>"]
}`

  const historyContext = messageHistory
    .slice(-5)
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n')

  const userPrompt = `Analyze this dealer message and provide guidance:

Session Context:
- Pack: ${sessionData.pack_type}
- Payment: ${sessionData.payment_method}
- Max Budget: ${sessionData.max_otd_budget ? `$${sessionData.max_otd_budget}` : 'Not specified'}
- Communication: ${sessionData.communication_method}

Recent Conversation:
${historyContext || 'This is the first message from the dealer.'}

Dealer's Message:
"${dealerMessage}"

Provide your analysis and recommendations. Be specific and actionable.

Return ONLY valid JSON, no other text.`

  return { systemPrompt, userPrompt }
}


