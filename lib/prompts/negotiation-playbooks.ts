// Negotiation Draft Builder Playbooks
// Predefined, opinionated message skeletons - NOT freeform generation

// Message style micro-variation system
// Selects one of 3 variants deterministically based on tone+goal+stage hash
function selectVariant(tone: Tone, goal: string, stage?: string): 0 | 1 | 2 {
  const hash = `${tone}:${goal}:${stage || ''}`
  let hashValue = 0
  for (let i = 0; i < hash.length; i++) {
    hashValue = ((hashValue << 5) - hashValue) + hash.charCodeAt(i)
    hashValue = hashValue & hashValue // Convert to 32-bit integer
  }
  return Math.abs(hashValue % 3) as 0 | 1 | 2
}

// Tone-specific phrasing variants for soft openers and closings
const toneVariants: Record<Tone, string[][]> = {
  friendly: [
    ['Hi! ', 'Thanks so much!'],
    ['Hello! ', 'I appreciate it!'],
    ['Thanks! ', 'Looking forward to hearing from you!']
  ],
  neutral: [
    ['', ''],
    ['', ''],
    ['', '']
  ],
  firm: [
    ['', ''],
    ['', ''],
    ['', '']
  ]
}

export type PlaybookType = 
  | 'OTD_CONFIRMATION'
  | 'CLOSE_TODAY'
  | 'PRICE_PUSHBACK'
  | 'FEE_OR_ADDON_PUSHBACK'
  | 'PAYMENT_DEFLECTION'

export type Tone = 'friendly' | 'neutral' | 'firm'

export interface PlaybookMessage {
  skeleton: string // Base message with placeholders
  toneModifiers: {
    friendly: string[]
    neutral: string[]
    firm: string[]
  }
  financingInsert?: string // Where to insert financing language
  variants?: {
    friendly: Array<{ softOpener: string; closing: string }>
    neutral: Array<{ softOpener: string; closing: string }>
    firm: Array<{ softOpener: string; closing: string }>
  }
}

// Playbook definitions
// Guardrails enforced: No "Thanks!", No "I love this car", No "hopefully", No explaining what OTD means, No education inside negotiation copy
export const playbooks: Record<PlaybookType, PlaybookMessage> = {
  OTD_CONFIRMATION: {
    skeleton: '{softOpener}I\'m interested in the vehicle and want to confirm the final out-the-door number before coming in. {financing} If the total OTD is ${desiredOTD}, all-in with no additional products added, I\'m prepared to move forward. Please confirm the written OTD so we\'re aligned.{walkAwayClause}',
    toneModifiers: {
      friendly: [
        'softOpener: "Hi! "',
        'walkAwayClause: ""'
      ],
      neutral: [
        'softOpener: ""',
        'walkAwayClause: ""'
      ],
      firm: [
        'softOpener: ""',
        'walkAwayClause: " If ${desiredOTD} doesn\'t work, I\'ll continue evaluating other options."'
      ]
    },
    financingInsert: 'after opener'
  },
  CLOSE_TODAY: {
    skeleton: '{softOpener}I\'m prepared to finalize today if the out-the-door number is ${desiredOTD}, all-in. {financing} {otdOnly}If you can confirm ${desiredOTD} in writing, I\'ll move forward immediately.{walkAwayClause}',
    toneModifiers: {
      friendly: [
        'softOpener: "I\'m ready to move forward. "',
        'walkAwayClause: ""'
      ],
      neutral: [
        'softOpener: ""',
        'walkAwayClause: ""'
      ],
      firm: [
        'softOpener: ""',
        'walkAwayClause: " If that number isn\'t available today, I\'ll continue evaluating other vehicles."'
      ]
    },
    financingInsert: 'after opener'
  },
  PRICE_PUSHBACK: {
    skeleton: '{softOpener}I\'m still targeting ${desiredOTD} out-the-door based on comparable pricing and total cost. If there\'s flexibility to get closer, I\'m ready to move quickly.{walkAwayClause}',
    toneModifiers: {
      friendly: [
        'softOpener: "I\'ve reviewed the numbers. "',
        'walkAwayClause: ""'
      ],
      neutral: [
        'softOpener: ""',
        'walkAwayClause: ""'
      ],
      firm: [
        'softOpener: ""',
        'walkAwayClause: " If not, I\'ll continue evaluating other options."'
      ]
    },
    financingInsert: 'after reference'
  },
  FEE_OR_ADDON_PUSHBACK: {
    skeleton: '{softOpener}I\'m only considering the all-in out-the-door price. If there are add-ons included, please list which are optional and which are required. I\'m open to proceeding without additional products.{walkAwayClause}',
    toneModifiers: {
      friendly: [
        'softOpener: "I see some add-ons in the breakdown. "',
        'walkAwayClause: ""'
      ],
      neutral: [
        'softOpener: ""',
        'walkAwayClause: ""'
      ],
      firm: [
        'softOpener: ""',
        'walkAwayClause: " If add-ons are mandatory, I\'ll continue evaluating other options."'
      ]
    },
    financingInsert: 'after ask'
  },
  PAYMENT_DEFLECTION: {
    skeleton: '{softOpener}I\'m not negotiating based on monthly payment. {financing} {otdOnly}If you can confirm ${desiredOTD}, I\'m ready to proceed.{walkAwayClause}',
    toneModifiers: {
      friendly: [
        'softOpener: "I appreciate the question, but "',
        'walkAwayClause: ""'
      ],
      neutral: [
        'softOpener: ""',
        'walkAwayClause: ""'
      ],
      firm: [
        'softOpener: ""',
        'walkAwayClause: " If you can\'t confirm OTD, I\'ll continue evaluating other options."'
      ]
    },
    financingInsert: 'after opener'
  }
}

