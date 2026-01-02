'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { getTaxRateForState, formatStateName } from '@/lib/utils/tax-rates'
import type { TaxRateResult } from '@/lib/utils/tax-lookup'
import { hasPack, hasAllAccess } from '@/lib/packs/entitlements'
import { usePackEntitlements } from '@/hooks/usePackEntitlements'

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

export default function CalculatorPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { ownedPacks } = usePackEntitlements()
  
  // Determine pack variant from localStorage (set by route) - read synchronously on first render
  const getInitialPackVariant = (): 'free' | 'first_time' | 'in_person' => {
    if (typeof window !== 'undefined') {
      const selectedPackId = localStorage.getItem('selected_pack_id')
      
      // Dev-only logging (not in production)
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Calculator] Initial pack variant detection:', {
          path: window.location.pathname,
          selected_pack_id: selectedPackId,
          resolved_variant: selectedPackId === 'first_time' || selectedPackId === 'in_person' || selectedPackId === 'free' 
            ? selectedPackId 
            : 'free (default)',
        })
      }
      
      if (selectedPackId === 'first_time' || selectedPackId === 'in_person' || selectedPackId === 'free') {
        return selectedPackId
      }
    }
    return 'free'
  }
  
  const [packVariant, setPackVariant] = useState<'free' | 'first_time' | 'in_person'>(getInitialPackVariant())
  
  // Update pack variant from localStorage on mount and handle redirect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const selectedPackId = localStorage.getItem('selected_pack_id')
      
      // Dev-only logging (not in production)
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Calculator] Pack variant detection:', {
          path: window.location.pathname,
          selected_pack_id: selectedPackId,
          resolved_variant: selectedPackId === 'first_time' || selectedPackId === 'in_person' || selectedPackId === 'free' 
            ? selectedPackId 
            : 'free (default)',
        })
      }
      
      if (selectedPackId === 'first_time' || selectedPackId === 'in_person' || selectedPackId === 'free') {
        setPackVariant(selectedPackId)
      } else {
        // Default to free if not set, and redirect to /calculator/free
        setPackVariant('free')
        localStorage.setItem('selected_pack_id', 'free')
        // Redirect old /calculator route to /calculator/free
        if (window.location.pathname === '/calculator') {
          router.replace('/calculator/free')
        }
      }
    }
  }, [router])
  
  // Check entitlements and apply pack variant
  const hasInPersonEntitlement = hasPack('in_person') || hasAllAccess()
  const hasFirstTimeEntitlement = hasPack('first_time') || hasAllAccess()
  
  // Only show pack-specific UI if user has entitlement AND variant matches
  const hasInPersonPack = hasInPersonEntitlement && packVariant === 'in_person'
  const hasFirstTimePack = hasFirstTimeEntitlement && packVariant === 'first_time'
  
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
        setTaxRateOverride(true) // Prevent auto-override from state
        console.log('OTD Builder: Loaded tax rate from localStorage:', savedTaxRate)
      }
      
      // Clear localStorage after reading
      if (savedPrice || savedState || savedTaxRate) {
        localStorage.removeItem('otd_builder_price')
        localStorage.removeItem('otd_builder_state')
        localStorage.removeItem('otd_builder_tax_rate')
      }

      // Load In-Person pack Dealer vs Target values (best effort from existing storage)
      if (hasInPersonPack) {
        // Try to load from Prepare Me state first
        const prepareState = localStorage.getItem('copilot_in_person_prepare_state')
        if (prepareState) {
          try {
            const parsed = JSON.parse(prepareState)
            if (parsed.targetOTD) setTargetOTD(parsed.targetOTD)
            if (parsed.walkAwayOTD) setWalkAwayCeiling(parsed.walkAwayOTD)
          } catch (e) {
            console.error('Failed to parse Prepare Me state:', e)
          }
        }
        
        // Fallback to dedicated keys
        const savedDealerOTD = localStorage.getItem('in_person_dealer_current_otd')
        const savedTargetOTD = localStorage.getItem('in_person_target_otd')
        const savedWalkAway = localStorage.getItem('in_person_walkaway_ceiling')
        
        if (savedDealerOTD) setDealerCurrentOTD(savedDealerOTD)
        if (savedTargetOTD && !targetOTD) setTargetOTD(savedTargetOTD)
        if (savedWalkAway && !walkAwayCeiling) setWalkAwayCeiling(savedWalkAway)
      }

      // Load FTB pack Dealer-Quoted OTD
      if (hasFirstTimePack) {
        const savedDealerQuoted = localStorage.getItem('first_time_dealer_quoted_otd')
        if (savedDealerQuoted) setDealerQuotedOTD(savedDealerQuoted)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Save In-Person pack Dealer vs Target values to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && hasInPersonPack) {
      if (dealerCurrentOTD) {
        localStorage.setItem('in_person_dealer_current_otd', dealerCurrentOTD)
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
          } catch (e) {
            // Ignore if parse fails
          }
        }
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
          } catch (e) {
            // Ignore if parse fails
          }
        }
      }
    }
  }, [dealerCurrentOTD, targetOTD, walkAwayCeiling, hasInPersonPack])

  // Save FTB pack Dealer-Quoted OTD to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && hasFirstTimePack) {
      if (dealerQuotedOTD) {
        localStorage.setItem('first_time_dealer_quoted_otd', dealerQuotedOTD)
      } else {
        localStorage.removeItem('first_time_dealer_quoted_otd')
      }
    }
  }, [dealerQuotedOTD, hasFirstTimePack])

  // Resolve tax rate when state or ZIP changes (if not overridden)
  useEffect(() => {
    if (state && !taxRateOverride) {
      setTaxRateLoading(true)
      
      // Call API route for tax lookup (server-side)
      const params = new URLSearchParams({ state })
      if (registrationZip) {
        params.append('zip', registrationZip)
      }
      
      fetch(`/api/tax-lookup?${params.toString()}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.success && data.data) {
            const result = data.data
            setTaxRateResult(result)
            // Set the tax rate to combined rate if available, otherwise use midpoint of range
            if (result.combinedRate !== undefined) {
              setTaxRate(result.combinedRate.toFixed(2))
            } else if (result.combinedRateRange) {
              const midpoint = (result.combinedRateRange.low + result.combinedRateRange.high) / 2
              setTaxRate(midpoint.toFixed(2))
            } else {
              setTaxRate(result.stateBaseRate.toFixed(2))
            }
          } else {
            throw new Error(data.error || 'Tax lookup failed')
          }
          setTaxRateLoading(false)
        })
        .catch((error) => {
          console.warn('Tax rate lookup failed:', error)
          // Fallback to state base rate
          const rate = getTaxRateForState(state)
          if (rate !== null) {
            setTaxRate(rate.toFixed(2))
            setTaxRateResult({
              stateBaseRate: rate,
              combinedRateRange: { low: rate, high: rate + 2.5 },
              confidence: 'low',
              source: 'state_table',
              provider: 'fallback',
              disclaimer: 'Tax rate lookup failed. Using state base rate estimate.',
            })
          } else {
            setTaxRate('')
            setTaxRateResult(null)
          }
          setTaxRateLoading(false)
        })
    } else if (!state) {
      setTaxRateResult(null)
      setTaxRate('')
      setTaxRateLoading(false)
    }
  }, [state, registrationZip, taxRateOverride])

  // Default fee ranges
  const defaultRanges = {
    docFee: { normal: 150, high: 500, inflated: 800 },
    titleFee: { normal: 20, high: 100, inflated: 200 },
    registrationFee: { normal: 50, high: 200, inflated: 400 },
  }

  const addCustomFee = () => {
    if (newCustomFeeName && newCustomFeeAmount) {
      setCustomFees([
        ...customFees,
        {
          id: Date.now().toString(),
          name: newCustomFeeName,
          amount: parseFloat(newCustomFeeAmount) || 0,
          isCustom: true,
        },
      ])
      setNewCustomFeeName('')
      setNewCustomFeeAmount('')
    }
  }

  const removeCustomFee = (id: string) => {
    setCustomFees(customFees.filter((f) => f.id !== id))
  }

  const classifyAddOns = () => {
    if (!addOnsText.trim()) return

    // Simple heuristic: parse line items and classify
    const lines = addOnsText.split('\n').filter((line) => line.trim())
    const classified: AddOn[] = []

    lines.forEach((line) => {
      // Try to extract name and price
      const priceMatch = line.match(/\$?([\d,]+\.?\d*)/)
      const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0
      const name = line.replace(/\$?[\d,]+\.?\d*/g, '').trim()

      if (name && price > 0) {
        let classification: 'normal' | 'maybe' | 'inflated' = 'normal'
        
        // Heuristics for classification
        const lowerName = name.toLowerCase()
        if (
          lowerName.includes('nitrogen') ||
          lowerName.includes('paint protection') ||
          lowerName.includes('fabric protection') ||
          lowerName.includes('vin etching') ||
          (lowerName.includes('warranty') && price > 2000) ||
          price > 1000
        ) {
          classification = 'inflated'
        } else if (
          lowerName.includes('gap') ||
          lowerName.includes('extended warranty') ||
          price > 500
        ) {
          classification = 'maybe'
        }

        classified.push({ name, price, classification })
      }
    })

    setAddOns(classified)
  }

  const calculateOTD = () => {
    const { parseMoney, parsePercentToDecimal, calculateOTD: calcOTD, calculateOTDRange } = require('@/lib/utils/number-parsing')
    
    const vehiclePrice = parseMoney(listedPrice)
    const taxRateDecimal = parsePercentToDecimal(taxRate) // Convert percentage to decimal
    const docFeeNum = parseMoney(docFee)
    const titleFeeNum = parseMoney(titleFee)
    const registrationFeeNum = parseMoney(registrationFee)
    const dealerFeesNum = parseMoney(dealerFees)
    const customFeesTotal = customFees.reduce((sum, f) => sum + parseMoney(f.amount), 0)
    const addOnsTotal = addOns.reduce((sum, a) => sum + parseMoney(a.price), 0)

    // Calculate expected OTD
    const expectedResult = calcOTD({
      vehiclePrice,
      taxRateDecimal,
      docFee: docFeeNum,
      titleFee: titleFeeNum,
      registrationFee: registrationFeeNum,
      otherFees: dealerFeesNum + customFeesTotal,
      addOns: addOnsTotal,
    })

    // Calculate ranges
    const rangeResult = calculateOTDRange({
      vehiclePrice,
      taxRateDecimal,
      docFee: { low: defaultRanges.docFee.normal, high: defaultRanges.docFee.high },
      titleFee: { low: defaultRanges.titleFee.normal, high: defaultRanges.titleFee.high },
      registrationFee: { low: defaultRanges.registrationFee.normal, high: defaultRanges.registrationFee.high },
      otherFees: dealerFeesNum + customFeesTotal,
      addOns: addOnsTotal,
    })

    setOtdLow(rangeResult.low)
    setOtdExpected(expectedResult.otd)
    setOtdHigh(rangeResult.high)
    
    // Add calculation issues to warnings
    const calculationWarnings = [...expectedResult.issues, ...rangeResult.issues]

    // Generate warnings
    const newWarnings: string[] = [...calculationWarnings]

    if (docFeeNum > defaultRanges.docFee.inflated) {
      newWarnings.push(`Documentation fee of $${docFeeNum} is unusually high. Typical range is $${defaultRanges.docFee.normal}-${defaultRanges.docFee.high}. Consider negotiating this down.`)
    } else if (docFeeNum > defaultRanges.docFee.high) {
      newWarnings.push(`Documentation fee of $${docFeeNum} is on the high side. Average is around $${defaultRanges.docFee.normal}-${defaultRanges.docFee.high}.`)
    }

    if (addOns.some((a) => a.classification === 'inflated')) {
      const inflatedAddOns = addOns.filter((a) => a.classification === 'inflated')
      newWarnings.push(`${inflatedAddOns.length} add-on(s) appear inflated and may be optional: ${inflatedAddOns.map((a) => a.name).join(', ')}`)
    }

    if (addOns.some((a) => a.classification === 'maybe')) {
      newWarnings.push('Some add-ons may be optional. Ask the dealer which are required vs. optional.')
    }

    // Check tax rate - convert back to percentage for display
    const taxRatePercent = taxRateDecimal * 100
    if (taxRatePercent === 0 && state) {
      newWarnings.push('Tax rate is 0%. Please verify this is correct for your state.')
    }

    setWarnings(newWarnings)
    setCurrentStep('results')
  }

  const handleNext = () => {
    if (currentStep === 'basics') {
      if (!state || !listedPrice || !taxRate) {
        alert('Please fill in all required fields')
        return
      }
      setCurrentStep('fees')
    } else if (currentStep === 'fees') {
      setCurrentStep('addons')
    } else if (currentStep === 'addons') {
      calculateOTD()
    }
  }

  const handleBack = () => {
    if (currentStep === 'fees') {
      setCurrentStep('basics')
    } else if (currentStep === 'addons') {
      setCurrentStep('fees')
    } else if (currentStep === 'results') {
      setCurrentStep('addons')
    }
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to use this feature</p>
          <a href="/login" className="text-blue-600 hover:text-blue-700">Sign In</a>
        </div>
      </div>
    )
  }

  const progress = currentStep === 'basics' ? 33 : currentStep === 'fees' ? 66 : currentStep === 'addons' ? 90 : 100

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart OTD Builder</h1>
          <p className="text-gray-600">Build your out-the-door price with guided steps and smart defaults</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep === 'basics' ? 1 : currentStep === 'fees' ? 2 : currentStep === 'addons' ? 3 : 4} of 4</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Card className="p-6 lg:p-8">
          {/* Step 1: Basics */}
          {currentStep === 'basics' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Step 1: {hasFirstTimePack ? 'Verify Your Location & Price' : 'Basics'}
              </h2>
              
              {/* Registration Location for Tax Calculation */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-blue-900">Registration Location</h3>
                    <p className="text-xs text-blue-700 mt-1">
                      Tax is calculated based on where you'll register the vehicle. ZIP code provides more accurate rates (includes local taxes).
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => {
                        const newState = e.target.value.toUpperCase().slice(0, 2)
                        setState(newState)
                        setTaxRateOverride(false)
                      }}
                      placeholder="CA, TX, NY"
                      maxLength={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code <span className="text-blue-600 text-xs">(Recommended)</span>
                    </label>
                    <input
                      type="text"
                      value={registrationZip}
                      onChange={(e) => {
                        const newZip = e.target.value.replace(/[^0-9-]/g, '').slice(0, 10)
                        setRegistrationZip(newZip)
                        setTaxRateOverride(false)
                      }}
                      placeholder="90210"
                      maxLength={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ZIP code provides more accurate tax rates
                    </p>
                  </div>
                </div>
                
                {/* Tax Rate Breakdown */}
                {taxRateResult && !taxRateLoading && (
                  <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">State Base Rate:</span>
                      <span className="text-sm font-medium text-gray-900">{taxRateResult.stateBaseRate.toFixed(2)}%</span>
                    </div>
                    {taxRateResult.estimatedLocalAddOn !== undefined && taxRateResult.estimatedLocalAddOn > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Estimated Local Add-on:</span>
                        <span className="text-sm font-medium text-gray-900">+{taxRateResult.estimatedLocalAddOn.toFixed(2)}%</span>
                      </div>
                    )}
                    {taxRateResult.combinedRate !== undefined ? (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-sm font-semibold text-gray-900">Combined Rate:</span>
                        <span className="text-sm font-bold text-blue-600">{taxRateResult.combinedRate.toFixed(2)}%</span>
                      </div>
                    ) : taxRateResult.combinedRateRange && (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-sm font-semibold text-gray-900">Combined Rate Range:</span>
                        <span className="text-sm font-bold text-blue-600">
                          {taxRateResult.combinedRateRange.low.toFixed(2)}% - {taxRateResult.combinedRateRange.high.toFixed(2)}%
                        </span>
                      </div>
                    )}
                    {taxRateResult.confidence && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Confidence:</span>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          taxRateResult.confidence === 'high' ? 'bg-green-100 text-green-700' :
                          taxRateResult.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {taxRateResult.confidence.toUpperCase()}
                        </span>
                      </div>
                    )}
                    {taxRateResult.source && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Source:</span>
                        <span className="text-xs text-gray-500 capitalize">{taxRateResult.source.replace(/_/g, ' ')}</span>
                      </div>
                    )}
                    {taxRateResult.disclaimer && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        <strong>Note:</strong> {taxRateResult.disclaimer}
                      </div>
                    )}
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      <strong>⚠️ Validation Required:</strong> Tax rates are estimates only. Vehicle tax rules vary by state and locality, and may differ from general sales tax. ZIP-based estimates can be imperfect. Always verify the actual tax rate with your dealer or state DMV before finalizing your purchase.
                    </div>
                  </div>
                )}
                
                {taxRateLoading && (
                  <div className="bg-white border border-gray-200 rounded-lg p-3 mt-3">
                    <div className="flex items-center gap-2">
                      <div className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600">Looking up tax rate...</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Listed Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={listedPrice}
                  onChange={(e) => setListedPrice(e.target.value)}
                  placeholder="25000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as 'new' | 'used')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="used">Used</option>
                    <option value="new">New</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seller Type
                  </label>
                  <select
                    value={sellerType}
                    onChange={(e) => setSellerType(e.target.value as 'dealer' | 'private')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="dealer">Dealer</option>
                    <option value="private">Private Party</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Rate (%) <span className="text-red-500">*</span>
                  {!hasFirstTimePack && !taxRateOverride && (
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
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => {
                    setTaxRate(e.target.value)
                    setTaxRateOverride(taxRateResult?.combinedRateRange ? true : false)
                  }}
                  placeholder={taxRateResult?.combinedRate?.toFixed(2) || (taxRateResult?.combinedRateRange ? `${taxRateResult.combinedRateRange.low.toFixed(2)}-${taxRateResult.combinedRateRange.high.toFixed(2)}` : getTaxRateForState(state)?.toFixed(2) || '6.25')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={taxRateLoading || hasFirstTimePack}
                  readOnly={hasFirstTimePack}
                />
                {taxRate && !taxRateOverride && taxRateResult && (
                  <p className="text-xs text-gray-500 mt-1">
                    {taxRateResult.combinedRate ? `Auto-filled from ${taxRateResult.confidence} confidence lookup.` : `Auto-filled from state base rate + local estimate.`}
                    {!hasFirstTimePack && ' Click "Override" to manually adjust.'}
                  </p>
                )}
                {taxRate && !taxRateOverride && !taxRateResult && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ Please verify this tax rate is correct for your state and locality
                  </p>
                )}
                {taxRate && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    <strong>⚠️ Validation Required:</strong> Tax rates are estimates only. Vehicle tax rules vary by state and locality, and may differ from general sales tax. Always verify the actual tax rate with your dealer or state DMV before finalizing your purchase.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Fees */}
          {currentStep === 'fees' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Step 2: {hasFirstTimePack ? 'Common Fees to Expect' : 'Fees'}
              </h2>
              
              {/* FTB Guardrail Helper Text */}
              {hasFirstTimePack && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-800">
                    If the dealer hasn't provided a fee in writing, don't assume it applies. Ask for an itemized OTD worksheet.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documentation Fee
                    <span className="text-xs text-gray-500 ml-2">(Typical: ${defaultRanges.docFee.normal}-${defaultRanges.docFee.high})</span>
                  </label>
                  <input
                    type="number"
                    value={docFee}
                    onChange={(e) => setDocFee(e.target.value)}
                    placeholder={defaultRanges.docFee.normal.toString()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title Fee
                    <span className="text-xs text-gray-500 ml-2">(Typical: $${defaultRanges.titleFee.normal}-${defaultRanges.titleFee.high})</span>
                  </label>
                  <input
                    type="number"
                    value={titleFee}
                    onChange={(e) => setTitleFee(e.target.value)}
                    placeholder={defaultRanges.titleFee.normal.toString()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Fee
                    <span className="text-xs text-gray-500 ml-2">(Typical: $${defaultRanges.registrationFee.normal}-${defaultRanges.registrationFee.high})</span>
                  </label>
                  <input
                    type="number"
                    value={registrationFee}
                    onChange={(e) => setRegistrationFee(e.target.value)}
                    placeholder={defaultRanges.registrationFee.normal.toString()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {!hasFirstTimePack || showOtherDealerFees ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Other Dealer Fees (optional)
                    </label>
                    <input
                      type="number"
                      value={dealerFees}
                      onChange={(e) => setDealerFees(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowOtherDealerFees(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      Add other dealer fees (optional)
                    </button>
                  </div>
                )}
              </div>

              {!hasFirstTimePack || showCustomFees ? (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Custom Fees (from dealer worksheet)</h3>
                <div className="space-y-2">
                  {customFees.map((fee) => (
                    <div key={fee.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm text-gray-700">
                        {fee.name}: ${fee.amount.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCustomFee(fee.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCustomFeeName}
                      onChange={(e) => setNewCustomFeeName(e.target.value)}
                      placeholder="Fee name"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      value={newCustomFeeAmount}
                      onChange={(e) => setNewCustomFeeAmount(e.target.value)}
                      placeholder="Amount"
                      className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <Button type="button" size="sm" onClick={addCustomFee}>
                      Add
                    </Button>
                  </div>
                </div>
                </div>
              ) : (
                <div className="border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCustomFees(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Add fees from dealer worksheet (optional)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Add-ons */}
          {currentStep === 'addons' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Step 3: {hasFirstTimePack ? 'Identify Optional Add-Ons' : 'Add-on Detector'}
              </h2>
              
              {/* FTB Guardrail Helper Text */}
              {hasFirstTimePack && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-800">
                    Most add-ons are optional. Paste the worksheet line items to identify what can be removed before agreeing to OTD.
                  </p>
                </div>
              )}
              
              <p className="text-sm text-gray-600 mb-4">
                Paste line items from the dealer worksheet (e.g., "Nitrogen $299, Paint protection $899")
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add-on Items
                </label>
                <textarea
                  value={addOnsText}
                  onChange={(e) => setAddOnsText(e.target.value)}
                  onBlur={classifyAddOns}
                  placeholder="Nitrogen $299&#10;Paint protection $899&#10;Extended warranty $1,299"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[150px]"
                />
                <Button type="button" variant="secondary" size="sm" onClick={classifyAddOns} className="mt-2">
                  Classify Add-ons
                </Button>
              </div>

              {addOns.length > 0 && (
                <div className="space-y-2">
                  {addOns.map((addOn, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        addOn.classification === 'inflated'
                          ? 'bg-red-50 border-red-200'
                          : addOn.classification === 'maybe'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium text-gray-900">{addOn.name}</span>
                          <span className="text-gray-600 ml-2">${addOn.price.toLocaleString()}</span>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            addOn.classification === 'inflated'
                              ? 'bg-red-100 text-red-700'
                              : addOn.classification === 'maybe'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {addOn.classification === 'inflated' ? 'Inflated' : addOn.classification === 'maybe' ? 'Maybe' : 'Normal'}
                        </span>
                      </div>
                      {addOn.classification === 'inflated' && hasInPersonPack && (
                        <p className="text-xs text-red-700 mt-2">
                          <strong>Pushback:</strong> "I'm not interested in {addOn.name.toLowerCase()}. Can we remove it from the quote?"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Results */}
          {currentStep === 'results' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {hasFirstTimePack ? 'OTD Reality Check' : 'Your OTD Estimate'}
              </h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Out-the-Door Price Range</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Low Estimate:</span>
                    <span className="font-medium">${otdLow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Expected (with your inputs):</span>
                    <span className="font-semibold text-blue-600">${otdExpected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">High Estimate:</span>
                    <span className="font-medium">${otdHigh.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  <strong>⚠️ Validation Required:</strong> This estimate includes tax based on the rate you provided. Tax rates are estimates only and may vary by state, locality, and vehicle type. Always verify the actual tax rate and final OTD price with your dealer before finalizing your purchase.
                </div>
              </div>

              {/* FTB Pack: Dealer-Quoted OTD Input and Verdict */}
              {hasFirstTimePack && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
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

              {/* In-Person Pack: Dealer vs Target Panel */}
              {hasInPersonPack && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
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
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">⚠️ Warnings</h3>
                  {warnings.map((warning, index) => (
                    <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">{warning}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* First-Time Buyer Pack: Cost Breakdown & Location Reminders */}
              {hasFirstTimePack && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold text-gray-900">💡 First-Time Buyer Breakdown</h3>
                  
                  {/* OTD Confidence */}
                  <div className="bg-white border border-yellow-300 rounded-lg p-3">
                    <h4 className="font-medium text-gray-900 mb-2">OTD Confidence</h4>
                    {(() => {
                      const hasTaxRate = !!taxRate && parseFloat(taxRate) > 0
                      const hasAllFees = !!docFee && !!titleFee && !!registrationFee
                      const hasPrice = !!listedPrice && parseFloat(listedPrice) > 0
                      const taxConfidence = taxRateResult?.confidence || 'low'
                      
                      let confidence: 'High' | 'Medium' | 'Low' = 'Low'
                      let confidenceColor = 'red'
                      let confidenceExplanation = ''
                      
                      if (hasPrice && hasTaxRate && hasAllFees && taxConfidence === 'high') {
                        confidence = 'High'
                        confidenceColor = 'green'
                        confidenceExplanation = 'You have all the key inputs and a high-confidence tax rate. This OTD estimate is reliable for planning.'
                      } else if (hasPrice && hasTaxRate && (hasAllFees || taxConfidence === 'medium')) {
                        confidence = 'Medium'
                        confidenceColor = 'yellow'
                        confidenceExplanation = 'Most inputs are provided, but some fees may be estimates. Verify with the dealer for accuracy.'
                      } else {
                        confidence = 'Low'
                        confidenceColor = 'red'
                        confidenceExplanation = 'Some key inputs are missing or estimated. Get a written breakdown from the dealer to confirm.'
                      }
                      
                      return (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-lg font-bold ${
                              confidenceColor === 'green' ? 'text-green-600' :
                              confidenceColor === 'yellow' ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {confidence === 'High' ? '✓' : confidence === 'Medium' ? '⚠' : '✗'}
                            </span>
                            <span className={`text-base font-semibold ${
                              confidenceColor === 'green' ? 'text-green-700' :
                              confidenceColor === 'yellow' ? 'text-yellow-700' :
                              'text-red-700'
                            }`}>
                              {confidence}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{confidenceExplanation}</p>
                        </div>
                      )
                    })()}
                  </div>
                  
                  {/* What Could Change This OTD */}
                  <div className="bg-white border border-yellow-300 rounded-lg p-3">
                    <h4 className="font-medium text-gray-900 mb-2">What Could Change This OTD</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {(() => {
                        const changes = []
                        if (!taxRateResult || taxRateResult.confidence !== 'high') {
                          changes.push('Tax rate may vary based on your exact registration location (ZIP code provides more accuracy)')
                        }
                        if (!docFee || !titleFee || !registrationFee) {
                          changes.push('Actual dealer fees may differ from estimates (doc fee, title fee, registration fee)')
                        }
                        if (addOns.length === 0) {
                          changes.push('Dealer may add optional add-ons during negotiations (extended warranty, protection packages, etc.)')
                        }
                        if (customFees.length === 0 && !dealerFees) {
                          changes.push('Additional dealer fees not yet disclosed (processing fees, dealer prep, etc.)')
                        }
                        // Always include at least one general item
                        if (changes.length === 0) {
                          changes.push('Dealer may adjust fees or add-ons during final negotiations')
                        }
                        return changes.slice(0, 4).map((change, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-yellow-600 mr-2">•</span>
                            <span>{change}</span>
                          </li>
                        ))
                      })()}
                    </ul>
                  </div>
                  
                  {/* One-time vs Recurring Costs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-yellow-300 rounded-lg p-3">
                      <h4 className="font-medium text-gray-900 mb-2">One-Time Costs (Included in OTD)</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li>• Vehicle sale price</li>
                        <li>• Sales tax</li>
                        <li>• Documentation fee</li>
                        <li>• Title fee</li>
                        <li>• Initial registration</li>
                        <li>• Dealer add-ons (if any)</li>
                      </ul>
                    </div>
                    <div className="bg-white border border-yellow-300 rounded-lg p-3">
                      <h4 className="font-medium text-gray-900 mb-2">Recurring/Annual Costs (NOT in OTD)</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li>• Annual registration renewal</li>
                        <li>• City sticker (if applicable)</li>
                        <li>• County wheel tax (if applicable)</li>
                        <li>• Insurance (ongoing)</li>
                        <li>• Maintenance & repairs</li>
                      </ul>
                    </div>
                  </div>

                  {/* Location-Aware Reminders */}
                  {state && (
                    <div className="bg-white border border-yellow-300 rounded-lg p-3">
                      <h4 className="font-medium text-gray-900 mb-2">Location-Specific Reminders</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {['IL', 'NY', 'CA'].includes(state) && (
                          <li>• <strong>City sticker required:</strong> Many cities in {state} require an annual vehicle sticker ($50-$200/year). This is separate from state registration.</li>
                        )}
                        {['WI', 'IL', 'IN'].includes(state) && (
                          <li>• <strong>County wheel tax:</strong> Some counties charge an annual wheel tax ($20-$100/year). Check with your county clerk.</li>
                        )}
                        <li>• <strong>Registration renewal:</strong> You'll need to renew your registration annually (typically $50-$150/year depending on state).</li>
                      </ul>
                    </div>
                  )}

                  {/* OTD Sanity Check */}
                  <div className="bg-white border border-yellow-300 rounded-lg p-3">
                    <h4 className="font-medium text-gray-900 mb-2">OTD Sanity Check</h4>
                    {(() => {
                      const basePrice = parseFloat(listedPrice) || 0
                      const otdDiff = otdExpected - basePrice
                      const otdPercent = basePrice > 0 ? (otdDiff / basePrice) * 100 : 0
                      
                      if (otdPercent <= 8) {
                        return (
                          <div>
                            <p className="text-sm text-green-700 font-medium mb-1">✓ Aggressive but reasonable</p>
                            <p className="text-xs text-gray-600">Your OTD is {otdPercent.toFixed(1)}% above the listed price, which is typical for taxes and fees. This looks realistic.</p>
                          </div>
                        )
                      } else if (otdPercent <= 15) {
                        return (
                          <div>
                            <p className="text-sm text-yellow-700 font-medium mb-1">⚠️ Likely missing some costs</p>
                            <p className="text-xs text-gray-600">Your OTD is {otdPercent.toFixed(1)}% above listed price. This might be missing dealer add-ons, higher fees, or local taxes. Ask the dealer for a complete breakdown.</p>
                          </div>
                        )
                      } else {
                        return (
                          <div>
                            <p className="text-sm text-red-700 font-medium mb-1">⚠️ Significantly higher than listed</p>
                            <p className="text-xs text-gray-600">Your OTD is {otdPercent.toFixed(1)}% above listed price. This suggests inflated fees, add-ons, or missing information. Request a detailed itemization from the dealer.</p>
                          </div>
                        )
                      }
                    })()}
                  </div>

                  {/* Plain-English Explanation */}
                  <div className="bg-white border border-yellow-300 rounded-lg p-3">
                    <h4 className="font-medium text-gray-900 mb-2">Why Dealers Omit Certain Costs</h4>
                    <p className="text-sm text-gray-700 mb-2">
                      Dealers often advertise lower prices to attract buyers, then add costs later. This is normal, but as a first-time buyer, it's important to understand:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                      <li><strong>Taxes:</strong> Dealers can't include your exact tax rate until they know your registration location</li>
                      <li><strong>Fees:</strong> Documentation and title fees vary by dealer and state - they're not included in the listed price</li>
                      <li><strong>Add-ons:</strong> Extended warranties, protection packages, etc. are optional but often pushed during negotiations</li>
                      <li><strong>Local costs:</strong> City stickers, county taxes, and other local fees are your responsibility, not the dealer's</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">What to Ask Dealer</h3>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" className="mt-0.5" />
                    <span>Request an itemized breakdown of all fees</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" className="mt-0.5" />
                    <span>Ask which add-ons are required vs. optional</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" className="mt-0.5" />
                    <span>Verify the tax rate matches your state and locality</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" className="mt-0.5" />
                    <span>Get the final OTD price in writing before committing</span>
                  </label>
                  {addOns.some((a) => a.classification === 'inflated') && (
                    <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" className="mt-0.5" />
                      <span>Negotiate removal of inflated add-ons: {addOns.filter((a) => a.classification === 'inflated').map((a) => a.name).join(', ')}</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={handleBack}
              disabled={currentStep === 'basics'}
            >
              Back
            </Button>
            {currentStep !== 'results' ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button type="button" onClick={() => setCurrentStep('basics')}>
                Start Over
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
