// Stable dealer offer parsing with confirmation logic

export interface ParsedOffer {
  amount: number
  confidence: 'high' | 'medium' | 'low'
  source: string // The matched text
}

/**
 * Parse dealer offer from text with strict rules to avoid spam
 * - Extract currency-like values: $12,345 or 12345
 * - Ignore values < 1000 unless preceded by "$" AND length >= 4
 * - Prefer values containing commas or 5+ digits
 * - If multiple candidates, pick the largest unless keywords suggest otherwise
 */
export function parseDealerOffer(text: string): ParsedOffer | null {
  if (!text || typeof text !== 'string') return null
  
  const trimmed = text.trim()
  if (trimmed.length === 0) return null

  // Pattern 1: $X,XXX or $XXXXX (with dollar sign)
  const dollarPattern = /\$[\d,]+/g
  const dollarMatches: Array<{ amount: number; source: string; confidence: 'high' | 'medium' | 'low' }> = []
  
  for (const match of trimmed.matchAll(dollarPattern)) {
    const cleaned = match[0].replace(/[$,]/g, '')
    const amount = parseFloat(cleaned)
    if (!isNaN(amount) && amount >= 1000 && amount <= 200000) {
      const hasComma = match[0].includes(',')
      dollarMatches.push({
        amount,
        source: match[0],
        confidence: hasComma ? 'high' : amount >= 10000 ? 'high' : 'medium',
      })
    }
  }

  // Pattern 2: Standalone numbers 5+ digits or 4 digits with context
  const numberPattern = /\b(\d{4,6})\b/g
  const numberMatches: Array<{ amount: number; source: string; confidence: 'high' | 'medium' | 'low' }> = []
  
  for (const match of trimmed.matchAll(numberPattern)) {
    const amount = parseFloat(match[1])
    if (!isNaN(amount) && amount >= 1000 && amount <= 200000) {
      // Check for context keywords that suggest it's an OTD
      const context = trimmed.substring(Math.max(0, match.index! - 20), Math.min(trimmed.length, match.index! + match[0].length + 20)).toLowerCase()
      const isOTDContext = context.includes('otd') || context.includes('out the door') || context.includes('total') || 
                           context.includes('offer') || context.includes('price') || context.includes('cost')
      
      if (amount >= 10000 || isOTDContext) {
        numberMatches.push({
          amount,
          source: match[1],
          confidence: amount >= 10000 ? 'high' : isOTDContext ? 'medium' : 'low',
        })
      }
    }
  }

  // Combine and deduplicate
  const allMatches = [...dollarMatches, ...numberMatches]
  
  if (allMatches.length === 0) return null

  // Remove duplicates (same amount)
  const uniqueMatches = allMatches.reduce((acc, match) => {
    const existing = acc.find(m => m.amount === match.amount)
    if (!existing || match.confidence === 'high') {
      return [...acc.filter(m => m.amount !== match.amount), match]
    }
    return acc
  }, [] as typeof allMatches)

  // Sort by confidence (high > medium > low) then by amount (largest first)
  uniqueMatches.sort((a, b) => {
    const confidenceOrder = { high: 3, medium: 2, low: 1 }
    const confDiff = confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
    if (confDiff !== 0) return confDiff
    return b.amount - a.amount
  })

  const bestMatch = uniqueMatches[0]
  if (!bestMatch) return null

  return {
    amount: bestMatch.amount,
    confidence: bestMatch.confidence,
    source: bestMatch.source,
  }
}