// Goal to Playbook mapping
// ROUTING RULES (in priority order):
// 1. If goal = "Get OTD Price" AND stage = "Initial Outreach" → OTD_CONFIRMATION
// 2. If goal = "Close Today" → CLOSE_TODAY
// 3. If stage = "After Counter Offered" → PRICE_PUSHBACK
// 4. If goal = "Reduce Add-ons" → FEE_OR_ADDON_PUSHBACK
// 5. If buyer type = Financing AND dealer mentions monthly payment → PAYMENT_DEFLECTION
// Hard rule: Only one base playbook per message. No mixing.
export function getPlaybookForGoal(
  goal: string, 
  stage: string, 
  buyerType?: string,
  dealerMentionsMonthlyPayment?: boolean
): PlaybookType {
  // Rule 5: If buyer type = Financing AND dealer mentions monthly payment → PAYMENT_DEFLECTION
  if (buyerType === 'financing' && dealerMentionsMonthlyPayment) {
    return 'PAYMENT_DEFLECTION'
  }
  
  // Rule 2: If goal = "Close Today" → CLOSE_TODAY
  if (goal === 'close_today') {
    return 'CLOSE_TODAY'
  }
  
  // Rule 3: If stage = "After Counter Offered" → PRICE_PUSHBACK
  if (stage === 'after_counter') {
    return 'PRICE_PUSHBACK'
  }
  
  // Rule 4: If goal = "Reduce Add-ons" → FEE_OR_ADDON_PUSHBACK
  if (goal === 'reduce_addons') {
    return 'FEE_OR_ADDON_PUSHBACK'
  }
  
  // Rule 1: If goal = "Get OTD Price" AND stage = "Initial Outreach" → OTD_CONFIRMATION
  if ((goal === 'get_otd' || goal === 'schedule_visit_otd') && stage === 'initial_outreach') {
    return 'OTD_CONFIRMATION'
  }
  
  // Fallback: Default to OTD_CONFIRMATION for other get_otd/schedule_visit_otd cases
  if (goal === 'get_otd' || goal === 'schedule_visit_otd') {
    return 'OTD_CONFIRMATION'
  }
  
  // Default fallback
  return 'OTD_CONFIRMATION'
}

