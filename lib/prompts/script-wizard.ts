// Centralized prompts for Script Wizard generation
// Easy to iterate and modify

import type { WizardAnswers } from '@/lib/types/wizard'
import type { BuyerProfile } from '@/lib/types/buyer'

interface PromptContext {
  answers: WizardAnswers
  buyerProfile: BuyerProfile
}

/**
 * Builds the system prompt for script generation based on wizard answers and buyer type
 */
export function buildScriptSystemPrompt(context: PromptContext): string {
  const { answers, buyerProfile } = context

  let basePrompt = `You are an expert car buying negotiation coach. Your job is to help users write effective negotiation messages or talking points based on their specific situation.

CRITICAL RULES:
1. Write clear, effective messages that get results
2. Be specific - reference the car details provided to show you've done research
3. Be respectful but confident - never aggressive or rude
4. Include a clear call to action
5. Make messages concise but complete
6. Provide educational guidance, not financial or legal advice
7. Never guarantee outcomes - frame suggestions as strategies, not promises
8. If the user has competitive offers from other dealerships, strategically leverage them to create urgency and strengthen negotiating position - but do so naturally and professionally, not aggressively

`

  // Add buyer type adjustments
  if (buyerProfile.toneAdjustment) {
    basePrompt += `TONE ADJUSTMENT: ${buyerProfile.toneAdjustment}\n\n`
  }

  // Add communication method guidance
  if (answers.communicationMethod === 'in_person') {
    basePrompt += `COMMUNICATION STYLE: In-person negotiation
CRITICAL: The user is negotiating FACE-TO-FACE at the dealership. They need SHORT, memorable phrases they can say out loud, NOT written messages.

FORMAT REQUIREMENTS:
- "script" field must contain SHORT talking points (1-2 sentences each, max 3-4 points total)
- Each point should be a phrase the user can remember and say naturally
- Use conversational language, not formal email language
- Format as bullet points or short phrases, NOT paragraphs
- Example format: "I've done some research and found similar cars for $X. What's your best out-the-door price?"

DO NOT create:
- Long paragraphs
- Email-style messages
- Formal written communication
- Anything that sounds like it's meant to be read, not spoken

INSTEAD create:
- Short, punchy phrases
- Natural conversation starters
- Easy-to-remember talking points
- What to say, not what to write
`
  } else {
    basePrompt += `COMMUNICATION STYLE: Remote (email/text)
- Create complete, polished messages ready to send
- 2-4 paragraphs typically
- Professional but personable
- Include follow-up messages for common dealer responses
`
  }

  // Add payment method guidance
  if (answers.paymentMethod === 'cash') {
    basePrompt += `
PAYMENT CONTEXT: Cash buyer
- Emphasize the cash advantage (no financing fees, immediate payment)
- Use cash as leverage for better price
- Mention that cash simplifies the transaction
`
  } else if (answers.paymentMethod === 'finance') {
    basePrompt += `
PAYMENT CONTEXT: Financing
- Include questions about financing terms (APR, term length)
- Ask about dealer financing vs outside financing options
- Request OTD breakdown including financing costs
`
  } else {
    basePrompt += `
PAYMENT CONTEXT: Payment method not yet decided
- Keep options open
- Ask about both cash and financing options
- Compare total costs of each approach
`
  }

  // Add experience level guidance
  if (answers.experienceLevel === 'first_time') {
    basePrompt += `
EXPERIENCE LEVEL: First-time buyer
- Provide extra context and education
- Explain common dealer tactics to watch for
- Include reassurance and confidence-building language
- Break down complex terms in simple language
`
  }

  // Add stage-specific guidance
  switch (answers.currentStage) {
    case 'just_starting':
      basePrompt += `
STAGE: Just starting negotiations
- Focus on initial contact and information gathering
- Set expectations and boundaries
- Establish that you're a serious buyer
`
      break
    case 'comparing_offers':
      basePrompt += `
STAGE: Comparing multiple offers
- Reference that you have other offers
- Ask for best price to compete
- Request written quotes for comparison
`
      break
    case 'sitting_on_offer':
      basePrompt += `
STAGE: Sitting on an offer, deciding next steps
- Create response to existing offer
- Include counter-offer language if appropriate
- Ask clarifying questions before committing
`
      break
    case 'ready_to_close':
      basePrompt += `
STAGE: Ready to close the deal
- Final negotiation points
- Request final OTD breakdown
- Confirm all terms before signing
`
      break
  }

  // Add help-needed specific guidance
  switch (answers.helpNeeded) {
    case 'negotiate_price':
      basePrompt += `
GOAL: Negotiate a better price
- Reference market research and comparable listings
- Use specific numbers and data
- Create room for negotiation
- Include polite but firm language
`
      break
    case 'ask_otd':
      basePrompt += `
GOAL: Request out-the-door (OTD) price breakdown
- Ask for itemized breakdown of all fees
- Request tax, doc fees, and any add-ons separately
- Emphasize that you need the total OTD price, not just the listed price
`
      break
    case 'push_back_fees':
      basePrompt += `
GOAL: Challenge unnecessary fees or add-ons
- Question fees that seem excessive or unnecessary
- Ask what each fee covers
- Request removal or reduction of questionable fees
- Be firm but respectful
`
      break
    case 'trade_in_value':
      basePrompt += `
GOAL: Negotiate trade-in value
- Request separate valuation for trade-in
- Ask about trade-in vs selling privately
- Negotiate trade-in value independently from purchase price
`
      break
    case 'financing_questions':
      basePrompt += `
GOAL: Ask about financing terms
- Request APR, term length, and total financing cost
- Ask about dealer financing vs credit union options
- Inquire about any incentives tied to financing
- Ask if rate is contingent on add-ons or warranties
- Provide educational context about financing terms (not financial advice)
`
      break
    case 'general_guidance':
      basePrompt += `
GOAL: General negotiation guidance
- Provide balanced approach covering multiple negotiation points
- Include tips for effective communication
- Suggest questions to ask
`
      break
  }

  // Add conversation flow requirement for in-person
  if (answers.communicationMethod === 'in_person') {
    basePrompt += `
CONVERSATION FLOW: Since this is in-person, you MUST include a "conversationFlow" section that shows:
- What the user should say (their talking points)
- Potential dealer responses (what the dealer might say back)
- User's options for how to respond to each dealer response
- This creates a back-and-forth conversation guide

Format the conversation flow as a structured dialogue showing multiple paths the conversation might take.
`
  }

  basePrompt += `
Your response must be a JSON object with this exact structure:
{
  "script": "<the complete negotiation message or talking points>",
  "followUps": [<array of 2-4 follow-up responses if dealer pushes back>],
  "conversationFlow": ${answers.communicationMethod === 'in_person' ? `{
    "userOpening": "<what user should say first>",
    "scenarios": [
      {
        "dealerResponse": "<what dealer might say>",
        "userOptions": [
          {
            "response": "<what user can say back>",
            "whenToUse": "<when this response is appropriate>"
          }
        ],
        "notes": "<what to watch for in this scenario>"
      }
    ]
  }` : 'null'},
  "keyPoints": [<array of 3-5 key points covered>],
  "tips": [<array of 2-4 additional negotiation tips>],
  "educationalHints": [<array of 2-3 hints about dealer tactics, what to watch for, or common pitfalls>]
}`

  return basePrompt
}

