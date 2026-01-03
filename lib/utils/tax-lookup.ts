/**
 * Tax Rate Lookup Service
 * Resolves tax rates based on buyer registration location (state + ZIP)
 * Supports TaxJar and Avalara APIs with fallback to state table
 */

import { getTaxRateForState, stateTaxRates } from './tax-rates'

export interface TaxRateResult {
  stateBaseRate: number
  estimatedLocalAddOn?: number
  combinedRate?: number
  combinedRateRange?: { low: number; high: number }
  confidence: 'high' | 'medium' | 'low'
  source: 'zip_lookup' | 'state_table' | 'state_estimate'
  provider?: 'taxjar' | 'avalara' | 'fallback'
  disclaimer?: string
}

/**
 * Lookup tax rate by ZIP code using TaxJar API
 */
async function lookupTaxRateByZipTaxJar(zip: string): Promise<number | null> {
  const apiKey = process.env.TAXJAR_API_KEY
  if (!apiKey) {
    return null
  }

  try {
    const response = await fetch(`https://api.taxjar.com/v2/rates/${zip}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    // TaxJar returns combined_rate which includes state + local
    return data.rate?.combined_rate ? parseFloat(data.rate.combined_rate) * 100 : null
  } catch (error) {
    console.warn('TaxJar lookup failed:', error)
    return null
  }
}

/**
 * Lookup tax rate by ZIP code using Avalara API
 */
async function lookupTaxRateByZipAvalara(zip: string, state: string): Promise<number | null> {
  const accountId = process.env.AVALARA_ACCOUNT_ID
  const licenseKey = process.env.AVALARA_LICENSE_KEY
  if (!accountId || !licenseKey) {
    return null
  }

  try {
    // Create base64 auth header (server-side only)
    const authString = `${accountId}:${licenseKey}`
    const authBase64 = typeof Buffer !== 'undefined' 
      ? Buffer.from(authString).toString('base64')
      : btoa(authString) // Fallback for environments without Buffer
    
    const response = await fetch(`https://rest.avatax.com/api/v2/taxrates/bypostalcode?country=US&postalCode=${zip}`, {
      headers: {
        'Authorization': `Basic ${authBase64}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    // Avalara returns totalRate which includes state + local
    return data.totalRate ? parseFloat(data.totalRate) * 100 : null
  } catch (error) {
    console.warn('Avalara lookup failed:', error)
    return null
  }
}

/**
 * Estimate local tax add-on based on state
 * Returns a reasonable range for local taxes (typically 0-2.5% additional)
 */
function estimateLocalTaxRange(state: string): { low: number; high: number } {
  const upperState = state.toUpperCase().trim()
  
  // States with typically higher local taxes
  const highLocalTaxStates = ['CA', 'NY', 'IL', 'TX', 'FL', 'PA']
  if (highLocalTaxStates.includes(upperState)) {
    return { low: 0.5, high: 2.5 }
  }
  
  // States with moderate local taxes
  const moderateLocalTaxStates = ['CO', 'MO', 'OH', 'MI', 'NC', 'GA']
  if (moderateLocalTaxStates.includes(upperState)) {
    return { low: 0.25, high: 1.5 }
  }
  
  // Default: minimal local taxes
  return { low: 0, high: 1.0 }
}

/**
 * Resolve tax rate based on registration location
 * 
 * Priority:
 * 1. If ZIP provided: Try TaxJar → Avalara → Fallback to state + local estimate
 * 2. If only state provided: Use state base rate + local range estimate
 */
export async function resolveTaxRate(
  registrationState: string,
  registrationZip?: string
): Promise<TaxRateResult> {
  const upperState = registrationState.toUpperCase().trim()
  const stateBaseRate = getTaxRateForState(upperState)

  if (!stateBaseRate && stateBaseRate !== 0) {
    // State not found in table
    return {
      stateBaseRate: 0,
      combinedRateRange: { low: 0, high: 0 },
      confidence: 'low',
      source: 'state_estimate',
      provider: 'fallback',
      disclaimer: 'Tax rates are estimates. Always verify with dealer.',
    }
  }

  // If ZIP is provided, try to get exact combined rate
  if (registrationZip) {
    const zip = registrationZip.replace(/[^0-9]/g, '').slice(0, 5) // Normalize ZIP
    
    // Try TaxJar first
    const taxJarRate = await lookupTaxRateByZipTaxJar(zip)
    if (taxJarRate !== null) {
      const localAddOn = taxJarRate - stateBaseRate
      return {
        stateBaseRate,
        estimatedLocalAddOn: localAddOn > 0 ? localAddOn : 0,
        combinedRate: taxJarRate,
        confidence: 'high',
        source: 'zip_lookup',
        provider: 'taxjar',
        disclaimer: 'Tax rates are estimates. Always verify with dealer.',
      }
    }

    // Try Avalara
    const avalaraRate = await lookupTaxRateByZipAvalara(zip, upperState)
    if (avalaraRate !== null) {
      const localAddOn = avalaraRate - stateBaseRate
      return {
        stateBaseRate,
        estimatedLocalAddOn: localAddOn > 0 ? localAddOn : 0,
        combinedRate: avalaraRate,
        confidence: 'high',
        source: 'zip_lookup',
        provider: 'avalara',
        disclaimer: 'Tax rates are estimates. Always verify with dealer.',
      }
    }

    // Fallback: state base + local estimate
    const localRange = estimateLocalTaxRange(upperState)
    const combinedLow = stateBaseRate + localRange.low
    const combinedHigh = stateBaseRate + localRange.high
    
    return {
      stateBaseRate,
      estimatedLocalAddOn: (localRange.low + localRange.high) / 2,
      combinedRateRange: { low: combinedLow, high: combinedHigh },
      confidence: 'medium',
      source: 'state_table',
      provider: 'fallback',
      disclaimer: 'Tax rates are estimates. Always verify with dealer.',
    }
  }

  // Only state provided - use state base + local range estimate
  const localRange = estimateLocalTaxRange(upperState)
  const combinedLow = stateBaseRate + localRange.low
  const combinedHigh = stateBaseRate + localRange.high

  return {
    stateBaseRate,
    estimatedLocalAddOn: (localRange.low + localRange.high) / 2,
    combinedRateRange: { low: combinedLow, high: combinedHigh },
    confidence: 'low',
    source: 'state_estimate',
    provider: 'fallback',
    disclaimer: 'Tax rates are estimates. Always verify with dealer.',
  }
}

