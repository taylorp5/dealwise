/**
 * Strict number parsing utilities for OTD calculations
 * Single source of truth to prevent tax rate and money parsing bugs
 */

/**
 * Parse money from various formats
 * Returns dollars as a number (e.g., "$23,450" -> 23450)
 */
export function parseMoney(input: unknown): number {
  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) return 0
    return Math.abs(input) // Ensure positive
  }
  
  if (typeof input === 'string') {
    // Remove currency symbols, commas, whitespace
    const cleaned = input.replace(/[$,\s]/g, '')
    const num = parseFloat(cleaned)
    if (isNaN(num) || !isFinite(num)) return 0
    return Math.abs(num)
  }
  
  return 0
}

/**
 * Parse percentage to decimal
 * Accepts: 7.25, "7.25", "7.25%", 0.0725, "0.0725"
 * Returns: decimal (0.0725)
 * 
 * Rules:
 * - If value > 1, treat as percent (divide by 100)
 * - If string includes '%', treat as percent
 * - Clamp between 0 and 0.15 (15%) unless explicitly overridden
 */
export function parsePercentToDecimal(
  input: unknown,
  options?: { maxPercent?: number; minPercent?: number }
): number {
  const maxPercent = options?.maxPercent ?? 15
  const minPercent = options?.minPercent ?? 0
  
  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) return 0
    
    // If > 1, assume it's a percentage (e.g., 7.25 means 7.25%)
    if (input > 1) {
      const decimal = input / 100
      return Math.max(minPercent / 100, Math.min(maxPercent / 100, decimal))
    }
    
    // If <= 1, assume it's already a decimal (e.g., 0.0725)
    return Math.max(minPercent / 100, Math.min(maxPercent / 100, Math.abs(input)))
  }
  
  if (typeof input === 'string') {
    const cleaned = input.trim().replace(/%/g, '')
    const num = parseFloat(cleaned)
    if (isNaN(num) || !isFinite(num)) return 0
    
    // If string had '%' or value > 1, treat as percentage
    if (input.includes('%') || num > 1) {
      const decimal = num / 100
      return Math.max(minPercent / 100, Math.min(maxPercent / 100, decimal))
    }
    
    // Otherwise assume decimal
    return Math.max(minPercent / 100, Math.min(maxPercent / 100, Math.abs(num)))
  }
  
  return 0
}

/**
 * Calculate OTD with strict validation
 */
export interface OtdCalculationInput {
  vehiclePrice: number
  taxRateDecimal: number // Must be decimal (0.0725), not percentage
  docFee?: number
  registrationFee?: number
  titleFee?: number
  otherFees?: number
  addOns?: number
}

export interface OtdCalculationResult {
  vehiclePrice: number
  taxRateDecimal: number
  taxAmount: number
  fees: number
  addOns: number
  otd: number
  issues: string[]
}

export function calculateOTD(input: OtdCalculationInput): OtdCalculationResult {
  const issues: string[] = []
  
  // Parse and validate inputs
  const vehiclePrice = parseMoney(input.vehiclePrice)
  const taxRateDecimal = parsePercentToDecimal(input.taxRateDecimal)
  const docFee = parseMoney(input.docFee ?? 0)
  const registrationFee = parseMoney(input.registrationFee ?? 0)
  const titleFee = parseMoney(input.titleFee ?? 0)
  const otherFees = parseMoney(input.otherFees ?? 0)
  const addOns = parseMoney(input.addOns ?? 0)
  
  // Validation
  if (vehiclePrice <= 0) {
    issues.push('Vehicle price must be greater than 0')
  }
  
  if (vehiclePrice > 1000000) {
    issues.push('Vehicle price seems unusually high (>$1M). Please verify.')
  }
  
  if (taxRateDecimal < 0 || taxRateDecimal > 0.15) {
    issues.push(`Tax rate ${(taxRateDecimal * 100).toFixed(2)}% is outside normal range (0-15%). Please verify.`)
  }
  
  // Calculate components
  const taxAmount = vehiclePrice * taxRateDecimal
  const fees = docFee + registrationFee + titleFee + otherFees
  const otd = vehiclePrice + taxAmount + fees + addOns
  
  // Sanity checks
  if (otd > vehiclePrice * 1.5) {
    issues.push(`OTD ($${otd.toLocaleString()}) is more than 50% above vehicle price ($${vehiclePrice.toLocaleString()}). Please check fees and tax rate.`)
  }
  
  if (otd < vehiclePrice) {
    issues.push(`OTD ($${otd.toLocaleString()}) is less than vehicle price ($${vehiclePrice.toLocaleString()}). This is unusual.`)
  }
  
  if (isNaN(otd) || !isFinite(otd)) {
    issues.push('OTD calculation resulted in invalid number. Please check all inputs.')
  }
  
  return {
    vehiclePrice,
    taxRateDecimal,
    taxAmount,
    fees,
    addOns,
    otd: Math.round(otd * 100) / 100, // Round to 2 decimals
    issues,
  }
}