/**
 * Builds the user prompt with car context
 */
export function buildScriptUserPrompt(
  answers: WizardAnswers,
  buyerProfile: BuyerProfile,
  competitiveOffers?: Array<{
    dealer: string
    price: number
    otdPrice?: number
    distance?: string
    notes?: string
  }>,
  packType?: string,
  packAnswers?: Record<string, any>,
  packEducation?: string[]
): string {
  const isInPerson = answers.communicationMethod === 'in_person'
  
  let prompt = `Generate a negotiation script based on these details:

Car Context: ${answers.carContext}

Communication Method: ${isInPerson ? 'In-person (FACE-TO-FACE at dealership)' : 'Remote (email/text)'}
Payment Method: ${answers.paymentMethod}
Experience Level: ${answers.experienceLevel === 'first_time' ? 'First-time buyer' : 'Experienced buyer'}
Current Stage: ${answers.currentStage}
Help Needed: ${answers.helpNeeded}
Buyer Profile: ${buyerProfile.displayName || 'General'} - ${buyerProfile.description || 'Standard buyer'}
Pack: ${packType || 'general'}

`

  if (packEducation && packEducation.length > 0) {
    prompt += `Pack Education:\n${packEducation.map((e) => `- ${e}`).join('\n')}\n\n`
  }

  if (packAnswers && Object.keys(packAnswers).length > 0) {
    prompt += `Pack Answers:\n`
    Object.entries(packAnswers).forEach(([k, v]) => {
      prompt += `- ${k}: ${v}\n`
    })
    prompt += `\n`
  }

  // Add competitive offers context if available
  if (competitiveOffers && competitiveOffers.length > 0) {
    prompt += `\nCOMPETITIVE LEVERAGE - The user has offers from other dealerships:\n`
    competitiveOffers.forEach((offer, index) => {
      prompt += `${index + 1}. ${offer.dealer}: $${offer.price.toLocaleString()}`
      if (offer.otdPrice) {
        prompt += ` (OTD: $${offer.otdPrice.toLocaleString()})`
      }
      if (offer.distance) {
        prompt += ` - ${offer.distance}`
      }
      if (offer.notes) {
        prompt += ` - ${offer.notes}`
      }
      prompt += `\n`
    })
    prompt += `\nCRITICAL: Use these competitive offers strategically in the script. Reference them to show you have alternatives and create urgency. For example:
- "I have a similar car at [Dealer Name] for $[Price]"
- "I'm comparing a few offers, and [Dealer Name] is offering $[Price]"
- "I found a better price nearby at $[Price] - can you match or beat that?"

Make the script leverage this competitive information naturally and confidently, but don't be aggressive or threatening.

`
  }

  if (isInPerson) {
    prompt += `IMPORTANT: This is an IN-PERSON conversation. Generate SHORT talking points (1-2 sentences each) that the user can say out loud, NOT a written message.

Also create a conversation flow showing:
1. What the user should say to open the negotiation
2. 3-4 common dealer responses (what the dealer might say back)
3. For each dealer response, provide 2-3 options for how the user can respond
4. Notes about what to watch for in each scenario

This creates a practical conversation guide for face-to-face negotiation.

`
  } else {
    prompt += `Generate a complete, polished message ready to send via email or text. Make it specific to their situation and car details.

`
  }

  // Pack answers context
  if (packAnswers && Object.keys(packAnswers).length > 0) {
    prompt += `\nPACK-SPECIFIC ANSWERS:\n`
    Object.entries(packAnswers).forEach(([key, value]) => {
      prompt += `- ${key}: ${value}\n`
    })
  }

  prompt += `Return ONLY valid JSON, no other text.`

  return prompt
}

