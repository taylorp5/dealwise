// Live Pressure Mode Simulation Engine
// V2 Expansion: Enhanced with new tactics, user intent classification, and severity levels

export type Tactic = 'scarcity' | 'authority' | 'urgency' | 'payment_anchoring' | 'addon_creep' | 'walkaway_save'
export type ResponseClassification = 'strong' | 'neutral' | 'weak'
export type UserIntent = 'ask_breakdown' | 'hold_line' | 'concede' | 'ask_payment' | 'pushback_addons' | 'trade_in' | 'walk_away' | 'neutral'
export type LeverageState = -2 | -1 | 0 | 1 | 2
export type SeverityLevel = 1 | 2 | 3
export type Scenario = 'pressure-tactics' | 'payment-trap'

export interface DealerLine {
  text: string
  tactic: Tactic
  severity: SeverityLevel
}

export interface ResponseFeedback {
  label: ResponseClassification
  intent: UserIntent
  reasons: string[]
  tryInstead: string
  dealerTranslation: string
  costOfMistake?: string
}

export interface SimulationState {
  turn: number
  leverage: LeverageState
  previousTactic: Tactic | null
  usedLines: Set<string>
  messages: Array<{
    type: 'dealer' | 'user'
    text: string
    classification?: ResponseClassification
    intent?: UserIntent
    feedback?: ResponseFeedback
    dealerTactic?: Tactic // Track which tactic dealer used before each user response
  }>
}

export interface SimulationResults {
  grade: 'A' | 'B' | 'C'
  finalLeverage: LeverageState
  weakResponseCount: number
  avoidedPaymentAnchoring: boolean
  pressureResistance: number
  clarityScore: number
  bestMoves: string[]
  improvementPoint: string
}

// Tactics Library - Canned dealer lines with severity levels (1=mild, 2=moderate, 3=intense)
const SCARCITY_LINES: DealerLine[] = [
  { text: "This is the last one on the lot. Another customer was looking at it this morning.", tactic: 'scarcity', severity: 2 },
  { text: "We've had three people call about this car today. I can't guarantee it'll be here tomorrow.", tactic: 'scarcity', severity: 2 },
  { text: "This model is selling fast. We only have two left in this color.", tactic: 'scarcity', severity: 1 },
]

const AUTHORITY_LINES: DealerLine[] = [
  { text: "My manager said this is the best price we can do. He's been here 20 years.", tactic: 'authority', severity: 2 },
  { text: "I already went to my manager twice. This is as low as we can go.", tactic: 'authority', severity: 3 },
  { text: "The manager approved this price, but only if you decide today.", tactic: 'authority', severity: 2 },
]

const URGENCY_LINES: DealerLine[] = [
  { text: "This price is only good for today. Tomorrow it goes back to MSRP.", tactic: 'urgency', severity: 2 },
  { text: "We have a special promotion ending tonight. After that, the price goes up $500.", tactic: 'urgency', severity: 3 },
  { text: "If you don't decide now, I can't guarantee this deal will still be available.", tactic: 'urgency', severity: 2 },
]

const PAYMENT_ANCHORING_LINES: DealerLine[] = [
  { text: "What kind of monthly payment are you looking for?", tactic: 'payment_anchoring', severity: 1 },
  { text: "If we can get you to $350 a month, would that work for you?", tactic: 'payment_anchoring', severity: 2 },
  { text: "Let's focus on the monthly payment. What can you afford per month?", tactic: 'payment_anchoring', severity: 2 },
  { text: "I can get you into this car for just $299 a month. How does that sound?", tactic: 'payment_anchoring', severity: 3 },
  { text: "We can make the payment work. What's your target monthly payment?", tactic: 'payment_anchoring', severity: 2 },
  { text: "Don't worry about the price, let's talk about what you can pay each month.", tactic: 'payment_anchoring', severity: 3 },
]

