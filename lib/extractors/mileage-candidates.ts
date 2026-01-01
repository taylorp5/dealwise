/**
 * Mileage candidate extraction and scoring
 * Avoids warranty/service interval numbers
 */

export interface MileageCandidate {
  value: number
  label: string
  context: string
  score: number
  isLikelyWarranty: boolean
  isLikelyServiceInterval: boolean
  isLikelyEstimated: boolean
}

/**
 * Extract mileage candidates from text
 */
export function extractMileageCandidates(text: string, contextWindow: number = 80): MileageCandidate[] {
  const candidates: MileageCandidate[] = []
  
  // Pattern 1: "45,000 mi" or "45000 miles"
  const pattern1 = /(\d{1,3}(?:[,\s]\d{3})*)\s*(?:mi|miles?)/gi
  const matches1 = [...text.matchAll(pattern1)]
  
  for (const match of matches1) {
    const mileageStr = match[0]
    const mileage = parseInt(match[1].replace(/[,\s]/g, ''))
    
    if (isNaN(mileage) || mileage < 0 || mileage > 400000) continue
    
    const matchIndex = match.index || 0
    const start = Math.max(0, matchIndex - contextWindow)
    const end = Math.min(text.length, matchIndex + mileageStr.length + contextWindow)
    const context = text.substring(start, end).trim()
    
    const contextLower = context.toLowerCase()
    let label = 'mileage'
    
    if (contextLower.includes('mileage') || contextLower.includes('odometer')) {
      label = 'Mileage'
    } else if (contextLower.includes('warranty')) {
      label = 'Warranty'
    } else if (contextLower.includes('service')) {
      label = 'Service'
    }
    
    const isLikelyWarranty = contextLower.includes('warranty') || contextLower.includes('coverage')
    const isLikelyServiceInterval = contextLower.includes('service interval') || contextLower.includes('maintenance')
    const isLikelyEstimated = contextLower.includes('est.') || contextLower.includes('estimate') || contextLower.includes('approximately')
    
    candidates.push({
      value: mileage,
      label,
      context,
      score: 0,
      isLikelyWarranty,
      isLikelyServiceInterval,
      isLikelyEstimated,
    })
  }
  
  // Pattern 2: "45k mi"
  const pattern2 = /(\d+(?:\.\d+)?)\s*k\s*(?:mi|miles?)?/gi
  const matches2 = [...text.matchAll(pattern2)]
  
  for (const match of matches2) {
    const mileage = Math.round(parseFloat(match[1]) * 1000)
    
    if (isNaN(mileage) || mileage < 0 || mileage > 400000) continue
    
    const matchIndex = match.index || 0
    const start = Math.max(0, matchIndex - contextWindow)
    const end = Math.min(text.length, matchIndex + match[0].length + contextWindow)
    const context = text.substring(start, end).trim()
    
    const contextLower = context.toLowerCase()
    const isLikelyWarranty = contextLower.includes('warranty')
    const isLikelyServiceInterval = contextLower.includes('service interval')
    const isLikelyEstimated = contextLower.includes('est.') || contextLower.includes('estimate')
    
    candidates.push({
      value: mileage,
      label: 'Mileage',
      context,
      score: 0,
      isLikelyWarranty,
      isLikelyServiceInterval,
      isLikelyEstimated,
    })
  }
  
  return candidates
}

/**
 * Score and rank mileage candidates
 */
export function scoreMileageCandidates(candidates: MileageCandidate[]): MileageCandidate[] {
  return candidates.map(candidate => {
    let score = 50 // Base score
    
    // Hard negative filters
    if (candidate.isLikelyWarranty) {
      score -= 100
    }
    if (candidate.isLikelyServiceInterval) {
      score -= 100
    }
    if (candidate.isLikelyEstimated) {
      score -= 50
    }
    
    // Boost if near mileage/odometer keywords
    const contextLower = candidate.context.toLowerCase()
    if (contextLower.includes('mileage') || contextLower.includes('odometer')) {
      score += 30
    }
    
    // Penalize absurd values
    if (candidate.value > 400000) {
      score -= 50
    }
    
    return { ...candidate, score }
  })
}

/**
 * Pick the best mileage candidate
 */
export function pickBestMileage(candidates: MileageCandidate[]): {
  best?: MileageCandidate
  ranked: MileageCandidate[]
} {
  if (candidates.length === 0) {
    return { ranked: [] }
  }
  
  const scored = scoreMileageCandidates(candidates)
  const ranked = scored.sort((a, b) => b.score - a.score)
  const valid = ranked.filter(c => c.score > 0)
  
  return { best: valid[0], ranked }
}






