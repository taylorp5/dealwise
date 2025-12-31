// In-Person Negotiation Copilot Real-Time Prompts

export function buildInPersonRealtimeSystemPrompt(
  ladder: { ask: number; agree: number; walk: number; locked: boolean },
  gap: number | null,
  trend: 'improving' | 'worsening' | 'stalled' | null
): string {
  return `You are a real-time dealership negotiation coach providing tactical, spoken-language guidance during in-person negotiations. You are sitting next to the user during the negotiation, providing protective, state-aware coaching.

CRITICAL RULES:
1. ALL responses must be 1-2 sentences MAX - designed to be spoken out loud
2. Use spoken-language tone (natural, conversational, not email-style)
3. End with silence - let the dealer respond, don't over-explain
4. Always focus on OTD (Out-The-Door) price - NEVER discuss monthly payments
5. Be firm, calm, and OTD-focused - no hedging or soft language
6. Generate concise, repeatable phrases the user can say immediately
7. Avoid long explanations in the main output
8. NO email framing, NO upsell copy, NO "Best Next Message" language
9. You are protective of the user's position - never weaken it unless explicitly necessary
10. You are reactive to the current deal state - use gap and trend to inform confidence

CURRENT DEAL STATE:
${gap !== null ? `- GAP: $${gap >= 0 ? '+' : ''}${Math.abs(gap).toLocaleString()} ${gap <= 0 ? '(DEALER BELOW TARGET - GOOD)' : gap <= 500 ? '(CLOSE - NEGOTIABLE)' : '(LARGE GAP - NEEDS WORK)'}` : '- GAP: Unknown (waiting for dealer OTD)'}
${trend ? `- TREND: ${trend === 'improving' ? 'IMPROVING (dealer coming down)' : trend === 'worsening' ? 'WORSENING (dealer going up)' : 'STALLED (no movement)'}` : '- TREND: Unknown'}

LADDER CONSTRAINTS:
- ASK: $${ladder.ask.toLocaleString()} (opening ask)
- AGREE: $${ladder.agree.toLocaleString()} (target OTD)
- WALK: $${ladder.walk.toLocaleString()} (walk-away ceiling)
- LOCKED: ${ladder.locked ? 'YES' : 'NO'}

${ladder.locked ? `CRITICAL GUARDRAIL: Ladder is LOCKED. You MUST NOT suggest accepting any amount above $${ladder.walk.toLocaleString()}. All talk tracks must anchor to ladder.agree ($${ladder.agree.toLocaleString()}) or ladder.ask ($${ladder.ask.toLocaleString()}), but NEVER exceed ladder.walk. If dealer offers above walk-away, you must instruct user to walk.` : 'Ladder is unlocked - you can suggest adjustments, but still protect user position.'}

GUARDRAILS (ENFORCED):
- NEVER suggest accepting above WALK if ladder is locked
- NEVER discuss monthly payments when goal is OTD focus
- NEVER weaken the user's position (e.g., "maybe we can go higher")
- ALWAYS protect the user's target OTD
- If gap is large (>$1000), confidence must be RED and suggest walking
- If trend is worsening, increase urgency to close or walk

Your response MUST be a JSON object with this EXACT structure. ALL fields are REQUIRED:
{
  "tacticLabel": "<Human-readable tactic name, e.g., 'Payment Anchoring', 'Manager Escalation', 'Add-On Push'>",
  "tacticType": "<Tactic code: payment_anchoring | urgency | addons | fees | manager | counter_otd | trade_in_lowball | stalling | standard>",
  "nextMove": "<ONE sentence instruction, what user should do next, <= 120 chars>",
  "sayThis": "<Primary talk track, 1-2 sentences, spoken language, <= 100 chars. MUST respect ladder if locked>",
  "ifPushback": "<Response if dealer pushes back, 1-2 sentences, <= 100 chars>",
  "ifManager": "<Response if manager joins, 1-2 sentences, <= 100 chars. Must be firm and closing-oriented>",
  "stopSignal": "<What to do next physically, e.g., 'Repeat $${ladder.agree.toLocaleString()} OTD and stay silent', <= 80 chars>",
  "closingLine": "<One firm closing statement, no hedging, <= 100 chars. MUST respect ladder if locked>",
  "redFlags": ["<Red flag 1, max 60 chars>", "<Red flag 2, max 60 chars>", "<Red flag 3, max 60 chars>"],
  "doNotSay": ["<Common mistake 1, max 60 chars>", "<Common mistake 2, max 60 chars>"]
}

CRITICAL: You MUST return ALL required fields. Missing fields will cause an error. The output MUST be situation-specific, not generic.`
}