const ADDON_CREEP_LINES: DealerLine[] = [
  { text: "For just $20 more a month, we can add extended warranty coverage.", tactic: 'addon_creep', severity: 1 },
  { text: "I'd recommend the paint protection package. It's only $15 a month.", tactic: 'addon_creep', severity: 1 },
  { text: "Let me add on the gap insurance. It's really important and only $12 a month.", tactic: 'addon_creep', severity: 2 },
  { text: "We should include the service contract. It's a small price for peace of mind.", tactic: 'addon_creep', severity: 2 },
  { text: "I'm going to throw in the fabric protection and window tinting. Just $25 a month.", tactic: 'addon_creep', severity: 3 },
  { text: "These add-ons are standard. Everyone gets them. It's just $30 a month total.", tactic: 'addon_creep', severity: 3 },
]

const WALKAWAY_SAVE_LINES: DealerLine[] = [
  { text: "Wait, don't leave yet. Let me see what else I can do.", tactic: 'walkaway_save', severity: 1 },
  { text: "Hold on, I think I can make this work. Give me one more minute.", tactic: 'walkaway_save', severity: 2 },
  { text: "Before you go, let me talk to my manager one more time.", tactic: 'walkaway_save', severity: 2 },
  { text: "I don't want to lose this deal. What if I could come down another $500?", tactic: 'walkaway_save', severity: 3 },
  { text: "You're making a mistake. This is a great deal. Let me see if I can do better.", tactic: 'walkaway_save', severity: 3 },
]

const TACTICS_LIBRARY: Record<Tactic, DealerLine[]> = {
  scarcity: SCARCITY_LINES,
  authority: AUTHORITY_LINES,
  urgency: URGENCY_LINES,
  payment_anchoring: PAYMENT_ANCHORING_LINES,
  addon_creep: ADDON_CREEP_LINES,
  walkaway_save: WALKAWAY_SAVE_LINES,
}

// Strong response keywords/phrases
const STRONG_KEYWORDS = [
  'not deciding today',
  'comparing offers',
  'compare offers',
  'send me breakdown',
  'send me otd',
  'otd breakdown',
  'out-the-door',
  'out the door',
  'prepared to walk',
  'walk away',
  'walk',
  'leave',
  'other dealerships',
  'think about it',
  'need time',
  'not in a rush',
  'take my time',
  'compare prices',
  'get back to you',
  'email me',
  'text me',
]

// Weak response keywords/phrases
const WEAK_KEYWORDS = [
  'love this car',
  'need it today',
  'what can you do',
  'stretch my budget',
  'i can stretch my budget',
  'can stretch my budget',
  'really want it',
  'must have',
  'perfect for me',
  'dream car',
  'can we make it work',
  'how much monthly',
  'monthly payment',
  'monthly payment focus',
  'afford',
  'desperate',
  'urgent',
]

// User intent keywords
const INTENT_KEYWORDS: Record<UserIntent, string[]> = {
  ask_breakdown: ['breakdown', 'otd', 'out the door', 'out-the-door', 'total', 'all fees', 'final price', 'what does it cost', 'send me', 'email me', 'text me'],
  hold_line: ['not deciding', 'think about it', 'need time', 'compare', 'other dealerships', 'not in a rush', 'take my time'],
  concede: ['okay', 'fine', 'i guess', 'alright', 'sounds good', 'i accept', 'deal', 'yes'],
  ask_payment: ['monthly payment', 'payment', 'per month', 'monthly', 'how much a month', 'afford', 'budget'],
  pushback_addons: ['don\'t want', 'don\'t need', 'remove', 'no add', 'no warranty', 'no protection', 'decline', 'not interested'],
  trade_in: ['trade', 'trade-in', 'trade in', 'my car', 'old car', 'current vehicle'],
  walk_away: ['walk', 'leave', 'going', 'bye', 'not interested', 'thanks anyway'],
  neutral: [],
}

/**
 * Detects user intent from response text
 */
