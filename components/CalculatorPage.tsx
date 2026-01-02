'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { getTaxRateForState, formatStateName, stateTaxRates } from '@/lib/utils/tax-rates'
import type { TaxRateResult } from '@/lib/utils/tax-lookup'
import { useEntitlements } from '@/hooks/useEntitlements'

type Step = 'basics' | 'fees' | 'addons' | 'results'

interface Fee {
  id: string
  name: string
  amount: number
  isCustom: boolean
}

interface AddOn {
  name: string
  price: number
  classification: 'normal' | 'maybe' | 'inflated'
}

export interface CalculatorPageProps {
  initialVariant?: 'free' | 'first_time' | 'in_person'
}

export default function CalculatorPage({ initialVariant = 'free' }: CalculatorPageProps = {}) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { hasFirstTime, hasInPerson, loading: entitlementsLoading, entitlements } = useEntitlements()
  
  // Initialize pack variant from prop (route-based, SSR-safe)
  // This ensures deterministic variant selection based on URL, not localStorage timing
  // Use prop as source of truth - no localStorage reads during initial render
  const [packVariant] = useState<'free' | 'first_time' | 'in_person'>(initialVariant)
  
  // Sync pack variant to localStorage for persistence (client-side only, in useEffect)
  // This is for persistence across sessions, but NOT required for correct initial render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Update localStorage to match current variant (for persistence)
      localStorage.setItem('selected_pack_id', packVariant)
      
      // Dev-only logging (not in production)
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Calculator] Pack variant:', {
          path: window.location.pathname,
          initialVariant,
          packVariant,
          localStorage_synced: packVariant,
        })
      }
    }
  }, [packVariant, initialVariant])
  
  // Route guarding: Check entitlements for paid routes and redirect if needed
  // Use Supabase entitlements (single source of truth) instead of localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return // SSR guard
    if (entitlementsLoading || authLoading) return // Wait for entitlements to load
    
    if (packVariant === 'first_time') {
      if (!hasFirstTime) {
        router.replace('/packs?upgrade=first_time')
        return
      }
    } else if (packVariant === 'in_person') {
      if (!hasInPerson) {
        router.replace('/packs?upgrade=in_person')
        return
      }
    }
    // Free variant is always accessible, no check needed
  }, [packVariant, router, hasFirstTime, hasInPerson, entitlementsLoading, authLoading])
  
  // Dev-only debug banner (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      console.log('[Calculator] Entitlement Debug:', {
        path: window.location.pathname,
        packVariant,
        user: user ? { id: user.id, email: user.email } : null,
        entitlements,
        hasFirstTime,
        hasInPerson,
        entitlementsLoading,
        authLoading,
      })
    }
  }, [packVariant, user, entitlements, hasFirstTime, hasInPerson, entitlementsLoading, authLoading])
  
  // UI rendering is based on packVariant alone (route-based)
  // Entitlements are checked separately for route access control
  const isFirstTimeVariant = packVariant === 'first_time'
  const isInPersonVariant = packVariant === 'in_person'
  
  const [currentStep, setCurrentStep] = useState<Step>('basics')
  
  // Step 1: Basics
  const [state, setState] = useState('')
  const [registrationZip, setRegistrationZip] = useState('')
  const [listedPrice, setListedPrice] = useState('')
  const [vehicleType, setVehicleType] = useState<'new' | 'used'>('used')
  const [sellerType, setSellerType] = useState<'dealer' | 'private'>('dealer')
  const [taxRate, setTaxRate] = useState('')
  const [taxRateOverride, setTaxRateOverride] = useState(false)
  const [taxRateResult, setTaxRateResult] = useState<TaxRateResult | null>(null)
  const [taxRateLoading, setTaxRateLoading] = useState(false)
  const [taxLookupError, setTaxLookupError] = useState<string | null>(null)
  
  // Step 2: Fees
  const [docFee, setDocFee] = useState('')
  const [titleFee, setTitleFee] = useState('')
  const [registrationFee, setRegistrationFee] = useState('')
  const [dealerFees, setDealerFees] = useState('')
  const [customFees, setCustomFees] = useState<Fee[]>([])
  const [newCustomFeeName, setNewCustomFeeName] = useState('')
  const [newCustomFeeAmount, setNewCustomFeeAmount] = useState('')

  // Step 3: Add-ons
  const [addOnsText, setAddOnsText] = useState('')
  const [addOns, setAddOns] = useState<AddOn[]>([])

  // Results
  const [warnings, setWarnings] = useState<string[]>([])
  const [otdLow, setOtdLow] = useState(0)
  const [otdExpected, setOtdExpected] = useState(0)
  const [otdHigh, setOtdHigh] = useState(0)

  // FTB-only: Collapsible sections
  const [showCustomFees, setShowCustomFees] = useState(false)
  const [showOtherDealerFees, setShowOtherDealerFees] = useState(false)

  // In-Person only: Dealer vs Target panel
  const [dealerCurrentOTD, setDealerCurrentOTD] = useState('')
  const [targetOTD, setTargetOTD] = useState('')
  const [walkAwayCeiling, setWalkAwayCeiling] = useState('')

  // FTB only: Dealer-Quoted OTD
  const [dealerQuotedOTD, setDealerQuotedOTD] = useState('')

  // Load data from localStorage on mount (from DealPlanDisplay)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPrice = localStorage.getItem('otd_builder_price')
      const savedState = localStorage.getItem('otd_builder_state')
      const savedTaxRate = localStorage.getItem('otd_builder_tax_rate')
      
      if (savedPrice) {
        setListedPrice(savedPrice)
        console.log('OTD Builder: Loaded price from localStorage:', savedPrice)
      }
      
      if (savedState) {
        setState(savedState)
        console.log('OTD Builder: Loaded state from localStorage:', savedState)
      }
      
      if (savedTaxRate) {
        setTaxRate(savedTaxRate)
        console.log('OTD Builder: Loaded tax rate from localStorage:', savedTaxRate)
      }
    }
  }, [])

  // Load In-Person pack values from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && isInPersonVariant) {
      const savedDealerOTD = localStorage.getItem('in_person_dealer_current_otd')
      const savedTargetOTD = localStorage.getItem('in_person_target_otd')
      const savedWalkAway = localStorage.getItem('in_person_walkaway_ceiling')
      const prepareState = localStorage.getItem('copilot_in_person_prepare_state')

      if (savedDealerOTD) setDealerCurrentOTD(savedDealerOTD)
      if (savedTargetOTD) setTargetOTD(savedTargetOTD)
      if (savedWalkAway) setWalkAwayCeiling(savedWalkAway)

      // Also try to load from Prepare Me state if not already set
      if (prepareState) {
        try {
          const parsed = JSON.parse(prepareState)
          if (parsed.targetOTD && !targetOTD) setTargetOTD(parsed.targetOTD)
          if (parsed.walkAwayOTD && !walkAwayCeiling) setWalkAwayCeiling(parsed.walkAwayOTD)
        } catch (e) { /* ignore */ }
      }
    }
  }, [isInPersonVariant, targetOTD, walkAwayCeiling])

  // Save In-Person pack values to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && isInPersonVariant) {
      if (dealerCurrentOTD) {
        localStorage.setItem('in_person_dealer_current_otd', dealerCurrentOTD)
      } else {
        localStorage.removeItem('in_person_dealer_current_otd')
      }
      if (targetOTD) {
        localStorage.setItem('in_person_target_otd', targetOTD)
        // Also update Prepare Me state if it exists
        const prepareState = localStorage.getItem('copilot_in_person_prepare_state')
        if (prepareState) {
          try {
            const parsed = JSON.parse(prepareState)
            parsed.targetOTD = targetOTD
            localStorage.setItem('copilot_in_person_prepare_state', JSON.stringify(parsed))
          } catch (e) { /* ignore */ }
        }
      } else {
        localStorage.removeItem('in_person_target_otd')
      }
      if (walkAwayCeiling) {
        localStorage.setItem('in_person_walkaway_ceiling', walkAwayCeiling)
        // Also update Prepare Me state if it exists
        const prepareState = localStorage.getItem('copilot_in_person_prepare_state')
        if (prepareState) {
          try {
            const parsed = JSON.parse(prepareState)
            parsed.walkAwayOTD = walkAwayCeiling
            localStorage.setItem('copilot_in_person_prepare_state', JSON.stringify(parsed))
          } catch (e) { /* ignore */ }
        }
      } else {
        localStorage.removeItem('in_person_walkaway_ceiling')
      }
    }
  }, [dealerCurrentOTD, targetOTD, walkAwayCeiling, isInPersonVariant])

  // Load FTB pack values from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && isFirstTimeVariant) {
      const savedDealerQuotedOTD = localStorage.getItem('first_time_dealer_quoted_otd')
      if (savedDealerQuotedOTD) setDealerQuotedOTD(savedDealerQuotedOTD)
    }
  }, [isFirstTimeVariant])

  // Save FTB pack values to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && isFirstTimeVariant) {
      if (dealerQuotedOTD) {
        localStorage.setItem('first_time_dealer_quoted_otd', dealerQuotedOTD)
      } else {
        localStorage.removeItem('first_time_dealer_quoted_otd')
      }
    }
  }, [dealerQuotedOTD, isFirstTimeVariant])

  // Auto-lookup tax rate when state changes
  useEffect(() => {
    if (state && !taxRateOverride) {
      setTaxRateLoading(true)
      setTaxLookupError(null) // Clear any previous error
      const rate = getTaxRateForState(state)
      if (rate) {
        setTaxRate(rate.toString())
        setTaxRateResult({
          stateBaseRate: rate,
          combinedRate: rate,
          confidence: 'low',
          source: 'state_estimate',
          provider: 'fallback',
        })
      }
      setTaxRateLoading(false)
    }
  }, [state, taxRateOverride])
  
  // Clear error when lookup succeeds
  useEffect(() => {
    if (taxRateResult && taxRateResult.source === 'zip_lookup') {
      setTaxLookupError(null)
    }
  }, [taxRateResult])

  const handleLookupTax = async () => {
    if (!state || !registrationZip) {
      alert('Please enter both state and ZIP code')
      return
    }

    setTaxRateLoading(true)
    try {
      const response = await fetch(`/api/tax-lookup?state=${encodeURIComponent(state)}&zip=${encodeURIComponent(registrationZip)}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.data) {
        // API returns { success: true, data: TaxRateResult }
        const result = data.data
        if (result.combinedRate !== undefined) {
          setTaxRate(result.combinedRate.toString())
        } else if (result.combinedRateRange) {
          // Use midpoint if range is provided
          const midpoint = (result.combinedRateRange.low + result.combinedRateRange.high) / 2
          setTaxRate(midpoint.toString())
        } else {
          setTaxRate(result.stateBaseRate.toString())
        }
        setTaxRateResult(result)
        setTaxRateOverride(false)
      } else {
        // API returned success: false or unexpected shape - fall back to state estimate
        throw new Error(data.error || 'Tax lookup unavailable')
      }
    } catch (error) {
      console.warn('Tax lookup error:', error)
      // Graceful fallback: use state estimate
      const stateRate = getTaxRateForState(state)
      if (stateRate !== null) {
        setTaxRate(stateRate.toString())
        setTaxRateResult({
          stateBaseRate: stateRate,
          combinedRate: stateRate,
          confidence: 'low',
          source: 'state_estimate',
          provider: 'fallback',
        })
      }
      // Show non-scary message (no alert, just update UI)
      setTaxLookupError('Tax lookup unavailable right now. Using state estimate. Please verify tax with dealer/DMV.')
    } finally {
      setTaxRateLoading(false)
    }
  }

  const handleAddCustomFee = () => {
    if (!newCustomFeeName || !newCustomFeeAmount) {
      alert('Please enter both fee name and amount')
      return
    }

    const amount = parseFloat(newCustomFeeAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setCustomFees([
      ...customFees,
      {
        id: Date.now().toString(),
        name: newCustomFeeName,
        amount,
        isCustom: true,
      },
    ])
    setNewCustomFeeName('')
    setNewCustomFeeAmount('')
  }

  const handleRemoveCustomFee = (id: string) => {
    setCustomFees(customFees.filter((fee) => fee.id !== id))
  }

  const parseAddOns = () => {
    if (!addOnsText.trim()) {
      setAddOns([])
      return
    }

    const lines = addOnsText.split('\n').filter((line) => line.trim())
    const parsed: AddOn[] = []

    for (const line of lines) {
      // Try to extract name and price from line
      // Common patterns:
      // - "Extended Warranty - $2,500"
      // - "GAP Insurance: $500"
      // - "Paint Protection $300"
      const priceMatch = line.match(/[\$]?([\d,]+\.?\d*)/)
      const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0
      const name = line.replace(/[\$][\d,]+\.?\d*/g, '').replace(/[:-]\s*$/, '').trim()

      if (name && price > 0) {
        // Classify add-on
        let classification: 'normal' | 'maybe' | 'inflated' = 'normal'
        const lowerName = name.toLowerCase()
        
        if (lowerName.includes('warranty') || lowerName.includes('protection') || lowerName.includes('coating')) {
          classification = 'maybe'
        }
        if (lowerName.includes('etch') || lowerName.includes('fabric') || lowerName.includes('paint') || lowerName.includes('rust')) {
          classification = 'inflated'
        }
        if (price > 2000) {
          classification = 'inflated'
        }

        parsed.push({ name, price, classification })
      }
    }

    setAddOns(parsed)
  }

  const calculateOTD = () => {
    const price = parseFloat(listedPrice) || 0
    const tax = parseFloat(taxRate) || 0
    const doc = parseFloat(docFee) || 0
    const title = parseFloat(titleFee) || 0
    const registration = parseFloat(registrationFee) || 0
    const dealer = parseFloat(dealerFees) || 0
    const customTotal = customFees.reduce((sum, fee) => sum + fee.amount, 0)
    const addOnsTotal = addOns.reduce((sum, addon) => sum + addon.price, 0)

    const base = price
    const taxAmount = (base * tax) / 100
    const fees = doc + title + registration + dealer + customTotal
    const total = base + taxAmount + fees + addOnsTotal

    // Calculate low/high estimates
    // Low: assume no add-ons, minimal fees
    const lowFees = doc + title + registration
    const lowTotal = base + (base * tax) / 100 + lowFees

    // High: include all fees and add-ons
    const highTotal = total

    // Expected: base + tax + standard fees (doc, title, registration) + half of optional fees/add-ons
    const expectedFees = doc + title + registration + (dealer + customTotal + addOnsTotal) * 0.5
    const expectedTotal = base + (base * tax) / 100 + expectedFees

    setOtdLow(lowTotal)
    setOtdExpected(expectedTotal)
    setOtdHigh(highTotal)

    // Generate warnings
    const warningsList: string[] = []
    if (addOnsTotal > 2000) {
      warningsList.push('High add-on costs detected. Review each item carefully.')
    }
    if (dealer > 500) {
      warningsList.push('Unusually high dealer fees. Request itemized breakdown.')
    }
    if (customTotal > 1000) {
      warningsList.push('Multiple custom fees detected. Verify each is necessary.')
    }
    setWarnings(warningsList)

    setCurrentStep('results')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Dev-only debug banner */}
      {process.env.NODE_ENV !== 'production' && packVariant !== 'free' && (
        <div className="max-w-4xl mx-auto px-4 mb-4">
          <Card className="p-4 bg-yellow-50 border-yellow-300">
            <h3 className="text-sm font-semibold text-yellow-900 mb-2">🔍 Dev Debug: Entitlement Check</h3>
            <div className="text-xs text-yellow-800 space-y-1">
              <p><strong>Path:</strong> {typeof window !== 'undefined' ? window.location.pathname : 'SSR'}</p>
              <p><strong>Pack Variant:</strong> {packVariant}</p>
              <p><strong>User:</strong> {user ? `${user.email} (${user.id.slice(0, 8)}...)` : 'Not logged in'}</p>
              <p><strong>Entitlements:</strong> {JSON.stringify(entitlements)}</p>
              <p><strong>hasFirstTime:</strong> {hasFirstTime ? '✅' : '❌'}</p>
              <p><strong>hasInPerson:</strong> {hasInPerson ? '✅' : '❌'}</p>
              <p><strong>Loading:</strong> {entitlementsLoading || authLoading ? '⏳' : '✅'}</p>
            </div>
          </Card>
        </div>
      )}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart OTD Builder</h1>
          <p className="text-gray-600 mb-6">
            Calculate your out-the-door price with all fees, taxes, and add-ons
          </p>

          {/* Step Navigation */}
          <div className="flex space-x-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setCurrentStep('basics')}
              className={`px-4 py-2 font-medium ${
                currentStep === 'basics'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {isFirstTimeVariant ? 'Step 1: Verify Your Location & Price' : 'Step 1: Basics'}
            </button>
            <button
              onClick={() => setCurrentStep('fees')}
              className={`px-4 py-2 font-medium ${
                currentStep === 'fees'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {isFirstTimeVariant ? 'Step 2: Common Fees to Expect' : 'Step 2: Fees'}
            </button>
            <button
              onClick={() => setCurrentStep('addons')}
              className={`px-4 py-2 font-medium ${
                currentStep === 'addons'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {isFirstTimeVariant ? 'Step 3: Identify Optional Add-Ons' : 'Step 3: Add-on Detector'}
            </button>
            <button
              onClick={() => currentStep === 'results' && setCurrentStep('results')}
              className={`px-4 py-2 font-medium ${
                currentStep === 'results'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              disabled={currentStep !== 'results'}
            >
              {isFirstTimeVariant ? 'OTD Reality Check' : 'Your OTD Estimate'}
            </button>
          </div>

          {/* Step 1: Basics */}
          {currentStep === 'basics' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {isFirstTimeVariant ? 'Step 1: Verify Your Location & Price' : 'Step 1: Basics'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Price (Listed Price)
                  </label>
                  <input
                    type="text"
                    value={listedPrice}
                    onChange={(e) => setListedPrice(e.target.value)}
                    placeholder="25000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration State
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select state</option>
                    {Object.keys(stateTaxRates).map((s) => (
                      <option key={s} value={s}>
                        {formatStateName(s)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration ZIP Code (optional, for accurate tax rate)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={registrationZip}
                      onChange={(e) => setRegistrationZip(e.target.value)}
                      placeholder="90210"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <Button onClick={handleLookupTax} disabled={taxRateLoading}>
                      {taxRateLoading ? 'Looking up...' : 'Lookup Tax Rate'}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Rate (%)
                    {!isFirstTimeVariant && !taxRateOverride && (
                      <button
                        type="button"
                        onClick={() => setTaxRateOverride(true)}
                        className="ml-2 text-xs text-blue-600 hover:text-blue-700"
                      >
                        Override
                      </button>
                    )}
                  </label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="7.5"
                    step="0.01"
                    disabled={taxRateLoading || isFirstTimeVariant}
                    readOnly={isFirstTimeVariant}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  {taxRateResult && (
                    <p className="text-xs text-gray-500 mt-1">
                      {taxRateResult.source === 'zip_lookup'
                        ? `Looked up: ${taxRateResult.combinedRate || taxRateResult.stateBaseRate}%`
                        : `Estimated: ${taxRateResult.combinedRate || taxRateResult.stateBaseRate}%`}
                      {!isFirstTimeVariant && ' Click "Override" to manually adjust.'}
                    </p>
                  )}
                  
                  {/* Graceful error message when lookup fails */}
                  {taxLookupError && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        {taxLookupError}
                      </p>
                    </div>
                  )}
                  
                  {/* Tax Rate Disclaimer - Always visible for all variants */}
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      <strong>⚠️ Tax rates are estimates only.</strong> Vehicle tax rules vary by state and locality. Always verify the actual tax rate with the dealer or your state DMV before finalizing.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setCurrentStep('fees')}>Continue to Fees</Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Fees */}
          {currentStep === 'fees' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {isFirstTimeVariant ? 'Step 2: Common Fees to Expect' : 'Step 2: Fees'}
              </h2>

              {isFirstTimeVariant && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-4">
                  <strong>💡 Guardrail:</strong> If the dealer hasn't provided a fee in writing, don't assume it applies. Ask for an itemized OTD worksheet.
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documentation Fee (Doc Fee)
                  </label>
                  <input
                    type="text"
                    value={docFee}
                    onChange={(e) => setDocFee(e.target.value)}
                    placeholder="500"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title Fee
                  </label>
                  <input
                    type="text"
                    value={titleFee}
                    onChange={(e) => setTitleFee(e.target.value)}
                    placeholder="50"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Fee
                  </label>
                  <input
                    type="text"
                    value={registrationFee}
                    onChange={(e) => setRegistrationFee(e.target.value)}
                    placeholder="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {!isFirstTimeVariant || showOtherDealerFees ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Other Dealer Fees (optional)
                    </label>
                    <input
                      type="text"
                      value={dealerFees}
                      onChange={(e) => setDealerFees(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <div>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setShowOtherDealerFees(!showOtherDealerFees)}>
                      {showOtherDealerFees ? 'Hide other dealer fees' : 'Add other dealer fees (optional)'}
                    </Button>
                    {showOtherDealerFees && (
                      <input
                        type="text"
                        value={dealerFees}
                        onChange={(e) => setDealerFees(e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mt-2"
                      />
                    )}
                  </div>
                )}

                {!isFirstTimeVariant || showCustomFees ? (
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Custom Fees (from dealer worksheet)</h3>
                    {customFees.map((fee) => (
                      <div key={fee.id} className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-700">
                          {fee.name}: ${fee.amount.toLocaleString()}
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRemoveCustomFee(fee.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <div className="flex space-x-2 mt-2">
                      <input
                        type="text"
                        value={newCustomFeeName}
                        onChange={(e) => setNewCustomFeeName(e.target.value)}
                        placeholder="Fee name"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={newCustomFeeAmount}
                        onChange={(e) => setNewCustomFeeAmount(e.target.value)}
                        placeholder="Amount"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <Button onClick={handleAddCustomFee}>Add</Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-gray-200 pt-4">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setShowCustomFees(!showCustomFees)}>
                      {showCustomFees ? 'Hide custom fees' : 'Add fees from dealer worksheet (optional)'}
                    </Button>
                    {showCustomFees && (
                      <div className="mt-2">
                        {customFees.map((fee) => (
                          <div key={fee.id} className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-700">
                              {fee.name}: ${fee.amount.toLocaleString()}
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleRemoveCustomFee(fee.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                        <div className="flex space-x-2 mt-2">
                          <input
                            type="text"
                            value={newCustomFeeName}
                            onChange={(e) => setNewCustomFeeName(e.target.value)}
                            placeholder="Fee name"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={newCustomFeeAmount}
                            onChange={(e) => setNewCustomFeeAmount(e.target.value)}
                            placeholder="Amount"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <Button onClick={handleAddCustomFee}>Add</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="secondary" onClick={() => setCurrentStep('basics')}>
                    Back
                  </Button>
                  <Button onClick={() => setCurrentStep('addons')}>Continue to Add-ons</Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Add-ons */}
          {currentStep === 'addons' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {isFirstTimeVariant ? 'Step 3: Identify Optional Add-Ons' : 'Step 3: Add-on Detector'}
              </h2>

              {isFirstTimeVariant && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-4">
                  <strong>💡 Guardrail:</strong> Most add-ons are optional. Paste the worksheet line items to identify what can be removed before agreeing to OTD.
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste add-ons from dealer worksheet (one per line)
                  </label>
                  <textarea
                    value={addOnsText}
                    onChange={(e) => {
                      setAddOnsText(e.target.value)
                      parseAddOns()
                    }}
                    onBlur={parseAddOns}
                    placeholder="Extended Warranty - $2,500&#10;GAP Insurance: $500&#10;Paint Protection $300"
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {addOns.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Detected Add-ons:</h3>
                    <div className="space-y-2">
                      {addOns.map((addon, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            addon.classification === 'inflated'
                              ? 'bg-red-50 border-red-200'
                              : addon.classification === 'maybe'
                              ? 'bg-yellow-50 border-yellow-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">{addon.name}</p>
                              <p className="text-sm text-gray-600">${addon.price.toLocaleString()}</p>
                            </div>
                            <div>
                              {addon.classification === 'inflated' && (
                                <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded">
                                  ⚠️ Likely inflated
                                </span>
                              )}
                              {addon.classification === 'maybe' && (
                                <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                                  ⚠️ Review carefully
                                </span>
                              )}
                              {addon.classification === 'normal' && (
                                <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                  ✓ Normal
                                </span>
                              )}
                            </div>
                          </div>
                          {addon.classification === 'inflated' && isInPersonVariant && (
                            <p className="text-xs text-red-700 mt-2">
                              Consider negotiating removal or significant reduction.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="secondary" onClick={() => setCurrentStep('fees')}>
                    Back
                  </Button>
                  <Button onClick={calculateOTD}>Calculate OTD</Button>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {currentStep === 'results' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {isFirstTimeVariant ? 'OTD Reality Check' : 'Your OTD Estimate'}
              </h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">OTD Price Range</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Low Estimate</p>
                    <p className="text-2xl font-bold text-gray-900">${otdLow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expected</p>
                    <p className="text-2xl font-bold text-blue-600">${otdExpected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">High Estimate</p>
                    <p className="text-2xl font-bold text-gray-900">${otdHigh.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>

              {isFirstTimeVariant && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dealer-Quoted OTD (optional)
                    </label>
                    <input
                      type="number"
                      value={dealerQuotedOTD}
                      onChange={(e) => setDealerQuotedOTD(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Paste the OTD the dealer sent you (from email or worksheet).
                    </p>
                  </div>

                  {/* Verdict Block */}
                  {dealerQuotedOTD && parseFloat(dealerQuotedOTD) > 0 && (() => {
                    const dealerQuote = parseFloat(dealerQuotedOTD)
                    const highEstimate = otdHigh
                    let verdict: { icon: string; color: string; title: string; nextStep: string } | null = null

                    if (dealerQuote <= highEstimate) {
                      verdict = {
                        icon: '✅',
                        color: 'green',
                        title: 'Within expected range',
                        nextStep: 'Confirm everything in writing before agreeing.'
                      }
                    } else if (dealerQuote > highEstimate && dealerQuote <= highEstimate * 1.05) {
                      verdict = {
                        icon: '⚠️',
                        color: 'yellow',
                        title: 'Slightly high — ask for itemized breakdown',
                        nextStep: 'Request a written itemized OTD breakdown and clarify optional add-ons.'
                      }
                    } else {
                      verdict = {
                        icon: '❌',
                        color: 'red',
                        title: 'Inflated — add-ons/fees likely',
                        nextStep: 'Request a written itemized OTD breakdown and clarify optional add-ons.'
                      }
                    }

                    return (
                      <div className={`bg-white border-2 rounded-lg p-4 ${
                        verdict.color === 'green' ? 'border-green-300' :
                        verdict.color === 'yellow' ? 'border-yellow-300' :
                        'border-red-300'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{verdict.icon}</span>
                          <h4 className={`font-semibold ${
                            verdict.color === 'green' ? 'text-green-900' :
                            verdict.color === 'yellow' ? 'text-yellow-900' :
                            'text-red-900'
                          }`}>
                            {verdict.title}
                          </h4>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-700">
                            <strong>Next step:</strong> {verdict.nextStep}
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {isInPersonVariant && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Dealer vs Target</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dealer Current OTD
                      </label>
                      <input
                        type="number"
                        value={dealerCurrentOTD}
                        onChange={(e) => setDealerCurrentOTD(e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Target OTD
                      </label>
                      <input
                        type="number"
                        value={targetOTD}
                        onChange={(e) => setTargetOTD(e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Walk-Away Ceiling
                      </label>
                      <input
                        type="number"
                        value={walkAwayCeiling}
                        onChange={(e) => setWalkAwayCeiling(e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  {/* Gap Calculations */}
                  <div className="bg-white border border-orange-300 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Gap to Target:</span>
                        <span className="ml-2 font-semibold text-gray-900">
                          {dealerCurrentOTD && targetOTD
                            ? (() => {
                                const gap = parseFloat(dealerCurrentOTD) - parseFloat(targetOTD)
                                return gap >= 0
                                  ? `+$${gap.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : `-$${Math.abs(gap).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              })()
                            : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Gap to Ceiling:</span>
                        <span className="ml-2 font-semibold text-gray-900">
                          {dealerCurrentOTD && walkAwayCeiling
                            ? (() => {
                                const gap = parseFloat(dealerCurrentOTD) - parseFloat(walkAwayCeiling)
                                return gap >= 0
                                  ? `+$${gap.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : `-$${Math.abs(gap).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              })()
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Guidance Text */}
                  {dealerCurrentOTD && targetOTD && (
                    <div className="bg-white border border-orange-300 rounded-lg p-3 mb-4">
                      <p className="text-sm text-gray-700">
                        {(() => {
                          const gap = parseFloat(dealerCurrentOTD) - parseFloat(targetOTD)
                          return gap > 0
                            ? "You're above target. Don't agree until OTD is at or below your number."
                            : "You're at/under target. Confirm the written OTD breakdown before signing."
                        })()}
                      </p>
                    </div>
                  )}

                  {/* Open Deal Decision Advisor Button */}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.push('/copilot/in-person/live')}
                    className="w-full"
                  >
                    Open Deal Decision Advisor
                  </Button>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Warnings</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                    {warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setCurrentStep('addons')}>
                  Back
                </Button>
                <Button onClick={() => setCurrentStep('basics')}>Start Over</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

