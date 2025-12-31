// In-Person Negotiation Pack Copilot Prompts

export function buildInPersonCopilotSystemPrompt(
  buyerType: string,
  stage: string,
  tone: string,
  goal: string,
  vehiclePrice: number,
  desiredOTD: number,
  state?: string,
  taxRate?: number,
  inPersonSituation?: string,
  detectedTactics?: string[]
): string {
  let situationGuidance = ''
  
  // Situation-specific guidance
  if (inPersonSituation) {
    if (inPersonSituation.includes('monthly payment')) {
      situationGuidance = `SITUATION-SPECIFIC: Monthly payment question detected.
- "sayThis" MUST refuse monthly payment framing and redirect to OTD
- Example: "I'm focused on the total out-the-door price, not monthly payments. What's your OTD?"
- "ifPushback" should reinforce OTD focus if they persist with monthly talk
- "doNotSay" must include "What's the monthly payment?" or similar`
    } else if (inPersonSituation.includes('mandatory add-ons') || inPersonSituation.includes('add-ons')) {
      situationGuidance = `SITUATION-SPECIFIC: Mandatory add-ons detected.
- "sayThis" MUST request add-on removal or itemized breakdown
- Example: "I need to see which add-ons are removable. Can you show me the breakdown?"
- "ifPushback" should offer to adjust sale price to hit OTD if add-ons stay
- Include specific add-on removal language`
    } else if (inPersonSituation.includes('fees are non-negotiable') || inPersonSituation.includes('fees non-negotiable')) {
      situationGuidance = `SITUATION-SPECIFIC: Fees non-negotiable claim detected.
- "sayThis" MUST request itemized OTD breakdown
- "ifPushback" should offer to adjust sale price to hit target OTD: "If fees are fixed, let's adjust the sale price to hit $${desiredOTD} OTD"
- Be firm that OTD is the only number that matters`
    } else if (inPersonSituation.includes('manager')) {
      situationGuidance = `SITUATION-SPECIFIC: Manager escalation detected.
- "ifManager" MUST be firm and closing-oriented
- Example: "I need $${desiredOTD} OTD. Can you make that happen?"
- "sayThis" should prepare for manager escalation
- Be direct, no small talk`
    } else if (inPersonSituation.includes('sign today') || inPersonSituation.includes('sign today')) {
      situationGuidance = `SITUATION-SPECIFIC: Sign today pressure detected.
- "sayThis" MUST include: "I sign when the OTD sheet matches $${desiredOTD}"
- "ifPushback" should reinforce: "Show me the OTD breakdown first"
- "closingLine" should be: "I'm ready to sign when you show me $${desiredOTD} OTD in writing"`
    } else if (inPersonSituation.includes('someone else is interested') || inPersonSituation.includes('urgency')) {
      situationGuidance = `SITUATION-SPECIFIC: Urgency/scarcity pressure detected.
- "sayThis" should acknowledge but stay firm on OTD
- Example: "I understand. I still need $${desiredOTD} OTD to move forward"
- "redFlags" must include "Pressure to decide without OTD breakdown"`
    } else if (inPersonSituation.includes('counter OTD')) {
      situationGuidance = `SITUATION-SPECIFIC: Counter OTD received.
- "sayThis" should acknowledge and restate target: "I appreciate that. I'm still at $${desiredOTD} OTD"
- "ladder.ask" should be the counter they offered
- "ladder.agree" should be your target OTD
- "ladder.walk" should be your walk-away number`
    } else if (inPersonSituation.includes('Trade-in lowball')) {
      situationGuidance = `SITUATION-SPECIFIC: Trade-in lowball detected.
- "sayThis" should separate trade-in from purchase: "Let's handle the trade-in separately. What's the OTD on the car?"
- "ifPushback" should offer to sell trade-in elsewhere if they won't negotiate`
    } else if (inPersonSituation.includes('close if they hit my OTD')) {
      situationGuidance = `SITUATION-SPECIFIC: Ready to close at target OTD.
- "sayThis" should be direct closing: "If you can do $${desiredOTD} OTD, I'm ready to move forward"
- "closingLine" should be firm: "I'm ready to sign at $${desiredOTD} OTD"
- "nextMove" should be: "Wait for their response. If they agree, request written OTD breakdown"`
    }
  }
  
  // Tactic-specific guidance
  let tacticGuidance = ''
  if (detectedTactics && detectedTactics.length > 0) {
    tacticGuidance = `\nDETECTED DEALER TACTICS: ${detectedTactics.join(', ')}\n`
    if (detectedTactics.includes('payment_anchoring')) {
      tacticGuidance += `- Payment anchoring detected: Refuse monthly payment talk, redirect to OTD\n`
    }
    if (detectedTactics.includes('urgency')) {
      tacticGuidance += `- Urgency pressure detected: Acknowledge but stay firm on OTD\n`
    }
    if (detectedTactics.includes('add_on_push')) {
      tacticGuidance += `- Add-on push detected: Request breakdown, offer to adjust sale price\n`
    }
    if (detectedTactics.includes('escalation')) {
      tacticGuidance += `- Manager escalation detected: Be firm and closing-oriented\n`
    }
  }
  
  return `You are an expert in-person car buying negotiation coach. Generate SHORT, SPOKEN talk tracks for face-to-face dealership negotiations.

CRITICAL IN-PERSON RULES:
1. ALL responses must be 1-2 sentences MAX - designed to be spoken out loud
2. Use spoken-language tone (natural, conversational, not email-style)
3. End with silence - let the dealer respond, don't over-explain
4. Always focus on OTD (Out-The-Door) price
5. Be firm, calm, and OTD-focused - no hedging or soft language
6. Generate concise, repeatable phrases the user can say immediately
7. Avoid long explanations in the main output
8. Output must be SITUATION-SPECIFIC - directly address the selected situation

BUYER TYPE: ${buyerType}
STAGE: ${stage} (IN-PERSON MODE)
TONE: ${tone}
GOAL: ${goal}
VEHICLE PRICE: $${vehiclePrice}
DESIRED OTD: $${desiredOTD}
${state ? `STATE: ${state}${taxRate ? ` (Tax rate: ~${taxRate}%)` : ''}` : ''}
${inPersonSituation ? `SITUATION: ${inPersonSituation}` : ''}
${situationGuidance}
${tacticGuidance}

Your response MUST be a JSON object with this EXACT structure. ALL fields are REQUIRED:
{
  "sayThis": "<Primary talk track, 1-2 sentences, spoken language, <= 100 chars. MUST directly address the situation>",
  "ifPushback": "<Response if dealer pushes back, 1-2 sentences, <= 100 chars>",
  "ifManager": "<Response if manager joins, 1-2 sentences, <= 100 chars. Must be firm and closing-oriented>",
  "stopSignal": "<What to do next physically, e.g., 'Repeat $${desiredOTD} OTD and stay silent', <= 80 chars>",
  "closingLine": "<One firm closing statement, no hedging, <= 100 chars>",
  "nextMove": "<What to do physically next (stand up, wait, request breakdown, etc.), <= 120 chars>",
  "ladder": {
    "ask": "<First number to ask for (usually their counter or a middle ground), <= 80 chars>",
    "agree": "<Number you'll agree to (your target OTD: $${desiredOTD}), <= 80 chars>",
    "walk": "<Number where you walk away (usually target + $500-1000), <= 80 chars>"
  },
  "redFlags": [
    "<Red flag 1, max 60 chars>",
    "<Red flag 2, max 60 chars>",
    "<Red flag 3, max 60 chars>"
  ],
  "doNotSay": [
    "<Common mistake 1, max 60 chars>",
    "<Common mistake 2, max 60 chars>"
  ],
  "assumptions": {
    "taxBaseRate": ${taxRate || 6.5},
    "feeAssumptions": "Doc fee: $150-500, Title/Registration: $50-200",
    "disclaimer": "Tax and fee rules vary by state and locality. Always verify final numbers with the dealer or DMV."
  }
}

CRITICAL: You MUST return ALL fields. Missing fields will cause an error. The output MUST be situation-specific, not generic.`
}