export function detectUserIntent(text: string): UserIntent {
  const lowerText = text.toLowerCase()
  
  // Check each intent in priority order (most specific first)
  const intentChecks: Array<{ intent: UserIntent; keywords: string[] }> = [
    { intent: 'walk_away', keywords: INTENT_KEYWORDS.walk_away },
    { intent: 'ask_breakdown', keywords: INTENT_KEYWORDS.ask_breakdown },
    { intent: 'pushback_addons', keywords: INTENT_KEYWORDS.pushback_addons },
    { intent: 'trade_in', keywords: INTENT_KEYWORDS.trade_in },
    { intent: 'ask_payment', keywords: INTENT_KEYWORDS.ask_payment },
    { intent: 'concede', keywords: INTENT_KEYWORDS.concede },
    { intent: 'hold_line', keywords: INTENT_KEYWORDS.hold_line },
  ]
  
  for (const { intent, keywords } of intentChecks) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return intent
    }
  }
  
  return 'neutral'
}

/**
 * Generates "Try instead" suggestion based on classification and intent
 */
function getTryInsteadSuggestion(classification: ResponseClassification, intent: UserIntent): string {
  if (classification === 'strong') {
    // Strong responses are good, but can be refined
    const suggestions: Record<UserIntent, string> = {
      ask_breakdown: "I need the full OTD breakdown in writing before I can make a decision.",
      hold_line: "I'm not deciding today. I'll compare offers and get back to you.",
      concede: "I need to think about this. Can you send me the numbers?",
      ask_payment: "I'm focused on the out-the-door price, not monthly payments.",
      pushback_addons: "I only want the car. No add-ons, no extras.",
      trade_in: "Let's keep trade-in separate. What's the OTD price on this car?",
      walk_away: "I'm prepared to walk if this doesn't work for me.",
      neutral: "I'm not in a rush. I'll take my time to make the right decision.",
    }
    return suggestions[intent] || suggestions.neutral
  }
  
  if (classification === 'weak') {
    // Weak responses need stronger alternatives
    const suggestions: Record<UserIntent, string> = {
      ask_breakdown: "I need the complete OTD breakdown. I'm not discussing anything else until I see it in writing.",
      hold_line: "I'm not deciding today. I'm comparing multiple offers.",
      concede: "I need time to review this. Send me the breakdown and I'll get back to you.",
      ask_payment: "I'm focused on the total price, not monthly payments. What's the out-the-door cost?",
      pushback_addons: "I don't want any add-ons. Just the car at the agreed price.",
      trade_in: "Let's handle trade-in separately. What's the OTD price without it?",
      walk_away: "If this doesn't work, I'm prepared to leave and check other dealerships.",
      neutral: "I'm not in a rush. I'll take my time and compare options.",
    }
    return suggestions[intent] || suggestions.neutral
  }
  
  // Neutral responses
  const suggestions: Record<UserIntent, string> = {
    ask_breakdown: "I need the complete OTD breakdown in writing before we continue.",
    hold_line: "I'm not making a decision today. I need time to think.",
    concede: "I need to review this carefully. Can you send me the breakdown?",
    ask_payment: "I'm focused on the total out-the-door price, not monthly payments.",
    pushback_addons: "I only want the car itself. No add-ons or extras.",
    trade_in: "Let's keep trade-in separate. What's the OTD price on just this car?",
    walk_away: "I'm prepared to walk if this doesn't work for me.",
    neutral: "I'm not in a rush. I'll take my time to make the right decision.",
  }
  return suggestions[intent] || suggestions.neutral
}

/**
 * Generates "What they mean" dealer translation based on classification and intent
 */
