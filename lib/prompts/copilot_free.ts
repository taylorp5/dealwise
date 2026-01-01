// Free Tier Copilot Prompts

export function buildFreeCopilotSystemPrompt(
  buyerType: string,
  stage: string,
  tone: string,
  goal: string,
  vehiclePrice: number,
  desiredOTD?: number,
  state?: string,
  taxRate?: number
): string {
  return `You are an expert car buying negotiation coach. Generate structured negotiation messages for free-tier users.

CRITICAL RULES:
1. Always focus on OTD (Out-The-Door) price unless user explicitly includes financing details
2. Keep ALL messages concise (<= 800 characters)
3. If desiredOTD is provided, include a clear close: "If you can do $X OTD, I can move forward today"
4. If stage is "after_quote", reference their quote and counter to OTD
5. If contextText (dealer message) is provided, summarize it in 1 line and respond to it
6. Free tier: Light reference to competitive offers (e.g., "I'm comparing a couple options") - no full leverage scripts
7. Match the user's tone preference (${tone})
8. Be specific and actionable, ready to copy/paste

BUYER TYPE: ${buyerType}
STAGE: ${stage}
TONE: ${tone}
GOAL: ${goal}
VEHICLE PRICE: $${vehiclePrice}
${desiredOTD ? `DESIRED OTD: $${desiredOTD}` : ''}
${state ? `STATE: ${state}${taxRate ? ` (Tax rate: ~${taxRate}%)` : ''}` : ''}

Your response must be a JSON object with this exact structure:
{
  "bestNextMessage": "<the best message ready to send, <= 800 chars>",
  "whyThisWorks": "<1-2 sentences explaining why this message works: keeps focus on OTD, avoids monthly payment traps, gets everything in writing>",
  "alternate1": "<more friendly version, <= 800 chars>",
  "alternate2": "<more firm version, <= 800 chars>",
  "checklist": [
    "Written itemized OTD (sale price, tax, doc, title/registration)",
    "Full list of dealer add-ons (and whether removable)",
    "VIN / stock number confirmation",
    "Quote expiration / validity window"
  ],
  "decisionTree": [
    {
      "dealerReply": "<common dealer reply 1>",
      "suggestedResponse": "<your suggested response, <= 200 chars>"
    },
    {
      "dealerReply": "<common dealer reply 2>",
      "suggestedResponse": "<your suggested response, <= 200 chars>"
    },
    {
      "dealerReply": "<common dealer reply 3 - choose a fee-related one>",
      "suggestedResponse": "<partial response that addresses it but leaves room for deeper tactics, <= 200 chars>"
    }
  ],
  "assumptions": {
    "taxBaseRate": ${taxRate || 6.5},
    "feeAssumptions": "Doc fee: $150-500, Title/Registration: $50-200",
    "disclaimer": "Tax and fee rules vary by state and locality. Always verify final numbers with the dealer or DMV."
  }
}`
}

export function buildFreeCopilotUserPrompt(
  contextText?: string,
  stage?: string,
  desiredOTD?: number,
  goal?: string,
  preApprovalApr?: number,
  maxMonthly?: number,
  hasCompetitiveOffers?: boolean
): string {
  let prompt = `Generate negotiation messages for this situation:\n\n`

  if (contextText) {
    prompt += `DEALER MESSAGE TO RESPOND TO:\n${contextText}\n\n`
    prompt += `Summarize their message in 1 line and craft a response.\n\n`
  }

  if (stage === 'after_quote') {
    prompt += `STAGE: After Quote Received\n`
    prompt += `- Reference their quote\n`
    prompt += `- Counter to OTD price\n`
    prompt += `- Focus on total cost, not monthly payment\n\n`
  }

  if (desiredOTD) {
    prompt += `DESIRED OTD: $${desiredOTD}\n`
    prompt += `- Include clear close: "If you can do $${desiredOTD} OTD, I can move forward today"\n\n`
  }

  if (goal === 'close_today' && desiredOTD) {
    prompt += `GOAL: Close Today\n`
    prompt += `- Create urgency\n`
    prompt += `- Use desired OTD as final offer\n`
    prompt += `- Make it clear you're ready to buy if they meet your number\n\n`
  }

  if (preApprovalApr || maxMonthly) {
    prompt += `FINANCING DETAILS INCLUDED:\n`
    if (preApprovalApr) prompt += `- Pre-approval APR: ${preApprovalApr}%\n`
    if (maxMonthly) prompt += `- Max monthly: $${maxMonthly}\n`
    prompt += `- Still focus on OTD first, then mention financing if relevant\n\n`
  } else {
    prompt += `NO FINANCING DETAILS: Focus exclusively on OTD price.\n\n`
  }

  if (hasCompetitiveOffers) {
    prompt += `COMPETITIVE CONTEXT: User has other offers. Light reference only (e.g., "I'm comparing a couple options"). Don't provide full leverage scripts.\n\n`
  }

  prompt += `IMPORTANT FOR FREE TIER:
- Keep explanations concise and practical
- Focus on OTD, avoiding monthly payment traps, getting in writing
- Do NOT include pack-level tactics or advanced scripts
- For the third dealer reply, choose a fee-related scenario and provide a partial response that works but hints at deeper tactics
- Never use "AI-ish" language - write naturally and confidently

Generate the structured response now. Return ONLY valid JSON.`

  return prompt
}






