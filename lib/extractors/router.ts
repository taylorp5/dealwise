/**
 * Extractor router - routes to appropriate extractor based on URL
 */

import type { ListingData } from '@/lib/types/listing'
import { extractCarsCom } from './cars'
import { extractDealerGeneric } from './dealer_generic'

/**
 * Extract listing data from any dealership URL
 */
export async function extractListing(url: string, html?: string): Promise<ListingData> {
  let result: ListingData
  
  try {
    const urlObj = new URL(url)
    const host = urlObj.hostname.replace(/^www\./, '').toLowerCase()
    
    // Route to specific extractors
    if (host.includes('cars.com')) {
      result = await extractCarsCom(url, html)
    } else {
      // Generic dealer extractor for all other sites
      result = await extractDealerGeneric(url, html)
    }
  } catch (error: any) {
    // If URL parsing fails, try generic extractor anyway
    console.warn('Failed to parse URL, using generic extractor:', error)
    result = await extractDealerGeneric(url, html)
  }
  
  // Safeguard: ensure sourceUrl and sourceSite are always set
  if (!result.sourceUrl) {
    result.sourceUrl = url
  }
  if (!result.sourceSite) {
    try {
      const urlObj = new URL(url)
      const host = urlObj.hostname.replace(/^www\./, '').toLowerCase()
      if (host.includes('cars.com')) {
        result.sourceSite = 'cars.com'
      } else if (host.includes('autotrader.com')) {
        result.sourceSite = 'autotrader.com'
      } else if (host.includes('cargurus.com')) {
        result.sourceSite = 'cargurus.com'
      } else {
        result.sourceSite = 'other'
      }
    } catch {
      result.sourceSite = 'other'
    }
  }
  
  return result
}