function getDealerTranslation(classification: ResponseClassification, intent: UserIntent): string {
  if (classification === 'strong') {
    const translations: Record<UserIntent, string> = {
      ask_breakdown: "They're being smart—asking for transparency before committing.",
      hold_line: "They're not desperate. This is a strong negotiating position.",
      concede: "They're being cautious, which shows they're not an easy target.",
      ask_payment: "They're avoiding the payment trap. Smart move.",
      pushback_addons: "They're protecting themselves from upsells. Good discipline.",
      trade_in: "They're keeping negotiations separate. This prevents confusion.",
      walk_away: "They're showing they have options. This is leverage.",
      neutral: "They're staying calm and not showing desperation.",
    }
    return translations[intent] || translations.neutral
  }
  
  if (classification === 'weak') {
    const translations: Record<UserIntent, string> = {
      ask_breakdown: "They want the breakdown, but they're still engaged—we can work with this.",
      hold_line: "They say they're holding, but they're still here talking. They want the car.",
      concede: "They're showing willingness to accept. We can push a bit more.",
      ask_payment: "They're focused on monthly payment—perfect for anchoring and add-ons.",
      pushback_addons: "They're resisting, but they haven't walked. We can still sell them.",
      trade_in: "They mentioned trade-in—they're thinking about making it work.",
      walk_away: "They're threatening to leave, but they're still here. They want the car.",
      neutral: "They're engaged but not showing strong resistance. We have room to negotiate.",
    }
    return translations[intent] || translations.neutral
  }
  
  // Neutral responses
  const translations: Record<UserIntent, string> = {
    ask_breakdown: "They want information, which is normal. We can still control the conversation.",
    hold_line: "They're being cautious, but they haven't left yet.",
    concede: "They're considering it. We can push a bit more.",
    ask_payment: "They're asking about payment—good opportunity to anchor.",
    pushback_addons: "They're resisting, but they're still negotiating.",
    trade_in: "They mentioned trade-in—they're trying to make it work.",
    walk_away: "They're showing they have options, but they're still here.",
    neutral: "They're engaged but not showing strong signals either way.",
  }
  return translations[intent] || translations.neutral
}

/**
 * Generates optional "Cost of mistake" range for weak responses
 */
function getCostOfMistake(classification: ResponseClassification, intent: UserIntent): string | undefined {
  // Only show cost of mistake for weak responses
  if (classification !== 'weak') {
    return undefined
  }
  
  const costs: Record<UserIntent, string> = {
    ask_payment: "$500-$1,500 in extra fees and add-ons",
    concede: "$300-$800 in unnecessary add-ons or higher price",
    ask_breakdown: "$200-$600 in hidden fees they might miss",
    pushback_addons: "$400-$1,200 if they give in to pressure later",
    trade_in: "$500-$1,500 in trade-in value manipulation",
    hold_line: "$300-$700 if they break and accept a worse deal",
    walk_away: "$200-$500 if they come back and accept original terms",
    neutral: "$300-$800 in potential overpayment",
  }
  
  return costs[intent] || costs.neutral
}

/**
 * Classifies a user response as Strong, Neutral, or Weak, and detects intent
 */
export function classifyResponse(text: string): ResponseFeedback {
  const lowerText = text.toLowerCase()
  const intent = detectUserIntent(text)
  
  // Check for strong indicators
  const strongMatches = STRONG_KEYWORDS.filter(keyword => lowerText.includes(keyword))
  if (strongMatches.length > 0) {
    const finalIntent = intent === 'neutral' ? 'hold_line' : intent
    return {
      label: 'strong',
      intent: finalIntent,
      reasons: [
        `You showed you're not in a rush (${strongMatches[0]})`,
        'This keeps you in control of the negotiation',
      ],
      tryInstead: getTryInsteadSuggestion('strong', finalIntent),
      dealerTranslation: getDealerTranslation('strong', finalIntent),
    }
  }
  
  // Check for weak indicators
  const weakMatches = WEAK_KEYWORDS.filter(keyword => lowerText.includes(keyword))
  if (weakMatches.length > 0) {
    const finalIntent = intent === 'neutral' ? 'concede' : intent
    return {
      label: 'weak',
      intent: finalIntent,
      reasons: [
        `You showed urgency/desperation (${weakMatches[0]})`,
        'This gives the dealer leverage to pressure you',
      ],
      tryInstead: getTryInsteadSuggestion('weak', finalIntent),
      dealerTranslation: getDealerTranslation('weak', finalIntent),
      costOfMistake: getCostOfMistake('weak', finalIntent),
    }
  }
  
  // Default to neutral for questions or unclear responses
  return {
    label: 'neutral',
    intent,
    reasons: [
      'Your response was neutral - neither strong nor weak',
      'Consider being more direct about your timeline or willingness to walk',
    ],
    tryInstead: getTryInsteadSuggestion('neutral', intent),
    dealerTranslation: getDealerTranslation('neutral', intent),
  }
}

