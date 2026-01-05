// Live Pressure Mode Simulation Engine
// Simple, deterministic simulation for V2 MVP

export type Tactic = 'scarcity' | 'authority' | 'urgency'
export type ResponseClassification = 'strong' | 'neutral' | 'weak'
export type LeverageState = -2 | -1 | 0 | 1 | 2

export interface DealerLine {
  text: string
  tactic: Tactic
}

export interface ResponseFeedback {
  label: ResponseClassification
  reasons: string[]
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
    feedback?: ResponseFeedback
  }>
}

// Tactics Library - Canned dealer lines
const SCARCITY_LINES: DealerLine[] = [
  { text: "This is the last one on the lot. Another customer was looking at it this morning.", tactic: 'scarcity' },
  { text: "We've had three people call about this car today. I can't guarantee it'll be here tomorrow.", tactic: 'scarcity' },
  { text: "This model is selling fast. We only have two left in this color.", tactic: 'scarcity' },
]

const AUTHORITY_LINES: DealerLine[] = [
  { text: "My manager said this is the best price we can do. He's been here 20 years.", tactic: 'authority' },
  { text: "I already went to my manager twice. This is as low as we can go.", tactic: 'authority' },
  { text: "The manager approved this price, but only if you decide today.", tactic: 'authority' },
]

const URGENCY_LINES: DealerLine[] = [
  { text: "This price is only good for today. Tomorrow it goes back to MSRP.", tactic: 'urgency' },
  { text: "We have a special promotion ending tonight. After that, the price goes up $500.", tactic: 'urgency' },
  { text: "If you don't decide now, I can't guarantee this deal will still be available.", tactic: 'urgency' },
]

const TACTICS_LIBRARY: Record<Tactic, DealerLine[]> = {
  scarcity: SCARCITY_LINES,
  authority: AUTHORITY_LINES,
  urgency: URGENCY_LINES,
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

/**
 * Classifies a user response as Strong, Neutral, or Weak
 */
export function classifyResponse(text: string): ResponseFeedback {
  const lowerText = text.toLowerCase()
  
  // Check for strong indicators
  const strongMatches = STRONG_KEYWORDS.filter(keyword => lowerText.includes(keyword))
  if (strongMatches.length > 0) {
    return {
      label: 'strong',
      reasons: [
        `You showed you're not in a rush (${strongMatches[0]})`,
        'This keeps you in control of the negotiation',
      ],
    }
  }
  
  // Check for weak indicators
  const weakMatches = WEAK_KEYWORDS.filter(keyword => lowerText.includes(keyword))
  if (weakMatches.length > 0) {
    return {
      label: 'weak',
      reasons: [
        `You showed urgency/desperation (${weakMatches[0]})`,
        'This gives the dealer leverage to pressure you',
      ],
    }
  }
  
  // Default to neutral for questions or unclear responses
  return {
    label: 'neutral',
    reasons: [
      'Your response was neutral - neither strong nor weak',
      'Consider being more direct about your timeline or willingness to walk',
    ],
  }
}

/**
 * Selects the next dealer line based on current leverage and previous tactic
 */
export function nextDealerLine(
  leverage: LeverageState,
  previousTactic: Tactic | null,
  usedLines: Set<string>
): DealerLine {
  // If buyer has control (+1 or +2), dealer uses urgency or authority
  // If dealer has control (-1 or -2), dealer uses scarcity
  // If neutral (0), dealer uses any tactic
  
  let preferredTactics: Tactic[]
  
  if (leverage >= 1) {
    // Buyer in control - dealer tries urgency or authority
    preferredTactics = ['urgency', 'authority']
  } else if (leverage <= -1) {
    // Dealer in control - dealer uses scarcity to maintain pressure
    preferredTactics = ['scarcity', 'urgency']
  } else {
    // Neutral - dealer can use any tactic
    preferredTactics = ['scarcity', 'authority', 'urgency']
  }
  
  // Avoid repeating the same tactic if possible
  const availableTactics = preferredTactics.filter(t => t !== previousTactic)
  const tactic = availableTactics.length > 0 
    ? availableTactics[Math.floor(Math.random() * availableTactics.length)]
    : preferredTactics[Math.floor(Math.random() * preferredTactics.length)]
  
  // Get available lines for this tactic
  const lines = TACTICS_LIBRARY[tactic]
  const unusedLines = lines.filter(line => !usedLines.has(line.text))
  
  // If all lines used, reset and pick any
  const lineToUse = unusedLines.length > 0
    ? unusedLines[Math.floor(Math.random() * unusedLines.length)]
    : lines[Math.floor(Math.random() * lines.length)]
  
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
 * Initializes a new simulation state
 */
export function initializeSimulation(): SimulationState {
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


