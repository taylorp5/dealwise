/**
 * Price candidate extraction and scoring
 * Prevents selecting monthly payments, MSRP, or conditional prices
 */

export type PriceSource = 'jsonld' | 'state' | 'dom' | 'meta' | 'regex'

export interface PriceCandidate {
  value: number
  label: string // inferred from nearby text
  source: PriceSource
  context: string // ~80 chars around it
  score: number
  isLikelyMonthlyPayment: boolean
  isLikelyMsrp: boolean
  isLikelyDiscount: boolean
  isLikelyConditional: boolean // with trade-in, with financing, etc.
}

/**
 * Extract price candidates from text with context
 */
export function extractPriceCandidates(
  text: string,
  source: PriceSource,
  contextWindow: number = 80
): PriceCandidate[] {
  const candidates: PriceCandidate[] = []
  const priceRegex = /\$[\d,]+/g
  const matches = [...text.matchAll(priceRegex)]
  
  for (const match of matches) {
    const priceStr = match[0]
    const price = parseFloat(priceStr.replace(/[$,]/g, ''))
    
    if (isNaN(price) || price < 500 || price > 250000) continue
    
    const matchIndex = match.index || 0
    const start = Math.max(0, matchIndex - contextWindow)
    const end = Math.min(text.length, matchIndex + priceStr.length + contextWindow)
    const context = text.substring(start, end).trim()
    
    // Infer label from context
    const contextLower = context.toLowerCase()
    let label = 'price'
    
    if (contextLower.includes('internet price') || contextLower.includes('e-price')) {
      label = 'Internet Price'
    } else if (contextLower.includes('sale price') || contextLower.includes('our price')) {
      label = 'Sale Price'
    } else if (contextLower.includes('dealer price')) {
      label = 'Dealer Price'
    } else if (contextLower.includes('final price') || contextLower.includes("today's price")) {
      label = 'Final Price'
    } else if (contextLower.includes('msrp') || contextLower.includes('sticker') || contextLower.includes('retail')) {
      label = 'MSRP'
    } else if (contextLower.includes('list price')) {
      label = 'List Price'
    }
    
    // Detect flags
    const isLikelyMonthlyPayment = 
      contextLower.includes('/mo') ||
      contextLower.includes('per month') ||
      contextLower.includes('monthly') ||
      contextLower.includes('biweekly') ||
      contextLower.includes('lease') ||
      contextLower.includes('payment')
    
    const isLikelyMsrp = 
      contextLower.includes('msrp') ||
      contextLower.includes('sticker') ||
      contextLower.includes('retail') ||
      contextLower.includes('manufacturer')
    
    const isLikelyDiscount = 
      contextLower.includes('save') ||
      contextLower.includes('discount') ||
      contextLower.includes('off') ||
      contextLower.includes('reduced')
    
    const isLikelyConditional = 
      contextLower.includes('with trade') ||
      contextLower.includes('with approved') ||
      contextLower.includes('after incentives') ||
      contextLower.includes('starting at') ||
      contextLower.includes('from') ||
      contextLower.includes('as low as') ||
      contextLower.includes('est.') ||
      contextLower.includes('estimate') ||
      contextLower.includes('calculator')
    
    candidates.push({
      value: price,
      label,
      source,
      context,
      score: 0, // Will be calculated
      isLikelyMonthlyPayment,
      isLikelyMsrp,
      isLikelyDiscount,
      isLikelyConditional,
    })
  }
  
  return candidates
}

/**
 * Score and rank price candidates
 */
export function scorePriceCandidates(candidates: PriceCandidate[]): PriceCandidate[] {
  return candidates.map(candidate => {
    let score = 50 // Base score
    
    // Hard negative filters - reject if these are present
    if (candidate.isLikelyMonthlyPayment) {
      score -= 100 // Strong rejection
    }
    if (candidate.isLikelyConditional) {
      score -= 80 // Strong rejection
    }
    
    // Label-based scoring
    if (candidate.label === 'Internet Price' || candidate.label === 'Sale Price' || 
        candidate.label === 'Our Price' || candidate.label === 'Dealer Price' ||
        candidate.label === 'Final Price' || candidate.label === "Today's Price") {
      score += 40 // Strong boost
    } else if (candidate.label === 'MSRP' || candidate.label === 'Sticker' || candidate.label === 'Retail') {
      score -= 20 // Penalty
    } else if (candidate.label === 'List Price') {
      score -= 10 // Small penalty
    }
    
    // Source-based scoring
    if (candidate.source === 'jsonld') {
      score += 20
    } else if (candidate.source === 'state') {
      score += 15
    } else if (candidate.source === 'meta') {
      score += 10
    } else if (candidate.source === 'regex') {
      score -= 10 // Penalty for regex-only
    }
    
    // Numeric sanity
    if (candidate.value < 2000) {
      score -= 30 // Likely a down payment or monthly payment
    }
    
    // Discount indicator (positive if it's a sale price)
    if (candidate.isLikelyDiscount && !candidate.isLikelyMsrp) {
      score += 10
    }
    
    return { ...candidate, score }
  })
}

/**
 * Pick the best price candidate
 */
export function pickBestPrice(candidates: PriceCandidate[]): {
  best?: PriceCandidate
  ranked: PriceCandidate[]
} {
  if (candidates.length === 0) {
    return { ranked: [] }
  }
  
  // Score all candidates
  const scored = scorePriceCandidates(candidates)
  
  // Sort by score (highest first)
  const ranked = scored.sort((a, b) => b.score - a.score)
  
  // Filter out rejected candidates (negative scores)
  const valid = ranked.filter(c => c.score > 0)
  
  if (valid.length === 0) {
    return { ranked }
  }
  
  const best = valid[0]
  const secondBest = valid[1]
  
  // Special case: if best is MSRP and second is sale price, prefer sale price
  if (best.isLikelyMsrp && secondBest && 
      (secondBest.label === 'Sale Price' || secondBest.label === 'Internet Price' || secondBest.label === 'Our Price') &&
      best.value > secondBest.value * 1.25) {
    return { best: secondBest, ranked }
  }
  
  return { best, ranked }
}