/**
 * Maps user intent to preferred dealer tactics (counter-strategies)
 */
function getTacticsForIntent(intent: UserIntent): Tactic[] {
  const intentTacticMap: Record<UserIntent, Tactic[]> = {
    ask_breakdown: ['authority', 'payment_anchoring'], // Counter with authority or shift to payment
    hold_line: ['urgency', 'scarcity'], // Increase pressure
    concede: ['addon_creep', 'payment_anchoring'], // Buyer is soft, push add-ons
    ask_payment: ['payment_anchoring', 'addon_creep'], // Already talking payment, perfect for anchoring
    pushback_addons: ['authority', 'walkaway_save'], // Try to save the deal or use authority
    trade_in: ['payment_anchoring', 'addon_creep'], // Shift focus to payment/add-ons
    walk_away: ['walkaway_save', 'urgency'], // Try to save the deal
    neutral: ['scarcity', 'authority', 'urgency'], // Default tactics
  }
  return intentTacticMap[intent] || intentTacticMap.neutral
}

/**
 * Selects the next dealer line based on leverage, previous tactic, user intent, and severity
 */
export function nextDealerLine(
  leverage: LeverageState,
  previousTactic: Tactic | null,
  usedLines: Set<string>,
  userIntent: UserIntent = 'neutral'
): DealerLine {
  // Base tactic selection on leverage
  let leverageBasedTactics: Tactic[]
  
  if (leverage >= 1) {
    // Buyer in control - dealer escalates with urgency, authority, or walkaway save
    leverageBasedTactics = ['urgency', 'authority', 'walkaway_save']
  } else if (leverage <= -1) {
    // Dealer in control - maintain pressure with scarcity, add-ons, or payment anchoring
    leverageBasedTactics = ['scarcity', 'addon_creep', 'payment_anchoring']
  } else {
    // Neutral - dealer can use any tactic
    leverageBasedTactics = ['scarcity', 'authority', 'urgency', 'payment_anchoring', 'addon_creep', 'walkaway_save']
  }
  
  // Get intent-based tactics
  const intentBasedTactics = getTacticsForIntent(userIntent)
  
  // Combine leverage and intent preferences (intent takes priority)
  // Tactics that appear in both lists are preferred
  const preferredTactics = intentBasedTactics.filter(t => leverageBasedTactics.includes(t))
  const fallbackTactics = preferredTactics.length > 0 
    ? preferredTactics 
    : [...new Set([...intentBasedTactics, ...leverageBasedTactics])]
  
  // Avoid repeating the same tactic if possible
  const availableTactics = fallbackTactics.filter(t => t !== previousTactic)
  const tactic = availableTactics.length > 0 
    ? availableTactics[Math.floor(Math.random() * availableTactics.length)]
    : fallbackTactics[Math.floor(Math.random() * fallbackTactics.length)]
  
  // Get available lines for this tactic
  const lines = TACTICS_LIBRARY[tactic]
  const unusedLines = lines.filter(line => !usedLines.has(line.text))
  
  // Filter by severity: when leverage favors buyer, increase severity
  // Severity 1 = mild, 2 = moderate, 3 = intense
  let severityFilter: SeverityLevel[] = [1, 2, 3] // Default: all severities
  
  if (leverage >= 1) {
    // Buyer in control - dealer uses higher severity (2-3)
    severityFilter = [2, 3]
  } else if (leverage <= -1) {
    // Dealer in control - can use lower severity (1-2) to maintain without overdoing it
    severityFilter = [1, 2]
  }
  
  // Filter lines by severity
  const severityFilteredLines = (unusedLines.length > 0 ? unusedLines : lines)
    .filter(line => severityFilter.includes(line.severity))
  
  // If no lines match severity, fall back to all lines
  const candidateLines = severityFilteredLines.length > 0 
    ? severityFilteredLines 
    : (unusedLines.length > 0 ? unusedLines : lines)
  
  // Pick a random line from candidates
  const lineToUse = candidateLines[Math.floor(Math.random() * candidateLines.length)]
  
  return lineToUse
}

