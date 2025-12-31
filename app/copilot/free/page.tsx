'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
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

interface FreeCopilotResponse {
  bestNextMessage: string
  whyThisWorks?: string
  alternate1?: string
  alternate2?: string
  checklist?: string[]
  decisionTree?: {
    dealerReply: string
    suggestedResponse: string
    isIncomplete?: boolean
  }[]
  assumptions: {
    taxBaseRate?: number
    feeAssumptions?: string
    disclaimer: string
  }
}

export default function FreeCopilotPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  // Inputs
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
  const [result, setResult] = useState<FreeCopilotResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedAlternates, setExpandedAlternates] = useState(false)
  
  // Load pre-filled data from localStorage (free mode only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefilledPrice = localStorage.getItem('copilot_vehicle_price_free') || localStorage.getItem('copilot_vehicle_price')
      const prefilledOTD = localStorage.getItem('copilot_desired_otd_free') || localStorage.getItem('copilot_desired_otd')
      const prefilledState = localStorage.getItem('copilot_state_free') || localStorage.getItem('copilot_state')
      const prefilledContext = localStorage.getItem('copilot_car_context_free') || localStorage.getItem('copilot_car_context')
      const prefilledMessage = localStorage.getItem('copilot_prefilled_message_free') || localStorage.getItem('copilot_prefilled_message')
      
      if (prefilledPrice && !vehiclePrice) {
        setVehiclePrice(prefilledPrice)
        localStorage.removeItem('copilot_vehicle_price')
      }
      if (prefilledOTD && !desiredOTD) {
        setDesiredOTD(prefilledOTD)
        localStorage.removeItem('copilot_desired_otd')
      }
      if (prefilledState && !state) {
        setState(prefilledState)
        localStorage.removeItem('copilot_state')
      }
      if (prefilledContext && !contextText) {
        setContextText(prefilledContext)
        localStorage.removeItem('copilot_car_context')
      }
      if (prefilledMessage && !contextText) {
        setContextText(prefilledMessage)
        localStorage.removeItem('copilot_prefilled_message')
      }
    }
  }, [])

  // Resolve tax rate when state or ZIP changes
  useEffect(() => {
    if (state && !taxRateOverride) {
      setTaxRateLoading(true)
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
        .catch((error) => {
          console.warn('Tax rate lookup failed:', error)
          const rate = getTaxRateForState(state)
          if (rate !== null) {
            setTaxRate(rate.toFixed(2))
          }
          setTaxRateLoading(false)
        })
    } else if (!state) {
      setTaxRateResult(null)
      setTaxRate('')
      setTaxRateLoading(false)
    }
  }, [state, registrationZip, taxRateOverride])

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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    const validationError = validateInputs()
    if (validationError) {
      setError(validationError)
      return
    }
    
    setGenerating(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
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
          mode: 'free',
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
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="bg-blue-600 text-white text-center py-4 px-6 rounded-lg mb-4">
            <h1 className="text-2xl font-bold">FREE NEGOTIATION DRAFT BUILDER</h1>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Negotiation Draft Builder</h2>
          <p className="text-gray-600">Get AI-powered negotiation messages tailored to your situation</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Inputs */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Situation</h2>
            
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
                  onChange={(e) => setTone(e.target.value as Tone)}
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
                  onChange={(e) => setGoal(e.target.value as Goal)}
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
                  onChange={(e) => setVehiclePrice(e.target.value)}
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
                  onChange={(e) => setDesiredOTD(e.target.value)}
                  placeholder="e.g., 28000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required={goal === 'get_otd' || goal === 'close_today'}
                />
              </div>
              
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
                <p className="mt-1.5 text-xs text-gray-500 italic">
                  This information needs to be verified by the user. Tax rates may vary by location and vehicle type.
                </p>
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
          </Card>
          
          {/* Right Panel: Outputs */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Message</h2>
            
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
              <div className="space-y-6">
                {/* Debug Mode Info */}
                <div className="text-xs text-gray-500 text-center pb-2 border-b border-gray-200">
                  Mode: {result.effectiveMode || 'free'} {result.entitlementCheck && `(${result.entitlementCheck})`}
                </div>
                {/* Best Next Message */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">Best Next Message</h3>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyToClipboard(result.bestNextMessage)}
                    >
                      📋 Copy
                    </Button>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                    <p className="text-gray-800 whitespace-pre-wrap font-medium">{result.bestNextMessage}</p>
                  </div>
                  
                  {/* Why this works */}
                  {result.whyThisWorks && (
                    <div className="mb-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Why this works:</h4>
                      <p className="text-sm text-gray-600">{result.whyThisWorks}</p>
                    </div>
                  )}
                  
                  {/* Free-tier scope limiter */}
                  <p className="text-xs text-gray-500 italic">
                    This is a high-level response. Paid packs unlock stage-specific scripts, add-on removal tactics, and dealer pressure handling.
                  </p>
                </div>
                
                {/* Two Alternates */}
                <div>
                  <button
                    onClick={() => setExpandedAlternates(!expandedAlternates)}
                    className="w-full text-left flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <span className="font-medium text-gray-900">Alternate Messages</span>
                    <span>{expandedAlternates ? '−' : '+'}</span>
                  </button>
                  {expandedAlternates && (
                    <div className="mt-3 space-y-3">
                      {result.alternate1 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">More Friendly</span>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => copyToClipboard(result.alternate1!)}
                            >
                              📋 Copy
                            </Button>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.alternate1}</p>
                        </div>
                      )}
                      {result.alternate2 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">More Firm</span>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => copyToClipboard(result.alternate2!)}
                            >
                              📋 Copy
                            </Button>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.alternate2}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Checklist */}
                {result.checklist && result.checklist.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Before You Reply, Make Sure You Have:</h3>
                    <ul className="space-y-2 mb-2">
                      {result.checklist.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-600 mr-2">✓</span>
                          <span className="text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-gray-500 italic">
                      Paid packs include scripts to remove add-ons and challenge inflated fees.
                    </p>
                  </div>
                )}
                
                {/* Decision Tree */}
                {result.decisionTree && result.decisionTree.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Common Dealer Replies</h3>
                    <div className="space-y-3">
                      {result.decisionTree.map((item, index) => (
                        <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="font-medium text-gray-900 mb-2">
                            If they say: "{item.dealerReply}"
                          </p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">{item.suggestedResponse}</p>
                          {item.isIncomplete && (
                            <p className="text-xs text-gray-500 italic mt-2 pt-2 border-t border-yellow-300">
                              Paid packs include fee-by-fee pushback scripts for this exact situation.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Assumptions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Assumptions Used</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                    {result.assumptions.taxBaseRate !== undefined && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">State base tax rate: </span>
                        <span className="text-sm text-gray-600">{result.assumptions.taxBaseRate}%</span>
                      </div>
                    )}
                    {result.assumptions.feeAssumptions && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Typical dealer fees: </span>
                        <span className="text-sm text-gray-600">{result.assumptions.feeAssumptions}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-gray-300">
                      <p className="text-xs text-gray-600">{result.assumptions.disclaimer}</p>
                    </div>
                  </div>
                </div>
                
                {/* Soft CTA */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 text-center">
                    <span className="font-medium">Want more leverage?</span>
                    <br />
                    <span className="text-xs">Paid packs unlock deeper scripts for add-ons, financing pressure, and in-person negotiations.</span>
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

