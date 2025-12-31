/**
 * Shared normalization helpers for all extractors
 * Single source of truth for parsing and normalizing listing data
 */

import type { VehicleCondition } from '@/lib/types/listing'
import { parseMoney, parsePercentToDecimal } from '@/lib/utils/number-parsing'

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
  if (lower.includes('used') || lower.includes('pre-owned') || lower.includes('preowned')) return 'used'
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
 * Extract VIN from text
 */
export function extractVIN(text: string): string | undefined {
  const vinMatch = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)
  if (vinMatch) {
    return vinMatch[1].toUpperCase()
  }
  return undefined
}

/**
 * Extract stock number from text
 */
export function extractStockNumber(text: string): string | undefined {
  // Common patterns: "Stock #12345", "Stock: 12345", "STK12345"
  const patterns = [
    /stock\s*[#:]?\s*([A-Z0-9-]+)/i,
    /stk\s*([A-Z0-9-]+)/i,
    /stock\s*number[:\s]+([A-Z0-9-]+)/i,
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].toUpperCase()
    }
  }
  
  return undefined
}

/**
 * Validate price is reasonable
 */
export function validatePrice(price: number | undefined): { valid: boolean; issue?: string } {
  if (!price) return { valid: false, issue: 'Price missing' }
  if (isNaN(price) || !isFinite(price)) return { valid: false, issue: 'Price is not a valid number' }
  if (price < 500) return { valid: false, issue: 'Price too low (<$500)' }
  if (price > 250000) return { valid: false, issue: 'Price too high (>$250k)' }
  return { valid: true }
}

/**
 * Validate mileage is reasonable
 */
export function validateMileage(mileage: number | undefined): { valid: boolean; issue?: string } {
  if (mileage === undefined) return { valid: false, issue: 'Mileage missing' }
  if (isNaN(mileage) || !isFinite(mileage)) return { valid: false, issue: 'Mileage is not a valid number' }
  if (mileage < 0) return { valid: false, issue: 'Mileage cannot be negative' }
  if (mileage > 400000) return { valid: false, issue: 'Mileage too high (>400k)' }
  return { valid: true }
}