/**
 * Updates leverage based on response classification
 */
export function updateLeverage(
  currentLeverage: LeverageState,
  classification: ResponseClassification
): LeverageState {
  let newLeverage = currentLeverage
  
  if (classification === 'strong') {
    // Strong response moves leverage toward buyer
    newLeverage = Math.min(2, currentLeverage + 1) as LeverageState
  } else if (classification === 'weak') {
    // Weak response moves leverage toward dealer
    newLeverage = Math.max(-2, currentLeverage - 1) as LeverageState
  }
  // Neutral responses don't change leverage
  
  return newLeverage
}

/**
 * Gets the opening dealer line for a specific scenario
 */
export function getOpeningLine(scenario: Scenario = 'pressure-tactics'): DealerLine {
  if (scenario === 'payment-trap') {
    // Payment trap scenario: Start with payment anchoring
    const paymentLines = TACTICS_LIBRARY.payment_anchoring
    // Use a moderate severity line to start
    const openingLine = paymentLines.find(line => line.severity === 2) || paymentLines[0]
    return openingLine
  }
  
  // Default pressure-tactics scenario: Random opening from any tactic
  const allTactics: Tactic[] = ['scarcity', 'authority', 'urgency']
  const randomTactic = allTactics[Math.floor(Math.random() * allTactics.length)]
  const lines = TACTICS_LIBRARY[randomTactic]
  return lines[Math.floor(Math.random() * lines.length)]
}

/**
 * Initializes a new simulation state
 */
export function initializeSimulation(scenario: Scenario = 'pressure-tactics'): SimulationState {
  return {
    turn: 0,
    leverage: 0,
    previousTactic: null,
    usedLines: new Set(),
    messages: [],
  }
}

/**
 * Gets the maximum number of turns for the simulation
 */
export function getMaxTurns(): number {
  // Random between 5-7 turns
  return 5 + Math.floor(Math.random() * 3)
}

export interface SimulationResults {
  grade: 'A' | 'B' | 'C'
  finalLeverage: LeverageState
  weakResponseCount: number
  avoidedPaymentAnchoring: boolean
  pressureResistance: number
  clarityScore: number
  bestMoves: string[]
  improvementPoint: string
}

/**
 * Calculates simulation results and grade
 */
