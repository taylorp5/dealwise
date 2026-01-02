// API Types
// ============================================================================

// Generate Script API
// ============================================================================
export interface GenerateScriptRequest {
  // Legacy fields (for backward compatibility)
  tone?: 'professional' | 'friendly' | 'firm' | 'casual'
  goal?: 'negotiate_price' | 'request_info' | 'schedule_test_drive' | 'make_offer' | 'counter_offer'
  carContext: string
  dealId?: string
  // New wizard-based fields
  wizardAnswers?: {
    communicationMethod: 'remote' | 'in_person'
    paymentMethod: 'cash' | 'finance' | 'unsure'
    experienceLevel: 'first_time' | 'experienced'
    currentStage: 'just_starting' | 'comparing_offers' | 'sitting_on_offer' | 'ready_to_close'
    helpNeeded:
      | 'negotiate_price'
      | 'ask_otd'
      | 'push_back_fees'
      | 'trade_in_value'
      | 'financing_questions'
      | 'general_guidance'
  }
  buyerType?: string
  selectedPackId?: string
  packAnswers?: Record<string, any>
  // New: Competitive context
  competitiveOffers?: Array<{
    dealer: string
    price: number
    otdPrice?: number
    distance?: string
    notes?: string
  }>
  previousAnalyses?: any[]
  // Packs
  packType?: string
}

export interface ConversationFlow {
  userOpening: string
  scenarios: {
    dealerResponse: string
    userOptions: {
      response: string
      whenToUse: string
    }[]
    notes?: string
  }[]
}

export interface GenerateScriptResponse {
  success: boolean
  analysisId?: string
  dealId?: string
  data: {
    script: string // The generated negotiation message or talking points
    followUps?: string[] // Follow-up lines if dealer pushes back
    conversationFlow?: ConversationFlow | null // Conversation guide for in-person negotiations
    keyPoints: string[] // Important points covered in the script
    tips: string[] // Additional negotiation tips
    educationalHints?: string[] // What to watch out for, dealer tactics
  }
  error?: string
}

// Analyze Listing API
// ============================================================================
export interface AnalyzeListingRequest {
  listingUrl: string
  dealId?: string
  // Buyer registration location (for tax calculation)
  registrationState?: string // Required for accurate tax calculation
  registrationZip?: string // Optional but strongly recommended for accurate rates
  packVariant?: 'free' | 'first_time' | 'in_person' // Pack variant for conditional logic
  confirmedData?: Partial<{
    price?: number
    year?: number
    make?: string
    model?: string
    trim?: string
    mileage?: number
    vehicleCondition?: 'new' | 'used' | 'cpo' | 'unknown'
    vin?: string
    dealerName?: string
    dealerCity?: string
    dealerState?: string
    zip?: string
  }>
}

export interface DealPlan {
  // 1. Bottom-Line Targets
  targets: {
    askingPrice: number
    estimatedFairPrice: number // Midpoint estimate
    strongOpeningOffer: number // More aggressive
    acceptableDealPrice: number // User-friendly target
    walkAwayOTDCeiling: number // OTD threshold
    percentRange?: string // Supporting detail (e.g., "3-7% below asking")
    estimationMethod?: string // How we estimated
  }
  
  // 2. Dealer Leverage Assessment
  leverage: {
    points: Array<{
      factor: string
      score: number // 0-100
      strength: 'high' | 'medium' | 'low'
      explanation: string
    }>
    bestAngles: string[] // Top 2-3 leverage angles
    overallScore?: number // 0-100 overall leverage score
  }
  
  // 3. Expected OTD Reality Check
  otdEstimate: {
    assumptions: {
      registrationState?: string // Buyer registration state
      registrationZip?: string // Buyer registration ZIP (if provided)
      taxRate: {
        value?: number // Combined rate if ZIP lookup succeeded
        range: { low: number; high: number } // Range if only state provided
        stateBaseRate?: number // State base rate
        estimatedLocalAddOn?: number // Estimated local tax add-on
        combinedRate?: number // Combined state + local rate (if ZIP lookup succeeded)
        confidence?: 'high' | 'medium' | 'low' // Confidence level
        source?: 'zip_lookup' | 'state_table' | 'state_estimate' // Source of rate
        disclaimer?: string // Disclaimer about tax accuracy
      }
      docFee: { value?: number; range: { low: number; high: number } }
      registrationTitle: { value?: number; range: { low: number; high: number } }
      dealerAddOns: { value: number; riskBand: { low: number; high: number } }
    }
    expectedOTD: {
      low: number
      expected: number
      high: number
    }
    warningThreshold: number // If OTD > this, fees/add-ons are inflated
    checklist: string[] // Request itemized OTD, etc.
  }
  