// Credibility signals (choose one based on context)
export const credibilitySignals = [
  'I already have financing secured',
  'I\'m comparing multiple vehicles today',
  'I\'m only discussing OTD, not payments',
  'No additional products added',
  'I have other options I\'m evaluating',
  'I\'m prepared to finalize today'
]

// Financing language (when preApprovalAPR exists)
// FINANCING RULES:
// - If Pre-Approval APR is provided: Mention financing is secured + Explicitly reject monthly-payment negotiation
// - If Max Monthly Payment is provided: NEVER mention the number, ONLY use it to justify firmness internally
// - If buyer type = Financing: Auto-append PAYMENT_DEFLECTION when appropriate (handled in routing)
// - Financing acknowledgment must feel natural and human, matching tone
export function getFinancingLanguage(
  preApprovalApr?: number,
  maxMonthly?: number,
  tone?: Tone,
  deflectMonthlyPayment?: boolean
): string {
  if (!preApprovalApr && !maxMonthly) return ''
  
  // If deflecting monthly payment, use explicit rejection
  if (deflectMonthlyPayment) {
    if (preApprovalApr) {
      return `I already have financing secured, so I'm not negotiating based on monthly payment.`
    }
    return `I'm not negotiating based on monthly payment.`
  }
  
  // Otherwise, use as leverage (natural, tone-matched)
  if (preApprovalApr) {
    switch (tone) {
      case 'firm':
        return `I'm already approved at competitive terms.`
      case 'neutral':
        return `I have financing secured.`
      case 'friendly':
        return `I already have financing lined up.`
      default:
        return `I have financing secured.`
    }
  }
  
  // If only maxMonthly (no APR), use subtly
  if (maxMonthly) {
    switch (tone) {
      case 'firm':
        return `I'm already approved.`
      case 'neutral':
        return `I have financing arranged.`
      case 'friendly':
        return `I've got financing ready.`
      default:
        return `I have financing arranged.`
    }
  }
  
  return ''
}

// Concept flags to control message language
interface ConceptFlags {
  mentionOTD: boolean // OTD language may ONLY appear if goal === "Get OTD Price" OR goal === "Reduce Add-ons" OR (desiredOTD entered AND OTD-related goal)
  deflectMonthlyPayment: boolean // Monthly payment deflection ONLY if buyerType === "Financing" AND financing details provided
  urgencyLanguage: boolean // Urgency language for Close Today
  walkAwayLanguage: boolean // Walk-away threats ONLY if tone === "Firm"
  hasFinancingDetails: boolean // True if buyerType === "Financing" AND financing details provided
  financingAsLeverageAllowed: boolean // True if goal === "Close Today" OR dealer mentions monthly payment OR tone === "Firm"
}

// Determine concept flags based on inputs
function determineConceptFlags(
  playbookType: PlaybookType,
  goal: string,
  tone: Tone,
  desiredOTD?: number,
  preApprovalApr?: number,
  maxMonthly?: number,
  buyerType?: string,
  dealerMentionsMonthlyPayment?: boolean
): ConceptFlags {
  // Rule 1: OTD language may ONLY appear if:
  // - goal === "Get OTD Price" OR goal === "Reduce Add-ons" OR
  // - (desiredOTD entered AND OTD-related goal selected)
  const otdRelatedGoals = ['get_otd', 'reduce_addons', 'schedule_visit_otd']
  const mentionOTD = 
    goal === 'get_otd' || 
    goal === 'reduce_addons' || 
    (!!desiredOTD && otdRelatedGoals.includes(goal))
  
  // Financing details available
  const hasFinancingDetails = 
    buyerType === 'financing' && 
    (!!preApprovalApr || !!maxMonthly)
  
  // Rule 3: Monthly payment deflection ONLY if buyerType === "Financing" AND financing details provided
  const deflectMonthlyPayment = hasFinancingDetails && !!dealerMentionsMonthlyPayment
  
  // Rule 2: Financing details SHOULD be used when:
  // - goal === "Close Today" OR dealer mentions monthly payment OR tone === "Firm"
  const financingAsLeverageAllowed = 
    hasFinancingDetails && (
      goal === 'close_today' ||
      !!dealerMentionsMonthlyPayment ||
      tone === 'firm'
    )
  
  // Urgency language for Close Today
  const urgencyLanguage = goal === 'close_today'
  
  // Walk-away language ONLY if tone === "Firm"
  const walkAwayLanguage = tone === 'firm'
  
  return {
    mentionOTD,
    deflectMonthlyPayment,
    urgencyLanguage,
    walkAwayLanguage,
    hasFinancingDetails,
    financingAsLeverageAllowed
  }
}