export function calculateResults(state: SimulationState): SimulationResults {
  const messages = state.messages
  const userMessages = messages.filter(m => m.type === 'user')
  
  // Count weak responses
  const weakResponseCount = userMessages.filter(m => m.classification === 'weak').length
  
  // Check if user avoided payment anchoring
  // User avoided it if they never asked about payment AND never responded weakly to payment_anchoring tactics
  const askedAboutPayment = userMessages.some(m => m.intent === 'ask_payment')
  const respondedToPaymentAnchoring = messages.some((m, i) => {
    if (m.type === 'dealer' && m.dealerTactic === 'payment_anchoring') {
      const nextUserMsg = messages[i + 1]
      return nextUserMsg && nextUserMsg.type === 'user' && nextUserMsg.classification === 'weak'
    }
    return false
  })
  const avoidedPaymentAnchoring = !askedAboutPayment && !respondedToPaymentAnchoring
  
  // Calculate Pressure Resistance: count of strong/neutral responses when dealer used urgency/scarcity
  let pressureResistance = 0
  for (let i = 0; i < messages.length - 1; i++) {
    const dealerMsg = messages[i]
    const userMsg = messages[i + 1]
    if (dealerMsg.type === 'dealer' && userMsg.type === 'user') {
      const tactic = dealerMsg.dealerTactic
      if ((tactic === 'urgency' || tactic === 'scarcity') && 
          (userMsg.classification === 'strong' || userMsg.classification === 'neutral')) {
        pressureResistance++
      }
    }
  }
  
  // Calculate Clarity Score: count of ask_breakdown / OTD requests
  const clarityScore = userMessages.filter(m => 
    m.intent === 'ask_breakdown' || 
    (m.text.toLowerCase().includes('otd') || m.text.toLowerCase().includes('out the door') || m.text.toLowerCase().includes('breakdown'))
  ).length
  
  // Find top 2 best moves (strong responses with helpful intents)
  const bestMoves = userMessages
    .filter(m => m.classification === 'strong' && m.feedback)
    .map(m => m.feedback!.tryInstead)
    .slice(0, 2)
  
  // If we don't have 2 best moves, add strong responses
  if (bestMoves.length < 2) {
    const additionalMoves = userMessages
      .filter(m => m.classification === 'strong' && !bestMoves.includes(m.feedback?.tryInstead || ''))
      .map(m => m.feedback?.tryInstead || m.text)
      .slice(0, 2 - bestMoves.length)
    bestMoves.push(...additionalMoves)
  }
  
  // Generate improvement point
  let improvementPoint = ''
  if (weakResponseCount > 0) {
    improvementPoint = 'Avoid showing urgency or desperation. Stay calm and maintain your timeline.'
  } else if (clarityScore === 0) {
    improvementPoint = 'Ask for the OTD breakdown early. It keeps you focused on the total price.'
  } else if (pressureResistance < 2) {
    improvementPoint = 'Practice resisting urgency and scarcity tactics. You have time to decide.'
  } else if (!avoidedPaymentAnchoring) {
    improvementPoint = 'Avoid discussing monthly payments. Focus on the out-the-door price instead.'
  } else {
    improvementPoint = 'Great job! Keep practicing to maintain consistency across all scenarios.'
  }
  
  // Calculate grade
  let grade: 'A' | 'B' | 'C' = 'C'
  
  // Grade factors:
  // - Leverage: +1 for each point (max +2)
  // - Weak responses: -1 for each (penalty)
  // - Avoided payment anchoring: +2 bonus
  // - Pressure resistance: +0.5 for each (max +3)
  // - Clarity score: +1 for each (max +3)
  
  let score = 0
  score += state.leverage // -2 to +2
  score -= weakResponseCount // penalty
  if (avoidedPaymentAnchoring) score += 2
  score += Math.min(pressureResistance * 0.5, 3)
  score += Math.min(clarityScore, 3)
  
  // Grade thresholds (adjusted for typical scores)
  if (score >= 5) {
    grade = 'A'
  } else if (score >= 2) {
    grade = 'B'
  } else {
    grade = 'C'
  }
  
  return {
    grade,
    finalLeverage: state.leverage,
    weakResponseCount,
    avoidedPaymentAnchoring,
    pressureResistance,
    clarityScore,
    bestMoves: bestMoves.length > 0 ? bestMoves : ['Keep practicing strong responses'],
    improvementPoint,
  }
}

/**
 * Calculates simulation results and grade
 */
