'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import PackGate from '@/components/PackGate'
import { hasPack, hasAllAccess } from '@/lib/packs/entitlements'
import { useEntitlements } from '@/hooks/useEntitlements'
import { getTaxRateForState } from '@/lib/utils/tax-rates'
import type { DealPlan } from '@/lib/types/api'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

const supabase = createBrowserSupabaseClient()
import type { 
  FinancingAdvisorAnswers, 
  FinancingRecommendation,
  CreditScoreRange,
  PreApprovalStatus,
  FinancingGoal,
  DebtRange,
  EmergencyFundRange,
  Timeline,
  DealerIncentives,
  LoanTerm,
  AdvisorModule,
  AdvisorModuleAnswers,
  GoodDealAnswers,
  Urgency,
  DealGoal,
  ComfortWithRepairs,
  PlannedOwnership,
  CompetingOffers
} from '@/lib/types/financing-advisor'
import { saveAdvisorAnswers, getAdvisorAnswers, getAdvisorMemory } from '@/lib/utils/advisor-memory'
import { getCopilotRouteFromContext } from '@/lib/utils/copilot-routes'
import AdvisorChat from '@/components/AdvisorChat'

type AnalyzerVariant = 'free' | 'first_time' | 'in_person'

interface DealPlanDisplayProps {
  dealPlan: DealPlan
  listingUrl: string
  onAddToComparison: () => void
  diagnostics?: any
  variant?: AnalyzerVariant // Route-based variant, not localStorage
}

