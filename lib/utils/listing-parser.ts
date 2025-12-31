// Utility functions to extract information from vehicle listing URLs

export interface ParsedListingData {
  price?: number
  year?: number
  make?: string
  model?: string
  mileage?: number
  location?: string
  state?: string
  dealer?: string
  vin?: string
}

/**
 * Parse common vehicle listing URL patterns to extract vehicle information
 */
export function parseListingUrl(url: string): ParsedListingData {
  const data: ParsedListingData = {}
  
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    const pathname = urlObj.pathname
    const searchParams = urlObj.searchParams
    
    // Extract dealer name from hostname
    if (hostname.includes('cars.com')) {
      data.dealer = extractDealerFromCarsCom(url)
    } else if (hostname.includes('autotrader.com')) {
      data.dealer = extractDealerFromAutoTrader(url)
    } else if (hostname.includes('cargurus.com')) {
      data.dealer = extractDealerFromCarGurus(url)
    } else {
      // Generic extraction
      const domainMatch = hostname.match(/([^.]+)\.(com|net|org|us)/)
      if (domainMatch) {
        data.dealer = domainMatch[1].replace(/^www\./, '')
      }
    }
    
    // Extract from URL path patterns
    // Common patterns: 
    // - /vehicles/2020-honda-civic-123456
    // - /used/2020/honda/civic
    // - /inventory/2020-honda-civic
    // - /2020-honda-civic
    
    // Pattern 1: /year-make-model or /vehicles/year-make-model
    const pathMatch1 = pathname.match(/\/(?:vehicles?|inventory|used|new|car)\/.*?(\d{4})[-\/]([a-z]+)[-\/]([a-z-]+)/i)
    if (pathMatch1) {
      const year = parseInt(pathMatch1[1])
      if (year >= 1990 && year <= new Date().getFullYear() + 1) {
        data.year = year
      }
      if (pathMatch1[2]) {
        data.make = pathMatch1[2].charAt(0).toUpperCase() + pathMatch1[2].slice(1)
      }
      if (pathMatch1[3]) {
        data.model = pathMatch1[3]
          .split('-')
          .slice(0, 3) // Limit to first 3 parts to avoid VIN/ID numbers
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }
    }
    
    // Pattern 2: /used/2020/honda/civic
    const pathMatch2 = pathname.match(/\/(?:used|new|inventory)\/(\d{4})\/([a-z]+)\/([a-z-]+)/i)
    if (pathMatch2 && !data.year) {
      const year = parseInt(pathMatch2[1])
      if (year >= 1990 && year <= new Date().getFullYear() + 1) {
        data.year = year
      }
      if (pathMatch2[2] && !data.make) {
        data.make = pathMatch2[2].charAt(0).toUpperCase() + pathMatch2[2].slice(1)
      }
      if (pathMatch2[3] && !data.model) {
        data.model = pathMatch2[3]
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }
    }
    
    // Pattern 3: Standalone year-make-model at start of path
    if (!data.year || !data.make) {
      const pathMatch3 = pathname.match(/^\/(\d{4})[-\/]([a-z]+)(?:[-\/]([a-z-]+))?/i)
      if (pathMatch3) {
        if (!data.year) {
          const year = parseInt(pathMatch3[1])
          if (year >= 1990 && year <= new Date().getFullYear() + 1) {
            data.year = year
          }
        }
        if (!data.make && pathMatch3[2]) {
          data.make = pathMatch3[2].charAt(0).toUpperCase() + pathMatch3[2].slice(1)
        }
        if (!data.model && pathMatch3[3]) {
          data.model = pathMatch3[3]
            .split('-')
            .slice(0, 2)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        }
      }
    }
    
    // Extract price from various patterns
    // Pattern 1: Query parameters (price=25000, listPrice=25000, etc.)
    const priceParams = ['price', 'listPrice', 'list_price', 'salePrice', 'sale_price', 'cost', 'amount']
    for (const param of priceParams) {
      const priceParam = searchParams.get(param)
      if (priceParam) {
        const price = parseInt(priceParam.replace(/[$,]/g, ''))
        if (price >= 5000 && price <= 200000) {
          data.price = price
          break
        }
      }
    }
    
    // Pattern 2: /price-25000 or /$25000 or /25000 in path
    if (!data.price) {
      const pricePattern1 = url.match(/[\/\-](?:price[-\/]?)?\$?(\d{4,6})(?:[\/\?]|$)/i)
      if (pricePattern1) {
        const price = parseInt(pricePattern1[1])
        if (price >= 5000 && price <= 200000) {
          data.price = price
        }
      }
    }
    
    // Pattern 3: Look for price-like numbers in the URL (but be careful not to match years/VINs)
    if (!data.price) {
      // Look for patterns like -25000- or $25000
      const pricePattern2 = url.match(/\$(\d{4,6})|[-_](\d{5,6})[-_]/)
      if (pricePattern2) {
        const price = parseInt(pricePattern2[1] || pricePattern2[2])
        // Exclude if it looks like a year or VIN
        if (price >= 5000 && price <= 200000 && price < 1990) {
          data.price = price
        }
      }
    }
    
    // Extract mileage
    const mileagePattern = url.match(/(\d{1,3}[,\.]?\d{3})\s*(?:miles?|mi|k\s*miles?)/i)
    if (mileagePattern) {
      const mileage = parseInt(mileagePattern[1].replace(/[,\.]/g, ''))
      if (mileage >= 0 && mileage <= 500000) {
        data.mileage = mileage
      }
    }
    
    // Extract VIN (17 characters, alphanumeric)
    const vinPattern = url.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i)
    if (vinPattern) {
      data.vin = vinPattern[1].toUpperCase()
    }
    
    // Extract location/state from path or query
    const statePattern = url.match(/\b([A-Z]{2})\b/)
    if (statePattern) {
      const state = statePattern[1]
      // Common state abbreviations
      const states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC']
      if (states.includes(state)) {
        data.state = state
      }
    }
    
    // Extract location from city-state patterns
    const cityStatePattern = url.match(/([a-z]+)[-\/]([a-z]{2})\b/i)
    if (cityStatePattern && !data.state) {
      const potentialState = cityStatePattern[2].toUpperCase()
      const states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC']
      if (states.includes(potentialState)) {
        data.state = potentialState
        data.location = cityStatePattern[1].charAt(0).toUpperCase() + cityStatePattern[1].slice(1) + ', ' + potentialState
      }
    }
    
  } catch (e) {
    // If URL parsing fails, try basic regex extraction
    console.warn('Failed to parse URL:', e)
  }
  
  // Fallback: Try to extract any 4-6 digit number as potential price
  if (!data.price) {
    const fallbackPriceMatch = url.match(/\$?(\d{4,6})\b/)
    if (fallbackPriceMatch) {
      const potentialPrice = parseInt(fallbackPriceMatch[1])
      if (potentialPrice >= 5000 && potentialPrice < 200000) {
        data.price = potentialPrice
      }
    }
  }
  
  return data
}

function extractDealerFromCarsCom(url: string): string | undefined {
  // Cars.com URLs often have dealer info in path: /dealers/[dealer-name]
  const dealerMatch = url.match(/\/dealers\/([^\/]+)/i)
  if (dealerMatch) {
    return dealerMatch[1].replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }
  return undefined
}

function extractDealerFromAutoTrader(url: string): string | undefined {
  // AutoTrader URLs may have dealer info
  const dealerMatch = url.match(/\/dealer\/([^\/]+)/i)
  if (dealerMatch) {
    return dealerMatch[1].replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }
  return undefined
}

function extractDealerFromCarGurus(url: string): string | undefined {
  // CarGurus URLs may have dealer info
  const dealerMatch = url.match(/\/dealer\/([^\/]+)/i)
  if (dealerMatch) {
    return dealerMatch[1].replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }
  return undefined
}

