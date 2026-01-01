// In-Person Negotiation Live Talk Tracks Prompt
// This prompt is specifically for generating structured talk tracks based on user inputs

export function buildInPersonLiveSystemPrompt(): string {
  return `You are a real-time dealership negotiation coach providing tactical, spoken-language talk tracks during in-person negotiations. You are sitting next to the user during the negotiation.

CRITICAL RULES:
1. ALL talk tracks must be 1-2 sentences MAX - designed to be spoken out loud
2. Use spoken-language tone (natural, conversational, not email-style)
3. End with silence - let the dealer respond, don't over-explain
4. Always focus on OTD (Out-The-Door) price - NEVER discuss monthly payments
5. Be firm, calm, and OTD-focused - no hedging or soft language
6. Generate concise, repeatable phrases the user can say immediately
7. NO email framing, NO upsell copy, NO "Best Next Message" language
8. You MUST incorporate the user's specific numbers (targetOTD, walkAwayOTD) explicitly in your talk tracks
9. You MUST tailor responses to the selected situation
10. If the situation involves monthly payments, you MUST refuse payment discussion and redirect to OTD
11. If the situation involves add-ons, you MUST address add-ons specifically
12. If the situation involves manager, you MUST provide manager-specific response

Your response MUST be a JSON object with this EXACT structure. ALL fields are REQUIRED and MUST be non-empty strings (or arrays for redFlags/doNotSay):
{
  "sayThis": "<Primary talk track, 1-2 sentences, spoken language, MUST include targetOTD number explicitly, <= 150 chars>",
  "ifPushback": "<Response if dealer pushes back, 1-2 sentences, MUST address the specific situation, <= 150 chars>",
  "ifManager": "<Response if manager joins, 1-2 sentences, firm and closing-oriented, MUST include targetOTD, <= 150 chars>",
  "stopSignal": "<What to do next physically, e.g., 'Repeat $X OTD and stay silent', <= 100 chars>",
  "closingLine": "<Authoritative closing statement, MUST include targetOTD explicitly, no soft language, <= 150 chars>",
  "nextMove": "<ONE sentence instruction, what user should do next immediately, <= 120 chars>",
  "ladderSummary": "<Brief summary of ASK/AGREE/WALK numbers, <= 100 chars>",
  "redFlags": ["<Max 3 red flags, each <= 80 chars>"],
  "doNotSay": ["<Max 2 things to avoid saying, each <= 80 chars>"]
}

CRITICAL: You MUST return ALL required fields. Missing or empty fields will cause an error.`
}

export function buildInPersonLiveUserPrompt(
  situation: string,
  dealerSaidText: string | undefined,
  vehiclePrice: number,
  targetOTD: number,
  walkAwayOTD: number,
  state: string,
  currentDealerOTD: number | undefined,
  ladder: { ask: number; agree: number; walk: number; locked: boolean },
  timelineTail: Array<{ ts: number; who: string; label: string; details?: string }> | undefined
): string {
  const gap = currentDealerOTD && targetOTD > 0 ? currentDealerOTD - targetOTD : null
  
  let prompt = `SITUATION: ${situation || 'Standard negotiation'}

USER'S NUMBERS:
- Target OTD: $${targetOTD.toLocaleString()}
- Walk-Away Ceiling: $${walkAwayOTD.toLocaleString()}
- Negotiation Ladder:
  * ASK: $${ladder.ask.toLocaleString()}
  * AGREE: $${ladder.agree.toLocaleString()}
  * WALK: $${ladder.walk.toLocaleString()}
  * LOCKED: ${ladder.locked ? 'YES' : 'NO'}

${vehiclePrice > 0 ? `- Vehicle Price: $${vehiclePrice.toLocaleString()}` : ''}
- State: ${state}

${currentDealerOTD ? `- Dealer Current OTD: $${currentDealerOTD.toLocaleString()}` : '- Dealer Current OTD: Not provided yet'}
${gap !== null ? `- GAP: $${gap >= 0 ? '+' : ''}${gap.toLocaleString()} ${gap <= 0 ? '(DEALER BELOW TARGET - GOOD)' : gap <= 500 ? '(CLOSE - NEGOTIABLE)' : '(LARGE GAP - NEEDS WORK)'}` : '- GAP: Unknown'}

${dealerSaidText ? `DEALER SAID: "${dealerSaidText}"` : ''}

${timelineTail && timelineTail.length > 0 ? `RECENT TIMELINE:\n${timelineTail.map(e => `- ${e.label}`).join('\n')}` : ''}

INSTRUCTIONS:
1. Generate talk tracks that EXPLICITLY reference the target OTD ($${targetOTD.toLocaleString()}) in sayThis and closingLine
2. Tailor ALL responses to the selected situation: "${situation}"
3. If situation is about monthly payments: sayThis MUST refuse payment discussion and redirect to OTD
4. If situation is about add-ons: sayThis MUST address add-ons specifically
5. If situation is about manager: ifManager MUST be firm and closing-oriented
6. ifPushback MUST address the likely dealer pushback for this specific situation
7. nextMove MUST tell user what to do immediately based on the situation
8. redFlags MUST be specific to this situation (max 3)
9. doNotSay MUST be specific to this situation (max 2)

Return ONLY valid JSON with ALL required fields.`

  return prompt
}






