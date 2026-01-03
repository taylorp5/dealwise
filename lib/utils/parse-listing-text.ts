/**
 * Parse listing text from "Copy from listing page" mode
 * Extracts price, mileage, dealer, city/state/zip with confidence scores
 */

import type { ListingData } from '@/lib/types/listing'

export interface ParsedTextResult {
  data: Partial<ListingData>
  confidence: Record<string, 'high' | 'med' | 'low'>
}

/**
 * Normalize whitespace in text
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Parse USD price from text
 */
function parsePrice(text: string): number | null {
  // Patterns: $25,000, $25000, 25,000, 25000
  const patterns = [
    /\$[\s]*([1-9]\d{2,3}(?:,\d{3})+|[1-9]\d{3,})/g,
    /price[:\s]*\$?([1-9]\d{2,3}(?:,\d{3})+|[1-9]\d{3,})/gi,
    /internet\s+price[:\s]*\$?([1-9]\d{2,3}(?:,\d{3})+|[1-9]\d{3,})/gi,
    /sale\s+price[:\s]*\$?([1-9]\d{2,3}(?:,\d{3})+|[1-9]\d{3,})/gi,
  ]
  
  const candidates: number[] = []
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const price = parseFloat(match[1].replace(/,/g, ''))
      if (price >= 500 && price <= 200000) {
        candidates.push(price)
      }
    }
  }
  
  if (candidates.length === 0) return null
  
  // Use most common price, or highest if tied
  const counts = new Map<number, number>()
  candidates.forEach(p => counts.set(p, (counts.get(p) || 0) + 1))
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  
  return sorted[0] ? Math.round(sorted[0][0]) : null
}

/**
 * Parse mileage from text
 */
function parseMileage(text: string): number | null {
  const patterns = [
    /(\d{1,3}(?:,\d{3})*)\s*(?:mi|miles?)/i,
    /mileage[:\s]*(\d{1,3}(?:,\d{3})*)/i,
    /(\d{1,3}(?:,\d{3})*)\s*(?:k\s*mi|k\s*miles?)/i,
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      let mileage = parseInt(match[1].replace(/,/g, ''))
      // Handle "k" suffix (e.g., "50k miles" = 50000)
      if (pattern.source.includes('k\\s*mi')) {
        mileage *= 1000
      }
      if (mileage >= 0 && mileage <= 500000) {
        return mileage
      }
    }
  }
  
  return null
}

/**
 * Parse dealer name from text
 */
function parseDealerName(text: string): string | null {
  const patterns = [
    /dealer[:\s]+([A-Z][A-Za-z\s&'.-]{2,49})/i,
    /sold\s+by[:\s]+([A-Z][A-Za-z\s&'.-]{2,49})/i,
    /from[:\s]+([A-Z][A-Za-z\s&'.-]{2,49})/i,
    /dealership[:\s]+([A-Z][A-Za-z\s&'.-]{2,49})/i,
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const name = match[1].trim()
      // Filter out common false positives
      if (!name.match(/^(price|mileage|year|make|model|trim|vin)$/i)) {
        return name
      }
    }
  }
  
  return null
}

/**
 * Parse city, state, zip from text
 */
function parseLocation(text: string): { city: string | null; state: string | null; zip: string | null } {
  // Pattern: City, State ZIP
  const cityStateZipMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2})\s+(\d{5})/i)
  if (cityStateZipMatch) {
    return {
      city: cityStateZipMatch[1],
      state: cityStateZipMatch[2].toUpperCase(),
      zip: cityStateZipMatch[3],
    }
  }
  
  // Try separate patterns
  let city: string | null = null
  let state: string | null = null
  let zip: string | null = null
  
  // ZIP code (5 digits)
  const zipMatch = text.match(/\b(\d{5})\b/)
  if (zipMatch) {
    zip = zipMatch[1]
  }
  
  // State (2 uppercase letters)
  const stateMatch = text.match(/\b([A-Z]{2})\b/)
  if (stateMatch && stateMatch[1] !== zip) {
    state = stateMatch[1]
  }
  
  // City (capitalized word before state)
  if (state) {
    const cityMatch = text.match(new RegExp(`([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?),\\s*${state}`, 'i'))
    if (cityMatch) {
      city = cityMatch[1]
    }
  }
  
  return { city, state, zip }
}

/**
 * Parse year, make, model from text
 */
function parseVehicleInfo(text: string): { year: number | null; make: string | null; model: string | null } {
  let year: number | null = null
  let make: string | null = null
  let model: string | null = null
  
  // Year pattern
  const yearMatch = text.match(/\b(19|20)\d{2}\b/)
  if (yearMatch) {
    const y = parseInt(yearMatch[0])
    if (y >= 1990 && y <= new Date().getFullYear() + 1) {
      year = y
    }
  }
  
  // Common make/model patterns (simplified - could be improved)
  const makeModelPattern = text.match(/\b(Ford|Chevrolet|Chevy|Toyota|Honda|Nissan|BMW|Mercedes|Audi|Lexus|Jeep|Ram|Dodge|GMC|Cadillac|Lincoln|Acura|Infiniti|Volvo|Subaru|Mazda|Hyundai|Kia|Volkswagen|VW|Porsche|Tesla|Jaguar|Land Rover|Mini|Fiat|Alfa Romeo|Genesis)\b/i)
  if (makeModelPattern) {
    make = makeModelPattern[1]
  }
  
  return { year, make, model }
}

/**
 * Main parsing function
 */
export function parseListingText(rawText: string): ParsedTextResult {
  const normalized = normalizeWhitespace(rawText)
  const result: Partial<ListingData> = {}
  const confidence: Record<string, 'high' | 'med' | 'low'> = {}
  
  // Parse price
  const price = parsePrice(normalized)
  if (price) {
    result.price = price
    confidence.price = 'med' // Text parsing is medium confidence
  }
  
  // Parse mileage
  const mileage = parseMileage(normalized)
  if (mileage) {
    result.mileage = mileage
    confidence.mileage = 'med'
  }
  
  // Parse dealer name
  const dealerName = parseDealerName(normalized)
  if (dealerName) {
    result.dealerName = dealerName
    confidence.dealer = 'low' // Text parsing for dealer is lower confidence
  }
  
  // Parse location
  const location = parseLocation(normalized)
  if (location.city) {
    result.dealerCity = location.city
    confidence.city = location.zip ? 'med' : 'low'
  }
  if (location.state) {
    result.dealerState = location.state
  }
  if (location.zip) {
    result.zip = location.zip
    confidence.zip = location.city ? 'med' : 'low'
  }
  
  // Parse vehicle info
  const vehicleInfo = parseVehicleInfo(normalized)
  if (vehicleInfo.year) {
    result.year = vehicleInfo.year
    confidence.year = 'med'
  }
  if (vehicleInfo.make) {
    result.make = vehicleInfo.make
    confidence.make = 'low' // Text parsing for make/model is lower confidence
  }
  if (vehicleInfo.model) {
    result.model = vehicleInfo.model
    confidence.model = 'low'
  }
  
  return { data: result, confidence }
}

