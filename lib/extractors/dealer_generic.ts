/**
 * Universal dealer listing extractor
 * Works with any dealership website using multiple parsing strategies
 */

import type { ListingData, VehicleCondition } from '@/lib/types/listing'
import * as cheerio from 'cheerio'
import { parseUsd, parseMileage, normalizeCondition, titleToYMMT } from './cars'
import { detectPlatform, getPlatformPaths } from './platform-detection'
import { extractPriceCandidates, pickBestPrice, type PriceCandidate } from './price-candidates'
import { extractMileageCandidates, pickBestMileage, type MileageCandidate } from './mileage-candidates'

/**
 * Strategy A: JSON-LD (schema.org)
 */
function parseJsonLd(html: string): Partial<ListingData> {
  const data: Partial<ListingData> = {}
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  
  if (!jsonLdMatches) return data
  
  for (const match of jsonLdMatches) {
    try {
      const jsonStr = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')
      const json = JSON.parse(jsonStr)
      
      // Check if it's a Vehicle, Product, Car, or Offer
      const type = Array.isArray(json['@type']) ? json['@type'] : [json['@type']]
      const isVehicle = type.some((t: string) => 
        t && typeof t === 'string' && (
          t.includes('Vehicle') || 
          t.includes('Product') || 
          t.includes('Car') || 
          t.includes('Auto')
        )
      )
      
      if (!isVehicle) continue
      
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
        const ymmt = titleToYMMT(json.name)
        if (ymmt.year && !data.year) data.year = ymmt.year
        if (ymmt.make && !data.make) data.make = ymmt.make
        if (ymmt.model && !data.model) data.model = ymmt.model
        if (ymmt.trim && !data.trim) data.trim = ymmt.trim
      }
      
      // Extract VIN
      if (json.vehicleIdentificationNumber && !data.vin) {
        data.vin = json.vehicleIdentificationNumber
      }
      if (json.vin && !data.vin) {
        data.vin = json.vin
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
        const condition = typeof json.itemCondition === 'string' 
          ? json.itemCondition 
          : json.itemCondition.name || json.itemCondition['@type']
        data.vehicleCondition = normalizeCondition(condition)
      }
      
      // Extract dealer info
      if (json.seller || json.provider) {
        const seller = json.seller || json.provider
        if (seller.name && !data.dealerName) {
          data.dealerName = seller.name
        }
        if (seller.address) {
          if (seller.address.addressLocality && !data.dealerCity) {
            data.dealerCity = seller.address.addressLocality
          }
          if (seller.address.addressRegion && !data.dealerState) {
            data.dealerState = seller.address.addressRegion
          }
          if (seller.address.postalCode && !data.zip) {
            data.zip = seller.address.postalCode
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
 * Strategy B: Embedded state JSON (React/Next/Vue)
 */
function parseEmbeddedJson(html: string): Partial<ListingData> {
  const data: Partial<ListingData> = {}
  
  // Common patterns for embedded state
  const patterns = [
    /window\.__NEXT_DATA__\s*=\s*({[\s\S]+?});/,
    /window\.__NUXT__\s*=\s*({[\s\S]+?});/,
    /window\.__INITIAL_STATE__\s*=\s*({[\s\S]+?});/,
    /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]+?});/,
    /preloadedState\s*=\s*({[\s\S]+?});/,
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
        if (obj[key] !== undefined) {
          return traverse(obj[key], rest)
        }
        return undefined
      }
      
      // Try common paths for vehicle data
      const vehiclePaths = [
        ['props', 'pageProps', 'vehicle'],
        ['props', 'pageProps', 'listing'],
        ['props', 'pageProps', 'inventory'],
        ['vehicle'],
        ['listing'],
        ['inventory'],
        ['data', 'vehicle'],
        ['data', 'listing'],
      ]
      
      for (const path of vehiclePaths) {
        const vehicle = traverse(json, path)
        if (vehicle && typeof vehicle === 'object') {
          // Price candidates
          const priceKeys = ['price', 'internetPrice', 'salePrice', 'yourPrice', 'finalPrice', 'listPrice', 'askingPrice']
          for (const key of priceKeys) {
            if (vehicle[key] && !data.price) {
              const price = parseUsd(String(vehicle[key]))
              if (price) data.price = price
            }
          }
          
          // Mileage
          if (vehicle.mileage && !data.mileage) {
            data.mileage = parseMileage(String(vehicle.mileage))
          }
          if (vehicle.odometer && !data.mileage) {
            data.mileage = parseMileage(String(vehicle.odometer))
          }
          
          // VIN
          if (vehicle.vin && !data.vin) {
            data.vin = String(vehicle.vin).toUpperCase()
          }
          
          // Stock
          if (vehicle.stock && !data.stockNumber) {
            data.stockNumber = String(vehicle.stock)
          }
          if (vehicle.stockNumber && !data.stockNumber) {
            data.stockNumber = String(vehicle.stockNumber)
          }
          
          // Condition
          if (vehicle.condition && !data.vehicleCondition) {
            data.vehicleCondition = normalizeCondition(String(vehicle.condition))
          }
          if (vehicle.isNew !== undefined && !data.vehicleCondition) {
            data.vehicleCondition = vehicle.isNew ? 'new' : 'used'
          }
          if (vehicle.certified && !data.vehicleCondition) {
            data.vehicleCondition = 'cpo'
          }
          
          // Year/Make/Model
          if (vehicle.year && !data.year) data.year = parseInt(String(vehicle.year))
          if (vehicle.make && !data.make) data.make = String(vehicle.make)
          if (vehicle.model && !data.model) data.model = String(vehicle.model)
          if (vehicle.trim && !data.trim) data.trim = String(vehicle.trim)
          
          // Title
          if (vehicle.title && !data.title) {
            data.title = String(vehicle.title)
            const ymmt = titleToYMMT(data.title)
            if (ymmt.year && !data.year) data.year = ymmt.year
            if (ymmt.make && !data.make) data.make = ymmt.make
            if (ymmt.model && !data.model) data.model = ymmt.model
            if (ymmt.trim && !data.trim) data.trim = ymmt.trim
          }
          
          // Dealer info
          if (vehicle.dealer) {
            if (typeof vehicle.dealer === 'string') {
              if (!data.dealerName) data.dealerName = vehicle.dealer
            } else {
              if (vehicle.dealer.name && !data.dealerName) data.dealerName = vehicle.dealer.name
              if (vehicle.dealer.city && !data.dealerCity) data.dealerCity = vehicle.dealer.city
              if (vehicle.dealer.state && !data.dealerState) data.dealerState = vehicle.dealer.state
              if (vehicle.dealer.zip && !data.zip) data.zip = vehicle.dealer.zip
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
 * Strategy C: Open Graph / Meta tags
 */
function parseMetaTags(html: string): Partial<ListingData> {
  const $ = cheerio.load(html)
  const data: Partial<ListingData> = {}
  
  // Open Graph title
  const ogTitle = $('meta[property="og:title"]').attr('content')
  if (ogTitle && !data.title) {
    data.title = ogTitle
    const ymmt = titleToYMMT(ogTitle)
    if (ymmt.year && !data.year) data.year = ymmt.year
    if (ymmt.make && !data.make) data.make = ymmt.make
    if (ymmt.model && !data.model) data.model = ymmt.model
    if (ymmt.trim && !data.trim) data.trim = ymmt.trim
  }
  
  // Product price
  const productPrice = $('meta[property="product:price:amount"]').attr('content')
  if (productPrice && !data.price) {
    data.price = parseUsd(productPrice)
  }
  
  // Description (often contains mileage/condition)
  const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content')
  if (description) {
    if (!data.mileage) {
      data.mileage = parseMileage(description)
    }
    if (!data.vehicleCondition) {
      data.vehicleCondition = normalizeCondition(description)
    }
  }
  
  return data
}

/**
 * Strategy D: DOM heuristics (generic)
 */
function parseDomHeuristics(html: string): Partial<ListingData> & { priceCandidates?: Array<{ price: number; label: string; context: string }> } {
  const $ = cheerio.load(html)
  const data: Partial<ListingData> & { priceCandidates?: Array<{ price: number; label: string; context: string }> } = {}
  const priceCandidates: Array<{ price: number; label: string; context: string }> = []
  
  // Price extraction - look for price-like patterns near keywords
  const priceKeywords = ['price', 'internet price', 'sale price', 'our price', 'dealer price', 'msrp', 'list price']
  const preferredKeywords = ['internet price', 'sale price', 'our price', 'dealer price']
  
  $('*').each((_, el) => {
    const text = $(el).text()
    const priceMatch = text.match(/\$[\d,]+/g)
    
    if (priceMatch) {
      const context = text.substring(0, 200).toLowerCase()
      const hasKeyword = priceKeywords.some(kw => context.includes(kw))
      
      if (hasKeyword) {
        for (const priceStr of priceMatch) {
          const price = parseUsd(priceStr)
          if (price && price >= 500 && price <= 250000) {
            const label = preferredKeywords.find(kw => context.includes(kw)) || 
                         priceKeywords.find(kw => context.includes(kw)) || 
                         'price'
            priceCandidates.push({
              price,
              label,
              context: text.substring(0, 100),
            })
          }
        }
      }
    }
  })
  
  // Select best price candidate
  if (priceCandidates.length > 0) {
    // Prefer "sale/internet/our price" over MSRP
    const preferred = priceCandidates.find(p => 
      preferredKeywords.some(kw => p.label.toLowerCase().includes(kw))
    )
    if (preferred) {
      data.price = preferred.price
    } else {
      // Use lowest non-zero price (likely sale price)
      const sorted = priceCandidates.sort((a, b) => a.price - b.price)
      data.price = sorted[0].price
    }
    data.priceCandidates = priceCandidates
  }
  
  // Mileage extraction
  $('*').each((_, el) => {
    const text = $(el).text()
    if (text.toLowerCase().includes('mileage') || text.toLowerCase().includes('odometer')) {
      const mileage = parseMileage(text)
      if (mileage && !data.mileage) {
        data.mileage = mileage
      }
    }
  })
  
  // Condition extraction
  $('*').each((_, el) => {
    const text = $(el).text().toLowerCase()
    if (!data.vehicleCondition) {
      if (text.includes('new') && !text.includes('used') && !text.includes('pre-owned')) {
        data.vehicleCondition = 'new'
      } else if (text.includes('certified') || text.includes('cpo')) {
        data.vehicleCondition = 'cpo'
      } else if (text.includes('used') || text.includes('pre-owned')) {
        data.vehicleCondition = 'used'
      }
    }
  })
  
  // VIN extraction
  $('*').each((_, el) => {
    const text = $(el).text()
    const vinMatch = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)
    if (vinMatch && !data.vin) {
      data.vin = vinMatch[1].toUpperCase()
    }
  })
  
  // Title extraction (H1, H2, or elements with class containing "title")
  const titleSelectors = ['h1', 'h2', '[class*="title"]', '[class*="heading"]']
  for (const selector of titleSelectors) {
    const titleText = $(selector).first().text().trim()
    if (titleText && titleText.length > 10 && !data.title) {
      data.title = titleText
      const ymmt = titleToYMMT(titleText)
      if (ymmt.year && !data.year) data.year = ymmt.year
      if (ymmt.make && !data.make) data.make = ymmt.make
      if (ymmt.model && !data.model) data.model = ymmt.model
      if (ymmt.trim && !data.trim) data.trim = ymmt.trim
      break
    }
  }
  
  // Spec table parsing (dl/dt/dd, tables)
  $('dl, table').each((_, el) => {
    const $el = $(el)
    const text = $el.text().toLowerCase()
    
    // Look for label:value patterns
    $el.find('dt, th, td').each((_, cell) => {
      const cellText = $(cell).text().toLowerCase()
      const nextText = $(cell).next().text()
      
      if (cellText.includes('price') && !data.price) {
        const price = parseUsd(nextText)
        if (price) data.price = price
      }
      if (cellText.includes('mileage') && !data.mileage) {
        data.mileage = parseMileage(nextText)
      }
      if (cellText.includes('vin') && !data.vin) {
        const vinMatch = nextText.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)
        if (vinMatch) data.vin = vinMatch[1].toUpperCase()
      }
      if (cellText.includes('stock') && !data.stockNumber) {
        data.stockNumber = nextText.trim()
      }
      // Dealer info from spec tables
      if (cellText.includes('dealer') && !data.dealerName) {
        data.dealerName = nextText.trim()
      }
      if (cellText.includes('location') || cellText.includes('address')) {
        const locationText = nextText.trim()
        // Try to parse "City, ST" or "City, State"
        const cityStateMatch = locationText.match(/([A-Za-z .'-]+),\s*([A-Z]{2})\b/)
        if (cityStateMatch && !data.dealerCity) {
          data.dealerCity = cityStateMatch[1].trim()
          data.dealerState = cityStateMatch[2].toUpperCase()
        }
      }
    })
  })
  
  // Dealer name extraction from common selectors
  if (!data.dealerName) {
    const dealerSelectors = [
      '[class*="dealer"]',
      '[class*="dealership"]',
      '[id*="dealer"]',
      'header [class*="name"]',
      '.dealer-name',
      '.dealership-name',
      'h1', 'h2', 'h3'
    ]
    
    for (const selector of dealerSelectors) {
      const $el = $(selector).first()
      const text = $el.text().trim()
      if (text && text.length > 3 && text.length < 100) {
        const textLower = text.toLowerCase()
        // Check if it looks like a dealer name (contains brand or dealer keywords)
        const brands = ['toyota', 'honda', 'ford', 'chevrolet', 'nissan', 'hyundai', 'kia', 'mazda', 'subaru', 'jeep', 'ram', 'dodge', 'chrysler', 'gmc', 'buick', 'cadillac', 'lexus', 'acura', 'infiniti', 'bmw', 'mercedes', 'audi', 'volkswagen', 'volvo', 'porsche', 'tesla']
        const hasBrand = brands.some(b => textLower.includes(b))
        const hasDealerKeyword = textLower.includes('dealer') || textLower.includes('dealership') || textLower.includes('auto') || textLower.includes('motors')
        
        if (hasBrand || hasDealerKeyword) {
          // Clean up the name
          let cleanName = text.replace(/\s+(dealer|dealership|auto|automotive|motors)$/i, '').trim()
          if (cleanName.length >= 3 && cleanName.length <= 100) {
            data.dealerName = cleanName
            break
          }
        }
      }
    }
  }
  
  // Location extraction from address patterns
  if (!data.dealerCity || !data.dealerState) {
    // Look for address patterns in common locations
    const addressSelectors = [
      '[class*="address"]',
      '[class*="location"]',
      '[class*="contact"]',
      'footer',
      '[itemprop="address"]'
    ]
    
    for (const selector of addressSelectors) {
      const $el = $(selector)
      const text = $el.text()
      
      // Find ZIP codes
      const zipMatch = text.match(/\b(\d{5}(?:-\d{4})?)\b/)
      if (zipMatch && !data.zip) {
        data.zip = zipMatch[1]
      }
      
      // Find "City, ST" patterns
      const cityStateMatch = text.match(/([A-Za-z .'-]+),\s*([A-Z]{2})\b/)
      if (cityStateMatch) {
        if (!data.dealerCity) data.dealerCity = cityStateMatch[1].trim()
        if (!data.dealerState) data.dealerState = cityStateMatch[2].toUpperCase()
      }
      
      // If we found what we need, break
      if (data.dealerCity && data.dealerState) break
    }
  }
  
  return data
}

/**
 * Strategy E: Regex fallback
 */
function parseRegex(html: string): Partial<ListingData> {
  const data: Partial<ListingData> = {}
  
  // VIN
  if (!data.vin) {
    const vinMatch = html.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)
    if (vinMatch) data.vin = vinMatch[1].toUpperCase()
  }
  
  // Mileage
  if (!data.mileage) {
    const mileageMatch = html.match(/(\d{1,3}(?:[,\s]\d{3})*)\s*(?:mi|miles?)/i)
    if (mileageMatch) {
      data.mileage = parseMileage(mileageMatch[0])
    }
  }
  
  // Price (avoid MSRP-only, prefer smaller prices near "internet/our/sale")
  if (!data.price) {
    const priceMatches = html.match(/\$[\d,]+/g)
    if (priceMatches) {
      const prices = priceMatches.map(m => parseUsd(m)).filter((p): p is number => p !== undefined && p >= 500 && p <= 250000)
      if (prices.length > 0) {
        // Prefer prices near "internet/our/sale" keywords
        const context = html.toLowerCase()
        const preferredPrices = prices.filter(p => {
          const priceStr = `$${p.toLocaleString()}`
          const index = html.indexOf(priceStr)
          if (index === -1) return false
          const snippet = html.substring(Math.max(0, index - 100), index + 100).toLowerCase()
          return snippet.includes('internet') || snippet.includes('our') || snippet.includes('sale')
        })
        data.price = preferredPrices.length > 0 ? Math.min(...preferredPrices) : Math.min(...prices)
      }
    }
  }
  
  return data
}

/**
 * Calculate confidence score
 */
function calculateConfidence(
  data: Partial<ListingData>,
  strategies: string[],
  priceCandidates?: Array<{ price: number; label: string; context: string }>
): { confidence: number; issues: string[] } {
  let score = 0
  const issues: string[] = []
  
  // Price validation
  if (data.price) {
    if (data.price >= 500 && data.price <= 250000) {
      score += 0.30
    } else {
      issues.push(`Price $${data.price.toLocaleString()} is outside normal range (500-250000)`)
    }
    
    // Check for price conflicts
    if (priceCandidates && priceCandidates.length > 1) {
      const prices = priceCandidates.map(p => p.price)
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      if (maxPrice / minPrice > 1.5) {
        issues.push(`Multiple price candidates found ($${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()})`)
        score -= 0.10 // Penalty for conflicts
      }
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
      if (data.mileage >= 0 && data.mileage <= 400000) {
        score += 0.15
      } else {
        issues.push(`Mileage ${data.mileage.toLocaleString()} is outside normal range`)
      }
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
  
  // VIN or Stock
  if (data.vin || data.stockNumber) {
    score += 0.10
  }
  
  // Dealer/Location
  if (data.dealerName || data.dealerCity || data.dealerState) {
    score += 0.05
  }
  
  // Strategy bonus (JSON sources are more reliable)
  if (strategies.includes('json-ld') || strategies.includes('embedded-json')) {
    score += 0.15
  } else if (strategies.includes('dom')) {
    score += 0.05
  } else if (strategies.includes('regex')) {
    score -= 0.10 // Penalty for regex-only
    issues.push('Low confidence extraction (regex fallback only)')
  }
  
  // Cap at 1.0
  score = Math.max(0, Math.min(score, 1.0))
  
  return { confidence: score, issues }
}

/**
 * Main extraction function
 */
export async function extractDealerGeneric(url: string, html?: string): Promise<ListingData> {
  const data: Partial<ListingData> = {
    sourceUrl: url,
    sourceSite: 'other',
  }
  
  const strategies: string[] = []
  let priceCandidates: Array<{ price: number; label: string; context: string }> = []
  let mileageCandidates: Array<{ value: number; source: string; context: string; score: number }> = []
  const platform = detectPlatform(html || '')
  let jsonLdData: Partial<ListingData> = {}
  let embeddedData: Partial<ListingData> = {}
  let metaData: Partial<ListingData> = {}
  let domData: Partial<ListingData> = {}
  let regexData: Partial<ListingData> = {}
  
  // If HTML not provided, we'll need to fetch it (handled by API route)
  if (!html) {
    return {
      ...data,
      confidence: 0,
      issues: ['HTML content not provided'],
    } as ListingData
  }
  
  // Check for blocking indicators
  const blockedIndicators = ['captcha', 'access denied', '403', 'blocked', 'robot', 'bot detection']
  const htmlLower = html.toLowerCase()
  if (blockedIndicators.some(indicator => htmlLower.includes(indicator))) {
    return {
      ...data,
      blocked: true,
      confidence: 0,
      issues: ['Page appears to be blocked (captcha/anti-bot detected)'],
    } as ListingData
  }
  
  // Strategy A: JSON-LD
  jsonLdData = parseJsonLd(html)
  if (Object.keys(jsonLdData).length > 0) {
    Object.assign(data, jsonLdData)
    strategies.push('json-ld')
  }
  
  // Strategy B: Embedded JSON
  const embeddedResult = parseEmbeddedJson(html)
  embeddedData = embeddedResult
  if (Object.keys(embeddedResult).length > 0) {
    for (const [key, value] of Object.entries(embeddedResult)) {
      if (value && !data[key as keyof ListingData]) {
        data[key as keyof ListingData] = value as any
      }
    }
    strategies.push('embedded-json')
  }
  
  // Strategy C: Meta tags
  const metaResult = parseMetaTags(html)
  metaData = metaResult
  for (const [key, value] of Object.entries(metaResult)) {
    if (value && !data[key as keyof ListingData]) {
      data[key as keyof ListingData] = value as any
    }
  }
  if (Object.keys(metaResult).length > 0) {
    strategies.push('meta-tags')
    
    // Extract price candidates from meta tags
    if (metaResult.price) {
      const $ = cheerio.load(html)
      const metaPrice = $('meta[property="product:price:amount"]').attr('content')
      if (metaPrice) {
        const candidates = extractPriceCandidates(metaPrice, 'meta')
        priceCandidates.push(...candidates.map(c => ({ price: c.value, label: c.label, context: c.context })))
      }
    }
  }
  
  // Strategy D: DOM heuristics with candidate scoring
  const domResult = parseDomHeuristics(html)
  domData = domResult
  if (domResult.priceCandidates) {
    priceCandidates = domResult.priceCandidates
    delete (domResult as any).priceCandidates
  }
  if ((domResult as any).mileageCandidates) {
    mileageCandidates = (domResult as any).mileageCandidates
    delete (domResult as any).mileageCandidates
  }
  for (const [key, value] of Object.entries(domResult)) {
    if (value && !data[key as keyof ListingData]) {
      data[key as keyof ListingData] = value as any
    }
  }
  if (Object.keys(domResult).length > 0) {
    strategies.push('dom')
  }
  
  // Strategy E: Regex fallback (only if we don't have price yet)
  if (!data.price) {
    const regexResult = parseRegex(html)
    regexData = regexResult
    for (const [key, value] of Object.entries(regexResult)) {
      if (value && !data[key as keyof ListingData]) {
        data[key as keyof ListingData] = value as any
      }
    }
    if (Object.keys(regexResult).length > 0) {
      strategies.push('regex')
    }
  }
  
  // Calculate confidence
  const { confidence, issues: confidenceIssues } = calculateConfidence(data, strategies, priceCandidates)
  const allIssues = [...confidenceIssues]
  
  return {
    ...data,
    confidence,
    issues: allIssues,
    raw: {
      strategies,
      priceCandidates: priceCandidates.slice(0, 5), // Top 5
      mileageCandidates: mileageCandidates.slice(0, 3), // Top 3
      platform,
      jsonLdData,
      embeddedData,
      metaData,
      domData,
      regexData,
    },
  } as ListingData
}
