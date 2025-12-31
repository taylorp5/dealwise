// Cars.com listing extractor with multi-strategy parsing

import type { ListingData, VehicleCondition } from '@/lib/types/listing'
import * as cheerio from 'cheerio'

/**
 * Parse USD price from text
 */
export function parseUsd(text: string | null | undefined): number | undefined {
  if (!text) return undefined
  const cleaned = text.replace(/[$,]/g, '')
  const num = parseFloat(cleaned)
  if (isNaN(num) || num < 500 || num > 200000) return undefined
  return Math.round(num)
}

/**
 * Parse mileage from text
 */
export function parseMileage(text: string | null | undefined): number | undefined {
  if (!text) return undefined
  // Match patterns like "45,000 mi", "45000 miles", "45k mi"
  const match = text.match(/(\d{1,3}(?:[,\s]\d{3})*)\s*(?:mi|miles?|k\s*mi)/i)
  if (match) {
    const cleaned = match[1].replace(/[,\s]/g, '')
    const num = parseInt(cleaned)
    if (!isNaN(num) && num >= 0 && num <= 500000) return num
  }
  // Try "45k" pattern
  const kMatch = text.match(/(\d+(?:\.\d+)?)\s*k\b/i)
  if (kMatch) {
    const num = parseFloat(kMatch[1]) * 1000
    if (!isNaN(num) && num >= 0 && num <= 500000) return Math.round(num)
  }
  return undefined
}

/**
 * Normalize vehicle condition
 */
export function normalizeCondition(text: string | null | undefined): VehicleCondition {
  if (!text) return 'unknown'
  const lower = text.toLowerCase()
  if (lower.includes('new')) return 'new'
  if (lower.includes('certified') || lower.includes('cpo')) return 'cpo'
  if (lower.includes('used') || lower.includes('pre-owned')) return 'used'
  return 'unknown'
}

/**
 * Parse year, make, model, trim from title
 */