// Assemble message from playbook
// FINANCING RULES:
// - If Pre-Approval APR is provided: Mention financing is secured + Explicitly reject monthly-payment negotiation
// - If Max Monthly Payment is provided: NEVER mention the number, ONLY use it to justify firmness internally
// - If buyer type = Financing: Auto-append PAYMENT_DEFLECTION when appropriate (handled in routing)
export function assembleMessage(
  playbookType: PlaybookType,
  tone: Tone,
  goal: string,
  desiredOTD?: number,
  preApprovalApr?: number,
  maxMonthly?: number,
  context?: {
    vehiclePrice?: number
    stage?: string
    hasCompetitiveOffers?: boolean
    buyerType?: string
    dealerMentionsMonthlyPayment?: boolean
  }
): string {
  // Determine concept flags
  const flags = determineConceptFlags(
    playbookType,
    goal,
    tone,
    desiredOTD,
    preApprovalApr,
    maxMonthly,
    context?.buyerType,
    context?.dealerMentionsMonthlyPayment
  )
  
  const playbook = playbooks[playbookType]
  let message = playbook.skeleton
  
  // Build a map of placeholder values from tone modifiers
  const placeholderMap: Record<string, string> = {}
  const modifiers = playbook.toneModifiers[tone]
  modifiers.forEach(mod => {
    const match = mod.match(/^(\w+):\s*["'](.+)["']$/)
    if (match) {
      const [, key, value] = match
      // Replace OTD placeholder in firmModifier if needed
      let processedValue = value
      if (desiredOTD && value.includes('${desiredOTD}')) {
        const formattedOTD = `$${desiredOTD.toLocaleString()}`
        processedValue = processedValue.replace(/\$\{desiredOTD\}/g, formattedOTD)
      }
      placeholderMap[key] = processedValue
    }
  })
  
  // Insert financing language if provided AND concept flag allows it
  // Rule 1: If buyerType === "Financing" AND financing details provided:
  // - The message MUST acknowledge financing in a way that matches the selected tone
  // Rule 2: Financing details SHOULD be used when: Close Today OR dealer mentions monthly payment OR tone === "Firm"
  if (flags.financingAsLeverageAllowed || flags.deflectMonthlyPayment) {
    const financingText = getFinancingLanguage(
      preApprovalApr,
      maxMonthly,
      tone,
      flags.deflectMonthlyPayment
    )
    placeholderMap['financing'] = financingText
  } else {
    placeholderMap['financing'] = ''
  }
  
  // If Max Monthly Payment is provided: NEVER mention the number, ONLY use it to justify firmness internally
  // This means if maxMonthly exists, we could use it to make tone firmer, but we NEVER mention the number in the message
  // (The maxMonthly parameter is available but not used in message assembly per the rule - it's for internal logic only)
  
  // Set OTD-only language placeholder based on concept flag
  if (flags.mentionOTD) {
    placeholderMap['otdOnly'] = 'This is an OTD discussion only. '
    placeholderMap['otdContext'] = 'My financing is already set — this comes down to the final OTD number. '
  } else {
    placeholderMap['otdOnly'] = ''
    placeholderMap['otdContext'] = ''
  }
  
  // Remove walk-away language if concept flag doesn't allow it
  if (!flags.walkAwayLanguage) {
    // Remove walk-away clauses from firmModifier
    placeholderMap['walkAwayClause'] = ''
  }
  
  // Replace OTD placeholder in skeleton if needed
  if (desiredOTD) {
    const formattedOTD = `$${desiredOTD.toLocaleString()}`
    message = message.replace(/\$\{desiredOTD\}/g, formattedOTD)
  }
  
  // Replace all placeholders
  Object.keys(placeholderMap).forEach(key => {
    const value = placeholderMap[key]
    if (value) {
      message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    } else {
      // Remove empty placeholders and clean up spacing
      message = message.replace(new RegExp(`\\{${key}\\}\\s*`, 'g'), '')
    }
  })
  
  // Clean up any remaining placeholders and extra spaces
  message = message.replace(/\{[^}]+\}/g, '')
  message = message.replace(/\s+/g, ' ').trim()
  
  // Remove leading/trailing punctuation issues
  message = message.replace(/^\s*[.,]\s*/, '').replace(/\s*[.,]\s*$/, '')
  
  // Enforce guardrails: Remove forbidden phrases
  // No "Thanks!", No "I love this car", No "hopefully", No explaining what OTD means, No education inside negotiation copy
  const guardrails = [
    /Thanks!/gi,
    /Thanks for/gi,
    /I love this car/gi,
    /hopefully/gi,
    /OTD \(out-the-door\)/gi,
    /out-the-door \(OTD\)/gi,
    /what OTD means/gi,
    /OTD means/gi,
    /out-the-door means/gi
  ]
  guardrails.forEach(pattern => {
    message = message.replace(pattern, '')
  })
  
  // Clean up double spaces and periods
  message = message.replace(/\s+/g, ' ').trim()
  message = message.replace(/\.\s*\./g, '.')
  
  // Ensure max 3-4 short sentences (not paragraphs)
  const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length > 4) {
    message = sentences.slice(0, 4).join('. ') + '.'
  }
  
  return message
}

