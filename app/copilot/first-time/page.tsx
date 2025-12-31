'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePackEntitlements } from '@/hooks/usePackEntitlements'
import { hasPack, hasAllAccess } from '@/lib/packs/entitlements'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase/client'
import { getTaxRateForState } from '@/lib/utils/tax-rates'
import type { TaxRateResult } from '@/lib/utils/tax-lookup'

type BuyerType = 'first-time' | 'cash' | 'financing' | 'lease'
type Stage = 'initial_outreach' | 'after_quote' | 'after_counter' | 'in_person_today' | 'final_paperwork'
type Tone = 'friendly' | 'neutral' | 'firm'
type Goal = 'get_otd' | 'reduce_addons' | 'lower_price' | 'schedule_visit_otd' | 'close_today'
type TradeInStatus = 'none' | 'maybe' | 'yes'

interface FirstTimeCopilotResponse {
  bestNextMessage: string
  whyThisWorks?: string[] // 2-3 bullets, coach-like
  confidenceCheck?: string // Single-line confidence assessment
  ifTheyPushBack?: Array<{
    dealerReply: string
    suggestedResponse: string
  }> // Only 2 realistic responses
  whatNotToSay?: string[] // What NOT to say next
  assumptions: {
    taxBaseRate?: number
    feeAssumptions?: string
    disclaimer: string
  }
}