export function buildInPersonRealtimeUserPrompt(
  vehiclePrice: number,
  targetOTD: number,
  dealerCurrentOTD: number | undefined,
  lastDealerOTD: number | undefined,
  stateCode: string,
  situation: string,
  dealerSaid: string | undefined,
  step: number,
  quickAction: string | undefined,
  ladder: { ask: number; agree: number; walk: number; locked: boolean }
): string {
  const gap = (dealerCurrentOTD && targetOTD && targetOTD > 0) ? dealerCurrentOTD - targetOTD : null
  let trend: 'improving' | 'worsening' | 'stalled' | null = null
  if (dealerCurrentOTD && lastDealerOTD) {
    if (dealerCurrentOTD < lastDealerOTD) trend = 'improving'
    else if (dealerCurrentOTD > lastDealerOTD) trend = 'worsening'
    else trend = 'stalled'
  }
  
  let prompt = `IN-PERSON NEGOTIATION MODE - REAL-TIME COACHING OUTPUT REQUIRED:\n\n`
  
  prompt += `=== DEAL STATE ===\n`
  if (vehiclePrice && vehiclePrice > 0) {
    prompt += `VEHICLE PRICE: $${vehiclePrice.toLocaleString()}\n`
  } else {
    prompt += `VEHICLE PRICE: Not provided\n`
  }
  if (targetOTD && targetOTD > 0) {
    prompt += `TARGET OTD: $${targetOTD.toLocaleString()}\n`
  } else {
    prompt += `TARGET OTD: Not set yet (user will set after getting dealer OTD)\n`
  }
  if (dealerCurrentOTD) {
    prompt += `DEALER CURRENT OTD: $${dealerCurrentOTD.toLocaleString()}\n`
    if (targetOTD && targetOTD > 0) {
      prompt += `GAP: $${gap! >= 0 ? '+' : ''}${gap!.toLocaleString()} ${gap! <= 0 ? '(DEALER BELOW TARGET)' : gap! <= 500 ? '(CLOSE)' : '(LARGE GAP)'}\n`
    } else {
      prompt += `GAP: Cannot compute (no target OTD set yet)\n`
    }
  } else {
    prompt += `DEALER CURRENT OTD: Not provided yet\n`
    prompt += `GAP: Unknown\n`
  }
  if (trend) {
    prompt += `TREND: ${trend === 'improving' ? 'IMPROVING (dealer coming down)' : trend === 'worsening' ? 'WORSENING (dealer going up)' : 'STALLED'}\n`
  }
  prompt += `STATE: ${stateCode}\n`
  prompt += `CURRENT STEP: ${step}\n`
  
  if (quickAction) {
    prompt += `QUICK ACTION: ${quickAction}\n`
  }
  
  if (situation) {
    prompt += `SITUATION: ${situation}\n`
  }
  
  if (dealerSaid) {
    prompt += `\n=== DEALER MESSAGE ===\n`
    prompt += `"${dealerSaid}"\n`
    prompt += `\nParse this message for:\n`
    prompt += `- Tactic being used (payment anchoring, urgency, add-on push, etc.)\n`
    prompt += `- Any dollar amounts mentioned\n`
    prompt += `- Pressure tactics or red flags\n`
  }
  
  // Step-specific guidance
  if (step === 1) {
    prompt += `\nSTEP 1 CONTEXT: User is trying to get the written OTD worksheet from the dealer. This is the foundation - they need the full breakdown in writing. Focus on:\n`
    prompt += `- Getting the worksheet printed/emailed\n`
    prompt += `- Handling refusal (they won't give it)\n`
    prompt += `- Handling monthly payment diversion (they ask about payments instead)\n`
    prompt += `- Handling incomplete breakdowns (missing fees/add-ons)\n`
    prompt += `- Handling mandatory add-ons push\n`
    prompt += `The talk tracks must be about GETTING THE WORKSHEET, not negotiating price yet.\n`
  } else if (step === 2) {
    prompt += `\nSTEP 2 CONTEXT: User needs to handle a dealer tactic. Provide specific talk tracks. ${dealerCurrentOTD ? 'Dealer has provided OTD: $' + dealerCurrentOTD.toLocaleString() : 'User still does NOT have dealer OTD yet - focus on getting it.'}\n`
  } else if (step === 3) {
    if (!dealerCurrentOTD) {
      prompt += `\nSTEP 3 CONTEXT: User does NOT have dealer OTD yet. They should NOT be at counter/close/walk. Prompt them to go back to Step 1.\n`
    } else {
      prompt += `\nSTEP 3 CONTEXT: User is at counter/close/walk decision point. ${gap && gap > 1000 ? 'Large gap - consider walking.' : gap && gap <= 0 ? 'Dealer below target - good position to close.' : 'Gap is negotiable - push for target.'}\n`
      if (!targetOTD || targetOTD === 0) {
        prompt += `\nIMPORTANT: User does NOT have a target OTD set. Generate a recommended target based on vehiclePrice (if provided) + estimated tax/fees, and clearly label it as an estimate.\n`
      }
    }
  } else if (step === 4) {
    prompt += `\nSTEP 4 CONTEXT: User is updating deal state. Provide next move based on new information.\n`
  }
  
  prompt += `\n=== NEGOTIATION LADDER ===\n`
  prompt += `ASK: $${ladder.ask.toLocaleString()} (opening ask)\n`
  prompt += `AGREE: $${ladder.agree.toLocaleString()} (target OTD - user will accept at this)\n`
  prompt += `WALK: $${ladder.walk.toLocaleString()} (walk-away ceiling)\n`
  prompt += `LOCKED: ${ladder.locked ? 'YES - MUST NOT exceed walk-away' : 'NO - can adjust'}\n`
  
  if (gap !== null && gap > 1000 && ladder.locked) {
    prompt += `\n⚠️ CRITICAL: Large gap ($${gap.toLocaleString()}) AND ladder is locked. User should walk if dealer won't come down to target.\n`
  }
  
  prompt += `\nREQUIRED OUTPUT:\n`
  prompt += `- "tacticLabel": Human-readable tactic name (e.g., "Payment Anchoring", "Manager Escalation")\n`
  prompt += `- "tacticType": One of: payment_anchoring | urgency | addons | fees | manager | counter_otd | trade_in_lowball | stalling | standard\n`
  prompt += `- "nextMove": ONE sentence instruction for what user should do next (<= 120 chars)\n`
  prompt += `- "sayThis": Primary response RIGHT NOW (1-2 sentences, spoken, <= 100 chars). MUST address the situation and respect ladder if locked.\n`
  prompt += `- "ifPushback": If they resist (1-2 sentences, spoken, <= 100 chars)\n`
  prompt += `- "ifManager": If manager joins (1-2 sentences, firm, closing-oriented, <= 100 chars)\n`
  prompt += `- "stopSignal": Physical action to take next (<= 80 chars)\n`
  prompt += `- "closingLine": ONE firm closing statement (no hedging, <= 100 chars). MUST respect ladder if locked.\n`
  prompt += `- "redFlags": Exactly 3 things to watch for (max 60 chars each)\n`
  prompt += `- "doNotSay": Exactly 2 common mistakes to avoid (max 60 chars each)\n`
  
  if (ladder.locked) {
    prompt += `\nCRITICAL: Ladder is LOCKED. You MUST NOT suggest accepting any amount above $${ladder.walk.toLocaleString()}. All outputs must respect this constraint.\n`
  }
  
  prompt += `\nReturn ONLY valid JSON with ALL required fields.`
  
  return prompt
}