// First-Time Buyer Advisor Component
function FirstTimeBuyerAdvisor({ dealPlan, listingUrl }: { dealPlan: DealPlan; listingUrl: string }) {
  const [userInput, setUserInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [interactionCount, setInteractionCount] = useState(0)
  const MAX_INTERACTIONS = 7 // Soft limit per listing
  
  // Module selection
  const [selectedModule, setSelectedModule] = useState<AdvisorModule | null>(null)
  
  // Module answers state (generic)
  const [moduleAnswers, setModuleAnswers] = useState<Partial<AdvisorModuleAnswers>>({})
  const [showRecommendation, setShowRecommendation] = useState(false)
  const [recommendation, setRecommendation] = useState<FinancingRecommendation | null>(null)
  const [loadingRecommendation, setLoadingRecommendation] = useState(false)
  const [ambiguousInput, setAmbiguousInput] = useState<string | null>(null)
  const [possibleModules, setPossibleModules] = useState<AdvisorModule[]>([])
  
  // Load saved memory on mount
  useEffect(() => {
    const savedMemory = getAdvisorMemory(listingUrl)
    if (savedMemory) {
      // Load any saved answers for context
      if (savedMemory.financingAnswers) {
        setModuleAnswers(savedMemory.financingAnswers)
      }
    }
  }, [listingUrl])

  const handleAdvisorQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    if (!userInput.trim()) {
      setError('Please enter a question or describe what you\'re seeing')
      return
    }

    if (interactionCount >= MAX_INTERACTIONS) {
      setError(`You've reached the limit of ${MAX_INTERACTIONS} interactions for this listing. The advisor is designed to provide focused guidance.`)
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      // Build context from deal plan
      const context = {
        state: dealPlan.otdEstimate?.assumptions?.registrationState || '',
        vehiclePrice: dealPlan.targets.askingPrice,
        estimatedFairPrice: dealPlan.targets.estimatedFairPrice,
        vehicleType: (dealPlan as any).vehicleInfo?.condition || 'used',
        hasOTD: !!dealPlan.otdEstimate?.expectedOTD,
      }

      // Get saved memory for context
      const savedMemory = getAdvisorMemory(listingUrl)
      
      // Detect module from input if not already selected
      let detectedModule = selectedModule || detectModuleFromInput(userInput.trim())
      
      // If no module detected and no explicit selection, check for ambiguous input
      if (!detectedModule && !selectedModule) {
        const lower = userInput.toLowerCase().trim()
        const possible: AdvisorModule[] = []
        
        // Check for multiple possible modules
        if (/(finance|financing|loan|credit|apr|monthly payment)/i.test(lower)) possible.push('financing')
        if (/(good deal|fair price|worth it|good value)/i.test(lower)) possible.push('good_deal')
        if (/(new|used|new vs used|new or used)/i.test(lower)) possible.push('new_vs_used')
        if (/(payment safe|afford|monthly payment safe|can i afford)/i.test(lower)) possible.push('payment_safe')
        if (/(come in|go in|visit|dealer wants|should i go)/i.test(lower)) possible.push('go_in')
        if (/(fees|walk|walk away|added fees|should i walk)/i.test(lower)) possible.push('fees_walk')
        if (/(down payment|down|put down|more down)/i.test(lower)) possible.push('down_payment')
        
        // If multiple matches, show ambiguous follow-up
        if (possible.length > 1) {
          setAmbiguousInput(userInput.trim())
          setPossibleModules(possible)
          setLoading(false)
          return
        } else if (possible.length === 1) {
          detectedModule = possible[0]
        }
      }

      const response = await fetch('/api/first-time-advisor', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: 'conversational',
          userInput: userInput.trim(),
          context,
          moduleType: detectedModule,
          financingAnswers: Object.keys(moduleAnswers).length > 0 && selectedModule === 'financing' ? moduleAnswers as FinancingAdvisorAnswers : undefined,
          moduleAnswers: Object.keys(moduleAnswers).length > 0 ? moduleAnswers : undefined,
          savedMemory: savedMemory ? {
            financingAnswers: savedMemory.financingAnswers,
          } : undefined,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to get advisor response')
      }

      setResult(data.data)
      
      // If this is a recommendation response, show it
      if (data.data.responseType === 'decision_help' && data.data.recommendation) {
        setShowRecommendation(true)
        setRecommendation({
          recommendation: data.data.recommendation,
          bestPath: data.data.bestPath || [],
          whatToConfirm: data.data.whatToConfirm || [],
          redFlags: data.data.redFlags,
          upsell: data.data.upsell,
          bottomLine: data.data.bottomLine,
          whatWouldChange: Array.isArray(data.data.whatWouldChange) ? data.data.whatWouldChange : [data.data.whatWouldChange].filter(Boolean),
          scenarioFork: data.data.scenarioFork,
          guardrailMath: data.data.guardrailMath,
        })
      } else {
        setShowRecommendation(false)
        setRecommendation(null)
      }
      
      // Auto-select module if detected
      if (detectedModule && !selectedModule) {
        setSelectedModule(detectedModule)
      }
      
      setInteractionCount(prev => prev + 1)
      setUserInput('') // Clear input after successful query
    } catch (err: any) {
      setError(err.message || 'Failed to get advisor response')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        First-Time Buyer Advisor
      </h3>
      <p className="text-sm text-gray-700 mb-4">
        Ask questions about fees, dealer behavior, or hidden costs. I'll explain what dealers don't proactively tell you.
      </p>

      {/* Interaction limit notice */}
      {interactionCount > 0 && interactionCount < MAX_INTERACTIONS && (
        <p className="text-xs text-gray-600 mb-3">
          Interactions: {interactionCount}/{MAX_INTERACTIONS}
        </p>
      )}
      
      {/* Usage limit warning */}
      {interactionCount >= MAX_INTERACTIONS && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-yellow-800">
            This advisor is designed for quick checks. For deeper step-by-step negotiation strategy, unlock relevant packs or use Negotiation Draft Builder.
          </p>
        </div>
      )}
      
      {/* Decision Guide */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">
          What are you trying to figure out right now?
        </h4>
        <p className="text-xs text-gray-600 mb-3">
          Not sure what to ask? Choose a decision below to get started, or type your question freely.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { module: 'financing' as AdvisorModule, label: 'Should I finance or pay cash?', icon: '💰' },
            { module: 'good_deal' as AdvisorModule, label: 'Is this a good deal for me?', icon: '✅' },
            { module: 'new_vs_used' as AdvisorModule, label: 'Should I buy new or used?', icon: '🆕' },
            { module: 'payment_safe' as AdvisorModule, label: 'Is this monthly payment safe for me?', icon: '💳' },
            { module: 'go_in' as AdvisorModule, label: 'Dealer wants me to come in — should I?', icon: '🚗' },
            { module: 'fees_walk' as AdvisorModule, label: 'They added fees — should I walk?', icon: '⚠️' },
            { module: 'down_payment' as AdvisorModule, label: 'Should I put more down?', icon: '💵' },
          ].map(({ module, label, icon }) => (
            <button
              key={module}
              type="button"
              onClick={async () => {
                setSelectedModule(module)
                setResult(null)
                setShowRecommendation(false)
                setModuleAnswers({})
                setAmbiguousInput(null)
                setPossibleModules([])
                setUserInput('')
                // Load saved answers for this module
                const saved = getAdvisorAnswers(listingUrl, module)
                if (saved) {
                  setModuleAnswers(saved)
                }
                // Trigger Phase 1 questions by sending a query for this module
                setLoading(true)
                setError(null)
                try {
                  const { data: { session } } = await supabase.auth.getSession()
                  const headers: HeadersInit = { 'Content-Type': 'application/json' }
                  if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`
                  }

                  const context = {
                    state: dealPlan.otdEstimate?.assumptions?.registrationState || '',
                    vehiclePrice: dealPlan.targets.askingPrice,
                    estimatedFairPrice: dealPlan.targets.estimatedFairPrice,
                    vehicleType: (dealPlan as any).vehicleInfo?.condition || 'used',
                    hasOTD: !!dealPlan.otdEstimate?.expectedOTD,
                  }

                  const savedMemory = getAdvisorMemory(listingUrl)

                  const response = await fetch('/api/first-time-advisor', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                      mode: 'conversational',
                      userInput: label,
                      context,
                      moduleType: module,
                      savedMemory: savedMemory ? {
                        [module === 'financing' ? 'financingAnswers' : `${module}Answers`]: (savedMemory as any)[module === 'financing' ? 'financingAnswers' : `${module}Answers`],
                      } : undefined,
                    }),
                  })

                  if (!response.ok) {
                    const errorText = await response.text()
                    throw new Error(`Failed: ${response.status} ${errorText}`)
                  }

                  const data = await response.json()
                  if (!data.success) {
                    throw new Error(data.error || 'Failed to get response')
                  }

                  setResult(data.data)
                  setInteractionCount(prev => prev + 1)
                } catch (err: any) {
                  setError(err.message || 'Failed to get response')
                } finally {
                  setLoading(false)
                }
              }}
              className={`px-4 py-3 text-left border-2 rounded-lg transition-all ${
                selectedModule === module
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">{icon}</span>
                <span className="text-sm font-medium text-gray-900">{label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Ambiguous Input Follow-up */}
      {ambiguousInput && possibleModules.length > 0 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-medium text-yellow-900 mb-2">
            Are you deciding about:
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {possibleModules.map((module) => (
              <button
                key={module}
                type="button"
                onClick={async () => {
                  setSelectedModule(module)
                  const inputToUse = ambiguousInput || userInput
                  setAmbiguousInput(null)
                  setPossibleModules([])
                  setUserInput(inputToUse)
                  // Trigger query with the selected module
                  setLoading(true)
                  setError(null)
                  setResult(null)
                  try {
                    const { data: { session } } = await supabase.auth.getSession()
                    const headers: HeadersInit = { 'Content-Type': 'application/json' }
                    if (session?.access_token) {
                      headers['Authorization'] = `Bearer ${session.access_token}`
                    }

                    const context = {
                      state: dealPlan.otdEstimate?.assumptions?.registrationState || '',
                      vehiclePrice: dealPlan.targets.askingPrice,
                      estimatedFairPrice: dealPlan.targets.estimatedFairPrice,
                      vehicleType: (dealPlan as any).vehicleInfo?.condition || 'used',
                      hasOTD: !!dealPlan.otdEstimate?.expectedOTD,
                    }

                    const savedMemory = getAdvisorMemory(listingUrl)

                    const response = await fetch('/api/first-time-advisor', {
                      method: 'POST',
                      headers,
                      body: JSON.stringify({
                        mode: 'conversational',
                        userInput: inputToUse,
                        context,
                        moduleType: module,
                        savedMemory: savedMemory ? {
                          [module === 'financing' ? 'financingAnswers' : `${module}Answers`]: (savedMemory as any)[module === 'financing' ? 'financingAnswers' : `${module}Answers`],
                        } : undefined,
                      }),
                    })

                    if (!response.ok) {
                      const errorText = await response.text()
                      throw new Error(`Failed: ${response.status} ${errorText}`)
                    }

                    const data = await response.json()
                    if (!data.success) {
                      throw new Error(data.error || 'Failed to get response')
                    }

                    setResult(data.data)
                    
                    // If this is a recommendation response, show it
                    if (data.data.responseType === 'decision_help' && data.data.recommendation) {
                      setShowRecommendation(true)
                      setRecommendation({
                        recommendation: data.data.recommendation,
                        bestPath: data.data.bestPath || [],
                        whatToConfirm: data.data.whatToConfirm || [],
                        redFlags: data.data.redFlags,
                        upsell: data.data.upsell,
                        bottomLine: data.data.bottomLine,
                        whatWouldChange: Array.isArray(data.data.whatWouldChange) ? data.data.whatWouldChange : [data.data.whatWouldChange].filter(Boolean),
                        scenarioFork: data.data.scenarioFork,
                        guardrailMath: data.data.guardrailMath,
                      })
                    } else {
                      setShowRecommendation(false)
                      setRecommendation(null)
                    }
                    
                    setInteractionCount(prev => prev + 1)
                    setUserInput('')
                  } catch (err: any) {
                    setError(err.message || 'Failed to get advisor response')
                  } finally {
                    setLoading(false)
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-full border border-yellow-300 bg-white text-yellow-900 hover:bg-yellow-100"
              >
                {module === 'financing' ? 'Financing vs Cash' :
                 module === 'good_deal' ? 'Good Deal' :
                 module === 'new_vs_used' ? 'New vs Used' :
                 module === 'payment_safe' ? 'Payment Safety' :
                 module === 'go_in' ? 'Visiting Dealer' :
                 module === 'fees_walk' ? 'Fees / Walk Away' :
                 'Down Payment'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setAmbiguousInput(null)
              setPossibleModules([])
            }}
            className="text-xs text-yellow-700 hover:text-yellow-900 underline"
          >
            Or continue with free text
          </button>
        </div>
      )}

      {/* Single Input Form */}
      <form onSubmit={handleAdvisorQuery} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Or type your question freely:
        </label>
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="e.g., 'The dealer said this price is only good today' or 'What is a documentation fee?' or 'What am I missing?'"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[120px] mb-3"
          disabled={loading || interactionCount >= MAX_INTERACTIONS}
        />
        <div className="flex items-center justify-between">
          <Button
            type="submit"
            disabled={loading || !userInput.trim() || interactionCount >= MAX_INTERACTIONS}
            className="flex-shrink-0"
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Analyzing...
              </>
            ) : (
              'Ask Advisor'
            )}
          </Button>
          {result && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setResult(null)
                setUserInput('')
                setError(null)
              }}
            >
              New Question
            </Button>
          )}
        </div>
      </form>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white border border-blue-300 rounded-lg p-4 space-y-4">
          {/* Response Type: Checklist (what am I missing) - Format D */}
          {result.responseType === 'checklist' && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">What You Might Be Missing</h4>
              {result.surprises && result.surprises.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-700 mb-2">Common first-time buyer surprises:</p>
                  <ul className="space-y-2">
                    {result.surprises.map((item: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        <span className="text-sm text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.whyBuyersMiss && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">Why buyers miss these:</p>
                  <p className="text-sm text-gray-700">{result.whyBuyersMiss}</p>
                </div>
              )}
              {result.whatToDoubleCheck && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-900 mb-1">What to double-check before moving forward:</p>
                  <p className="text-sm text-blue-700">{result.whatToDoubleCheck}</p>
                </div>
              )}
            </div>
          )}

          {/* Response Type: Dealer Message Analysis */}
          {result.responseType === 'dealer_message' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="font-semibold text-gray-900">Is this normal?</h4>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  result.classification === 'normal' ? 'bg-green-100 text-green-700' :
                  result.classification === 'caution' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {result.classification === 'normal' ? 'Yes - Normal' :
                   result.classification === 'caution' ? 'Caution' : 'Red Flag'}
                </span>
              </div>
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 mb-1">What it usually means:</p>
                <p className="text-sm text-gray-700">{result.whatItMeans}</p>
              </div>
              {result.actions && result.actions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">What to confirm or ask next:</p>
                  <ul className="space-y-1">
                    {result.actions.map((action: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-600 mr-2">→</span>
                        <span className="text-sm text-gray-700">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Response Type: Fee Explanation - Format B */}
          {result.responseType === 'fee_explanation' && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Fee Explanation</h4>
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 mb-1">What this fee usually represents:</p>
                <p className="text-sm text-gray-700">{result.whatItIs}</p>
              </div>
              {result.typicalRange && (
                <div className="mb-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Typical Range:</span>
                    <span className="text-sm font-medium text-gray-900">{result.typicalRange}</span>
                  </div>
                </div>
              )}
              {result.negotiable && (
                <div className="mb-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Is it negotiable?</span>
                    <span className={`text-sm font-medium ${
                      result.negotiable === 'Yes' ? 'text-green-700' :
                      result.negotiable === 'Rarely' ? 'text-red-700' :
                      'text-yellow-700'
                    }`}>
                      {result.negotiable}
                    </span>
                  </div>
                </div>
              )}
              {result.whatToClarify && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-900 mb-1">What to clarify before agreeing:</p>
                  <p className="text-sm text-blue-700">{result.whatToClarify}</p>
                </div>
              )}
            </div>
          )}

          {/* Response Type: Decision Help - Format C */}
          {result.responseType === 'decision_help' && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Decision Help</h4>
              {result.whatItMeans && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">What this decision means:</p>
                  <p className="text-sm text-gray-700">{result.whatItMeans}</p>
                </div>
              )}
              {(result.pros || result.cons) && (
                <div className="mb-3 space-y-2">
                  {result.pros && result.pros.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-700 mb-1">Pros for first-time buyers:</p>
                      <ul className="space-y-1">
                        {result.pros.map((pro: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="text-green-600 mr-2">+</span>
                            <span className="text-sm text-gray-700">{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.cons && result.cons.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-700 mb-1">Cons for first-time buyers:</p>
                      <ul className="space-y-1">
                        {result.cons.map((con: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="text-red-600 mr-2">-</span>
                            <span className="text-sm text-gray-700">{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {result.factors && result.factors.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">Factors that matter in this situation:</p>
                  <ul className="space-y-1">
                    {result.factors.map((factor: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-600 mr-2">→</span>
                        <span className="text-sm text-gray-700">{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.whatToUnderstand && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">What to understand before deciding:</p>
                  <p className="text-sm text-gray-700">{result.whatToUnderstand}</p>
                </div>
              )}
              
              {/* Interactive Clarifying Questions (Required) - Only show if not showing recommendation */}
              {!showRecommendation && result.clarifyingQuestions && result.clarifyingQuestions.length > 0 && selectedModule === 'financing' && result.phase !== '2' && (
                <InteractiveFinancingQuestions
                  financingAnswers={moduleAnswers as Partial<FinancingAdvisorAnswers>}
                  setFinancingAnswers={(answers) => {
                    setModuleAnswers(answers)
                    saveAdvisorAnswers(listingUrl, 'financing', answers)
                  }}
                  onGetRecommendation={async () => {
                    // Validate required fields
                    const answers = moduleAnswers as Partial<FinancingAdvisorAnswers>
                    if (!answers.creditScoreRange || !answers.goal || !answers.preApproval) {
                      setError('Please answer at least: Credit Score Range, Goal, and Pre-approval Status')
                      return
                    }

                    setLoadingRecommendation(true)
                    setError(null)

                    try {
                      const { data: { session } } = await supabase.auth.getSession()
                      const headers: HeadersInit = { 'Content-Type': 'application/json' }
                      if (session?.access_token) {
                        headers['Authorization'] = `Bearer ${session.access_token}`
                      }

                      const context = {
                        state: dealPlan.otdEstimate?.assumptions?.registrationState || '',
                        vehiclePrice: dealPlan.targets.askingPrice,
                        estimatedFairPrice: dealPlan.targets.estimatedFairPrice,
                        vehicleType: (dealPlan as any).vehicleInfo?.condition || 'used',
                        hasOTD: !!dealPlan.otdEstimate?.expectedOTD,
                      }

                      const savedMemory = getAdvisorMemory(listingUrl)

                      const response = await fetch('/api/first-time-advisor', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                          mode: 'conversational',
                          userInput: 'Get personalized financing recommendation',
                          context,
                          moduleType: 'financing',
                          financingAnswers: answers as FinancingAdvisorAnswers,
                          savedMemory: savedMemory ? {
                            financingAnswers: savedMemory.financingAnswers,
                          } : undefined,
                        }),
                      })

                      if (!response.ok) {
                        const errorText = await response.text()
                        throw new Error(`Failed: ${response.status} ${errorText}`)
                      }

                      const data = await response.json()
                      if (!data.success) {
                        throw new Error(data.error || 'Failed to get recommendation')
                      }

                      if (data.data.recommendation) {
                        setShowRecommendation(true)
                        setRecommendation({
                          recommendation: data.data.recommendation,
                          bestPath: data.data.bestPath || [],
                          whatToConfirm: data.data.whatToConfirm || [],
                          redFlags: data.data.redFlags,
                          upsell: data.data.upsell,
                          bottomLine: data.data.bottomLine,
                          whatWouldChange: Array.isArray(data.data.whatWouldChange) ? data.data.whatWouldChange : [data.data.whatWouldChange].filter(Boolean),
                          scenarioFork: data.data.scenarioFork,
                          guardrailMath: data.data.guardrailMath,
                        })
                        setResult(data.data)
                      }
                    } catch (err: any) {
                      setError(err.message || 'Failed to get recommendation')
                    } finally {
                      setLoadingRecommendation(false)
                    }
                  }}
                  loading={loadingRecommendation}
                />
              )}

              {/* Recommendation Display */}
              {showRecommendation && recommendation && (
                <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="text-sm font-semibold text-green-900 mb-3">Your Personalized Recommendation</h5>
                  <p className="text-sm text-gray-800 mb-4">{recommendation.recommendation}</p>
                  
                  {recommendation.bestPath && recommendation.bestPath.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Best Path:</p>
                      <ul className="space-y-1">
                        {recommendation.bestPath.map((path: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="text-green-600 mr-2">✓</span>
                            <span className="text-sm text-gray-700">{path}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {recommendation.whatToConfirm && recommendation.whatToConfirm.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">What to confirm with dealer:</p>
                      <ul className="space-y-1">
                        {recommendation.whatToConfirm.map((item: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-600 mr-2">→</span>
                            <span className="text-sm text-gray-700">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {recommendation.redFlags && recommendation.redFlags.length > 0 && (
                    <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-red-900 mb-2">Red Flags:</p>
                      <ul className="space-y-1">
                        {recommendation.redFlags.map((flag: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="text-red-600 mr-2">⚠</span>
                            <span className="text-sm text-red-800">{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {recommendation.upsell && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <p className="text-xs text-blue-800">{recommendation.upsell}</p>
                    </div>
                  )}

                  {/* Scenario Fork */}
                  {recommendation.scenarioFork && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-3">
                      <p className="text-xs font-semibold text-purple-900 mb-1">Next Step:</p>
                      <p className="text-sm text-purple-800">{recommendation.scenarioFork}</p>
                    </div>
                  )}

                  {/* Guardrail Math */}
                  {recommendation.guardrailMath && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mt-3">
                      <p className="text-xs font-semibold text-indigo-900 mb-1">Payment Estimate:</p>
                      <p className="text-sm text-indigo-800">{recommendation.guardrailMath}</p>
                    </div>
                  )}

                  {/* Bottom Line */}
                  {recommendation.bottomLine && (
                    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-900 mb-1">Bottom line for you:</p>
                      <p className="text-sm text-gray-800">{recommendation.bottomLine}</p>
                    </div>
                  )}

                  {/* What Would Change */}
                  {recommendation.whatWouldChange && recommendation.whatWouldChange.length > 0 && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-yellow-900 mb-2">What would change this recommendation:</p>
                      <ul className="space-y-1">
                        {recommendation.whatWouldChange.map((change: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="text-yellow-600 mr-2">•</span>
                            <span className="text-sm text-yellow-800">{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-4"
                    onClick={() => {
                      setShowRecommendation(false)
                      setRecommendation(null)
                      setModuleAnswers({})
                      setSelectedModule(null)
                    }}
                  >
                    Start Over
                  </Button>
                </div>
              )}

              {/* Provisional Guidance (Optional) - Only show if not showing recommendation */}
              {!showRecommendation && result.provisionalGuidance && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-900 mb-1">Provisional Guidance (until you answer the questions above):</p>
                  <p className="text-sm text-blue-700 italic">{result.provisionalGuidance}</p>
                </div>
              )}

              {/* Bottom Line - Show for both initial and personalized responses, but NOT for GOOD_DEAL_DECISION Phase 1 */}
              {result.bottomLine && !(selectedModule === 'good_deal' && result.phase === '1') && (
                <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-900 mb-1">Bottom line for you:</p>
                  <p className="text-sm text-gray-800">{result.bottomLine}</p>
                </div>
              )}

              {/* What Would Change - Show for both initial and personalized responses, but NOT for GOOD_DEAL_DECISION Phase 1 */}
              {result.whatWouldChange && !(selectedModule === 'good_deal' && result.phase === '1') && (
                <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-yellow-900 mb-1">What would change this recommendation:</p>
                  {Array.isArray(result.whatWouldChange) ? (
                    <ul className="space-y-1">
                      {result.whatWouldChange.map((change: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="text-yellow-600 mr-2">•</span>
                          <span className="text-sm text-yellow-800">{change}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-yellow-800">{result.whatWouldChange}</p>
                  )}
                </div>
              )}
              
              {/* GOOD_DEAL_DECISION Phase 1 - Interactive Questions */}
              {!showRecommendation && result.clarifyingQuestions && result.clarifyingQuestions.length > 0 && selectedModule === 'good_deal' && result.phase === '1' && (
                <InteractiveGoodDealQuestions
                  goodDealAnswers={moduleAnswers as Partial<GoodDealAnswers>}
                  setGoodDealAnswers={(answers) => {
                    setModuleAnswers(answers)
                    saveAdvisorAnswers(listingUrl, 'good_deal', answers)
                  }}
                  onGetRecommendation={async () => {
                    // Validate required fields
                    const answers = moduleAnswers as Partial<GoodDealAnswers>
                    if (!answers.urgency || !answers.primaryGoal || !answers.repairComfort || !answers.ownershipHorizon || !answers.competingOptions) {
                      setError('Please answer all questions: Urgency, Primary Goal, Ownership Horizon, Repair Comfort, and Competing Options')
                      return
                    }

                    setLoadingRecommendation(true)
                    setError(null)

                    try {
                      const { data: { session } } = await supabase.auth.getSession()
                      const headers: HeadersInit = { 'Content-Type': 'application/json' }
                      if (session?.access_token) {
                        headers['Authorization'] = `Bearer ${session.access_token}`
                      }

                      const context = {
                        state: dealPlan.otdEstimate?.assumptions?.registrationState || '',
                        vehiclePrice: dealPlan.targets.askingPrice,
                        estimatedFairPrice: dealPlan.targets.estimatedFairPrice,
                        vehicleType: (dealPlan as any).vehicleInfo?.condition || 'used',
                        hasOTD: !!dealPlan.otdEstimate?.expectedOTD,
                      }

                      const savedMemory = getAdvisorMemory(listingUrl)

                      const response = await fetch('/api/first-time-advisor', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                          mode: 'conversational',
                          userInput: 'Get personalized good deal recommendation',
                          context,
                          moduleType: 'good_deal',
                          moduleAnswers: answers as GoodDealAnswers,
                          savedMemory: savedMemory ? {
                            goodDealAnswers: savedMemory.goodDealAnswers,
                          } : undefined,
                        }),
                      })

                      if (!response.ok) {
                        const errorText = await response.text()
                        throw new Error(`Failed: ${response.status} ${errorText}`)
                      }

                      const data = await response.json()
                      if (!data.success) {
                        throw new Error(data.error || 'Failed to get recommendation')
                      }

                      if (data.data.recommendation || data.data.phase === '2') {
                        setShowRecommendation(true)
                        setRecommendation({
                          recommendation: data.data.recommendation,
                          bestPath: data.data.bestPath || [],
                          whatToConfirm: data.data.whatToConfirm || [],
                          redFlags: data.data.redFlags,
                          upsell: data.data.upsell,
                          bottomLine: data.data.bottomLine,
                          whatWouldChange: Array.isArray(data.data.whatWouldChange) ? data.data.whatWouldChange : [data.data.whatWouldChange].filter(Boolean),
                        })
                        setResult(data.data)
                      }
                    } catch (err: any) {
                      setError(err.message || 'Failed to get recommendation')
                    } finally {
                      setLoadingRecommendation(false)
                    }
                  }}
                  loading={loadingRecommendation}
                />
              )}
            </div>
          )}

          {/* Response Type: General Explanation */}
          {result.responseType === 'general' && result.explanation && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Explanation</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.explanation}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// Interactive Financing Questions Component
function InteractiveFinancingQuestions({
  financingAnswers: answers,
  setFinancingAnswers: setAnswers,
  onGetRecommendation,
  loading,
}: {
  financingAnswers: Partial<FinancingAdvisorAnswers>
  setFinancingAnswers: (answers: Partial<FinancingAdvisorAnswers>) => void
  onGetRecommendation: () => Promise<void>
  loading: boolean
}) {
  const creditScoreOptions: CreditScoreRange[] = ['<620', '620-679', '680-739', '740+', 'not_sure']
  const preApprovalOptions: PreApprovalStatus[] = ['yes', 'no', 'not_sure']
  const goalOptions: FinancingGoal[] = ['lowest_monthly', 'lowest_total', 'pay_off_fast', 'build_credit', 'not_sure']
  const debtOptions: DebtRange[] = ['0-100', '100-300', '300-700', '700+', 'not_sure']
  const emergencyFundOptions: EmergencyFundRange[] = ['<1k', '1k-3k', '3k-5k', '5k+', 'not_sure']
  const timelineOptions: Timeline[] = ['this_week', '2-4_weeks', '1-3_months', 'researching']
  const dealerIncentivesOptions: DealerIncentives[] = ['yes', 'no', 'not_sure']
  const termOptions: LoanTerm[] = [36, 48, 60, 72, 84]

  const canGetRecommendation = 
    !!answers.creditScoreRange && 
    !!answers.goal && 
    !!answers.preApproval

  const ChipButton = ({ 
    label, 
    value, 
    selected, 
    onClick 
  }: { 
    label: string
    value: string
    selected: boolean
    onClick: () => void
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
        selected
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-700'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <p className="text-xs font-semibold text-yellow-900 mb-3">To give you personalized advice, please answer:</p>
      
      <div className="space-y-4">
        {/* Credit Score Range */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Credit Score Range:</p>
          <div className="flex flex-wrap gap-2">
            {creditScoreOptions.map((option) => (
              <ChipButton
                key={option}
                label={option === 'not_sure' ? 'Not sure' : option}
                value={option}
                selected={answers.creditScoreRange === option}
                onClick={() => setAnswers({ ...answers, creditScoreRange: option })}
              />
            ))}
          </div>
        </div>

        {/* Pre-approval */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Pre-approval:</p>
          <div className="flex flex-wrap gap-2">
            {preApprovalOptions.map((option) => (
              <ChipButton
                key={option}
                label={option === 'not_sure' ? 'Not sure' : option.charAt(0).toUpperCase() + option.slice(1)}
                value={option}
                selected={answers.preApproval === option}
                onClick={() => {
                  const newAnswers = { ...answers, preApproval: option }
                  if (option !== 'yes') {
                    delete newAnswers.apr
                    delete newAnswers.termMonths
                  }
                  setAnswers(newAnswers)
                }}
              />
            ))}
          </div>
          {answers.preApproval === 'yes' && (
            <div className="mt-2 space-y-2">
              <div>
                <label className="text-xs text-gray-600 mb-1 block flex items-center gap-1">
                  APR (%) (optional)
                  <span 
                    className="text-blue-600 cursor-help" 
                    title="Annual Percentage Rate: Your interest rate. Lower APR = less total interest paid over the loan term."
                  >
                    ⓘ
                  </span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="30"
                  value={answers.apr || ''}
                  onChange={(e) => setAnswers({ 
                    ...answers, 
                    apr: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  className="px-2 py-1 text-xs border border-gray-300 rounded w-24"
                  placeholder="e.g., 5.5"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block flex items-center gap-1">
                  Term (months)
                  <span 
                    className="text-blue-600 cursor-help" 
                    title="Loan term: How long you'll pay. Longer terms = lower monthly payment but more total interest. Always compare total cost, not just monthly payment."
                  >
                    ⓘ
                  </span>
                </label>
                <select
                  value={answers.termMonths || ''}
                  onChange={(e) => setAnswers({ 
                    ...answers, 
                    termMonths: e.target.value ? parseInt(e.target.value) as LoanTerm : undefined 
                  })}
                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  <option value="">Select term</option>
                  {termOptions.map((term) => (
                    <option key={term} value={term}>{term} months</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Goal */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Goal:</p>
          <div className="flex flex-wrap gap-2">
            {goalOptions.map((option) => (
              <ChipButton
                key={option}
                label={
                  option === 'not_sure' ? 'Not sure' :
                  option === 'lowest_monthly' ? 'Lowest monthly' :
                  option === 'lowest_total' ? 'Lowest total cost' :
                  option === 'pay_off_fast' ? 'Pay off fast' :
                  'Build credit'
                }
                value={option}
                selected={answers.goal === option}
                onClick={() => setAnswers({ ...answers, goal: option })}
              />
            ))}
          </div>
        </div>

        {/* Monthly Debt Burden */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Monthly Debt Burden:</p>
          <div className="flex flex-wrap gap-2">
            {debtOptions.map((option) => (
              <ChipButton
                key={option}
                label={option === 'not_sure' ? 'Not sure' : `$${option}/month`}
                value={option}
                selected={answers.debtRange === option}
                onClick={() => setAnswers({ ...answers, debtRange: option })}
              />
            ))}
          </div>
        </div>

        {/* Emergency Fund */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Emergency Fund to Keep:</p>
          <div className="flex flex-wrap gap-2">
            {emergencyFundOptions.map((option) => (
              <ChipButton
                key={option}
                label={option === 'not_sure' ? 'Not sure' : option}
                value={option}
                selected={answers.emergencyFund === option}
                onClick={() => setAnswers({ ...answers, emergencyFund: option })}
              />
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Timeline:</p>
          <div className="flex flex-wrap gap-2">
            {timelineOptions.map((option) => (
              <ChipButton
                key={option}
                label={
                  option === 'this_week' ? 'This week' :
                  option === '2-4_weeks' ? '2-4 weeks' :
                  option === '1-3_months' ? '1-3 months' :
                  'Just researching'
                }
                value={option}
                selected={answers.timeline === option}
                onClick={() => setAnswers({ ...answers, timeline: option })}
              />
            ))}
          </div>
        </div>

        {/* Dealer Incentives */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Dealer Incentives:</p>
          <div className="flex flex-wrap gap-2">
            {dealerIncentivesOptions.map((option) => (
              <ChipButton
                key={option}
                label={option === 'not_sure' ? 'Not sure' : option.charAt(0).toUpperCase() + option.slice(1)}
                value={option}
                selected={answers.dealerIncentives === option}
                onClick={() => setAnswers({ ...answers, dealerIncentives: option })}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Button
          onClick={onGetRecommendation}
          disabled={!canGetRecommendation || loading}
          className="w-full"
        >
          {loading ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              Getting Recommendation...
            </>
          ) : (
            'Get My Recommendation'
          )}
        </Button>
        {!canGetRecommendation && (
          <p className="text-xs text-gray-600 mt-2 text-center">
            Please answer: Credit Score Range, Goal, and Pre-approval Status
          </p>
        )}
      </div>
    </div>
  )
}

// Helper to detect module from input
function detectModuleFromInput(input: string): AdvisorModule | null {
  if (!input || typeof input !== 'string') return null
  
  const lower = input.toLowerCase().trim()
  
  if (/(should i|finance|financing|loan|credit|apr|monthly payment)/i.test(lower)) return 'financing'
  if (/(good deal|fair price|worth it|good value)/i.test(lower)) return 'good_deal'
  if (/(new|used|new vs used|new or used)/i.test(lower)) return 'new_vs_used'
  if (/(payment safe|afford|monthly payment safe|can i afford)/i.test(lower)) return 'payment_safe'
  if (/(come in|go in|visit|dealer wants|should i go)/i.test(lower)) return 'go_in'
  if (/(fees|walk|walk away|added fees|should i walk)/i.test(lower)) return 'fees_walk'
  if (/(down payment|down|put down|more down)/i.test(lower)) return 'down_payment'
  
  return null
}

// Interactive Good Deal Questions Component
function InteractiveGoodDealQuestions({
  goodDealAnswers: answers,
  setGoodDealAnswers: setAnswers,
  onGetRecommendation,
  loading,
}: {
  goodDealAnswers: Partial<GoodDealAnswers>
  setGoodDealAnswers: (answers: Partial<GoodDealAnswers>) => void
  onGetRecommendation: () => Promise<void>
  loading: boolean
}) {
  const urgencyOptions: Urgency[] = ['this_week', '2-4_weeks', '1-3_months', 'researching']
  const goalOptions: DealGoal[] = ['lowest_total', 'lowest_monthly', 'reliability', 'resale', 'build_credit']
  const comfortOptions: ComfortWithRepairs[] = ['low', 'medium', 'high']
  const ownershipOptions: PlannedOwnership[] = ['1-2_years', '3-5_years', '6+_years']
  const competingOptions: CompetingOffers[] = ['yes', 'no', 'not_sure']

  const canGetRecommendation = 
    !!answers.urgency && 
    !!answers.primaryGoal && 
    !!answers.repairComfort &&
    !!answers.ownershipHorizon &&
    !!answers.competingOptions

  const ChipButton = ({ 
    label, 
    value, 
    selected, 
    onClick 
  }: { 
    label: string
    value: string
    selected: boolean
    onClick: () => void
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
        selected
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-700'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <p className="text-xs font-semibold text-yellow-900 mb-3">To give you personalized advice, please answer:</p>
      
      <div className="space-y-4">
        {/* Urgency */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Urgency:</p>
          <div className="flex flex-wrap gap-2">
            {urgencyOptions.map((option) => (
              <ChipButton
                key={option}
                label={
                  option === 'this_week' ? 'This week' :
                  option === '2-4_weeks' ? '2-4 weeks' :
                  option === '1-3_months' ? '1-3 months' :
                  'Just researching'
                }
                value={option}
                selected={answers.urgency === option}
                onClick={() => setAnswers({ ...answers, urgency: option })}
              />
            ))}
          </div>
        </div>

        {/* Primary Goal */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Primary Goal:</p>
          <div className="flex flex-wrap gap-2">
            {goalOptions.map((option) => (
              <ChipButton
                key={option}
                label={
                  option === 'lowest_total' ? 'Lowest total cost' :
                  option === 'lowest_monthly' ? 'Lowest monthly' :
                  option === 'reliability' ? 'Reliability' :
                  option === 'resale' ? 'Resale value' :
                  'Build credit'
                }
                value={option}
                selected={answers.primaryGoal === option}
                onClick={() => setAnswers({ ...answers, primaryGoal: option })}
              />
            ))}
          </div>
        </div>

        {/* Ownership Horizon */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Ownership Horizon:</p>
          <div className="flex flex-wrap gap-2">
            {ownershipOptions.map((option) => (
              <ChipButton
                key={option}
                label={option.replace('_', '-')}
                value={option}
                selected={answers.ownershipHorizon === option}
                onClick={() => setAnswers({ ...answers, ownershipHorizon: option })}
              />
            ))}
          </div>
        </div>

        {/* Repair Comfort */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Repair Comfort:</p>
          <div className="flex flex-wrap gap-2">
            {comfortOptions.map((option) => (
              <ChipButton
                key={option}
                label={option.charAt(0).toUpperCase() + option.slice(1)}
                value={option}
                selected={answers.repairComfort === option}
                onClick={() => setAnswers({ ...answers, repairComfort: option })}
              />
            ))}
          </div>
        </div>

        {/* Competing Options */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Competing Options:</p>
          <div className="flex flex-wrap gap-2">
            {competingOptions.map((option) => (
              <ChipButton
                key={option}
                label={option === 'not_sure' ? 'Not sure' : option.charAt(0).toUpperCase() + option.slice(1)}
                value={option}
                selected={answers.competingOptions === option}
                onClick={() => setAnswers({ ...answers, competingOptions: option })}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Button
          onClick={onGetRecommendation}
          disabled={!canGetRecommendation || loading}
          className="w-full"
        >
          {loading ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              Getting Recommendation...
            </>
          ) : (
            'Get My Recommendation'
          )}
        </Button>
        {!canGetRecommendation && (
          <p className="text-xs text-gray-600 mt-2 text-center">
            Please answer all questions: Urgency, Primary Goal, Ownership Horizon, Repair Comfort, and Competing Options
          </p>
        )}
      </div>
    </div>
  )
}

export default function DealPlanDisplay({ dealPlan, listingUrl, onAddToComparison, diagnostics, variant = 'free' }: DealPlanDisplayProps) {
  const router = useRouter()
  
  // Variant is now passed as prop from route, not from localStorage
  // Default to 'free' if not provided
  const [showEditAssumptions, setShowEditAssumptions] = useState(false)
  const [otdAssumptions, setOtdAssumptions] = useState(dealPlan.otdEstimate.assumptions)
  const [recalculatedOTD, setRecalculatedOTD] = useState(dealPlan.otdEstimate.expectedOTD)
  
  // Fee inputs for desired OTD calculation
  const [showFeeInputs, setShowFeeInputs] = useState(false)
  const [docFeeInput, setDocFeeInput] = useState('')
  const [titleFeeInput, setTitleFeeInput] = useState('')
  const [registrationFeeInput, setRegistrationFeeInput] = useState('')
  const [otherFeesInput, setOtherFeesInput] = useState('')
  const [calculatedDesiredOTD, setCalculatedDesiredOTD] = useState<number | null>(null)

  // Recalculate OTD when assumptions change or on mount
  useEffect(() => {
    const { parseMoney, parsePercentToDecimal, calculateOTDRange } = require('@/lib/utils/number-parsing')
    
    const price = parseMoney(dealPlan.targets.estimatedFairPrice)
    
    if (!price || price <= 0) {
      console.warn('Invalid vehicle price for OTD calculation:', dealPlan.targets.estimatedFairPrice)
      return
    }
    
    // Parse tax rate - AI might return it as percentage (6-7) or decimal (0.06-0.07)
    const taxRateRaw = otdAssumptions.taxRate.value || (otdAssumptions.taxRate.range.low + otdAssumptions.taxRate.range.high) / 2
    const taxRateDecimal = parsePercentToDecimal(taxRateRaw)
    
    // Parse fees - registrationTitle includes both registration and title fees
    const addOns = parseMoney(otdAssumptions.dealerAddOns.value || 0)

    // Determine doc fee range
    const docFeeLow = otdAssumptions.docFee.value 
      ? parseMoney(otdAssumptions.docFee.value)
      : parseMoney(otdAssumptions.docFee.range.low)
    const docFeeHigh = otdAssumptions.docFee.value
      ? parseMoney(otdAssumptions.docFee.value)
      : parseMoney(otdAssumptions.docFee.range.high)

    // Determine registration/title fee range
    const regTitleLow = otdAssumptions.registrationTitle.value
      ? parseMoney(otdAssumptions.registrationTitle.value)
      : parseMoney(otdAssumptions.registrationTitle.range.low)
    const regTitleHigh = otdAssumptions.registrationTitle.value
      ? parseMoney(otdAssumptions.registrationTitle.value)
      : parseMoney(otdAssumptions.registrationTitle.range.high)

    // Calculate OTD range using strict parsing
    // Note: registrationTitle is treated as a combined fee (registration + title)
    const rangeResult = calculateOTDRange({
      vehiclePrice: price,
      taxRateDecimal,
      docFee: { low: docFeeLow, high: docFeeHigh },
      registrationFee: { low: regTitleLow, high: regTitleHigh },
      otherFees: 0,
      addOns,
    })

    // Log issues if any
    if (rangeResult.issues.length > 0) {
      console.warn('OTD calculation issues:', rangeResult.issues)
    }

    setRecalculatedOTD({
      low: Math.round(rangeResult.low),
      expected: Math.round(rangeResult.expected),
      high: Math.round(rangeResult.high),
    })
  }, [otdAssumptions, dealPlan.targets.estimatedFairPrice])

  const handleCopyScript = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Calculate desired OTD with fees
  const calculateDesiredOTDWithFees = () => {
    const { parseMoney, parsePercentToDecimal, calculateOTD } = require('@/lib/utils/number-parsing')
    
    const vehiclePrice = parseMoney(dealPlan.targets.estimatedFairPrice)
    if (!vehiclePrice || vehiclePrice <= 0) {
      alert('Invalid vehicle price')
      return
    }
    
    // Get tax rate
    const taxRateRaw = otdAssumptions.taxRate.value || (otdAssumptions.taxRate.range.low + otdAssumptions.taxRate.range.high) / 2
    const taxRateDecimal = parsePercentToDecimal(taxRateRaw)
    
    // Get fees
    const docFee = parseMoney(docFeeInput) || otdAssumptions.docFee.value || otdAssumptions.docFee.range.low
    const titleFee = parseMoney(titleFeeInput) || 0
    const registrationFee = parseMoney(registrationFeeInput) || 0
    const otherFees = parseMoney(otherFeesInput) || 0
    
    // Calculate OTD
    const otd = calculateOTD({
      vehiclePrice,
      taxRateDecimal,
      docFee,
      titleFee,
      registrationFee,
      otherFees,
      addOns: otdAssumptions.dealerAddOns.value || 0,
    })
    
    setCalculatedDesiredOTD(Math.round(otd))
    setShowFeeInputs(false)
  }

  const handleOpenCopilot = (dealerMessage?: string) => {
    const ctx = dealPlan.nextMoves.copilotLink
    
    // Determine pack ID from variant prop
    const selectedPackId = variant === 'first_time' ? 'first_time' : variant === 'in_person' ? 'in_person' : null
    
    // Use pack context (selected pack) instead of auto-prioritizing by ownership
    // This ensures the route matches the pack context the user is viewing
    const copilotRoute = getCopilotRouteFromContext(
      selectedPackId,
      hasInPerson,
      hasFirstTime
    )
    
    // Extract mode from route for localStorage keys
    // Use variant prop (from route) instead of localStorage
    const mode = variant
    const keySuffix = mode === 'free' ? '_free' : mode === 'first_time' ? '_first_time' : '_in_person'
    
    // Use calculated desired OTD if available, otherwise use the default from dealPlan
    const desiredOTDToUse = calculatedDesiredOTD !== null 
      ? calculatedDesiredOTD.toString() 
      : ctx.desiredOTD
    
    // Use mode-specific localStorage keys
    localStorage.setItem(`copilot_vehicle_price${keySuffix}`, ctx.vehiclePrice)
    localStorage.setItem(`copilot_desired_otd${keySuffix}`, desiredOTDToUse)
    localStorage.setItem(`copilot_car_context${keySuffix}`, ctx.carContext)
    
    // Add state to localStorage for copilot (mode-specific)
    const state = dealPlan.otdEstimate?.assumptions?.registrationState || dealPlan.nextMoves.otdBuilderLink?.state
    if (state) {
      localStorage.setItem(`copilot_state${keySuffix}`, state)
      console.log('Copilot: Setting state:', state)
    }
    
    if (dealerMessage) {
      localStorage.setItem(`copilot_prefilled_message${keySuffix}`, dealerMessage)
    }
    
    // Navigate to the correct route based on pack context
    router.push(`${copilotRoute}?stage=${ctx.stage}&goal=${ctx.goal}`)
  }

  const handleOpenOTDBuilder = () => {
    const link = dealPlan.nextMoves.otdBuilderLink
    // Set price (use askingPrice or estimatedFairPrice)
    const price = dealPlan.targets.askingPrice || dealPlan.targets.estimatedFairPrice
    if (price) {
      localStorage.setItem('otd_builder_price', price.toString())
      console.log('OTD Builder: Setting price:', price)
    } else {
      console.warn('OTD Builder: No price found in dealPlan.targets')
    }
    
    // Set state - try multiple sources in order of preference
    const state = dealPlan.otdEstimate?.assumptions?.registrationState || link?.state
    if (state) {
      localStorage.setItem('otd_builder_state', state)
      console.log('OTD Builder: Setting state:', state)
    } else {
      console.warn('OTD Builder: No state found in dealPlan.otdEstimate.assumptions.registrationState or link.state', {
        assumptionsState: dealPlan.otdEstimate?.assumptions?.registrationState,
        linkState: link?.state,
        assumptions: dealPlan.otdEstimate?.assumptions,
      })
    }
    
    // Set tax rate (use value if available, otherwise use midpoint of range)
    const taxRateValue = dealPlan.otdEstimate?.assumptions?.taxRate?.value
    const taxRate = taxRateValue 
      ? taxRateValue.toString() 
      : ((dealPlan.otdEstimate.assumptions.taxRate.range.low + dealPlan.otdEstimate.assumptions.taxRate.range.high) / 2).toFixed(2)
    if (taxRate) {
      localStorage.setItem('otd_builder_tax_rate', taxRate)
      console.log('OTD Builder: Setting tax rate:', taxRate)
    } else {
      console.warn('OTD Builder: No tax rate found')
    }
    
    router.push('/calculator')
  }

  const handleOpenComparison = () => {
    const link = dealPlan.nextMoves.comparisonLink
    localStorage.setItem('comparison_prefill', JSON.stringify(link))
    router.push('/research?tab=compare')
  }

  // Pack checks - use server-side entitlements
  const { hasFirstTime, hasInPerson } = useEntitlements()
  const hasCashPack = hasPack('cash') || hasAllAccess()
  const hasFinancingPack = hasPack('financing') || hasAllAccess()

  return (
    <div className="mt-6 space-y-6">
      <div>
        {variant === 'first_time' ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Deal Readiness Assessment</h2>
            <p className="text-gray-600 mb-4">Expert review before you contact the dealer.</p>
            
            {/* Verdict Banner - First-Time Buyer Only */}
            {(() => {
              const hasOTD = !!dealPlan.otdEstimate?.expectedOTD
              const hasFeeBreakdown = dealPlan.otdEstimate?.assumptions?.docFee?.value !== undefined
              const priceDiff = dealPlan.targets.askingPrice - dealPlan.targets.estimatedFairPrice
              const priceDiffPercent = (priceDiff / dealPlan.targets.estimatedFairPrice) * 100
              const hasDealerRedFlags = dealPlan.leverage.points.some(p => p.strength === 'low' && p.score < 30)
              const hasTaxValidationWarning = dealPlan.otdEstimate?.assumptions?.taxRate?.confidence !== 'high'
              const hasMissingKeyInfo = !hasOTD || !hasFeeBreakdown
              
              // Determine verdict state based on existing signals
              let verdict: 'ready' | 'caution' | 'not-ready' = 'ready'
              
              // Critical issues → Not Ready
              if (!hasOTD || priceDiffPercent > 20) {
                verdict = 'not-ready'
              }
              // Warnings → Caution
              else if (!hasFeeBreakdown || hasTaxValidationWarning || priceDiffPercent > 10 || hasDealerRedFlags) {
                verdict = 'caution'
              }
              // Otherwise → Ready
              
              const verdictConfig = {
                ready: {
                  icon: '✅',
                  title: 'Ready to proceed (in writing)',
                  bgColor: 'bg-green-50',
                  borderColor: 'border-green-300',
                  textColor: 'text-green-900',
                  iconColor: 'text-green-600',
                },
                caution: {
                  icon: '⚠️',
                  title: 'Proceed with caution',
                  bgColor: 'bg-amber-50',
                  borderColor: 'border-amber-300',
                  textColor: 'text-amber-900',
                  iconColor: 'text-amber-600',
                },
                'not-ready': {
                  icon: '❌',
                  title: 'Not ready — missing critical info',
                  bgColor: 'bg-red-50',
                  borderColor: 'border-red-300',
                  textColor: 'text-red-900',
                  iconColor: 'text-red-600',
                },
              }
              
              const config = verdictConfig[verdict]
              
              return (
                <div className={`${config.bgColor} ${config.borderColor} border-2 rounded-lg p-4 mb-6 shadow-sm`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl ${config.iconColor}`}>{config.icon}</span>
                    <h3 className={`text-lg font-bold ${config.textColor}`}>
                      {config.title}
                    </h3>
                  </div>
                </div>
              )
            })()}
            
            {/* Written-Only Templates - First-Time Buyer Only */}
            <Card className="p-6 mb-6 bg-blue-50 border-blue-200" data-templates-section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                If you proceed, send this (written only)
              </h3>
              <div className="space-y-4">
                {/* Template 1: Safe opener (OTD request) */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Request written OTD breakdown</p>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap mb-3">
                      Hi — I'm interested in this vehicle. Before discussing next steps, can you email me the full out-the-door price breakdown including sale price, taxes, doc fee, title/registration, and any add-ons? I want to review the complete OTD in writing.
                    </p>
                    <button
                      onClick={() => {
                        handleCopyScript("Hi — I'm interested in this vehicle. Before discussing next steps, can you email me the full out-the-door price breakdown including sale price, taxes, doc fee, title/registration, and any add-ons? I want to review the complete OTD in writing.")
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
                
                {/* Template 2: Clarify add-ons */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Clarify add-ons (optional vs mandatory)</p>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap mb-3">
                      Thanks. Can you confirm which line items are optional vs required by law? If any add-ons are dealer policy, please itemize them and send an updated out-the-door breakdown in writing without optional items so I can compare.
                    </p>
                    <button
                      onClick={() => {
                        handleCopyScript("Thanks. Can you confirm which line items are optional vs required by law? If any add-ons are dealer policy, please itemize them and send an updated out-the-door breakdown in writing without optional items so I can compare.")
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
                
                {/* Template 3: Polite pause */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Pause to review</p>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap mb-3">
                      Appreciate it — I'm going to review the written out-the-door breakdown and compare options. I'll follow up once I've looked everything over.
                    </p>
                    <button
                      onClick={() => {
                        handleCopyScript("Appreciate it — I'm going to review the written out-the-door breakdown and compare options. I'll follow up once I've looked everything over.")
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Deal Plan</h2>
            <p className="text-gray-600 mb-6">Your complete negotiation strategy for this listing</p>
          </>
        )}

        {/* In-Person Enhanced Analyzer: Dealer Leverage Snapshot */}
        {variant === 'in_person' && hasInPerson && (
          <Card className="p-6 mb-6 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-xl font-bold text-gray-900">Dealer Leverage Snapshot</h3>
              <span className="px-2 py-0.5 text-xs font-semibold text-orange-700 bg-orange-200 border border-orange-300 rounded-md">
                In-Person Pack
              </span>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Likely Dealer Moves */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Likely Dealer Moves</h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span><strong>Payment push:</strong> Redirect to monthly payments to hide total cost</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span><strong>Add-ons:</strong> Frame extras as "mandatory" or "recommended"</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span><strong>Urgency:</strong> "Someone else is interested" or "Price goes up tomorrow"</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span><strong>Delay OTD:</strong> Avoid giving written breakdown until you're committed</span>
                  </li>
                </ul>
              </div>
              
              {/* Where You Have Leverage */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Where You Have Leverage</h4>
                <ul className="space-y-2">
                  {dealPlan.targets.askingPrice > dealPlan.targets.estimatedFairPrice && (
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span><strong>Price vs market:</strong> Asking ${dealPlan.targets.askingPrice.toLocaleString()} vs fair ${dealPlan.targets.estimatedFairPrice.toLocaleString()} (${(dealPlan.targets.askingPrice - dealPlan.targets.estimatedFairPrice).toLocaleString()} above)</span>
                    </li>
                  )}
                  {dealPlan.leverage.points.some(p => p.strength === 'high') && (
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span><strong>Comparable vehicles:</strong> Use market data to anchor your offer</span>
                    </li>
                  )}
                  {(dealPlan.leverage as any).marketCondition && (
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span><strong>Market conditions:</strong> {(dealPlan.leverage as any).marketCondition}</span>
                    </li>
                  )}
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span><strong>Time on lot:</strong> Longer = more negotiating room (if available)</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span><strong>Inventory signals:</strong> High inventory = dealer needs to move units</span>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Walk-In Plan */}
            <div className="pt-4 border-t border-orange-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Walk-In Plan</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white border border-orange-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">OTD-First Rules</p>
                  <p className="text-xs text-gray-600">Only discuss total out-the-door price. No monthly payment talk.</p>
                </div>
                <div className="bg-white border border-orange-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Silence Tactic</p>
                  <p className="text-xs text-gray-600">After stating your number, pause. Let them respond first.</p>
                </div>
                <div className="bg-white border border-orange-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Request in Writing</p>
                  <p className="text-xs text-gray-600">Get full OTD breakdown in writing before negotiating further.</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 1. Bottom-Line Targets */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Bottom-Line Targets</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Asking Price</p>
              <p className="text-2xl font-bold text-gray-900">${dealPlan.targets.askingPrice.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Estimated Fair Price <span className="text-xs">(est.)</span></p>
              <p className="text-2xl font-bold text-blue-600">${dealPlan.targets.estimatedFairPrice.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Strong Opening Offer</p>
              <p className="text-2xl font-bold text-green-600">${dealPlan.targets.strongOpeningOffer.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">"Acceptable Deal" Price</p>
              <p className="text-2xl font-bold text-indigo-600">${dealPlan.targets.acceptableDealPrice.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Walk-Away OTD Ceiling</p>
              <p className="text-xl font-semibold text-red-600">${dealPlan.targets.walkAwayOTDCeiling.toLocaleString()}</p>
            </div>
          </div>
          {dealPlan.targets.percentRange && (
            <p className="text-xs text-gray-500 mt-3">
              Range: {dealPlan.targets.percentRange}
              {dealPlan.targets.estimationMethod && (
                <span className="ml-2" title={dealPlan.targets.estimationMethod}>
                  ℹ️
                </span>
              )}
            </p>
          )}
        </Card>

        {/* 2. Dealer Leverage Assessment */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Dealer Leverage Assessment</h3>
          <div className="space-y-3 mb-4">
            {dealPlan.leverage.points.map((point, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium text-gray-900">{point.factor}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          point.score >= 70 ? 'bg-green-500' : point.score >= 40 ? 'bg-yellow-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${point.score}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-8">{point.score}/100</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      point.strength === 'high' ? 'bg-green-100 text-green-700' :
                      point.strength === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {point.strength.toUpperCase()}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{point.explanation}</p>
              </div>
            ))}
          </div>
          {dealPlan.leverage.bestAngles && dealPlan.leverage.bestAngles.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-900 mb-1">Best leverage angles:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                {dealPlan.leverage.bestAngles.map((angle, i) => (
                  <li key={i}>{angle}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* 3. Expected OTD Reality Check */}
        <Card className="p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">3. Expected OTD Reality Check</h3>
            <Button size="sm" variant="secondary" onClick={() => setShowEditAssumptions(!showEditAssumptions)}>
              {showEditAssumptions ? 'Hide' : 'Edit'} Assumptions
            </Button>
          </div>

          {showEditAssumptions && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Tax Rate Breakdown */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate Information</label>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                    {otdAssumptions.taxRate.stateBaseRate !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">State Base Rate:</span>
                        <span className="text-sm font-medium text-gray-900">{otdAssumptions.taxRate.stateBaseRate.toFixed(2)}%</span>
                      </div>
                    )}
                    {otdAssumptions.taxRate.estimatedLocalAddOn !== undefined && otdAssumptions.taxRate.estimatedLocalAddOn > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Estimated Local Add-on:</span>
                        <span className="text-sm font-medium text-gray-900">+{otdAssumptions.taxRate.estimatedLocalAddOn.toFixed(2)}%</span>
                      </div>
                    )}
                    {otdAssumptions.taxRate.combinedRate !== undefined ? (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-sm font-semibold text-gray-900">Combined Rate:</span>
                        <span className="text-sm font-bold text-blue-600">{otdAssumptions.taxRate.combinedRate.toFixed(2)}%</span>
                      </div>
                    ) : (otdAssumptions.taxRate as any).combinedRateRange && (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-sm font-semibold text-gray-900">Combined Rate Range:</span>
                        <span className="text-sm font-bold text-blue-600">
                          {(otdAssumptions.taxRate as any).combinedRateRange.low.toFixed(2)}% - {(otdAssumptions.taxRate as any).combinedRateRange.high.toFixed(2)}%
                        </span>
                      </div>
                    )}
                    {otdAssumptions.taxRate.confidence && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Confidence:</span>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          otdAssumptions.taxRate.confidence === 'high' ? 'bg-green-100 text-green-700' :
                          otdAssumptions.taxRate.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {otdAssumptions.taxRate.confidence.toUpperCase()}
                        </span>
                      </div>
                    )}
                    {otdAssumptions.taxRate.source && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Source:</span>
                        <span className="text-xs text-gray-500 capitalize">{otdAssumptions.taxRate.source.replace(/_/g, ' ')}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* User Override */}
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Override Tax Rate (%) <span className="text-xs text-gray-500 font-normal">(optional)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={otdAssumptions.taxRate.value || ''}
                      onChange={(e) => setOtdAssumptions({
                        ...otdAssumptions,
                        taxRate: { ...otdAssumptions.taxRate, value: e.target.value ? parseFloat(e.target.value) : undefined },
                      })}
                      placeholder={otdAssumptions.taxRate.combinedRate?.toFixed(2) || `${otdAssumptions.taxRate.range.low.toFixed(2)}-${otdAssumptions.taxRate.range.high.toFixed(2)}`}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  
                  {/* Disclaimer */}
                  {otdAssumptions.taxRate.disclaimer && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      <strong>Note:</strong> {otdAssumptions.taxRate.disclaimer}
                    </div>
                  )}
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    <strong>⚠️ Validation Required:</strong> Tax rates are estimates only. Vehicle tax rules vary by state and locality, and may differ from general sales tax. ZIP-based estimates can be imperfect. Always verify the actual tax rate with your dealer or state DMV before finalizing your purchase.
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Doc Fee ($) {otdAssumptions.docFee.value ? '' : `($${otdAssumptions.docFee.range.low}-$${otdAssumptions.docFee.range.high} range)`}
                  </label>
                  <input
                    type="number"
                    value={otdAssumptions.docFee.value || ''}
                    onChange={(e) => setOtdAssumptions({
                      ...otdAssumptions,
                      docFee: { ...otdAssumptions.docFee, value: e.target.value ? parseFloat(e.target.value) : undefined },
                    })}
                    placeholder={otdAssumptions.docFee.range.low.toString()}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration/Title ($) {otdAssumptions.registrationTitle.value ? '' : `($${otdAssumptions.registrationTitle.range.low}-$${otdAssumptions.registrationTitle.range.high} range)`}
                  </label>
                  <input
                    type="number"
                    value={otdAssumptions.registrationTitle.value || ''}
                    onChange={(e) => setOtdAssumptions({
                      ...otdAssumptions,
                      registrationTitle: { ...otdAssumptions.registrationTitle, value: e.target.value ? parseFloat(e.target.value) : undefined },
                    })}
                    placeholder={otdAssumptions.registrationTitle.range.low.toString()}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dealer Add-Ons ($) {otdAssumptions.dealerAddOns.value ? '' : `($${otdAssumptions.dealerAddOns.riskBand.low}-$${otdAssumptions.dealerAddOns.riskBand.high} risk band)`}
                  </label>
                  <input
                    type="number"
                    value={otdAssumptions.dealerAddOns.value}
                    onChange={(e) => setOtdAssumptions({
                      ...otdAssumptions,
                      dealerAddOns: { ...otdAssumptions.dealerAddOns, value: parseFloat(e.target.value) || 0 },
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Low Estimate</p>
              <p className="text-xl font-semibold text-gray-900">${recalculatedOTD.low.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
              <p className="text-sm text-gray-600 mb-1">Expected OTD</p>
              <p className="text-2xl font-bold text-blue-600">${recalculatedOTD.expected.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">High Estimate</p>
              <p className="text-xl font-semibold text-gray-900">${recalculatedOTD.high.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <strong>⚠️ Validation Required:</strong> This OTD estimate includes tax based on estimated rates. Tax rates are estimates only and may vary by state, locality, and vehicle type. Always verify the actual tax rate and final OTD price with your dealer before finalizing your purchase.
          </div>

          {(() => {
            const { parseMoney } = require('@/lib/utils/number-parsing')
            const expectedOTD = parseMoney(dealPlan.otdEstimate.expectedOTD.expected)
            const threshold = parseMoney(dealPlan.otdEstimate.warningThreshold)
            const thresholdMin = expectedOTD * 0.7
            const thresholdMax = expectedOTD * 1.3
            const isValid = threshold >= thresholdMin && threshold <= thresholdMax
            
            if (!isValid) {
              return (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Warning threshold seems inconsistent with OTD estimate. Please check assumptions.
                  </p>
                </div>
              )
            }
            
            return (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                <p className="text-sm font-medium text-yellow-800 mb-1">
                  ⚠️ OTD Warning Threshold: If OTD &gt; ${threshold.toLocaleString()}, fees/add-ons are inflated
                </p>
              </div>
            )
          })()}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900 mb-2">Checklist:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              {dealPlan.otdEstimate.checklist.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </Card>

        {/* 3.5. First-Time Buyer Pack: Hidden Costs & Price Exclusions */}
        {/* Only show for First-Time variant, not In-Person */}
        {variant === 'first_time' && hasFirstTime && (
          <>
          <Card className="p-6 mb-6 bg-yellow-50 border-yellow-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              💡 First-Time Buyer Guide
            </h3>
            
            {/* Hidden Costs to Expect */}
            <div className="mb-4">
              <h4 className="text-md font-semibold text-gray-800 mb-3">Hidden Costs to Expect</h4>
              <div className="space-y-2">
                {(() => {
                  const state = dealPlan.otdEstimate?.assumptions?.registrationState || ''
                  const hiddenCosts = []
                  
                  // City sticker (common in IL, NY, etc.)
                  if (['IL', 'NY', 'CA'].includes(state)) {
                    hiddenCosts.push({
                      name: 'City Sticker / Vehicle Registration Sticker',
                      amount: '$50-$200',
                      explanation: 'Many cities require an annual vehicle sticker. This is separate from state registration and often surprises first-time buyers.',
                    })
                  }
                  
                  // County wheel tax (common in some states)
                  if (['WI', 'IL', 'IN'].includes(state)) {
                    hiddenCosts.push({
                      name: 'County Wheel Tax',
                      amount: '$20-$100',
                      explanation: 'Some counties charge an annual wheel tax per vehicle. This is a recurring cost, not a one-time fee.',
                    })
                  }
                  
                  // Registration/plate nuances
                  hiddenCosts.push({
                    name: 'Registration & Plate Fees',
                    amount: '$50-$300',
                    explanation: 'State registration and plate fees vary. Some states charge based on vehicle value, others have flat fees. First-time buyers often don\'t realize this is separate from the sale price.',
                  })
                  
                  return hiddenCosts.map((cost, i) => (
                    <div key={i} className="bg-white border border-yellow-300 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-gray-900">{cost.name}</span>
                        <span className="text-sm font-semibold text-gray-700">{cost.amount}</span>
                      </div>
                      <p className="text-xs text-gray-600 italic">{cost.explanation}</p>
                    </div>
                  ))
                })()}
              </div>
            </div>
            
            {/* What this price likely excludes */}
            <div className="bg-white border border-yellow-300 rounded-lg p-4 mb-4">
              <h4 className="text-md font-semibold text-gray-800 mb-2">What This Price Likely Excludes</h4>
              <p className="text-sm text-gray-700 mb-2">
                The listed price typically does <strong>not</strong> include:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 mb-3">
                <li><strong>Documentation fees</strong> ($150-$500) - Dealers charge this for processing paperwork</li>
                <li><strong>Dealer add-ons</strong> - Extended warranties, paint protection, fabric protection, etc. (often $1,000-$3,000+)</li>
                <li><strong>Taxes</strong> - Sales tax based on your registration location (typically 6-10% of sale price)</li>
                <li><strong>Title & registration fees</strong> - State and local fees ($50-$300)</li>
              </ul>
              <p className="text-xs text-gray-600 italic">
                💡 <strong>Why dealers do this:</strong> Lower advertised prices attract more buyers. They'll add these costs later during negotiations. Always ask for a written "Out-the-Door" (OTD) price that includes everything.
              </p>
            </div>

            {/* First-Time Buyer Education */}
            <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-4">
              <h4 className="text-md font-semibold text-gray-800 mb-3">First-Time Buyer Education</h4>
              <p className="text-xs text-gray-600 mb-3 italic">
                These concepts are explained contextually as you use the Advisor and OTD Builder—learn as you go!
              </p>
              <div className="space-y-3">
                <div className="bg-white border border-blue-200 rounded-lg p-3">
                  <h5 className="font-semibold text-gray-900 mb-1 text-sm">OTD vs Monthly Payment</h5>
                  <p className="text-xs text-gray-700">
                    <strong>OTD (Out-the-Door)</strong> is your total cost including all fees, taxes, and add-ons. <strong>Monthly payment</strong> only shows your loan payment, which dealers can manipulate by extending the loan term. Always negotiate OTD first—it's the only number that matters for comparing deals.
                  </p>
                </div>
                <div className="bg-white border border-blue-200 rounded-lg p-3">
                  <h5 className="font-semibold text-gray-900 mb-1 text-sm">APR & Loan Term</h5>
                  <p className="text-xs text-gray-700">
                    <strong>APR (Annual Percentage Rate)</strong> is your interest rate. <strong>Loan term</strong> is how long you'll pay (36, 48, 60 months, etc.). A lower monthly payment from a longer term costs more in total interest. Always compare total cost, not just monthly payment.
                  </p>
                </div>
              </div>
            </div>

            {/* Insurance Awareness */}
            <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-800 mb-3">🛡 Insurance — What First-Time Buyers Should Know</h4>
              
              <div className="space-y-3 mb-4">
                <p className="text-sm text-gray-700">
                  Most dealerships require proof of active insurance before you can drive the vehicle off the lot. This is standard practice, not a negotiation tactic. Getting an insurance quote before visiting helps you understand the full cost of ownership and prevents last-minute surprises.
                </p>
                
                <p className="text-sm text-gray-700">
                  Many dealer-offered protection products overlap with what your insurance may already cover. For example, tire and wheel protection, windshield coverage, and some extended warranties may duplicate coverage you already have. Always ask what's included, compare it to your existing insurance, and verify before agreeing to add-ons.
                </p>
                
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <h5 className="font-semibold text-gray-900 mb-2 text-sm">Common Dealer Add-Ons (Often Optional)</h5>
                  <ul className="space-y-1.5 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="text-slate-600 mr-2 mt-0.5">•</span>
                      <span><strong>GAP insurance</strong> — Covers the difference if your car is totaled and worth less than you owe. Check if your insurance or loan already includes this.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-slate-600 mr-2 mt-0.5">•</span>
                      <span><strong>Tire & wheel protection</strong> — May overlap with your insurance's comprehensive coverage. Ask what's covered and compare.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-slate-600 mr-2 mt-0.5">•</span>
                      <span><strong>Windshield protection</strong> — Many insurance policies already cover windshield replacement. Verify your coverage first.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-slate-600 mr-2 mt-0.5">•</span>
                      <span><strong>Extended warranties</strong> — Optional service contracts. Review what's covered, compare to manufacturer warranty, and consider your repair comfort level.</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-900 mb-1">💡 Smart First-Time Buyer Tip</p>
                  <p className="text-xs text-green-800">
                    Get an insurance quote before visiting the dealership. This helps you budget for the full cost of ownership and gives you leverage when dealers offer protection products. You can always say, "I already have coverage for that" if your insurance overlaps.
                  </p>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <h5 className="font-semibold text-gray-900 mb-2 text-sm">Before You Visit — Insurance Checklist</h5>
                  <ul className="space-y-1.5 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2 mt-0.5">✓</span>
                      <span>Get an insurance quote for the specific vehicle (VIN helps)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2 mt-0.5">✓</span>
                      <span>Review your current policy to see what's already covered</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2 mt-0.5">✓</span>
                      <span>Ask dealers which add-ons are optional vs mandatory</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2 mt-0.5">✓</span>
                      <span>Compare dealer protection products to your insurance coverage</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2 mt-0.5">✓</span>
                      <span>Verify the final OTD price includes only what you want</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <p className="text-xs text-gray-600 italic border-t border-slate-200 pt-3 mt-3">
                Remember: Ask, compare, verify. Understanding your insurance coverage helps you make informed decisions about dealer add-ons and reinforces the importance of getting a clear OTD price before finalizing.
              </p>
            </div>
          </Card>

          {/* 1. Common First-Time Buyer Mistakes (contextual) */}
          {/* Only show for First-Time variant */}
          {variant === 'first_time' && (
          <Card className="p-6 mb-6 bg-red-50 border-red-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ⚠️ Common First-Time Buyer Mistakes
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Mistakes that cost first-time buyers money on deals like this one:
            </p>
            <div className="space-y-3">
              {(() => {
                const mistakes = []
                const hasOTD = !!dealPlan.otdEstimate?.expectedOTD
                const priceDiff = dealPlan.targets.askingPrice - dealPlan.targets.estimatedFairPrice
                const state = dealPlan.otdEstimate?.assumptions?.registrationState || ''
                
                // Mistake 1: Not getting written OTD
                if (!hasOTD) {
                  mistakes.push({
                    mistake: 'Negotiating without a written Out-the-Door (OTD) price',
                    why: 'First-time buyers focus on the monthly payment or sale price, not realizing dealers add thousands in fees later.',
                    cost: '$500-$2,000+ in surprise fees',
                    fix: 'Always ask for a written itemized OTD quote before negotiating further.',
                  })
                }
                
                // Mistake 2: Focusing on monthly payment only
                mistakes.push({
                  mistake: 'Negotiating based on monthly payment instead of total cost',
                  why: 'Dealers can make any monthly payment work by extending the loan term, which costs you more in total interest.',
                  cost: '$1,000-$3,000+ in extra interest over the loan term',
                  fix: 'Negotiate the total OTD price first, then discuss financing separately.',
                })
                
                // Mistake 3: Not questioning mandatory add-ons
                mistakes.push({
                  mistake: 'Accepting "mandatory" dealer add-ons without questioning',
                  why: 'First-time buyers assume everything the dealer says is required, but many add-ons are optional or negotiable.',
                  cost: '$1,000-$3,000+ in unnecessary add-ons',
                  fix: 'Ask which add-ons are truly mandatory by law vs. dealer policy, and negotiate to remove optional ones.',
                })
                
                // Mistake 4: Not comparing to fair market value
                if (priceDiff > 1000) {
                  mistakes.push({
                    mistake: `Paying ${Math.round((priceDiff / dealPlan.targets.estimatedFairPrice) * 100)}% above estimated fair market value`,
                    why: 'First-time buyers don\'t research comparable prices and accept the first "good deal" they see.',
                    cost: `$${priceDiff.toLocaleString()}+ over fair value`,
                    fix: `Use the estimated fair price ($${dealPlan.targets.estimatedFairPrice.toLocaleString()}) as your negotiation anchor, not the asking price.`,
                  })
                }
                
                // Mistake 5: Not verifying tax and registration fees
                mistakes.push({
                  mistake: 'Not verifying tax rate and registration fees before finalizing',
                  why: 'First-time buyers assume the dealer calculates taxes correctly, but mistakes happen and you pay for them.',
                  cost: '$200-$800+ in overcharged taxes or fees',
                  fix: 'Verify your state and local tax rate independently, and ask for a breakdown of all registration fees.',
                })
                
                // Mistake 6: Rushing to "close today" deals
                mistakes.push({
                  mistake: 'Feeling pressured by "today only" pricing and rushing the decision',
                  why: 'First-time buyers fear missing out on a "deal" and skip due diligence like getting a second opinion or sleeping on it.',
                  cost: '$500-$2,000+ in missed negotiation leverage and buyer\'s remorse',
                  fix: 'Take time to review the written OTD, compare with other dealers, and never let urgency override careful decision-making.',
                })
                
                return mistakes.slice(0, 6).map((mistake, i) => (
                  <div key={i} className="bg-white border border-red-300 rounded-lg p-4">
                    <h5 className="font-semibold text-red-900 mb-2">{mistake.mistake}</h5>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-700"><strong className="text-gray-900">Why first-time buyers make it:</strong> {mistake.why}</p>
                      <p className="text-red-700"><strong className="text-red-900">What it usually costs:</strong> {mistake.cost}</p>
                      <p className="text-green-700"><strong className="text-green-900">What to do instead:</strong> {mistake.fix}</p>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </Card>
          )}

          {/* 2. Deal Confidence Meter - Prominent Status Banner */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Deal Confidence Meter
            </h3>
            {(() => {
            const hasOTD = !!dealPlan.otdEstimate?.expectedOTD
            const hasFeeBreakdown = dealPlan.otdEstimate?.assumptions?.docFee?.value !== undefined
            const priceDiff = dealPlan.targets.askingPrice - dealPlan.targets.estimatedFairPrice
            const priceDiffPercent = (priceDiff / dealPlan.targets.estimatedFairPrice) * 100
            const hasDealerRedFlags = dealPlan.leverage.points.some(p => p.strength === 'low' && p.score < 30)
            
            let confidence: 'high' | 'caution' | 'risk' = 'high'
            let confidenceLabel = 'High Confidence'
            let whyMatters = ''
            let nextStep = ''
            let ctaText = ''
            let ctaAction: (() => void) | null = null
            
            const issues = []
            
            if (!hasOTD) {
              issues.push('No written OTD provided')
              confidence = 'risk'
            }
            
            if (!hasFeeBreakdown) {
              issues.push('Fee breakdown unclear')
              if (confidence !== 'risk') confidence = 'caution'
            }
            
            if (priceDiffPercent > 10) {
              issues.push(`Price ${Math.round(priceDiffPercent)}% above estimated fair value`)
              if (confidence === 'high') confidence = 'caution'
              if (priceDiffPercent > 20) confidence = 'risk'
            }
            
            if (hasDealerRedFlags) {
              issues.push('Dealer behavior signals raise concerns')
              if (confidence === 'high') confidence = 'caution'
            }
            
            if (confidence === 'high') {
              confidenceLabel = 'High Confidence'
              whyMatters = 'You have the transparency and pricing clarity needed to make an informed decision.'
              nextStep = 'You can proceed with confidence, but still verify the final OTD matches your expectations.'
              ctaText = 'See what to verify before proceeding'
              ctaAction = () => {
                // Scroll to verification checklist
                const checklist = document.getElementById('first-time-verification-checklist')
                checklist?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            } else if (confidence === 'caution') {
              confidenceLabel = 'Proceed with Caution'
              whyMatters = 'Some important details are unclear, which could lead to surprise costs or unfavorable terms.'
              nextStep = 'Get clarification on the unclear items before moving forward with negotiations.'
              ctaText = 'Ask the Advisor what to clarify'
              ctaAction = () => {
                // Scroll to First-Time Buyer Advisor
                const advisor = document.getElementById('first-time-buyer-advisor')
                advisor?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            } else {
              confidenceLabel = 'High Risk'
              whyMatters = 'Multiple red flags suggest this deal needs significant clarification before proceeding.'
              nextStep = 'Address the critical issues before engaging further, or consider alternative options.'
              ctaText = 'Ask the Advisor what to clarify'
              ctaAction = () => {
                // Scroll to First-Time Buyer Advisor
                const advisor = document.getElementById('first-time-buyer-advisor')
                advisor?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }
            
            const accentColor = confidence === 'high' ? 'green' : confidence === 'caution' ? 'amber' : 'red'
            const bgColor = confidence === 'high' 
              ? 'bg-green-50 border-green-300' 
              : confidence === 'caution' 
              ? 'bg-amber-50 border-amber-300' 
              : 'bg-red-50 border-red-300'
            const textColor = confidence === 'high' 
              ? 'text-green-900' 
              : confidence === 'caution' 
              ? 'text-amber-900' 
              : 'text-red-900'
            const iconColor = confidence === 'high' 
              ? 'text-green-600' 
              : confidence === 'caution' 
              ? 'text-amber-600' 
              : 'text-red-600'
            const borderAccent = confidence === 'high' 
              ? 'border-l-green-500' 
              : confidence === 'caution' 
              ? 'border-l-amber-500' 
              : 'border-l-red-500'
            
            return (
              <div className={`border-l-4 ${borderAccent} ${bgColor} border rounded-lg shadow-sm`}>
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`text-4xl font-bold ${iconColor} flex-shrink-0`}>
                      {confidence === 'high' ? '✓' : confidence === 'caution' ? '⚠' : '✗'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-xl font-bold ${textColor} mb-2`}>
                        {confidenceLabel}
                      </h3>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Why this matters: {whyMatters}
                      </p>
                      <p className="text-sm text-gray-700 mb-3">
                        {nextStep}
                      </p>
                      {ctaAction && (
                        <button
                          onClick={ctaAction}
                          className={`text-sm font-semibold ${
                            confidence === 'high' 
                              ? 'text-green-700 hover:text-green-900' 
                              : confidence === 'caution' 
                              ? 'text-amber-700 hover:text-amber-900' 
                              : 'text-red-700 hover:text-red-900'
                          } underline`}
                        >
                          {ctaText} →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
          </div>

          {/* 3. "Before You Proceed, Verify These" Checklist */}
          <Card className="p-6 mb-6 bg-green-50 border-green-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ✅ Before You Proceed, Verify These
            </h3>
            <div className="space-y-3">
              {[
                {
                  item: 'Written Out-the-Door (OTD) price',
                  why: 'This is your total cost including all fees, taxes, and add-ons. Without it, you can\'t compare deals accurately.',
                },
                {
                  item: 'Add-ons: optional vs mandatory',
                  why: 'Many "mandatory" add-ons are actually optional dealer policies. Know which ones you can remove to save money.',
                },
                {
                  item: 'Warranty / return policy details',
                  why: 'Understand what\'s covered, for how long, and what voids the warranty. Some dealers offer short return windows.',
                },
                {
                  item: 'Financing incentives and terms',
                  why: 'If financing, verify the APR, loan term, and any special incentives. Compare with your own pre-approval.',
                },
                {
                  item: 'Registration and local fees breakdown',
                  why: 'State and local fees vary. Get an itemized list so you know exactly what you\'re paying and why.',
                },
                {
                  item: 'Vehicle history and condition report',
                  why: 'For used cars, verify the Carfax or similar report. Check for accidents, title issues, or maintenance gaps.',
                },
                {
                  item: 'Final paperwork review before signing',
                  why: 'Read all documents carefully. Ensure the final price matches your agreed OTD, and understand all terms.',
                },
              ].map((check, i) => (
                <div key={i} className="bg-white border border-green-300 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold mt-0.5">□</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">{check.item}</p>
                      <p className="text-xs text-gray-600 italic">{check.why}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 4. Dealer Behavior Decoder */}
          <Card className="p-6 mb-6 bg-purple-50 border-purple-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Dealer Behavior Decoder
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              What common dealer statements usually mean:
            </p>
            <div className="space-y-3">
              {[
                {
                  statement: '"Come in to talk numbers"',
                  meaning: 'They want you in the showroom where pressure tactics work better. They\'ll likely avoid giving you a written OTD quote until you\'re there.',
                },
                {
                  statement: '"This price is only good today"',
                  meaning: 'This is a pressure tactic. If the price is truly competitive, it will still be there tomorrow. Take time to compare and think.',
                },
                {
                  statement: '"We can make any monthly payment work"',
                  meaning: 'They\'ll extend the loan term or add fees to hit your target payment, which costs you more overall. Focus on total OTD price instead.',
                },
                {
                  statement: '"These add-ons are mandatory"',
                  meaning: 'Many are actually optional dealer policies, not legal requirements. Ask which are required by law vs. dealer policy.',
                },
                {
                  statement: '"We\'re losing money on this deal"',
                  meaning: 'This is almost never true. Dealers don\'t sell at a loss. It\'s a negotiation tactic to make you feel like you\'re getting a great deal.',
                },
                {
                  statement: '"Let me check with my manager"',
                  meaning: 'This is often a scripted delay tactic to make you wait and feel invested. They may already know the answer but want to create urgency.',
                },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-purple-300 rounded-lg p-3">
                  <p className="font-medium text-purple-900 mb-1">"{item.statement}"</p>
                  <p className="text-sm text-gray-700">{item.meaning}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* 5. Location-Specific Surprise Costs (expanded) */}
          <Card className="p-6 mb-6 bg-orange-50 border-orange-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📍 Location-Specific Surprise Costs
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              First-time buyer surprises specific to your location:
            </p>
            <div className="space-y-2">
              {(() => {
                const state = dealPlan.otdEstimate?.assumptions?.registrationState || ''
                const surpriseCosts = []
                
                // City sticker (common in IL, NY, etc.)
                if (['IL', 'NY', 'CA'].includes(state)) {
                  surpriseCosts.push({
                    name: 'City Sticker / Vehicle Registration Sticker',
                    amount: '$50-$200',
                    explanation: 'Many cities require an annual vehicle sticker. This is separate from state registration and often surprises first-time buyers who think registration covers everything.',
                    frequency: 'Annual',
                  })
                }
                
                // County wheel tax (common in some states)
                if (['WI', 'IL', 'IN'].includes(state)) {
                  surpriseCosts.push({
                    name: 'County Wheel Tax',
                    amount: '$20-$100',
                    explanation: 'Some counties charge an annual wheel tax per vehicle. This is a recurring cost, not a one-time fee, and varies by county.',
                    frequency: 'Annual',
                  })
                }
                
                // State-specific registration fees
                if (['CA', 'FL', 'TX'].includes(state)) {
                  surpriseCosts.push({
                    name: 'State Registration Fee (value-based)',
                    amount: '$200-$500+',
                    explanation: `${state} charges registration fees based on vehicle value, not a flat rate. First-time buyers often underestimate this cost.`,
                    frequency: 'Annual',
                  })
                }
                
                // Emissions testing (some states)
                if (['CA', 'NY', 'CO', 'AZ'].includes(state)) {
                  surpriseCosts.push({
                    name: 'Emissions Testing / Smog Check',
                    amount: '$20-$50',
                    explanation: 'Required before registration in some states. Must be done at certified stations, and older vehicles may need repairs to pass.',
                    frequency: 'Biennial or as needed',
                  })
                }
                
                // Always include registration/plate nuances
                surpriseCosts.push({
                  name: 'Registration & Plate Fees',
                  amount: '$50-$300',
                  explanation: 'State registration and plate fees vary. Some states charge based on vehicle value, others have flat fees. First-time buyers often don\'t realize this is separate from the sale price and may be higher than expected.',
                  frequency: 'One-time (plus annual renewal)',
                })
                
                return surpriseCosts.map((cost, i) => (
                  <div key={i} className="bg-white border border-orange-300 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span className="font-medium text-gray-900">{cost.name}</span>
                        <span className="text-xs text-gray-500 ml-2">({cost.frequency})</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{cost.amount}</span>
                    </div>
                    <p className="text-xs text-gray-600 italic">{cost.explanation}</p>
                  </div>
                ))
              })()}
            </div>
            <p className="text-xs text-gray-600 mt-3 italic">
              💡 <strong>First-time buyer tip:</strong> These costs are often not included in dealer quotes. Ask specifically about local fees, city stickers, and county taxes for your registration address.
            </p>
          </Card>

          {/* 6. Confidence Recap */}
          <Card className="p-6 mb-6 bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confidence Recap
            </h3>
            {(() => {
              const hasOTD = !!dealPlan.otdEstimate?.expectedOTD
              const priceDiff = dealPlan.targets.askingPrice - dealPlan.targets.estimatedFairPrice
              const priceDiffPercent = (priceDiff / dealPlan.targets.estimatedFairPrice) * 100
              const hasGoodLeverage = dealPlan.leverage.points.some(p => p.strength === 'high')
              
              const strengths = []
              const nextSteps = []
              
              if (hasOTD) {
                strengths.push('You have a clear OTD target to negotiate toward')
              } else {
                nextSteps.push('Get a written itemized OTD quote before proceeding')
              }
              
              if (priceDiffPercent <= 5) {
                strengths.push('The asking price is close to estimated fair market value')
              } else if (priceDiffPercent > 20) {
                nextSteps.push('Negotiate toward the estimated fair price as your anchor')
              }
              
              if (hasGoodLeverage) {
                strengths.push('You have identified leverage points to use in negotiation')
              }
              
              if (strengths.length === 0) {
                nextSteps.push('Review the checklist above and gather missing information')
              }
              
              if (variant === 'first_time') {
                nextSteps.push('Use the written-only templates above to request a written OTD breakdown.')
              } else {
                nextSteps.push('Use the Negotiation Copilot to craft your first message')
              }
              
              return (
                <div>
                  {strengths.length > 0 && (
                    <div className="bg-white border border-indigo-300 rounded-lg p-4 mb-4">
                      <p className="text-sm font-medium text-indigo-900 mb-2">Your current position:</p>
                      <ul className="space-y-1">
                        {strengths.map((strength, i) => (
                          <li key={i} className="flex items-start text-sm text-gray-700">
                            <span className="text-green-600 mr-2">✓</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="bg-white border border-indigo-300 rounded-lg p-4">
                    <p className="text-sm font-medium text-indigo-900 mb-2">Your next steps:</p>
                    <ul className="space-y-1">
                      {nextSteps.map((step, i) => (
                        <li key={i} className="flex items-start text-sm text-gray-700">
                          <span className="text-blue-600 mr-2">→</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <p className="text-sm text-gray-700 mt-4 italic">
                    You're prepared with the information and guardrails needed to make a confident decision. Take your time, verify everything, and don't let pressure override careful consideration.
                  </p>
                </div>
              )
            })()}
          </Card>

          {/* First-Time Buyer Advisor - Chat Interface */}
          {/* Only show for First-Time pack, not In-Person pack */}
          {variant === 'first_time' && (
            <div id="first-time-buyer-advisor">
              <AdvisorChat
                listingUrl={listingUrl}
                context={{
                  state: dealPlan.otdEstimate?.assumptions?.registrationState || '',
                  vehiclePrice: dealPlan.targets.askingPrice,
                  estimatedFairPrice: dealPlan.targets.estimatedFairPrice,
                  vehicleType: (dealPlan as any).vehicleInfo?.condition || 'used',
                  hasOTD: !!dealPlan.otdEstimate?.expectedOTD,
                  dealerName: (dealPlan as any).vehicleInfo?.dealerName,
                  dealerState: dealPlan.otdEstimate?.assumptions?.registrationState,
                  trim: (dealPlan as any).vehicleInfo?.trim,
                }}
              />
            </div>
          )}
          </>
        )}

        {/* In-Person Negotiation Pack: What You Can Say In Person */}
        {/* Only show for In-Person pack variant */}
        {variant === 'in_person' && hasInPerson && (
          <Card className="p-6 mb-6 bg-orange-50 border-orange-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              What You Can Say In Person
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Convert your analysis into short, spoken leverage lines. Use these phrases during in-person negotiations:
            </p>
            <div className="space-y-3">
              {(() => {
                const verbalLeverage = []
                const priceDiff = dealPlan.targets.askingPrice - dealPlan.targets.estimatedFairPrice
                const priceDiffPercent = (priceDiff / dealPlan.targets.estimatedFairPrice) * 100
                const hasOTD = !!dealPlan.otdEstimate?.expectedOTD
                const hasGoodLeverage = dealPlan.leverage.points.some(p => p.strength === 'high')
                
                // Price leverage
                if (priceDiffPercent > 5) {
                  verbalLeverage.push({
                    situation: 'When they quote the asking price',
                    phrase: `"I've seen similar vehicles priced around $${dealPlan.targets.estimatedFairPrice.toLocaleString()}. Can you help me understand the difference?"`,
                    why: 'Anchors to fair market value without being confrontational'
                  })
                }
                
                // OTD leverage
                if (hasOTD && dealPlan.otdEstimate.expectedOTD) {
                  const expectedOTDValue = typeof dealPlan.otdEstimate.expectedOTD === 'number' 
                    ? dealPlan.otdEstimate.expectedOTD 
                    : dealPlan.otdEstimate.expectedOTD.expected
                  verbalLeverage.push({
                    situation: 'When they avoid giving OTD price',
                    phrase: `"I need to see the full out-the-door price, including all fees and taxes. My target is $${expectedOTDValue.toLocaleString()} OTD."`,
                    why: 'Direct, firm, and sets clear expectation'
                  })
                } else {
                  verbalLeverage.push({
                    situation: 'When they avoid giving OTD price',
                    phrase: '"I need the full out-the-door price in writing, including all fees and taxes."',
                    why: 'Gets everything in writing before negotiating further'
                  })
                }
                
                // Leverage points
                if (hasGoodLeverage) {
                  const highLeverage = dealPlan.leverage.points.find(p => p.strength === 'high')
                  if (highLeverage) {
                    verbalLeverage.push({
                      situation: 'When they push back on price',
                      phrase: `"${highLeverage.factor}"`,
                      why: 'Uses your strongest leverage point'
                    })
                  }
                }
                
                // Market condition leverage
                if ((dealPlan.leverage as any).marketCondition) {
                  verbalLeverage.push({
                    situation: 'When they claim urgency',
                    phrase: `"I'm comparing a few options. What's your best OTD price?"`,
                    why: 'Signals you have alternatives without being aggressive'
                  })
                }
                
                // Fee leverage
                verbalLeverage.push({
                  situation: 'When they add unexpected fees',
                  phrase: '"Can you show me which of these fees are required by law versus dealer policy?"',
                  why: 'Separates mandatory from negotiable fees'
                })
                
                return verbalLeverage.map((item, i) => (
                  <div key={i} className="bg-white border border-orange-300 rounded-lg p-4">
                    <p className="text-sm font-semibold text-gray-900 mb-2">{item.situation}:</p>
                    <p className="text-sm font-medium text-orange-800 bg-orange-50 rounded p-2 mb-2 border border-orange-200">
                      {item.phrase}
                    </p>
                    <p className="text-xs text-gray-600 italic">💡 {item.why}</p>
                  </div>
                ))
              })()}
            </div>
            <p className="text-xs text-gray-600 mt-4 italic">
              💡 <strong>In-person tip:</strong> Keep these phrases short (1-2 sentences). Say them calmly, then wait for their response. Don't over-explain.
            </p>
          </Card>
        )}

        {/* 4. Likely Dealer Tactics + Counters */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">4. Likely Dealer Tactics + Counters</h3>
          <p className="text-sm text-gray-600 mb-4">"If they say X → say Y"</p>
          <div className="space-y-4">
            {dealPlan.tactics.map((tactic, i) => {
              const isLocked = tactic.pack && !hasPack(tactic.pack) && !hasAllAccess()
              const content = (
                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-medium text-gray-900">{tactic.tactic}</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      tactic.likelihood === 'high' ? 'bg-red-100 text-red-700' :
                      tactic.likelihood === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {tactic.likelihood.toUpperCase()} Likelihood
                    </span>
                  </div>
                  <p className="text-sm text-gray-700"><strong>Counter:</strong> {tactic.counter}</p>
                </div>
              )
              return isLocked ? (
                <PackGate key={i} packId={tactic.pack!} fallback={content}>
                  {content}
                </PackGate>
              ) : (
                <div key={i}>{content}</div>
              )
            })}
          </div>
        </Card>

        {/* 5. Ready-to-Send Scripts */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">5. Ready-to-Send Scripts</h3>
          <div className="space-y-4">
            {dealPlan.scripts.map((script, i) => {
              const isLocked = script.pack && !hasPack(script.pack) && !hasAllAccess()
              const content = (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">{script.title}</p>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{script.text}</p>
                    <button
                      onClick={() => handleCopyScript(script.text)}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
              )
              return isLocked ? (
                <PackGate key={i} packId={script.pack!} fallback={content}>
                  {content}
                </PackGate>
              ) : (
                <div key={i}>{content}</div>
              )
            })}
          </div>
        </Card>

        {/* 5.5. Calculate Desired OTD with Fees */}
        <Card className="p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                Calculate Desired OTD
                <span 
                  className="text-blue-600 cursor-help text-base" 
                  title="OTD (Out-the-Door): Your total cost including sale price, all fees, taxes, and add-ons. This is the only number that matters for comparing deals—always negotiate OTD first, not monthly payment."
                >
                  ⓘ
                </span>
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Input fees to calculate your desired Out-the-Door price for negotiations
              </p>
            </div>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => setShowFeeInputs(!showFeeInputs)}
            >
              {showFeeInputs ? 'Hide' : 'Calculate'}
            </Button>
          </div>

          {showFeeInputs && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documentation Fee
                    <span className="text-xs text-gray-500 ml-2">
                      (Typical: ${otdAssumptions.docFee.range.low}-${otdAssumptions.docFee.range.high})
                    </span>
                  </label>
                  <input
                    type="number"
                    value={docFeeInput}
                    onChange={(e) => setDocFeeInput(e.target.value)}
                    placeholder={otdAssumptions.docFee.value?.toString() || otdAssumptions.docFee.range.low.toString()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title Fee
                    <span className="text-xs text-gray-500 ml-2">(Typical: $20-100)</span>
                  </label>
                  <input
                    type="number"
                    value={titleFeeInput}
                    onChange={(e) => setTitleFeeInput(e.target.value)}
                    placeholder="20"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Fee
                    <span className="text-xs text-gray-500 ml-2">(Typical: $50-200)</span>
                  </label>
                  <input
                    type="number"
                    value={registrationFeeInput}
                    onChange={(e) => setRegistrationFeeInput(e.target.value)}
                    placeholder="50"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Other Dealer Fees (optional)
                  </label>
                  <input
                    type="number"
                    value={otherFeesInput}
                    onChange={(e) => setOtherFeesInput(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
                <Button onClick={calculateDesiredOTDWithFees}>
                  Calculate Desired OTD
                </Button>
                {calculatedDesiredOTD !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Desired OTD:</span>
                    <span className="text-lg font-bold text-blue-600">
                      ${calculatedDesiredOTD.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {variant === 'first_time' 
                        ? '(Saved for your reference)' 
                        : '(This will be used when opening Copilot)'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {calculatedDesiredOTD !== null && !showFeeInputs && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Your Desired OTD</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    ${calculatedDesiredOTD.toLocaleString()}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => {
                    setCalculatedDesiredOTD(null)
                    setDocFeeInput('')
                    setTitleFeeInput('')
                    setRegistrationFeeInput('')
                    setOtherFeesInput('')
                  }}
                >
                  Clear
                </Button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {variant === 'first_time'
                  ? 'This OTD includes vehicle price, tax, and all fees. Use this as your target when requesting a written breakdown.'
                  : 'This OTD includes vehicle price, tax, and all fees. It will be used when you open Copilot.'}
              </p>
            </div>
          )}
        </Card>

        {/* 6. Next Best Move */}
        <Card className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <h3 className="text-lg font-semibold mb-4">6. Next Best Move</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {variant === 'first_time' ? (
              <Button
                onClick={() => {
                  // Scroll to the written templates section
                  const templatesSection = document.querySelector('[data-templates-section]')
                  if (templatesSection) {
                    templatesSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    
                    // Add visual highlight after scroll
                    templatesSection.classList.add('ring-4', 'ring-blue-400', 'ring-opacity-75', 'transition-all', 'duration-300')
                    
                    // Remove highlight after animation
                    setTimeout(() => {
                      templatesSection.classList.remove('ring-4', 'ring-blue-400', 'ring-opacity-75')
                    }, 2000)
                  }
                }}
                className="bg-white !text-black hover:bg-gray-100"
              >
                Use the safe written templates above
              </Button>
            ) : (
              <Button
                onClick={() => handleOpenCopilot()}
                className="bg-white !text-black hover:bg-gray-100"
              >
                Generate Best Reply in Copilot
              </Button>
            )}
            <Button
              onClick={handleOpenOTDBuilder}
              className="bg-white !text-black hover:bg-gray-100"
            >
              Build OTD
            </Button>
            <Button
              onClick={handleOpenComparison}
              className="bg-white !text-black hover:bg-gray-100"
            >
              Compare Similar Offers
            </Button>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button onClick={onAddToComparison} variant="secondary">
            Add to Comparison
          </Button>
        </div>
      </div>

      {/* Extraction Diagnostics (Dev Only) */}
      {diagnostics && typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 list-none">
              <span className="flex items-center gap-2">
                <span className="transform transition-transform group-open:rotate-90">▶</span>
                Extraction Diagnostics (Dev)
              </span>
            </summary>
            <div className="mt-4 space-y-4 bg-gray-50 rounded-lg p-4 text-sm">
              {/* Fetch Info */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Fetch Information</h4>
                <div className="space-y-1 text-gray-700">
                  <p><strong>Source URL:</strong> {diagnostics.sourceUrl}</p>
                  <p><strong>Final URL:</strong> {diagnostics.finalUrl}</p>
                  <p><strong>Page Title:</strong> "{diagnostics.pageTitle}"</p>
                  <p><strong>Fetch Status:</strong> {diagnostics.fetchStatus}</p>
                  <p><strong>Blocked:</strong> {diagnostics.blocked ? 'Yes ⚠️' : 'No'}</p>
                </div>
              </div>

              {/* Extraction Info */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Extraction Information</h4>
                <div className="space-y-1 text-gray-700">
                  <p><strong>Platform Detected:</strong> {diagnostics.platformDetected}</p>
                  <p><strong>Strategy Used:</strong> {diagnostics.extractionStrategyUsed}</p>
                  <p><strong>Confidence:</strong> {(diagnostics.confidence * 100).toFixed(0)}%</p>
                  {diagnostics.issues.length > 0 && (
                    <div>
                      <p><strong>Issues:</strong></p>
                      <ul className="list-disc list-inside ml-2 text-red-600">
                        {diagnostics.issues.map((issue: string, i: number) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Price Candidates */}
              {diagnostics.priceCandidates.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Price Candidates (Top 5)</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Value</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Label</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Source</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Score</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Flags</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Context</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {diagnostics.priceCandidates.map((candidate: any, i: number) => (
                          <tr key={i} className={i === 0 ? 'bg-blue-50' : ''}>
                            <td className="px-3 py-2 text-sm font-mono">
                              ${candidate.value.toLocaleString()}
                              {i === 0 && <span className="ml-2 text-blue-600 font-semibold">✓ Selected</span>}
                            </td>
                            <td className="px-3 py-2 text-sm">{candidate.label}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{candidate.source}</td>
                            <td className="px-3 py-2 text-sm font-mono">{candidate.score.toFixed(0)}</td>
                            <td className="px-3 py-2 text-sm">
                              {candidate.flags.isMsrp && <span className="text-yellow-600">MSRP </span>}
                              {candidate.flags.isMonthlyPayment && <span className="text-red-600">Monthly </span>}
                              {candidate.flags.isConditional && <span className="text-orange-600">Conditional </span>}
                              {!candidate.flags.isMsrp && !candidate.flags.isMonthlyPayment && !candidate.flags.isConditional && (
                                <span className="text-gray-400">None</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate" title={candidate.context}>
                              "{candidate.context}"
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Mileage Candidates */}
              {diagnostics.mileageCandidates.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Mileage Candidates (Top 5)</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Value</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Source</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Score</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Context</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {diagnostics.mileageCandidates.map((candidate: any, i: number) => (
                          <tr key={i} className={i === 0 ? 'bg-blue-50' : ''}>
                            <td className="px-3 py-2 text-sm font-mono">
                              {candidate.value.toLocaleString()} mi
                              {i === 0 && <span className="ml-2 text-blue-600 font-semibold">✓ Selected</span>}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600">{candidate.source}</td>
                            <td className="px-3 py-2 text-sm font-mono">{candidate.score.toFixed(0)}</td>
                            <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate" title={candidate.context}>
                              "{candidate.context}"
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

