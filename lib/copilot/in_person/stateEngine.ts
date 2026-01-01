// In-Person Negotiation State Engine
import type { InPersonDealState } from './types'

export function computeGap(dealerOTD: number | undefined, targetOTD: number): number | null {
  if (dealerOTD === undefined) return null
  return dealerOTD - targetOTD
}

export function computeTrend(
  currentOTD: number | undefined,
  lastOTD: number | undefined
): 'improving' | 'worsening' | 'stalled' | null {
  if (currentOTD === undefined || lastOTD === undefined) return null
  if (currentOTD < lastOTD) return 'improving'
  if (currentOTD > lastOTD) return 'worsening'
  return 'stalled'
}

export function computeConfidence(
  dealerOTD: number | undefined,
  targetOTD: number
): { level: 'green' | 'yellow' | 'red'; reason: string; whatWouldChange: string[] } {
  if (dealerOTD === undefined) {
    return {
      level: 'yellow',
      reason: 'Waiting for dealer OTD to assess confidence',
      whatWouldChange: ['Get itemized OTD breakdown', 'Confirm all fees included', 'Verify no hidden add-ons'],
    }
  }

  const gap = dealerOTD - targetOTD

  if (gap <= 300) {
    return {
      level: 'green',
      reason: `Dealer is within $${Math.abs(gap).toLocaleString()} of your target. Very reasonable.`,
      whatWouldChange: ['Dealer adds mandatory add-ons', 'Fees increase unexpectedly', 'Trade-in value drops'],
    }
  } else if (gap <= 1000) {
    return {
      level: 'yellow',
      reason: `Dealer is $${gap.toLocaleString()} above target. Negotiable but needs work.`,
      whatWouldChange: ['Ask for itemized OTD breakdown', 'Request removal of optional add-ons', 'Negotiate doc fee reduction', 'Leave and follow up in 24 hours'],
    }
  } else {
    return {
      level: 'red',
      reason: `Dealer is $${gap.toLocaleString()} above target. Aggressive gap.`,
      whatWouldChange: ['Dealer reduces sale price significantly', 'Major add-ons removed', 'Trade-in value increases', 'Walk away and negotiate elsewhere'],
    }
  }
}

export function classifyTacticFromSituation(situation: string): string {
  const lower = situation.toLowerCase()
  if (lower.includes('monthly payment')) return 'Payment anchoring'
  if (lower.includes('add-ons') || lower.includes('mandatory')) return 'Add-on shove'
  if (lower.includes('fees') && lower.includes('non-negotiable')) return 'Fee wall'
  if (lower.includes('manager')) return 'Manager escalation'
  if (lower.includes('sign today') || lower.includes('commit')) return 'Commitment pressure'
  if (lower.includes('someone else') || lower.includes('urgency')) return 'Urgency'
  if (lower.includes('trade-in') || lower.includes('lowball')) return 'Trade-in lowball'
  if (lower.includes('counter')) return 'Counter offer'
  return 'Standard negotiation'
}

export function parseDealerOTDFromText(text: string): number | null {
  // Look for dollar amounts
  const dollarMatches = text.match(/\$[\d,]+/g)
  if (!dollarMatches || dollarMatches.length === 0) return null

  // Try to find the largest reasonable number (likely the OTD)
  const amounts = dollarMatches
    .map((match) => parseFloat(match.replace(/[$,]/g, '')))
    .filter((amount) => !isNaN(amount) && amount > 1000 && amount < 200000)

  if (amounts.length === 0) return null

  // Return the largest amount (most likely to be OTD)
  return Math.max(...amounts)
}

export function detectTacticsFromText(text: string): string[] {
  const lower = text.toLowerCase()
  const tactics: string[] = []

  if (lower.includes('monthly') || lower.includes('payment')) {
    tactics.push('Payment anchoring')
  }
  if (lower.includes('today only') || lower.includes('someone else') || lower.includes('won\'t last')) {
    tactics.push('Urgency')
  }
  if (lower.includes('add-on') || lower.includes('protection') || lower.includes('nitrogen') || lower.includes('etch')) {
    tactics.push('Add-on shove')
  }
  if (lower.includes('manager') || lower.includes('talk to my manager')) {
    tactics.push('Manager escalation')
  }
  if (lower.includes('fees') && (lower.includes('non-negotiable') || lower.includes('fixed'))) {
    tactics.push('Fee wall')
  }
  if (lower.includes('sign today') || lower.includes('commit now')) {
    tactics.push('Commitment pressure')
  }
  if (lower.includes('trade') && (lower.includes('low') || lower.includes('best'))) {
    tactics.push('Trade-in lowball')
  }

  return tactics.length > 0 ? tactics : ['Standard negotiation']
}

export function validateLadderContradiction(
  output: string,
  ladder: { ask: number; agree: number; walk: number; locked: boolean }
): boolean {
  if (!ladder.locked) return true

  // Extract numbers from output
  const numbers = output.match(/\$[\d,]+/g)
  if (!numbers) return true

  const amounts = numbers.map((match) => parseFloat(match.replace(/[$,]/g, ''))).filter((n) => !isNaN(n))

  // Check if any amount exceeds walk-away
  return !amounts.some((amount) => amount > ladder.walk)
}

export function addTimelineEvent(
  state: InPersonDealState,
  who: 'you' | 'dealer' | 'coach',
  label: string,
  details?: string
): InPersonDealState {
  return {
    ...state,
    timeline: [
      ...state.timeline,
      {
        ts: Date.now(),
        who,
        label,
        details,
      },
    ],
  }
}

export function generateDeterministicDecoder(
  situation: string,
  dealerSaid?: string
): { tactic: string; whyNow: string; risk: string; bestResponse: string } {
  const tactic = classifyTacticFromSituation(situation)
  const detectedTactics = dealerSaid ? detectTacticsFromText(dealerSaid) : [tactic]

  let whyNow = 'Standard negotiation tactic'
  let risk = 'Low'
  let bestResponse = 'Stay firm on your target OTD'

  if (detectedTactics.includes('Payment anchoring')) {
    whyNow = 'They want to shift focus from total cost to monthly payment'
    risk = 'High - can hide true cost'
    bestResponse = 'Redirect to OTD: "I focus on total out-the-door price, not monthly payments"'
  } else if (detectedTactics.includes('Urgency')) {
    whyNow = 'Creating false scarcity to pressure quick decision'
    risk = 'Medium - may cause rushed decision'
    bestResponse = 'Acknowledge but stay firm: "I understand, but I still need $X OTD"'
  } else if (detectedTactics.includes('Add-on shove')) {
    whyNow = 'Adding mandatory items to increase total cost'
    risk = 'High - can inflate OTD significantly'
    bestResponse = 'Request breakdown and ask which add-ons are removable'
  } else if (detectedTactics.includes('Manager escalation')) {
    whyNow = 'Using authority figure to apply pressure'
    risk = 'Medium - psychological pressure'
    bestResponse = 'Be firm and direct: "I need $X OTD. Can you make that happen?"'
  } else if (detectedTactics.includes('Fee wall')) {
    whyNow = 'Claiming fees are fixed to prevent negotiation'
    risk = 'Medium - may be negotiable despite claim'
    bestResponse = 'Request itemized breakdown and offer to adjust sale price to hit target OTD'
  } else if (detectedTactics.includes('Commitment pressure')) {
    whyNow = 'Pushing for immediate commitment before full disclosure'
    risk = 'High - may hide costs'
    bestResponse = 'Set condition: "I sign when the OTD sheet matches $X"'
  }

  return {
    tactic: detectedTactics[0],
    whyNow,
    risk,
    bestResponse,
  }
}






