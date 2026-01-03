import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import type { ListingData } from '@/lib/types/listing'

export const dynamic = 'force-dynamic'

interface ResolveResponse {
  ok: boolean
  data?: ListingData
  confidence?: {
    price: 'high' | 'med' | 'low'
    dealer: 'high' | 'med' | 'low'
    city: 'high' | 'med' | 'low'
    zip: 'high' | 'med' | 'low'
    mileage: 'high' | 'med' | 'low'
    year: 'high' | 'med' | 'low'
    make: 'high' | 'med' | 'low'
    model: 'high' | 'med' | 'low'
  }
  error?: string
  fallback?: 'paste_text' | 'manual'
  fallbackSuggested?: boolean
}

/**
 * Parse JSON-LD structured data
 */
function parseJsonLd(html: string): { data: Partial<ListingData>; confidence: Record<string, 'high' | 'med' | 'low'> } {
  const result: Partial<ListingData> = {}
  const confidence: Record<string, 'high' | 'med' | 'low'> = {}
  
  try {
    // Find all JSON-LD scripts
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
    if (!jsonLdMatches) return { data: {}, confidence }
    
    for (const match of jsonLdMatches) {
      const contentMatch = match.match(/<script[^>]*>([\s\S]*?)<\/script>/i)
      if (!contentMatch) continue
      
      try {
        let jsonData = JSON.parse(contentMatch[1])
        // Handle arrays - process all items
        const items = Array.isArray(jsonData) ? jsonData : [jsonData]
        
        for (const data of items) {
        
        // Extract from Product/Vehicle schema
        if (data['@type'] === 'Product' || data['@type'] === 'Vehicle' || data['@type'] === 'Car') {
          // Price from offers
          if (data.offers && Array.isArray(data.offers)) {
            const offer = data.offers[0]
            if (offer.price) {
              const price = typeof offer.price === 'string' 
                ? parseFloat(offer.price.replace(/[$,]/g, ''))
                : typeof offer.price === 'number' ? offer.price : undefined
              if (price && price > 500 && price < 200000) {
                result.price = Math.round(price)
                confidence.price = 'high'
              }
            }
          } else if (data.offers && typeof data.offers === 'object' && data.offers.price) {
            const price = typeof data.offers.price === 'string'
              ? parseFloat(data.offers.price.replace(/[$,]/g, ''))
              : typeof data.offers.price === 'number' ? data.offers.price : undefined
            if (price && price > 500 && price < 200000) {
              result.price = Math.round(price)
              confidence.price = 'high'
            }
          }
          
          // Vehicle info from itemOffered
          if (data.itemOffered) {
            const item = data.itemOffered
            if (item.name) {
              const nameMatch = item.name.match(/\b(19|20)\d{2}\b/)
              if (nameMatch) {
                const year = parseInt(nameMatch[0])
                if (year >= 1990 && year <= new Date().getFullYear() + 1) {
                  result.year = year
                  confidence.year = 'high'
                }
              }
            }
            if (item.brand?.name) {
              result.make = item.brand.name
              confidence.make = 'high'
            }
            if (item.model) {
              result.model = item.model
              confidence.model = 'high'
            }
          }
          
          // Brand/model from root
          if (data.brand?.name && !result.make) {
            result.make = data.brand.name
            confidence.make = 'high'
          }
          if (data.model && !result.model) {
            result.model = data.model
            confidence.model = 'high'
          }
        }
        
          // Extract from Organization schema (dealer/seller)
          const orgTypes = ['Organization', 'AutoDealer', 'AutoPartsStore', 'LocalBusiness', 'Store']
          if (orgTypes.some(type => data['@type']?.includes(type))) {
            if (data.name && !result.dealerName) {
              result.dealerName = data.name
              confidence.dealer = 'high'
            }
            
            // Also check seller field
            if (data.seller && typeof data.seller === 'object') {
              if (data.seller.name && !result.dealerName) {
                result.dealerName = data.seller.name
                confidence.dealer = 'high'
              }
              if (data.seller.address) {
                const addr = typeof data.seller.address === 'string' ? JSON.parse(data.seller.address) : data.seller.address
                if (addr.addressLocality && !result.dealerCity) {
                  result.dealerCity = addr.addressLocality
                  confidence.city = 'high'
                }
                if (addr.addressRegion && !result.dealerState) {
                  result.dealerState = addr.addressRegion
                }
                if (addr.postalCode && !result.zip) {
                  const zip = String(addr.postalCode).match(/\d{5}/)?.[0]
                  if (zip) {
                    result.zip = zip
                    confidence.zip = 'high'
                  }
                }
              }
            }
            
            // Address
            if (data.address) {
              const addr = typeof data.address === 'string' ? JSON.parse(data.address) : data.address
              if (addr.addressLocality && !result.dealerCity) {
                result.dealerCity = addr.addressLocality
                confidence.city = 'high'
              }
              if (addr.addressRegion && !result.dealerState) {
                result.dealerState = addr.addressRegion
              }
              if (addr.postalCode && !result.zip) {
                const zip = String(addr.postalCode).match(/\d{5}/)?.[0]
                if (zip) {
                  result.zip = zip
                  confidence.zip = 'high'
                }
              }
            }
          }
          
          // Also check for seller in Product/Vehicle offers
          if ((data['@type'] === 'Product' || data['@type'] === 'Vehicle') && data.offers) {
            const offers = Array.isArray(data.offers) ? data.offers : [data.offers]
            for (const offer of offers) {
              if (offer.seller && typeof offer.seller === 'object') {
                if (offer.seller.name && !result.dealerName) {
                  result.dealerName = offer.seller.name
                  confidence.dealer = 'high'
                }
                if (offer.seller.address) {
                  const addr = typeof offer.seller.address === 'string' ? JSON.parse(offer.seller.address) : offer.seller.address
                  if (addr.addressLocality && !result.dealerCity) {
                    result.dealerCity = addr.addressLocality
                    confidence.city = 'high'
                  }
                  if (addr.addressRegion && !result.dealerState) {
                    result.dealerState = addr.addressRegion
                  }
                  if (addr.postalCode && !result.zip) {
                    const zip = String(addr.postalCode).match(/\d{5}/)?.[0]
                    if (zip) {
                      result.zip = zip
                      confidence.zip = 'high'
                    }
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        // Skip invalid JSON
        continue
      }
    }
  } catch (e) {
    // JSON-LD parsing failed, continue with other methods
  }
  
  return { data: result, confidence }
}

/**
 * Recursively search for a key in an object
 */
function findValueRecursive(obj: any, keys: string[], visited = new Set()): any {
  if (!obj || typeof obj !== 'object' || visited.has(obj)) return undefined
  visited.add(obj)
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const result = findValueRecursive(item, keys, visited)
      if (result !== undefined) return result
    }
    return undefined
  }
  
  for (const key of keys) {
    if (key in obj && obj[key] !== null && obj[key] !== undefined) {
      return obj[key]
    }
  }
  
  // Recursively search nested objects
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      const result = findValueRecursive(value, keys, visited)
      if (result !== undefined) return result
    }
  }
  
  return undefined
}

/**
 * Parse Next.js __NEXT_DATA__ blob with recursive search
 */
function parseNextData(html: string): { data: Partial<ListingData>; confidence: Record<string, 'high' | 'med' | 'low'> } {
  const result: Partial<ListingData> = {}
  const confidence: Record<string, 'high' | 'med' | 'low'> = {}
  
  try {
    const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)
    if (!nextDataMatch) return { data: {}, confidence }
    
    const jsonData = JSON.parse(nextDataMatch[1])
    
    // Try direct paths first (faster)
    const props = jsonData?.props?.pageProps || jsonData?.props || {}
    
    // Extract vehicle data
    if (props.vehicle) {
      const v = props.vehicle
      if (v.price) {
        const price = typeof v.price === 'number' ? v.price : parseFloat(String(v.price).replace(/[$,]/g, ''))
        if (price > 500 && price < 200000) {
          result.price = Math.round(price)
          confidence.price = 'high'
        }
      }
      if (v.year) {
        result.year = parseInt(String(v.year))
        confidence.year = 'high'
      }
      if (v.make) {
        result.make = v.make
        confidence.make = 'high'
      }
      if (v.model) {
        result.model = v.model
        confidence.model = 'high'
      }
      if (v.mileage) {
        const mileage = typeof v.mileage === 'number' ? v.mileage : parseInt(String(v.mileage).replace(/[,\s]/g, ''))
        if (mileage >= 0 && mileage <= 500000) {
          result.mileage = mileage
          confidence.mileage = 'high'
        }
      }
    }
    
    // Extract dealer data
    if (props.dealer) {
      const d = props.dealer
      if (d.name) {
        result.dealerName = d.name
        confidence.dealer = 'high'
      }
      if (d.city) {
        result.dealerCity = d.city
        confidence.city = 'high'
      }
      if (d.state) {
        result.dealerState = d.state
      }
      if (d.zip) {
        const zip = String(d.zip).match(/\d{5}/)?.[0]
        if (zip) {
          result.zip = zip
          confidence.zip = 'high'
        }
      }
    }
    
    // Recursive search for missing fields
    if (!result.price) {
      const price = findValueRecursive(jsonData, ['price', 'listPrice', 'salePrice', 'cost', 'amount'])
      if (price) {
        const parsed = typeof price === 'number' ? price : parseFloat(String(price).replace(/[$,]/g, ''))
        if (parsed > 500 && parsed < 200000) {
          result.price = Math.round(parsed)
          confidence.price = confidence.price || 'med'
        }
      }
    }
    
    if (!result.dealerName) {
      const dealerName = findValueRecursive(jsonData, ['dealerName', 'dealership', 'dealer', 'seller', 'name'])
      if (dealerName && typeof dealerName === 'string' && dealerName.length > 2 && dealerName.length < 100) {
        result.dealerName = dealerName
        confidence.dealer = confidence.dealer || 'med'
      }
    }
    
    if (!result.zip) {
      const zip = findValueRecursive(jsonData, ['postalCode', 'zip', 'zipCode', 'postal'])
      if (zip) {
        const zipStr = String(zip).match(/\d{5}/)?.[0]
        if (zipStr) {
          result.zip = zipStr
          confidence.zip = confidence.zip || 'med'
        }
      }
    }
    
    if (!result.dealerCity) {
      const city = findValueRecursive(jsonData, ['city', 'addressLocality', 'locality'])
      if (city && typeof city === 'string' && city.length > 1 && city.length < 50) {
        result.dealerCity = city
        confidence.city = confidence.city || 'med'
      }
    }
    
    if (!result.dealerState) {
      const state = findValueRecursive(jsonData, ['state', 'addressRegion', 'region'])
      if (state && typeof state === 'string' && (state.length === 2 || state.length < 20)) {
        result.dealerState = state.length === 2 ? state.toUpperCase() : state
      }
    }
  } catch (e) {
    // Next.js data parsing failed
  }
  
  return { data: result, confidence }
}

/**
 * Parse OpenGraph meta tags
 */
function parseOpenGraph(html: string): { data: Partial<ListingData>; confidence: Record<string, 'high' | 'med' | 'low'> } {
  const result: Partial<ListingData> = {}
  const confidence: Record<string, 'high' | 'med' | 'low'> = {}
  
  try {
    const $ = cheerio.load(html)
    
    // Price from og:price:amount
    const ogPrice = $('meta[property="og:price:amount"]').attr('content')
    if (ogPrice) {
      const price = parseFloat(ogPrice.replace(/[$,]/g, ''))
      if (price > 500 && price < 200000) {
        result.price = Math.round(price)
        confidence.price = 'med'
      }
    }
    
    // Title for make/model hints
    const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text()
    if (ogTitle) {
      const yearMatch = ogTitle.match(/\b(19|20)\d{2}\b/)
      if (yearMatch && !result.year) {
        const year = parseInt(yearMatch[0])
        if (year >= 1990 && year <= new Date().getFullYear() + 1) {
          result.year = year
          confidence.year = 'med'
        }
      }
    }
  } catch (e) {
    // OpenGraph parsing failed
  }
  
  return { data: result, confidence }
}

/**
 * Regex fallback parsing
 */
function parseRegexFallback(html: string, url: string): { data: Partial<ListingData>; confidence: Record<string, 'high' | 'med' | 'low'> } {
  const result: Partial<ListingData> = {}
  const confidence: Record<string, 'high' | 'med' | 'low'> = {}
  
  // Remove HTML tags for text extraction
  const textOnly = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  
  // Price patterns
  const pricePatterns = [
    /\$([1-9]\d{2,3}(?:,\d{3})*)/g,
    /price[:\s]*\$?([1-9]\d{2,3}(?:,\d{3})*)/gi,
    /internet\s+price[:\s]*\$?([1-9]\d{2,3}(?:,\d{3})*)/gi,
  ]
  
  const priceCandidates: number[] = []
  for (const pattern of pricePatterns) {
    const matches = textOnly.matchAll(pattern)
    for (const match of matches) {
      const price = parseFloat(match[1].replace(/,/g, ''))
      if (price > 500 && price < 200000) {
        priceCandidates.push(price)
      }
    }
  }
  
  if (priceCandidates.length > 0) {
    // Use most common price or highest if tied
    const counts = new Map<number, number>()
    priceCandidates.forEach(p => counts.set(p, (counts.get(p) || 0) + 1))
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
    if (sorted[0]) {
      result.price = Math.round(sorted[0][0])
      confidence.price = sorted[0][1] > 1 ? 'med' : 'low'
    }
  }
  
  // ZIP code (5 digits)
  const zipMatch = textOnly.match(/\b(\d{5})\b/)
  if (zipMatch) {
    result.zip = zipMatch[1]
    confidence.zip = 'med'
  }
  
  // City, State ZIP pattern
  const cityStateZipMatch = textOnly.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2})\s+(\d{5})/i)
  if (cityStateZipMatch) {
    result.dealerCity = cityStateZipMatch[1]
    result.dealerState = cityStateZipMatch[2].toUpperCase()
    result.zip = cityStateZipMatch[3]
    confidence.city = 'med'
    confidence.zip = 'high'
  }
  
  // Dealer name patterns
  const dealerPatterns = [
    /dealer[:\s]+([A-Z][A-Za-z\s&]+)/i,
    /sold\s+by[:\s]+([A-Z][A-Za-z\s&]+)/i,
    /from[:\s]+([A-Z][A-Za-z\s&]+)/i,
  ]
  
  for (const pattern of dealerPatterns) {
    const match = textOnly.match(pattern)
    if (match && match[1].length > 2 && match[1].length < 50) {
      result.dealerName = match[1].trim()
      confidence.dealer = 'low'
      break
    }
  }
  
  // Mileage patterns
  const mileagePatterns = [
    /(\d{1,3}(?:,\d{3})*)\s*(?:mi|miles?)/i,
    /mileage[:\s]*(\d{1,3}(?:,\d{3})*)/i,
  ]
  
  for (const pattern of mileagePatterns) {
    const match = textOnly.match(pattern)
    if (match) {
      const mileage = parseInt(match[1].replace(/,/g, ''))
      if (mileage >= 0 && mileage <= 500000) {
        result.mileage = mileage
        confidence.mileage = 'med'
        break
      }
    }
  }
  
  return { data: result, confidence }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({
        ok: false,
        error: 'Missing or invalid url parameter',
        fallbackSuggested: true,
      } as ResolveResponse, { status: 400 })
    }
    
    // Validate URL
    let targetUrl: URL
    try {
      targetUrl = new URL(url)
    } catch (e) {
      return NextResponse.json({
        ok: false,
        error: 'Invalid URL format',
        fallbackSuggested: true,
      } as ResolveResponse, { status: 400 })
    }
    
    // Block non-dealership domains
    const hostname = targetUrl.hostname.toLowerCase()
    const blockedDomains = ['google.com', 'facebook.com', 'twitter.com', 'youtube.com']
    if (blockedDomains.some(domain => hostname.includes(domain))) {
      return NextResponse.json({
        ok: false,
        error: 'Domain not allowed',
        fallbackSuggested: true,
      } as ResolveResponse, { status: 400 })
    }
    
    // Fetch HTML
    let html: string
    let finalUrl = url
    let fetchStatus = 200
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000)
      
      const response = await fetch(targetUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.cars.com/',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        redirect: 'follow',
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      finalUrl = response.url
      fetchStatus = response.status
      
      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          return NextResponse.json({
            ok: false,
            error: `Access denied (HTTP ${response.status})`,
            fallback: 'paste_text',
            fallbackSuggested: true,
          } as ResolveResponse)
        }
        return NextResponse.json({
          ok: false,
          error: `HTTP ${response.status}`,
          fallback: 'paste_text',
          fallbackSuggested: true,
        } as ResolveResponse)
      }
      
      html = await response.text()
      
      // Check if HTML is too small (likely blocked or error page)
      if (html.length < 1000) {
        return NextResponse.json({
          ok: false,
          error: 'Received incomplete page content',
          fallback: 'paste_text',
          fallbackSuggested: true,
        } as ResolveResponse)
      }
      
      // Check for blocking indicators
      const htmlLower = html.toLowerCase()
      if (htmlLower.includes('cloudflare') || htmlLower.includes('captcha') || htmlLower.includes('verify you are human')) {
        return NextResponse.json({
          ok: false,
          error: 'Website blocked access (captcha/cloudflare)',
          fallback: 'paste_text',
          fallbackSuggested: true,
        } as ResolveResponse)
      }
      
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({
          ok: false,
          error: 'Request timed out',
          fallback: 'paste_text',
          fallbackSuggested: true,
        } as ResolveResponse)
      }
      return NextResponse.json({
        ok: false,
        error: fetchError.message || 'Failed to fetch URL',
        fallback: 'paste_text',
        fallbackSuggested: true,
      } as ResolveResponse)
    }
    
    // Parse with priority: JSON-LD > Next.js data > OpenGraph > Regex
    const jsonLdResult = parseJsonLd(html)
    const nextDataResult = parseNextData(html)
    const ogResult = parseOpenGraph(html)
    const regexResult = parseRegexFallback(html, finalUrl)
    
    // Merge results (JSON-LD takes priority)
    const merged: Partial<ListingData> = {
      sourceUrl: finalUrl,
      sourceSite: hostname.includes('cars.com') ? 'cars.com' : 'other',
      ...regexResult.data,
      ...ogResult.data,
      ...nextDataResult.data,
      ...jsonLdResult.data, // JSON-LD highest priority
    }
    
    // Merge confidence scores (highest wins)
    const mergedConfidence: Record<string, 'high' | 'med' | 'low'> = {
      ...regexResult.confidence,
      ...ogResult.confidence,
      ...nextDataResult.confidence,
      ...jsonLdResult.confidence,
    }
    
    // Extract domain for source_domain
    const sourceDomain = targetUrl.hostname.replace(/^www\./, '')
    
    // Build final ListingData (match ListingData interface)
    const listingData: ListingData = {
      sourceUrl: finalUrl,
      sourceSite: hostname.includes('cars.com') ? 'cars.com' : 'other',
      price: merged.price,
      year: merged.year,
      make: merged.make,
      model: merged.model,
      trim: merged.trim,
      mileage: merged.mileage,
      dealerName: merged.dealerName,
      dealerCity: merged.dealerCity,
      dealerState: merged.dealerState,
      zip: merged.zip,
      imageUrl: merged.imageUrl,
      vin: merged.vin,
      confidence: Object.keys(mergedConfidence).length > 0 ? 0.7 : 0.5,
      issues: [],
      raw: {
        confidence: mergedConfidence,
        extractionMethod: 'json-ld',
      },
    }
    
    return NextResponse.json({
      ok: true,
      data: listingData,
      confidence: {
        price: mergedConfidence.price || 'low',
        dealer: mergedConfidence.dealer || 'low',
        city: mergedConfidence.city || 'low',
        zip: mergedConfidence.zip || 'low',
        mileage: mergedConfidence.mileage || 'low',
        year: mergedConfidence.year || 'low',
        make: mergedConfidence.make || 'low',
        model: mergedConfidence.model || 'low',
      },
    } as ResolveResponse)
    
  } catch (error: any) {
    console.error('[listing/resolve] Error:', error)
    return NextResponse.json({
      ok: false,
      error: error.message || 'Failed to resolve listing',
      fallbackSuggested: true,
    } as ResolveResponse, { status: 500 })
  }
}