/**
 * Calculate OTD range (low, expected, high)
 */
export interface OtdRangeInput {
  vehiclePrice: number
  taxRateDecimal: number
  docFee?: { low: number; high: number }
  registrationFee?: { low: number; high: number }
  titleFee?: { low: number; high: number }
  otherFees?: number
  addOns?: number
}

export interface OtdRangeResult {
  low: number
  expected: number
  high: number
  issues: string[]
}

export function calculateOTDRange(input: OtdRangeInput): OtdRangeResult {
  const issues: string[] = []
  
  // Low estimate: use low fees
  const lowResult = calculateOTD({
    vehiclePrice: input.vehiclePrice,
    taxRateDecimal: input.taxRateDecimal,
    docFee: input.docFee?.low ?? 0,
    registrationFee: input.registrationFee?.low ?? 0,
    titleFee: input.titleFee?.low ?? 0,
    otherFees: input.otherFees ?? 0,
    addOns: input.addOns ?? 0,
  })
  
  // Expected: use midpoint of fee ranges
  const expectedDocFee = input.docFee ? (input.docFee.low + input.docFee.high) / 2 : 0
  const expectedRegFee = input.registrationFee ? (input.registrationFee.low + input.registrationFee.high) / 2 : 0
  const expectedTitleFee = input.titleFee ? (input.titleFee.low + input.titleFee.high) / 2 : 0
  
  const expectedResult = calculateOTD({
    vehiclePrice: input.vehiclePrice,
    taxRateDecimal: input.taxRateDecimal,
    docFee: expectedDocFee,
    registrationFee: expectedRegFee,
    titleFee: expectedTitleFee,
    otherFees: input.otherFees ?? 0,
    addOns: input.addOns ?? 0,
  })
  
  // High estimate: use high fees
  const highResult = calculateOTD({
    vehiclePrice: input.vehiclePrice,
    taxRateDecimal: input.taxRateDecimal,
    docFee: input.docFee?.high ?? 0,
    registrationFee: input.registrationFee?.high ?? 0,
    titleFee: input.titleFee?.high ?? 0,
    otherFees: input.otherFees ?? 0,
    addOns: input.addOns ?? 0,
  })
  
  // Collect all issues
  issues.push(...lowResult.issues, ...expectedResult.issues, ...highResult.issues)
  
  // Validate range consistency
  if (highResult.otd < lowResult.otd) {
    issues.push('High OTD estimate is less than low estimate. Please check fee ranges.')
  }
  
  if (expectedResult.otd < lowResult.otd || expectedResult.otd > highResult.otd) {
    issues.push('Expected OTD is outside the low-high range. Please check calculations.')
  }
  
  // Validate threshold consistency (threshold should be within ±30% of expected)
  const thresholdRange = {
    min: expectedResult.otd * 0.7,
    max: expectedResult.otd * 1.3,
  }
  
  return {
    low: lowResult.otd,
    expected: expectedResult.otd,
    high: highResult.otd,
    issues: [...new Set(issues)], // Remove duplicates
  }
}