export function titleToYMMT(title: string | null | undefined): {
  year?: number
  make?: string
  model?: string
  trim?: string
} {
  if (!title) return {}
  
  const result: { year?: number; make?: string; model?: string; trim?: string } = {}
  
  // Extract year (4 digits at start or after common words)
  const yearMatch = title.match(/\b(19|20)\d{2}\b/)
  if (yearMatch) {
    const year = parseInt(yearMatch[0])
    if (year >= 1990 && year <= new Date().getFullYear() + 1) {
      result.year = year
    }
  }
  
  // Common makes (case-insensitive)
  const makes = [
    'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Chevy', 'Nissan', 'BMW', 'Mercedes-Benz', 'Mercedes',
    'Audi', 'Lexus', 'Acura', 'Infiniti', 'Cadillac', 'Lincoln', 'Jeep', 'Ram', 'Dodge', 'Chrysler',
    'GMC', 'Buick', 'Hyundai', 'Kia', 'Mazda', 'Subaru', 'Volkswagen', 'VW', 'Volvo', 'Porsche',
    'Tesla', 'Genesis', 'Alfa Romeo', 'Jaguar', 'Land Rover', 'Mini', 'Mitsubishi', 'Fiat'
  ]
  
  for (const make of makes) {
    const regex = new RegExp(`\\b${make.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (regex.test(title)) {
      result.make = make === 'Chevy' ? 'Chevrolet' : make === 'VW' ? 'Volkswagen' : make
      break
    }
  }
  
  // Extract model (usually after make, before trim/year)
  if (result.make) {
    const makeIndex = title.toLowerCase().indexOf(result.make.toLowerCase())
    if (makeIndex !== -1) {
      const afterMake = title.substring(makeIndex + result.make.length).trim()
      // Common model patterns
      const modelMatch = afterMake.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)
      if (modelMatch) {
        const potentialModel = modelMatch[1].trim()
        // Exclude common words that aren't models
        if (!['New', 'Used', 'Certified', 'CPO', 'Pre-Owned'].includes(potentialModel)) {
          result.model = potentialModel
        }
      }
    }
  }
  
  // Extract trim (usually at end, often in parentheses or after model)
  const trimMatch = title.match(/(?:\(([^)]+)\)|(?:Trim|Package):\s*([^,]+))/i)
  if (trimMatch) {
    result.trim = (trimMatch[1] || trimMatch[2]).trim()
  }
  
  return result
}

/**
 * Find first matching text from multiple selectors
 */
function findFirstText($: cheerio.CheerioAPI, selectors: string[]): string | null {
  for (const selector of selectors) {
    const element = $(selector).first()
    if (element.length) {
      const text = element.text().trim()
      if (text) return text
    }
  }
  return null
}

/**
 * Extract number from text
 */
function extractNumberFromText(text: string): number | undefined {
  const match = text.match(/[\d,]+/)
  if (match) {
    const num = parseInt(match[0].replace(/,/g, ''))
    if (!isNaN(num)) return num
  }
  return undefined
}

/**
 * Strategy 1: Parse JSON-LD structured data
 */
function parseJsonLd(html: string): Partial<ListingData> {
  const data: Partial<ListingData> = {}
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  
  if (!jsonLdMatches) return data
  
  for (const match of jsonLdMatches) {
    try {
      const jsonStr = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')
      const json = JSON.parse(jsonStr)
      
      // Check if it's a Vehicle or Product
      const type = Array.isArray(json['@type']) ? json['@type'] : [json['@type']]
      if (!type.some((t: string) => t.includes('Vehicle') || t.includes('Product'))) continue
      
      // Extract price from offers
      if (json.offers) {
        const offers = Array.isArray(json.offers) ? json.offers : [json.offers]
        for (const offer of offers) {
          if (offer.price && !data.price) {
            const price = typeof offer.price === 'string' ? parseUsd(offer.price) : offer.price
            if (price) data.price = price
          }
        }
      }
      
      // Extract brand/name (title)
      if (json.brand && !data.make) {
        data.make = typeof json.brand === 'string' ? json.brand : json.brand.name
      }
      if (json.name && !data.title) {
        data.title = json.name
      }
      
      // Extract VIN
      if (json.vehicleIdentificationNumber && !data.vin) {
        data.vin = json.vehicleIdentificationNumber
      }
      
      // Extract mileage
      if (json.mileageFromOdometer && !data.mileage) {
        const mileage = typeof json.mileageFromOdometer === 'object'
          ? json.mileageFromOdometer.value
          : json.mileageFromOdometer
        if (mileage) data.mileage = parseMileage(String(mileage))
      }
      
      // Extract condition
      if (json.itemCondition && !data.vehicleCondition) {
        data.vehicleCondition = normalizeCondition(json.itemCondition)
      }
      
    } catch (e) {
      // Skip invalid JSON
      continue
    }
  }
  
  return data
}

/**
 * Strategy 2: Parse embedded JSON state (Next.js, React, etc.)
 */
function parseEmbeddedJson(html: string): Partial<ListingData> {
  const data: Partial<ListingData> = {}
  
  // Common patterns for embedded state
  const patterns = [
    /window\.__NEXT_DATA__\s*=\s*({[\s\S]+?});/,
    /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]+?});/,
    /__INITIAL_STATE__\s*=\s*({[\s\S]+?});/,
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]+?)<\/script>/,
  ]
  
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (!match) continue
    
    try {
      const jsonStr = match[1]
      const json = JSON.parse(jsonStr)
      
      // Traverse common paths
      const traverse = (obj: any, path: string[]): any => {
        if (path.length === 0) return obj
        if (!obj || typeof obj !== 'object') return undefined
        const [key, ...rest] = path
        if (Array.isArray(obj)) {
          for (const item of obj) {
            const result = traverse(item, path)
            if (result !== undefined) return result
          }
        }
        return traverse(obj[key], rest)
      }
      
      // Try common paths for price
      const pricePaths = [
        ['props', 'pageProps', 'vehicle', 'price'],
        ['props', 'pageProps', 'listing', 'price'],
        ['vehicle', 'price'],
        ['listing', 'price'],
        ['price'],
      ]
      for (const path of pricePaths) {
        const price = traverse(json, path)
        if (price && !data.price) {
          const parsed = typeof price === 'string' ? parseUsd(price) : price
          if (parsed) data.price = parsed
        }
      }
      
      // Try paths for vehicle info
      const vehiclePaths = [
        ['props', 'pageProps', 'vehicle'],
        ['props', 'pageProps', 'listing'],
        ['vehicle'],
        ['listing'],
      ]
      for (const path of vehiclePaths) {
        const vehicle = traverse(json, path)
        if (vehicle && typeof vehicle === 'object') {
          if (vehicle.price && !data.price) {
            const parsed = typeof vehicle.price === 'string' ? parseUsd(vehicle.price) : vehicle.price
            if (parsed) data.price = parsed
          }
          if (vehicle.year && !data.year) data.year = vehicle.year
          if (vehicle.make && !data.make) data.make = vehicle.make
          if (vehicle.model && !data.model) data.model = vehicle.model
          if (vehicle.trim && !data.trim) data.trim = vehicle.trim
          if (vehicle.mileage && !data.mileage) data.mileage = parseMileage(String(vehicle.mileage))
          if (vehicle.vin && !data.vin) data.vin = vehicle.vin
          if (vehicle.stockNumber && !data.stockNumber) data.stockNumber = vehicle.stockNumber
          if (vehicle.condition && !data.vehicleCondition) {
            data.vehicleCondition = normalizeCondition(vehicle.condition)
          }
          if (vehicle.dealer && !data.dealerName) {
            data.dealerName = typeof vehicle.dealer === 'string' ? vehicle.dealer : vehicle.dealer.name
          }
          if (vehicle.location && !data.dealerCity) {
            if (typeof vehicle.location === 'string') {
              const parts = vehicle.location.split(',')
              if (parts[0]) data.dealerCity = parts[0].trim()
              if (parts[1]) data.dealerState = parts[1].trim()
            } else {
              if (vehicle.location.city) data.dealerCity = vehicle.location.city
              if (vehicle.location.state) data.dealerState = vehicle.location.state
              if (vehicle.location.zip) data.zip = vehicle.location.zip
            }
          }
        }
      }
      
    } catch (e) {
      // Skip invalid JSON
      continue
    }
  }
  
  return data
}

/**
 * Strategy 3: DOM selectors fallback
 */
function parseDomSelectors(html: string): Partial<ListingData> {
  const $ = cheerio.load(html)
  const data: Partial<ListingData> = {}
  
  // Price selectors (multiple candidates)
  const priceSelectors = [
    '[data-testid="price"]',
    '.price',
    '.vehicle-price',
    '[class*="price"]',
    '[data-price]',
    'span[class*="Price"]',
  ]
  const priceText = findFirstText($, priceSelectors)
  if (priceText && !data.price) {
    data.price = parseUsd(priceText)
  }
  
  // Title selectors
  const titleSelectors = [
    'h1',
    '[data-testid="title"]',
    '.vehicle-title',
    '[class*="title"]',
    'title',
  ]
  const titleText = findFirstText($, titleSelectors)
  if (titleText && !data.title) {
    data.title = titleText
    const ymmt = titleToYMMT(titleText)
    if (ymmt.year && !data.year) data.year = ymmt.year
    if (ymmt.make && !data.make) data.make = ymmt.make
    if (ymmt.model && !data.model) data.model = ymmt.model
    if (ymmt.trim && !data.trim) data.trim = ymmt.trim
  }
  
  // Mileage selectors
  const mileageSelectors = [
    '[data-testid="mileage"]',
    '[class*="mileage"]',
    '[class*="odometer"]',
    'span:contains("mi")',
  ]
  const mileageText = findFirstText($, mileageSelectors)
  if (mileageText && !data.mileage) {
    data.mileage = parseMileage(mileageText)
  }
  
  // Condition selectors
  const conditionSelectors = [
    '[data-testid="condition"]',
    '[class*="condition"]',
    '[class*="badge"]',
    'span:contains("New"), span:contains("Used"), span:contains("Certified")',
  ]
  const conditionText = findFirstText($, conditionSelectors)
  if (conditionText && !data.vehicleCondition) {
    data.vehicleCondition = normalizeCondition(conditionText)
  }
  
  // Dealer selectors
  const dealerSelectors = [
    '[data-testid="dealer"]',
    '[class*="dealer"]',
    '[class*="seller"]',
    '.dealer-name',
  ]
  const dealerText = findFirstText($, dealerSelectors)
  if (dealerText && !data.dealerName) {
    data.dealerName = dealerText
  }
  
  // Location selectors (city, state, zip)
  const locationSelectors = [
    '[data-testid="location"]',
    '[data-testid="address"]',
    '[class*="location"]',
    '[class*="address"]',
    '[class*="contact"]',
    'footer',
  ]
  for (const selector of locationSelectors) {
    const locationText = findFirstText($, [selector])
    if (locationText) {
      // Find ZIP codes
      const zipMatch = locationText.match(/\b(\d{5}(?:-\d{4})?)\b/)
      if (zipMatch && !data.zip) {
        data.zip = zipMatch[1]
      }
      
      // Find "City, ST" patterns
      const cityStateMatch = locationText.match(/([A-Za-z .'-]+),\s*([A-Z]{2})\b/)
      if (cityStateMatch) {
        if (!data.dealerCity) data.dealerCity = cityStateMatch[1].trim()
        if (!data.dealerState) data.dealerState = cityStateMatch[2].toUpperCase()
      }
      
      // If we found what we need, break
      if (data.dealerCity && data.dealerState) break
    }
  }
  
  // VIN selectors
  const vinSelectors = [
    '[data-testid="vin"]',
    '[class*="vin"]',
    'span:contains("VIN")',
  ]
  const vinText = findFirstText($, vinSelectors)
  if (vinText && !data.vin) {
    const vinMatch = vinText.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)
    if (vinMatch) data.vin = vinMatch[1]
  }
  
  return data
}

/**
 * Strategy 4: Regex fallback
 */
function parseRegex(html: string): Partial<ListingData> {
  const data: Partial<ListingData> = {}
  
  // Price regex
  if (!data.price) {
    const priceMatches = html.match(/\$([0-9][0-9,]+)/g)
    if (priceMatches) {
      // Take the largest reasonable price
      const prices = priceMatches.map(m => parseUsd(m)).filter((p): p is number => p !== undefined)
      if (prices.length > 0) {
        data.price = Math.max(...prices)
      }
    }
  }
  
  // Mileage regex
  if (!data.mileage) {
    const mileageMatch = html.match(/([0-9][0-9,]+)\s*mi\b/i)
    if (mileageMatch) {
      data.mileage = parseMileage(mileageMatch[0])
    }
  }
  
  // VIN regex
  if (!data.vin) {
    const vinMatch = html.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)
    if (vinMatch) data.vin = vinMatch[1]
  }
  
  return data
}

/**
 * Calculate confidence score
 */
function calculateConfidence(data: Partial<ListingData>, strategies: string[]): {
  confidence: number
  issues: string[]
} {
  let score = 0
  const issues: string[] = []
  
  // Price validation
  if (data.price) {
    if (data.price >= 500 && data.price <= 200000) {
      score += 0.25
    } else {
      issues.push('Price out of reasonable bounds')
    }
  } else {
    issues.push('Price missing')
  }
  
  // Year/Make/Model validation
  if (data.year && data.make && data.model) {
    score += 0.20
  } else {
    if (!data.year) issues.push('Year missing')
    if (!data.make) issues.push('Make missing')
    if (!data.model) issues.push('Model missing')
  }
  
  // Mileage (important for used/cpo)
  if (data.vehicleCondition === 'used' || data.vehicleCondition === 'cpo') {
    if (data.mileage) {
      score += 0.15
    } else {
      issues.push('Mileage missing for used vehicle')
    }
  } else if (data.mileage) {
    score += 0.10
  }
  
  // Condition
  if (data.vehicleCondition && data.vehicleCondition !== 'unknown') {
    score += 0.10
  } else {
    issues.push('Condition unknown')
  }
  
  // Dealer/Location
  if (data.dealerName || data.dealerCity || data.dealerState) {
    score += 0.10
  }
  
  // Strategy bonus (JSON sources are more reliable)
  if (strategies.includes('json-ld') || strategies.includes('embedded-json')) {
    score += 0.20
  } else if (strategies.includes('dom')) {
    score += 0.10
  }
  
  // Cap at 1.0
  score = Math.min(score, 1.0)
  
  return { confidence: score, issues }
}

/**
 * Main extraction function for Cars.com
 */
export async function extractCarsCom(url: string, html?: string): Promise<ListingData> {
  const data: Partial<ListingData> = {
    sourceUrl: url,
    sourceSite: 'cars.com',
  }
  
  const strategies: string[] = []
  
  // If HTML not provided, we'll need to fetch it (handled by API route)
  if (!html) {
    return {
      ...data,
      confidence: 0,
      issues: ['HTML content not provided'],
    } as ListingData
  }
  
  // Strategy 1: JSON-LD
  const jsonLdData = parseJsonLd(html)
  if (Object.keys(jsonLdData).length > 0) {
    Object.assign(data, jsonLdData)
    strategies.push('json-ld')
  }
  
  // Strategy 2: Embedded JSON
  const embeddedData = parseEmbeddedJson(html)
  if (Object.keys(embeddedData).length > 0) {
    // Merge, but don't overwrite existing data
    for (const [key, value] of Object.entries(embeddedData)) {
      if (value && !data[key as keyof ListingData]) {
        data[key as keyof ListingData] = value as any
      }
    }
    strategies.push('embedded-json')
  }
  
  // Strategy 3: DOM selectors
  const domData = parseDomSelectors(html)
  for (const [key, value] of Object.entries(domData)) {
    if (value && !data[key as keyof ListingData]) {
      data[key as keyof ListingData] = value as any
    }
  }
  if (Object.keys(domData).length > 0) {
    strategies.push('dom')
  }
  
  // Strategy 4: Regex fallback
  const regexData = parseRegex(html)
  for (const [key, value] of Object.entries(regexData)) {
    if (value && !data[key as keyof ListingData]) {
      data[key as keyof ListingData] = value as any
    }
  }
  if (Object.keys(regexData).length > 0) {
    strategies.push('regex')
  }
  
  // Calculate confidence
  const { confidence, issues } = calculateConfidence(data, strategies)
  
  return {
    ...data,
    confidence,
    issues,
    raw: {
      strategies,
      jsonLdData,
      embeddedData,
      domData,
      regexData,
    },
  } as ListingData
}

/**
 * Parse listing text (fallback for manual paste)
 * Handles both plain text and HTML
 * Returns data with confidence score and issues
 */
export function parseListingText(text: string): Partial<ListingData> & { confidence: number; issues: string[] } {
  const data: Partial<ListingData> = { raw: {} }
  const issues: string[] = []
  let confidence = 0
  
  if (!text || text.trim().length < 10) {
    return { confidence: 0, issues: ['Text too short or empty'] }
  }
  
  // Remove HTML tags for cleaner parsing (but keep text content)
  const textOnly = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  
  // Split into lines for line-by-line analysis
  const lines = text.split(/\n/).map(l => l.trim().replace(/\s+/g, ' ')).filter(l => l.length > 0)
  
  // Extract price - look for $XX,XXX patterns, but ignore monthly payments, lease, APR, down payment, "starting at", "MSRP"
  const pricePatterns = [
    /\$([1-9]\d{2,3}(?:,\d{3})*)/g, // $23,450 format
    /price[:\s]*\$?([1-9]\d{2,3}(?:,\d{3})*)/gi, // "Price: $23,450"
    /internet\s+price[:\s]*\$?([1-9]\d{2,3}(?:,\d{3})*)/gi, // "Internet Price: $23,450"
    /sale\s+price[:\s]*\$?([1-9]\d{2,3}(?:,\d{3})*)/gi, // "Sale Price: $23,450"
    /our\s+price[:\s]*\$?([1-9]\d{2,3}(?:,\d{3})*)/gi, // "Our Price: $23,450"
  ]
  
  const priceCandidates: Array<{ price: number; context: string; score: number }> = []
  
  for (const pattern of pricePatterns) {
    const matches = [...textOnly.matchAll(pattern)]
    for (const match of matches) {
      const price = parseUsd(match[0])
      if (!price) continue
      
      // Get context around the match
      const context = textOnly.substring(Math.max(0, match.index! - 100), match.index! + match[0].length + 100).toLowerCase()
      
      // Hard negative filters
      if (context.includes('/mo') || 
          context.includes('monthly') || 
          context.includes('lease') ||
          context.includes('apr') ||
          context.includes('down payment') ||
          context.includes('starting at') ||
          context.includes('est.') ||
          context.includes('calculator')) {
        continue // Skip this candidate
      }
      
      // Label scoring
      let score = 50 // Base score
      if (context.includes('internet price') || context.includes('sale price') || context.includes('our price')) {
        score += 30 // Boost for sale prices
      }
      if (context.includes('msrp') || context.includes('sticker')) {
        score -= 20 // Penalize MSRP
      }
      
      // Numeric sanity
      if (price < 2000 || price > 250000) continue
      
      priceCandidates.push({ price, context, score })
    }
  }
  
  // Pick best price (highest score, or highest price if scores are close)
  if (priceCandidates.length > 0) {
    const sorted = priceCandidates.sort((a, b) => {
      if (Math.abs(a.score - b.score) < 10) {
        return b.price - a.price // If scores close, prefer higher price
      }
      return b.score - a.score
    })
    data.price = sorted[0].price
    confidence += 30
  } else {
    issues.push('Could not find a valid price (ignored monthly payments, lease terms, etc.)')
  }
  
  // Extract mileage - look for patterns like "45,000 mi" or "45000 miles"
  data.mileage = parseMileage(textOnly)
  if (data.mileage) {
    confidence += 20
  }
  
  // Extract VIN - 17 character alphanumeric
  const vinMatch = textOnly.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)
  if (vinMatch) {
    data.vin = vinMatch[1].toUpperCase()
    confidence += 10
  }
  
  // Extract Year/Make/Model with multi-pass approach
  // Pass 1: Title line detection with scoring
  const makes = [
    'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Chevy', 'Nissan', 'BMW', 'Mercedes-Benz', 'Mercedes',
    'Audi', 'Lexus', 'Acura', 'Infiniti', 'Cadillac', 'Lincoln', 'Jeep', 'Ram', 'Dodge', 'Chrysler',
    'GMC', 'Buick', 'Hyundai', 'Kia', 'Mazda', 'Subaru', 'Volkswagen', 'VW', 'Volvo', 'Porsche',
    'Tesla', 'Genesis', 'Alfa Romeo', 'Jaguar', 'Land Rover', 'Mini', 'Mitsubishi', 'Fiat'
  ]
  
  const navJunk = ['home', 'inventory', 'search', 'specials', 'finance', 'service', 'parts', 'contact', 
                    'directions', 'hours', 'login', 'sign in', 'shop', 'build', 'accessories', 'new', 
                    'used', 'certified', 'cpo', 'pre-owned', 'about', 'trade', 'special']
  
  const titleCandidates: Array<{ line: string; score: number }> = []
  
  for (const line of lines) {
    const lineLower = line.toLowerCase()
    let score = 0
    
    // +50 if contains year
    if (line.match(/\b(19\d{2}|20\d{2})\b/)) {
      score += 50
    }
    
    // +30 if contains known make
    if (makes.some(make => new RegExp(`\\b${make.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(line))) {
      score += 30
    }
    
    // +20 if contains model-like token (letters, not nav)
    const words = line.split(/\s+/)
    const hasModelLikeToken = words.some(word => 
      word.length >= 3 && 
      /^[A-Za-z]+$/.test(word) && 
      !navJunk.includes(word.toLowerCase())
    )
    if (hasModelLikeToken) {
      score += 20
    }
    
    // -50 if contains nav junk
    if (navJunk.some(junk => lineLower.includes(junk))) {
      score -= 50
    }
    
    if (score > 0) {
      titleCandidates.push({ line, score })
    }
  }
  
  // Pick best title line
  let bestTitleLine: string | null = null
  if (titleCandidates.length > 0) {
    const sorted = titleCandidates.sort((a, b) => b.score - a.score)
    bestTitleLine = sorted[0].line
  }
  
  // Pass 2: Extract year from best title line
  if (bestTitleLine) {
    const yearMatch = bestTitleLine.match(/\b(19\d{2}|20\d{2})\b/)
    if (yearMatch) {
      const year = parseInt(yearMatch[0])
      if (year >= 1990 && year <= new Date().getFullYear() + 1) {
        data.year = year
        confidence += 15
      }
    }
  }
  
  // Pass 3: Extract make/model from best title line
  if (bestTitleLine) {
    // Find make
    for (const make of makes) {
      const makeRegex = new RegExp(`\\b${make.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (makeRegex.test(bestTitleLine)) {
        data.make = make === 'Chevy' ? 'Chevrolet' : make === 'VW' ? 'Volkswagen' : make
        confidence += 15
        
        // Extract model (after make, before stopwords)
        const makeIndex = bestTitleLine.toLowerCase().indexOf(make.toLowerCase())
        if (makeIndex !== -1) {
          const afterMake = bestTitleLine.substring(makeIndex + make.length).trim()
          // Stopwords that indicate trim/end of model
          const stopwords = ['4wd', 'awd', 'hybrid', 'i-force', 'crewmax', 'trd', 'limited', 'xle', 
                            'xse', 'le', 'se', 'sport', 'touring', 'platinum', 'sr5', 'sr', 'ltd',
                            'rwd', 'fwd', 'turbo', 'supercharged', 'v6', 'v8', 'ecoboost']
          
          const modelWords: string[] = []
          const words = afterMake.split(/\s+/)
          
          for (const word of words) {
            const wordLower = word.toLowerCase().replace(/[^\w]/g, '')
            if (stopwords.includes(wordLower)) {
              // This is trim, store remainder as trim
              const trimStart = words.indexOf(word)
              if (trimStart > 0) {
                data.trim = words.slice(trimStart).join(' ')
              }
              break
            }
            // Skip year if we already have it
            if (/^\d{4}$/.test(word)) continue
            // Skip if it's the make again
            if (wordLower === make.toLowerCase()) continue
            modelWords.push(word)
          }
          
          if (modelWords.length > 0) {
            data.model = modelWords.join(' ')
            confidence += 15
          }
        }
        break
      }
    }
  }
  
  // Store title candidates for debugging
  data.raw.titleCandidates = titleCandidates.slice(0, 5)
  if (bestTitleLine) {
    data.raw.vehicleTitleCandidate = bestTitleLine
  }
  
  if (!data.year || !data.make || !data.model) {
    issues.push('Could not extract complete year/make/model from text')
  }
  
  // Extract condition - look for new/used/certified
  data.vehicleCondition = normalizeCondition(textOnly)
  if (data.vehicleCondition !== 'unknown') {
    confidence += 10
  }
  
  // Extract dealer name with candidate scoring + direct match rule
  const dealerNameCandidates: Array<{ name: string; score: number; context: string }> = []
  
  // Nav junk stoplist
  const navJunkStoplist = ['home', 'inventory', 'search', 'specials', 'finance', 'service', 'parts', 
                           'contact', 'directions', 'hours', 'login', 'sign in', 'shop', 'build', 
                           'accessories', 'new', 'used', 'certified', 'cpo', 'pre-owned', 'about', 
                           'trade', 'special']
  
  // Dealer name regex for direct match
  const dealerNameRegex = /(Toyota|Honda|Ford|Chevrolet|Chevy|Nissan|Kia|Hyundai|BMW|Mercedes|Audi|Volkswagen|VW|Volvo|Porsche|Tesla|Lexus|Acura|Infiniti|Cadillac|Lincoln|Jeep|Ram|Dodge|Chrysler|GMC|Buick|Mazda|Subaru|Genesis).*(Toyota|Motors|Auto|Automotive|Dealership|of)/i
  
  // First pass: Direct match rule (wins if found)
  let directMatch: string | null = null
  for (const line of lines) {
    const lineLower = line.toLowerCase()
    const words = line.split(/\s+/)
    const wordCount = words.length
    
    // Check for direct match pattern
    if (dealerNameRegex.test(line)) {
      // Check if it's a valid dealer name (3-8 words, no nav junk)
      const hasNavJunk = navJunkStoplist.some(junk => lineLower.includes(junk))
      if (!hasNavJunk && wordCount >= 3 && wordCount <= 8) {
        // Clean up the name
        let cleanName = line.trim()
        cleanName = cleanName.replace(/\s+(dealer|dealership|auto|automotive|motors|sales|service|parts)$/i, '')
        cleanName = cleanName.replace(/^[^\w]+|[^\w]+$/g, '')
        
        if (cleanName.length >= 3 && cleanName.length <= 100) {
          directMatch = cleanName
          break // Direct match wins
        }
      }
    }
  }
  
  // Second pass: Scoring-based extraction (if no direct match)
  if (!directMatch) {
    const brands = ['toyota', 'honda', 'ford', 'chevrolet', 'chevy', 'nissan', 'hyundai', 'kia', 'mazda', 'subaru', 'jeep', 'ram', 'dodge', 'chrysler', 'gmc', 'buick', 'cadillac', 'lexus', 'acura', 'infiniti', 'bmw', 'mercedes', 'audi', 'volkswagen', 'vw', 'volvo', 'porsche', 'tesla']
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineLower = line.toLowerCase()
      const prevLine = i > 0 ? lines[i - 1].toLowerCase() : ''
      const nextLine = i < lines.length - 1 ? lines[i + 1].toLowerCase() : ''
      const context = `${prevLine} ${lineLower} ${nextLine}`.toLowerCase()
      
      // Skip very short lines (likely nav items)
      if (line.split(/\s+/).length <= 2 && !brands.some(b => lineLower.includes(b))) {
        continue
      }
      
      // Negative signals - skip these
      if (lineLower.includes('toyota certified') || 
          lineLower.includes('toyota financial') ||
          lineLower.includes('build & price') ||
          lineLower.includes('build and price') ||
          navJunkStoplist.some(junk => lineLower === junk || lineLower.startsWith(junk + ' ') || lineLower.endsWith(' ' + junk))) {
        continue
      }
      
      let score = 0
      
      // Strong positive signals
      if (lineLower.includes('dealer') || lineLower.includes('dealership')) {
        score += 40
      }
      
      // Brand detection
      const hasBrand = brands.some(brand => lineLower.includes(brand))
      if (hasBrand) {
        score += 30
      }
      
      // Auto/Automotive keywords
      if (lineLower.includes('auto') || lineLower.includes('automotive') || lineLower.includes('motors')) {
        score += 20
      }
      
      // Sales/Service/Parts near proper name
      if ((context.includes('sales') || context.includes('service') || context.includes('parts')) && 
          line.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/)) {
        score += 25
      }
      
      // Near contact/directions/hours
      if (context.includes('contact') || context.includes('directions') || context.includes('hours') || context.includes('address') || context.includes('location')) {
        score += 15
      }
      
      // Penalize very short unless has brand
      if (line.split(/\s+/).length <= 2 && !hasBrand) {
        score -= 20
      }
      
      // Must have at least some positive signals
      if (score > 0) {
        // Clean up the name
        let cleanName = line.trim()
        // Remove common suffixes
        cleanName = cleanName.replace(/\s+(dealer|dealership|auto|automotive|motors|sales|service|parts)$/i, '')
        // Remove leading/trailing punctuation
        cleanName = cleanName.replace(/^[^\w]+|[^\w]+$/g, '')
        
        if (cleanName.length >= 3 && cleanName.length <= 100) {
          dealerNameCandidates.push({
            name: cleanName,
            score,
            context: line.substring(0, 100)
          })
        }
      }
    }
  }
  
  // Pick best dealer name
  if (directMatch) {
    // Direct match wins
    data.dealerName = directMatch
    confidence += 15
    data.raw.dealerNameCandidates = [{ name: directMatch, score: 100, context: 'Direct match' }]
  } else if (dealerNameCandidates.length > 0) {
    // Deduplicate by name (case-insensitive)
    const unique = new Map<string, { name: string; score: number; context: string }>()
    for (const candidate of dealerNameCandidates) {
      const key = candidate.name.toLowerCase()
      if (!unique.has(key) || unique.get(key)!.score < candidate.score) {
        unique.set(key, candidate)
      }
    }
    
    const sorted = Array.from(unique.values()).sort((a, b) => b.score - a.score)
    data.dealerName = sorted[0].name
    confidence += 10
    
    // Store candidates in raw data
    data.raw.dealerNameCandidates = sorted.slice(0, 5)
  }
  
  // Extract location (City, State, ZIP)
  const locationCandidates: Array<{ city?: string; state?: string; zip?: string; score: number; context: string }> = []
  
  // Find ZIP codes
  const zipMatches = [...textOnly.matchAll(/\b(\d{5}(?:-\d{4})?)\b/g)]
  
  // Find "City, ST" patterns
  const cityStateMatches = [...textOnly.matchAll(/([A-Za-z .'-]+),\s*([A-Z]{2})\b/g)]
  
  // Find lines with location keywords
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineLower = line.toLowerCase()
    const context = `${lines[Math.max(0, i - 1)]} ${line} ${lines[Math.min(lines.length - 1, i + 1)]}`.toLowerCase()
    
    // Boost if near location keywords
    const hasLocationKeyword = context.includes('address') || 
                               context.includes('location') || 
                               context.includes('directions') || 
                               context.includes('contact') || 
                               context.includes('hours')
    
    let locationScore = hasLocationKeyword ? 30 : 10
    
    // Check for ZIP in this line
    const zipInLine = zipMatches.find(m => {
      const matchIndex = textOnly.indexOf(m[0])
      const lineStart = textOnly.indexOf(line)
      const lineEnd = lineStart + line.length
      return matchIndex >= lineStart && matchIndex <= lineEnd
    })
    
    // Check for City, ST in this line
    const cityStateInLine = cityStateMatches.find(m => {
      const matchIndex = textOnly.indexOf(m[0])
      const lineStart = textOnly.indexOf(line)
      const lineEnd = lineStart + line.length
      return matchIndex >= lineStart && matchIndex <= lineEnd
    })
    
    if (zipInLine || cityStateInLine) {
      const candidate: { city?: string; state?: string; zip?: string; score: number; context: string } = {
        score: locationScore,
        context: line.substring(0, 100)
      }
      
      if (zipInLine) {
        candidate.zip = zipInLine[1]
        locationScore += 20
      }
      
      if (cityStateInLine) {
        candidate.city = cityStateInLine[1].trim()
        candidate.state = cityStateInLine[2].toUpperCase()
        locationScore += 30
      }
      
      candidate.score = locationScore
      
      // Only add if we have at least city+state or zip
      if (candidate.city || candidate.zip) {
        locationCandidates.push(candidate)
      }
    }
  }
  
  // Pick best location
  if (locationCandidates.length > 0) {
    const sorted = locationCandidates.sort((a, b) => b.score - a.score)
    const best = sorted[0]
    
    if (best.city) data.dealerCity = best.city
    if (best.state) data.dealerState = best.state
    if (best.zip) data.zip = best.zip
    
    if (best.city || best.state || best.zip) {
      confidence += 10
    }
    
    // Store candidates in raw data
    data.raw.locationCandidates = sorted.slice(0, 5)
  }
  
  // Clamp confidence between 0 and 1
  confidence = Math.min(100, confidence) / 100
  
  return { ...data, confidence, issues }
}