  // 4. Likely Dealer Tactics + Counters
  tactics: Array<{
    tactic: string
    likelihood: 'high' | 'medium' | 'low'
    counter: string // 1-2 sentence counter-script
    pack?: string // Which pack unlocks this (if applicable)
  }>
  
  // 5. Ready-to-Send Scripts
  scripts: Array<{
    title: string
    text: string
    pack?: string // Which pack unlocks this (if applicable)
  }>
  
  // 6. Next Best Move
  nextMoves: {
    copilotLink: {
      vehiclePrice: string
      desiredOTD: string
      stage: string
      goal: string
      carContext: string
      dealerMessage?: string // If user pasted a message
    }
    otdBuilderLink: {
      price: string
      state?: string
    }
    comparisonLink: {
      dealer: string
      price: number
      otdLow?: number
      otdHigh?: number
      notes?: string
    }
  }
  
  // Supporting data
  marketData?: {
    comparableRange: { low: number; high: number } | null
    marketComparison: string
  }
}

export interface PriceCandidate {
  value: number
  label: string
  source: 'jsonld' | 'state' | 'dom' | 'meta' | 'regex' | 'platform'
  context: string
  score: number
  flags: {
    isMsrp: boolean
    isMonthlyPayment: boolean
    isConditional: boolean
  }
}

export interface MileageCandidate {
  value: number
  source: 'jsonld' | 'state' | 'dom' | 'meta' | 'regex' | 'platform'
  context: string
  score: number
}

export interface FetchDebug {
  contentType?: string
  contentLength?: number
  attemptedHeaders?: string[]
  timeoutMs?: number
}

export interface ExtractionDiagnostics {
  sourceUrl: string
  finalUrl?: string
  pageTitle?: string | null
  fetchStatus?: number
  blocked: boolean
  errorType?: string // Real error type from fetch-listing (timeout, dns, tls, etc.)
  errorMessage?: string // Real error message from fetch-listing, not "No extraction performed"
  blockReason?: string
  contentType?: string
  contentLength?: number
  fetchDebug?: FetchDebug
  platformDetected: string
  extractionStrategyUsed: string
  confidence: number
  issues: string[] // May include "No extraction performed" but errorMessage stays intact
  priceCandidates: PriceCandidate[]
  mileageCandidates: MileageCandidate[]
}

export interface AnalyzeListingResponse {
  success: boolean
  analysisId?: string
  dealId?: string
  data: DealPlan | null // null when blocked without confirmedData
  extractionResult?: any // ListingData from extractor
  diagnostics?: ExtractionDiagnostics // Fetch + candidate rankings + platform + strategy
  error?: string
  requiresUserInput?: boolean // true when manual entry is needed (blocked/failed extraction)
  // Legacy fields for backward compatibility
  dealPlan?: DealPlan | null
  extractedListing?: any
  needsReview?: boolean
  listingData?: any
}

// Interpret Dealer Message API
// ============================================================================
export interface InterpretDealerRequest {
  dealerMessage: string
  dealId?: string
  carContext?: string
}

export interface InterpretDealerResponse {
  success: boolean
  analysisId?: string
  dealId?: string
  data: {
    explanation: string
    keyPoints: string[]
    recommendedResponse?: string
    redFlags: string[]
    nextSteps: string[]
  }
  error?: string
}

// Compare Offers API
// ============================================================================
export interface CompareOffersRequest {
  offers: Array<{
    dealer: string
    price: number
    otdPrice?: number
    notes?: string
  }>
  dealId?: string
}

export interface CompareOffersResponse {
  success: boolean
  analysisId?: string
  dealId?: string
  data: {
    comparison: string
    bestOffer: number
    recommendations: string[]
    keyPoints: string[]
  }
  error?: string
}