export function buildInPersonCopilotUserPrompt(
  inPersonSituation?: string,
  contextText?: string,
  desiredOTD?: number,
  detectedTactics?: string[]
): string {
  let prompt = `IN-PERSON NEGOTIATION MODE - SITUATION-SPECIFIC OUTPUT REQUIRED:\n`
  
  if (inPersonSituation) {
    prompt += `PRIMARY SITUATION: ${inPersonSituation}\n`
    prompt += `Your talk tracks MUST directly address this situation. Do NOT give generic responses.\n\n`
  }
  
  if (contextText) {
    prompt += `DEALER SAID: "${contextText}"\n`
    if (detectedTactics && detectedTactics.length > 0) {
      prompt += `Detected tactics: ${detectedTactics.join(', ')}\n`
    }
    prompt += `Respond directly to what they said, using situation-specific language.\n\n`
  }
  
  prompt += `REQUIRED OUTPUT STRUCTURE:
- "sayThis": Primary response RIGHT NOW (1-2 sentences, spoken, <= 100 chars). MUST address the situation.
- "ifPushback": If they resist (1-2 sentences, spoken, <= 100 chars)
- "ifManager": If manager joins (1-2 sentences, firm, closing-oriented, <= 100 chars)
- "stopSignal": Physical action to take next (e.g., "Repeat $${desiredOTD || '[OTD]'} OTD and stay silent", <= 80 chars)
- "closingLine": ONE firm closing statement (no hedging, <= 100 chars)
- "nextMove": What to do physically next (stand, wait, request breakdown, etc., <= 120 chars)
- "ladder": Your 3-number negotiation ladder:
  - "ask": First number to ask (their counter or middle ground, <= 80 chars)
  - "agree": Your target OTD ($${desiredOTD || '[OTD]'}, <= 80 chars)
  - "walk": Walk-away number (target + $500-1000, <= 80 chars)
- "redFlags": Exactly 3 things to watch for (max 60 chars each)
- "doNotSay": Exactly 2 common mistakes to avoid (max 60 chars each)

CRITICAL REQUIREMENTS:
- ALL fields are REQUIRED. Missing fields = error.
- Output MUST be situation-specific, not generic.
- Talk tracks must directly address the selected situation.
- Use spoken language, 1-2 sentences max per field.
- Return ONLY valid JSON.`

  return prompt
}

/**
 * Lightweight tactic classifier for dealer messages
 * Returns array of detected tactics
 */
export function classifyDealerTactics(contextText: string): string[] {
  if (!contextText) return []
  
  const text = contextText.toLowerCase()
  const tactics: string[] = []
  
  // Payment anchoring
  if (text.includes('monthly') || text.includes('payment') || text.includes('per month')) {
    tactics.push('payment_anchoring')
  }
  
  // Urgency
  if (text.includes('today only') || text.includes('other buyer') || text.includes('someone else') || 
      text.includes('limited time') || text.includes('expires') || text.includes('hurry')) {
    tactics.push('urgency')
  }
  
  // Add-on push
  if (text.includes('add-on') || text.includes('protection') || text.includes('nitrogen') || 
      text.includes('warranty') || text.includes('coating') || text.includes('package')) {
    tactics.push('add_on_push')
  }
  
  // Escalation
  if (text.includes('manager') || text.includes('supervisor') || text.includes('let me check with')) {
    tactics.push('escalation')
  }
  
  return tactics
}