export function calculateResults(state: SimulationState): SimulationResults {
  const messages = state.messages
  const userMessages = messages.filter(m => m.type === 'user')
  
  // Count weak responses
  const weakResponseCount = userMessages.filter(m => m.classification === 'weak').length
  
  // Check if user avoided payment anchoring
  // User avoided it if they never asked about payment AND never responded weakly to payment_anchoring tactics
  const askedAboutPayment = userMessages.some(m => m.intent === 'ask_payment')
  const respondedToPaymentAnchoring = messages.some((m, i) => {
    if (m.type === 'dealer' && m.dealerTactic === 'payment_anchoring') {
      const nextUserMsg = messages[i + 1]
      return nextUserMsg && nextUserMsg.type === 'user' && nextUserMsg.classification === 'weak'
    }
    return false
  })
  const avoidedPaymentAnchoring = !askedAboutPayment && !respondedToPaymentAnchoring
  
  // Calculate Pressure Resistance: count of strong/neutral responses when dealer used urgency/scarcity
  let pressureResistance = 0
  for (let i = 0; i < messages.length - 1; i++) {
    const dealerMsg = messages[i]
    const userMsg = messages[i + 1]
    if (dealerMsg.type === 'dealer' && userMsg.type === 'user') {
      const tactic = dealerMsg.dealerTactic
      if ((tactic === 'urgency' || tactic === 'scarcity') && 
          (userMsg.classification === 'strong' || userMsg.classification === 'neutral')) {
        pressureResistance++
      }
    }
  }
  
  // Calculate Clarity Score: count of ask_breakdown / OTD requests
  const clarityScore = userMessages.filter(m => 
    m.intent === 'ask_breakdown' || 
    (m.text.toLowerCase().includes('otd') || m.text.toLowerCase().includes('out the door') || m.text.toLowerCase().includes('breakdown'))
  ).length
  
  // Find top 2 best moves (strong responses with helpful intents)
  const bestMoves = userMessages
    .filter(m => m.classification === 'strong' && m.feedback)
    .map(m => m.feedback!.tryInstead)
    .slice(0, 2)
  
  // If we don't have 2 best moves, add strong responses
  if (bestMoves.length < 2) {
    const additionalMoves = userMessages
      .filter(m => m.classification === 'strong' && !bestMoves.includes(m.feedback?.tryInstead || ''))
      .map(m => m.feedback?.tryInstead || m.text)
      .slice(0, 2 - bestMoves.length)
    bestMoves.push(...additionalMoves)
  }
  
  // Generate improvement point
  let improvementPoint = ''
  if (weakResponseCount > 0) {
    improvementPoint = 'Avoid showing urgency or desperation. Stay calm and maintain your timeline.'
  } else if (clarityScore === 0) {
    improvementPoint = 'Ask for the OTD breakdown early. It keeps you focused on the total price.'
  } else if (pressureResistance < 2) {
    improvementPoint = 'Practice resisting urgency and scarcity tactics. You have time to decide.'
  } else if (!avoidedPaymentAnchoring) {
    improvementPoint = 'Avoid discussing monthly payments. Focus on the out-the-door price instead.'
  } else {
    improvementPoint = 'Great job! Keep practicing to maintain consistency across all scenarios.'
  }
  
  // Calculate grade
  let grade: 'A' | 'B' | 'C' = 'C'
  
  // Grade factors:
  // - Leverage: +1 for each point (max +2)
  // - Weak responses: -1 for each (penalty)
  // - Avoided payment anchoring: +2 bonus
  // - Pressure resistance: +0.5 for each (max +3)
  // - Clarity score: +1 for each (max +3)
  
  let score = 0
  score += state.leverage // -2 to +2
  score -= weakResponseCount // penalty
  if (avoidedPaymentAnchoring) score += 2
  score += Math.min(pressureResistance * 0.5, 3)
  score += Math.min(clarityScore, 3)
  
  // Grade thresholds (adjusted for typical scores)
  if (score >= 5) {
    grade = 'A'
  } else if (score >= 2) {
    grade = 'B'
  } else {
    grade = 'C'
  }
  
  return {
    grade,
    finalLeverage: state.leverage,
    weakResponseCount,
    avoidedPaymentAnchoring,
    pressureResistance,
    clarityScore,
    bestMoves: bestMoves.length > 0 ? bestMoves : ['Keep practicing strong responses'],
    improvementPoint,
  }
}


