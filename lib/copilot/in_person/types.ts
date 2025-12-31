// In-Person Negotiation Copilot Types

export interface InPersonDealState {
  vehiclePrice: number
  targetOTD: number
  dealerCurrentOTD?: number
  lastDealerOTD?: number
  stateCode: string
  situation: string
  dealerSaid?: string
  ladder: {
    ask: number
    agree: number
    walk: number
    locked: boolean
  }
  confidence: {
    level: 'green' | 'yellow' | 'red'
    reason: string
    whatWouldChange: string[]
  }
  decoder: {
    tactic: string
    whyNow: string
    risk: string
    bestResponse: string
  }
  coachOutput: {
    sayThis: string
    ifPushback: string
    ifManager: string
    stopSignal: string
    closingLine: string
    redFlags: string[]
    doNotSay: string[]
    nextBestMove: string
    alerts: string[]
  }
  timeline: Array<{
    ts: number
    who: 'you' | 'dealer' | 'coach'
    label: string
    details?: string
  }>
  meta: {
    mode: 'in_person'
    aiEnabled: boolean
  }
}

export interface InPersonAPIRequest {
  vehiclePrice: number
  targetOTD: number
  dealerCurrentOTD?: number
  lastDealerOTD?: number // For trend calculation
  stateCode: string
  situation?: string // Optional - can be inferred from step/context
  dealerSaid?: string
  step: 0 | 1 | 2 | 3 | 4
  quickAction?: string // Optional quick action ID
  ladder: {
    ask: number
    agree: number
    walk: number
    locked: boolean
  }
}

export interface InPersonAPIResponse {
  tacticLabel: string
  tacticType: 'payment_anchoring' | 'urgency' | 'addons' | 'fees' | 'manager' | 'counter_otd' | 'trade_in_lowball' | 'stalling' | 'standard'
  nextMove: string
  sayThis: string
  ifPushback: string
  ifManager: string
  stopSignal: string
  closingLine: string
  redFlags: string[]
  doNotSay: string[]
}