/**
 * Get buyer profile based on type
 */
export function getBuyerProfile(buyerType: string): BuyerProfile {
  const profiles: Record<string, Partial<BuyerProfile>> = {
    first_time: {
      displayName: 'First-Time Buyer',
      description: 'New to car buying, needs extra guidance',
      toneAdjustment: 'Be patient and educational, explain terms clearly',
    },
    cash_buyer: {
      displayName: 'Cash Buyer',
      description: 'Paying with cash, wants to leverage this advantage',
      toneAdjustment: 'Emphasize cash benefits and simplicity',
    },
    financing_focused: {
      displayName: 'Financing-Focused',
      description: 'Interested in financing options and terms',
      toneAdjustment: 'Focus on financing details and comparisons',
    },
    trade_in_focus: {
      displayName: 'Trade-In Focus',
      description: 'Has a trade-in vehicle to negotiate',
      toneAdjustment: 'Balance trade-in value with purchase price',
    },
    in_person_pack: {
      displayName: 'In-Person Negotiator',
      description: 'Prefers face-to-face negotiation',
      toneAdjustment: 'Create short, memorable talking points',
    },
  }

  const profile = profiles[buyerType] || {}
  
  return {
    communicationMethod: 'remote',
    paymentMethod: 'unsure',
    experience: 'experienced',
    stage: 'just_starting',
    helpNeeded: 'general_guidance',
    carContext: '',
    ...profile,
  } as BuyerProfile
}

/**
 * Convenience function to get both prompts
 */
export function getScriptWizardPrompts(request: {
  wizardAnswers: WizardAnswers
  buyerType?: string
  competitiveOffers?: Array<{
    dealer: string
    price: number
    otdPrice?: number
    distance?: string
    notes?: string
  }>
  packType?: string
  packAnswers?: Record<string, any>
  packEducation?: string[]
}): { systemPrompt: string; userPrompt: string } {
  const buyerType = request.buyerType || 'general'
  const buyerProfile = getBuyerProfile(buyerType)
  
  return {
    systemPrompt: buildScriptSystemPrompt({
      answers: request.wizardAnswers,
      buyerProfile,
    }),
    userPrompt: buildScriptUserPrompt(
      request.wizardAnswers,
      buyerProfile,
      request.competitiveOffers,
      request.packType,
      request.packAnswers,
      request.packEducation
    ),
  }
}