// Coach-like explanations for "Why This Works" (not blog-like psychology)
export function getLeverageExplanation(
  playbookType: PlaybookType,
  goal: string,
  hasFinancing?: boolean,
  hasCompetitiveOffers?: boolean
): string[] {
  // Coach-like format: short, outcome-focused, verb-starting bullets
  const explanations: Record<PlaybookType, string[]> = {
    OTD_CONFIRMATION: [
      'Asks for written confirmation to avoid surprise fees later',
      'Keeps the conversation on total price, not monthly payment',
      hasFinancing 
        ? 'Signals you\'re ready to buy (not just shopping numbers)'
        : 'Creates a written reference point for final negotiation'
    ],
    CLOSE_TODAY: [
      'Signals you\'re ready to buy today (not just shopping numbers)',
      'Sets a clear boundary that prevents drawn-out negotiation',
      'Asks for written confirmation before you come in'
    ],
    PRICE_PUSHBACK: [
      'Anchors the conversation around total cost, not monthly payment',
      'Signals you have other options without showing desperation',
      'Keeps negotiation door open while asserting your position'
    ],
    FEE_OR_ADDON_PUSHBACK: [
      'Asks dealer to clarify which add-ons are optional vs required',
      'Prevents fee creep by addressing unnecessary charges upfront',
      'Keeps focus on what you actually need, not what dealer wants to sell'
    ],
    PAYMENT_DEFLECTION: [
      'Shuts down monthly payment discussion immediately',
      'Forces dealer to discuss total cost, which is what actually matters',
      hasFinancing 
        ? 'Signals you already have financing secured'
        : 'Keeps control of the conversation'
    ]
  }
  
  // Return 2-3 bullets max, prioritizing most relevant
  const baseExplanations = explanations[playbookType] || explanations.OTD_CONFIRMATION
  return baseExplanations.slice(0, 3)
}

// Confidence check based on inputs
export function buildConfidenceCheck(
  desiredOTD?: number,
  taxRate?: number,
  goal?: string
): string {
  if (goal === 'close_today' && desiredOTD) {
    return 'Confidence check: Strong — clear close, low ambiguity.'
  }
  
  if (!desiredOTD) {
    return 'Confidence check: Medium — add a target OTD to get a cleaner yes/no.'
  }
  
  if (!taxRate || taxRate === 0) {
    return 'Confidence check: Medium — tax assumptions may change final OTD.'
  }
  
  return 'Confidence check: Strong — all key inputs provided.'
}