export default function FirstTimeCopilotPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { ownedPacks } = usePackEntitlements()
  const hasFirstTimePack = hasPack('first_time') || hasAllAccess()
  
  // Entitlement guard
  useEffect(() => {
    if (!authLoading && !hasFirstTimePack) {
      router.push('/copilot/free')
    }
  }, [authLoading, hasFirstTimePack, router])
  
  // Inputs (same as free, but with first-time specific features)
  const [buyerType, setBuyerType] = useState<BuyerType>('first-time')
  const [stage, setStage] = useState<Stage>('initial_outreach')
  const [tone, setTone] = useState<Tone>('friendly')
  const [goal, setGoal] = useState<Goal>('get_otd')
  const [vehiclePrice, setVehiclePrice] = useState('')
  const [desiredOTD, setDesiredOTD] = useState('')
  const [state, setState] = useState('')
  const [registrationZip, setRegistrationZip] = useState('')
  const [taxRate, setTaxRate] = useState('')
  const [taxRateOverride, setTaxRateOverride] = useState(false)
  const [taxRateResult, setTaxRateResult] = useState<TaxRateResult | null>(null)
  const [taxRateLoading, setTaxRateLoading] = useState(false)
  const [tradeIn, setTradeIn] = useState<TradeInStatus>('none')
  const [tradeInValue, setTradeInValue] = useState('')
  const [preApprovalApr, setPreApprovalApr] = useState('')
  const [maxMonthly, setMaxMonthly] = useState('')
  const [includeFinancing, setIncludeFinancing] = useState(false)
  const [contextText, setContextText] = useState('')
  
  // Outputs
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<FirstTimeCopilotResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedAlternates, setExpandedAlternates] = useState(false)
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  
  // First-Time Buyer Pack: Advisor integration states
  const [preGenCheck, setPreGenCheck] = useState<any>(null)
  const [preGenCheckLoading, setPreGenCheckLoading] = useState(false)
  const [showPreGenCheck, setShowPreGenCheck] = useState(false)
  const [dealerMessageDecoder, setDealerMessageDecoder] = useState<any>(null)
  const [postGenExplanation, setPostGenExplanation] = useState<any>(null)
  
  // Load pre-filled data from localStorage (first-time mode only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefilledPrice = localStorage.getItem('copilot_vehicle_price_first_time')
      const prefilledOTD = localStorage.getItem('copilot_desired_otd_first_time')
      const prefilledState = localStorage.getItem('copilot_state_first_time')
      const prefilledContext = localStorage.getItem('copilot_car_context_first_time')
      const prefilledMessage = localStorage.getItem('copilot_prefilled_message_first_time')
      
      if (prefilledPrice && !vehiclePrice) setVehiclePrice(prefilledPrice)
      if (prefilledOTD && !desiredOTD) setDesiredOTD(prefilledOTD)
      if (prefilledState && !state) setState(prefilledState)
      if (prefilledContext && !contextText) setContextText(prefilledContext)
      if (prefilledMessage && !contextText) setContextText(prefilledMessage)
    }
  }, [])

  // Resolve tax rate (same logic as free)
  useEffect(() => {
    if (state && !taxRateOverride) {
      setTaxRateLoading(true)
      const params = new URLSearchParams({ state })
      if (registrationZip) params.append('zip', registrationZip)
      
      fetch(`/api/tax-lookup?${params.toString()}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.success && data.data) {
            const result = data.data
            setTaxRateResult(result)
            if (result.combinedRate !== undefined) {
              setTaxRate(result.combinedRate.toFixed(2))
            } else if (result.combinedRateRange) {
              const midpoint = (result.combinedRateRange.low + result.combinedRateRange.high) / 2
              setTaxRate(midpoint.toFixed(2))
            } else {
              setTaxRate(result.stateBaseRate.toFixed(2))
            }
          }
          setTaxRateLoading(false)
        })
        .catch(() => {
          const rate = getTaxRateForState(state)
          if (rate !== null) setTaxRate(rate.toFixed(2))
          setTaxRateLoading(false)
        })
    } else if (!state) {
      setTaxRateResult(null)
      setTaxRate('')
      setTaxRateLoading(false)
    }
  }, [state, registrationZip, taxRateOverride])

  // Update validation warnings when relevant inputs change
  useEffect(() => {
    const warnings = getValidationWarnings()
    setValidationWarnings(warnings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiclePrice, desiredOTD, taxRate, goal, tone, stage])

  // First-Time Buyer Pack: Pre-generation advisor check
  const runPreGenCheck = async (): Promise<any> => {
    if (!hasFirstTimePack) return null
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const vehiclePriceNum = parseFloat(vehiclePrice) || 0
      const desiredOTDNum = desiredOTD ? parseFloat(desiredOTD) : undefined
      
      const advisorContext = {
        listingPrice: vehiclePriceNum,
        state: state || undefined,
        vehicleType: 'used',
        hasOTD: !!desiredOTDNum,
      }
      
      const checkInput = `Pre-generation check for negotiation copilot:
Vehicle Price: $${vehiclePriceNum}
${desiredOTDNum ? `Desired OTD: $${desiredOTDNum}` : 'No desired OTD set'}
State: ${state || 'Not specified'}
Stage: ${stage}
Goal: ${goal}

Validate the desired OTD, comment on stage expectations, flag tax rate assumptions, and identify the biggest risk.`
      
      const response = await fetch('/api/first-time-advisor', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: 'conversational',
          userInput: checkInput,
          context: advisorContext,
        }),
      })
      
      if (!response.ok) return null
      const data = await response.json()
      return data.success ? data.data : null
    } catch {
      return null
    }
  }

  // First-Time Buyer Pack: Dealer message decoder
  const decodeDealerMessage = async (dealerMessage: string): Promise<any> => {
    if (!hasFirstTimePack || !dealerMessage.trim()) return null
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const advisorContext = {
        listingPrice: parseFloat(vehiclePrice) || 0,
        state: state || undefined,
        vehicleType: 'used',
        hasOTD: !!desiredOTD,
      }
      
      const response = await fetch('/api/first-time-advisor', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: 'conversational',
          userInput: `Dealer message to decode: ${dealerMessage}`,
          dealerMessage: dealerMessage.trim(),
          context: advisorContext,
        }),
      })
      
      if (!response.ok) return null
      const data = await response.json()
      return data.success ? data.data : null
    } catch {
      return null
    }
  }

  // First-Time Buyer Pack: Post-generation explanation
  const getPostGenExplanation = async (generatedMessage: string): Promise<any> => {
    if (!hasFirstTimePack) return null
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const advisorContext = {
        listingPrice: parseFloat(vehiclePrice) || 0,
        state: state || undefined,
        vehicleType: 'used',
        hasOTD: !!desiredOTD,
      }
      
      const explanationInput = `Post-generation explanation for negotiation copilot message:
${generatedMessage}

Explain why this message works for first-time buyers and what pitfalls it avoids.`
      
      const response = await fetch('/api/first-time-advisor', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: 'conversational',
          userInput: explanationInput,
          context: advisorContext,
        }),
      })
      
      if (!response.ok) return null
      const data = await response.json()
      return data.success ? data.data : null
    } catch {
      return null
    }
  }

  const validateInputs = (): string | null => {
    if (!vehiclePrice.trim()) return 'Vehicle price is required'
    if (!state.trim()) return 'State is required'
    if ((goal === 'get_otd' || goal === 'close_today') && !desiredOTD.trim()) {
      return 'Desired OTD is required for this goal'
    }
    if (isNaN(parseFloat(vehiclePrice)) || parseFloat(vehiclePrice) <= 0) {
      return 'Vehicle price must be a valid number'
    }
    if (desiredOTD && (isNaN(parseFloat(desiredOTD)) || parseFloat(desiredOTD) <= 0)) {
      return 'Desired OTD must be a valid number'
    }
    return null
  }

  // Validation warnings (non-blocking)
  const getValidationWarnings = (): string[] => {
    const warnings: string[] = []
    
    // Rule 1: If Desired OTD < Vehicle Price + estimated tax → show warning
    if (desiredOTD && vehiclePrice && taxRate) {
      const vehiclePriceNum = parseFloat(vehiclePrice)
      const desiredOTDNum = parseFloat(desiredOTD)
      const taxRateNum = parseFloat(taxRate) || 0
      const estimatedTax = vehiclePriceNum * (taxRateNum / 100)
      const minimumOTD = vehiclePriceNum + estimatedTax
      
      if (desiredOTDNum < minimumOTD) {
        warnings.push(`Your desired OTD ($${desiredOTDNum.toLocaleString()}) is below the vehicle price plus estimated tax ($${minimumOTD.toLocaleString()}). This may not be realistic.`)
      }
    }
    
    // Rule 2: If Close Today + Friendly tone → suggest Neutral or Firm
    if (goal === 'close_today' && tone === 'friendly') {
      warnings.push('For "Close Today" goals, consider using Neutral or Firm tone for better leverage. Friendly tone may weaken your position.')
    }
    
    return warnings
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    const validationError = validateInputs()
    if (validationError) {
      setError(validationError)
      return
    }
    
    // First-Time Buyer Pack: Pre-generation check
    if (hasFirstTimePack) {
      setPreGenCheckLoading(true)
      setShowPreGenCheck(false)
      setPreGenCheck(null)
      setDealerMessageDecoder(null)
      setPostGenExplanation(null)
      
      const check = await runPreGenCheck()
      if (check) {
        setPreGenCheck(check)
        setShowPreGenCheck(true)
        setPreGenCheckLoading(false)
        return // Wait for user to confirm
      }
      setPreGenCheckLoading(false)
    }
    
    await proceedWithGeneration()
  }
  
  const proceedWithGeneration = async () => {
    setGenerating(true)
    setShowPreGenCheck(false)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      // First-Time Buyer Pack: Decode dealer message if present
      if (hasFirstTimePack && contextText.trim()) {
        const decoder = await decodeDealerMessage(contextText.trim())
        if (decoder) setDealerMessageDecoder(decoder)
      }
      
      const competitiveOffers = localStorage.getItem('copilot_competitive_offers')
      const scriptCarContext = localStorage.getItem('scriptCarContext')
      
      const response = await fetch('/api/copilot/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          buyerType,
          stage,
          tone,
          goal,
          vehiclePrice: parseFloat(vehiclePrice),
          desiredOTD: desiredOTD ? parseFloat(desiredOTD) : undefined,
          state: state.trim().toUpperCase(),
          registrationZip: registrationZip.trim() || undefined,
          taxRate: taxRate ? parseFloat(taxRate) : undefined,
          tradeIn,
          tradeInValue: tradeIn === 'yes' && tradeInValue ? parseFloat(tradeInValue) : undefined,
          preApprovalApr: includeFinancing && preApprovalApr ? parseFloat(preApprovalApr) : undefined,
          maxMonthly: includeFinancing && maxMonthly ? parseFloat(maxMonthly) : undefined,
          contextText: contextText.trim() || undefined,
          hasCompetitiveOffers: !!competitiveOffers,
          hasCarContext: !!scriptCarContext,
          mode: 'first_time',
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to generate: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate response')
      }
      
      setResult({
        ...data.data,
        effectiveMode: data.effectiveMode,
        entitlementCheck: data.entitlementCheck,
      })
      
      // First-Time Buyer Pack: Get post-generation explanation
      if (hasFirstTimePack && data.data.bestNextMessage) {
        const explanation = await getPostGenExplanation(data.data.bestNextMessage)
        if (explanation) setPostGenExplanation(explanation)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate response')
    } finally {
      setGenerating(false)
    }
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
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
  
  if (!hasFirstTimePack) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">First-Time Buyer Pack required</p>
          <a href="/packs" className="text-blue-600 hover:text-blue-700">View Packs</a>
        </div>
      </div>
    )
  }
  
  // Render form (similar to free but with first-time specific UI)
  // For brevity, I'll include the key differences - the form structure is similar
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">First-Time Buyer Negotiation Draft Builder</h1>
          <p className="text-lg text-gray-600 mb-4">Guided message drafting for email & text negotiations</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              Best for email & text conversations with dealerships.<br />
              For live, in-person negotiations and real-time pressure tactics, use the In-Person Negotiation Pack.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Inputs - Same structure as free but with first-time branding */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Situation</h2>
            
            {/* First-Time Buyer Pack: Pre-Generation Check Panel */}
            {showPreGenCheck && preGenCheck && (
              <Card className="p-6 mb-6 bg-yellow-50 border-yellow-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">First-Time Buyer Check</h3>
                {preGenCheck.explanation && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{preGenCheck.explanation}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button onClick={proceedWithGeneration} className="flex-1">
                    Continue with Message Generation
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    setShowPreGenCheck(false)
                    setPreGenCheck(null)
                  }}>
                    Review Form
                  </Button>
                </div>
              </Card>
            )}
            
            {preGenCheckLoading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Running first-time buyer check...</p>
              </div>
            )}
            
            {!showPreGenCheck && !preGenCheckLoading && (
              <form onSubmit={handleGenerate} className="space-y-6">
                {/* Buyer Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buyer Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={buyerType}
                    onChange={(e) => setBuyerType(e.target.value as BuyerType)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="first-time">First-Time Buyer</option>
                    <option value="cash">Cash Buyer</option>
                    <option value="financing">Financing</option>
                    <option value="lease">Lease</option>
                  </select>
                </div>
                
                {/* Stage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Negotiation Stage <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as Stage)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="initial_outreach">Initial Outreach</option>
                    <option value="after_quote">After Quote Received</option>
                    <option value="after_counter">After Counter Offer</option>
                    <option value="in_person_today">In Person Today</option>
                    <option value="final_paperwork">Final Paperwork</option>
                  </select>
                </div>
                
                {/* Tone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tone <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => {
                      setTone(e.target.value as Tone)
                      const warnings = getValidationWarnings()
                      setValidationWarnings(warnings)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="friendly">Friendly</option>
                    <option value="neutral">Neutral</option>
                    <option value="firm">Firm</option>
                  </select>
                </div>
                
                {/* Goal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Goal <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={goal}
                    onChange={(e) => {
                      setGoal(e.target.value as Goal)
                      const warnings = getValidationWarnings()
                      setValidationWarnings(warnings)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="get_otd">Get OTD Price</option>
                    <option value="reduce_addons">Reduce Add-ons</option>
                    <option value="lower_price">Lower Price</option>
                    <option value="schedule_visit_otd">Schedule Visit (OTD)</option>
                    <option value="close_today">Close Today</option>
                  </select>
                </div>
                
                {/* Vehicle Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={vehiclePrice}
                    onChange={(e) => {
                      setVehiclePrice(e.target.value)
                      const warnings = getValidationWarnings()
                      setValidationWarnings(warnings)
                    }}
                    placeholder="e.g., 25000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                {/* Desired OTD */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Desired OTD {((goal === 'get_otd' || goal === 'close_today') && <span className="text-red-500">*</span>)}
                  </label>
                  <input
                    type="number"
                    value={desiredOTD}
                    onChange={(e) => {
                      setDesiredOTD(e.target.value)
                      const warnings = getValidationWarnings()
                      setValidationWarnings(warnings)
                    }}
                    placeholder="e.g., 28000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required={goal === 'get_otd' || goal === 'close_today'}
                  />
                </div>
                
                {/* Validation Warnings */}
                {validationWarnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
                    {validationWarnings.map((warning, i) => (
                      <p key={i} className="text-sm text-yellow-800">⚠️ {warning}</p>
                    ))}
                  </div>
                )}
                
                {/* State */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    placeholder="e.g., CA"
                    maxLength={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                {/* Registration ZIP */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration ZIP Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={registrationZip}
                    onChange={(e) => {
                      setRegistrationZip(e.target.value.replace(/\D/g, '').slice(0, 5))
                      setTaxRateOverride(false)
                    }}
                    placeholder="90210"
                    maxLength={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Tax Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Rate (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={taxRate}
                      onChange={(e) => {
                        setTaxRate(e.target.value)
                        setTaxRateOverride(true)
                      }}
                      placeholder="6.5"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {taxRateLoading && (
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    )}
                  </div>
                </div>
                
                {/* Trade In */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trade-In
                  </label>
                  <select
                    value={tradeIn}
                    onChange={(e) => setTradeIn(e.target.value as TradeInStatus)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">No Trade-In</option>
                    <option value="maybe">Maybe</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
                
                {tradeIn === 'yes' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trade-In Value
                    </label>
                    <input
                      type="number"
                      value={tradeInValue}
                      onChange={(e) => setTradeInValue(e.target.value)}
                      placeholder="e.g., 5000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                
                {/* Context Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dealer Message (Optional)
                  </label>
                  <textarea
                    value={contextText}
                    onChange={(e) => setContextText(e.target.value)}
                    placeholder="Paste dealer message here..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                
                {/* Financing Details Toggle */}
                <div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeFinancing}
                      onChange={(e) => setIncludeFinancing(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Include Financing Details</span>
                  </label>
                </div>
                
                {/* Pre-Approval APR */}
                {includeFinancing && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pre-Approval APR (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={preApprovalApr}
                      onChange={(e) => setPreApprovalApr(e.target.value)}
                      placeholder="4.5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                
                {/* Max Monthly */}
                {includeFinancing && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Monthly Payment
                    </label>
                    <input
                      type="number"
                      value={maxMonthly}
                      onChange={(e) => setMaxMonthly(e.target.value)}
                      placeholder="500"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
                
                <Button type="submit" className="w-full" disabled={generating}>
                  {generating ? 'Generating...' : 'Generate Message'}
                </Button>
              </form>
            )}
          </Card>
          
          {/* Right Panel: Outputs */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Draft Output</h2>
            
            {!result && !generating && (
              <div className="text-center py-12 text-gray-500">
                <p>Fill out the form and click "Generate Message" to get started</p>
              </div>
            )}
            
            {generating && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Generating your message...</p>
              </div>
            )}
            
            {result && (
              <div className="space-y-8">
                {/* Section 1: Context Header - Negotiation Strategy Summary */}
                <Card className="p-6 bg-slate-50 border-slate-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Negotiation Strategy Summary</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Goal</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {goal === 'get_otd' ? 'Get OTD Price' :
                         goal === 'lower_price' ? 'Lower Price' :
                         goal === 'reduce_addons' ? 'Reduce Add-ons' :
                         goal === 'schedule_visit_otd' ? 'Schedule Visit (OTD)' :
                         goal === 'close_today' ? 'Close Today' : goal}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tone</p>
                      <p className="text-sm font-semibold text-gray-900 capitalize">{tone}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Best used for</p>
                      <p className="text-sm text-gray-700">Email & Text</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Not for</p>
                      <p className="text-sm text-gray-700">Live dealership conversations</p>
                    </div>
                  </div>
                  {(result as any).explainer && (
                    <p className="text-sm text-gray-600 border-t border-slate-200 pt-4 mt-4">
                      {(result as any).explainer}
                    </p>
                  )}
                </Card>

                {/* Dealer Message Decoder */}
                {dealerMessageDecoder && dealerMessageDecoder.responseType === 'dealer_message' && (
                  <Card className="p-6 bg-purple-50 border-purple-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Dealer Message Analysis</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium text-gray-700">Classification:</span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        dealerMessageDecoder.classification === 'normal' ? 'bg-green-100 text-green-700' :
                        dealerMessageDecoder.classification === 'caution' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {dealerMessageDecoder.classification === 'normal' ? 'Normal' :
                         dealerMessageDecoder.classification === 'caution' ? 'Caution' : 'Red Flag'}
                      </span>
                    </div>
                    {dealerMessageDecoder.whatItMeans && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-900 mb-1">What this usually means:</p>
                        <p className="text-sm text-gray-700">{dealerMessageDecoder.whatItMeans}</p>
                      </div>
                    )}
                    {dealerMessageDecoder.actions && dealerMessageDecoder.actions.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-1">What to watch out for:</p>
                        <ul className="space-y-1">
                          {dealerMessageDecoder.actions.map((action: string, i: number) => (
                            <li key={i} className="flex items-start text-sm text-gray-700">
                              <span className="text-purple-600 mr-2">→</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                )}

                {/* Section 1: Message to Send (copyable) */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Message to Send</h3>
                    <Button
                      size="md"
                      variant="primary"
                      onClick={() => copyToClipboard(result.bestNextMessage)}
                      className="flex items-center gap-2"
                    >
                      <span>📋</span>
                      Copy
                    </Button>
                  </div>
                  <div className="bg-white border-2 border-slate-300 rounded-lg p-6 shadow-sm">
                    <p className="text-gray-900 whitespace-pre-wrap leading-relaxed text-base" style={{ lineHeight: '1.75' }}>
                      {result.bestNextMessage}
                    </p>
                  </div>
                </div>

                {/* Section 2: Why This Works (2-3 bullets, coach-like) */}
                {result.whyThisWorks && result.whyThisWorks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Why This Works</h3>
                    <ul className="space-y-2.5">
                      {result.whyThisWorks.slice(0, 3).map((bullet, i) => (
                        <li key={i} className="flex items-start text-sm text-gray-700">
                          <span className="text-slate-600 mr-3 mt-0.5 font-semibold">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Section 2.5: Confidence Check (single line) */}
                {result.confidenceCheck && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700">{result.confidenceCheck}</p>
                  </div>
                )}

                {/* Section 3: If They Push Back (only 2 realistic responses) */}
                {result.ifTheyPushBack && result.ifTheyPushBack.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">If They Push Back</h3>
                    <div className="space-y-3">
                      {result.ifTheyPushBack.slice(0, 2).map((item, index) => (
                        <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-gray-900 mb-2">
                            If they say: "{item.dealerReply}"
                          </p>
                          <p className="text-sm text-gray-700">
                            You can respond: "{item.suggestedResponse}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 4: What NOT to Say Next */}
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-red-900 mb-3">What NOT to Say Next</h3>
                  <ul className="space-y-2">
                    {(result.whatNotToSay || [
                      "What's the monthly payment?",
                      "I love this car",
                      "This is my first time buying"
                    ]).map((item, i) => (
                      <li key={i} className="flex items-start text-sm text-red-800">
                        <span className="text-red-600 mr-2 mt-0.5 font-bold">✗</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Section 8: Clear Handoff to In-Person Pack */}
                <div className="pt-6 border-t-2 border-slate-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Going in person?</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    This draft is optimized for email/text. For real-time pressure tactics, manager counters, and live talk tracks, switch to the In-Person Negotiation Pack.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

