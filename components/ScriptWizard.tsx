'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

const supabase = createBrowserSupabaseClient()
import Card from './ui/Card'
import Button from './ui/Button'
import FinancingHelper from './FinancingHelper'
import type { WizardAnswers, WizardStep } from '@/lib/types/wizard'
import type { GenerateScriptResponse } from '@/lib/types/api'
import type { User } from '@supabase/supabase-js'
import { packs as packConfigs } from '@/lib/packs/config'

interface ScriptWizardProps {
  user: User
  initialCarContext?: string | null
  prefilledDealId?: string | null
  onComplete?: (result: GenerateScriptResponse['data']) => void
  onCancel?: () => void
  activePackId?: string | null
  unlockedPackIds?: string[]
}

interface CompetitiveOffer {
  dealer: string
  price: number
  otdPrice?: number
  distance?: string
  notes?: string
}

export default function ScriptWizard({
  user,
  initialCarContext,
  prefilledDealId,
  onComplete,
  onCancel,
  activePackId,
  unlockedPackIds = [],
}: ScriptWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<WizardStep | 'pack_questions'>('communication_method')
  const [answers, setAnswers] = useState<Partial<WizardAnswers>>({
    carContext: initialCarContext || '',
  })
  const [packAnswers, setPackAnswers] = useState<Record<string, any>>({})
  const [result, setResult] = useState<GenerateScriptResponse['data'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFinancingHelper, setShowFinancingHelper] = useState(false)
  const [competitiveOffers, setCompetitiveOffers] = useState<CompetitiveOffer[]>([])
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [showCompetitiveStep, setShowCompetitiveStep] = useState(false)

  const packConfig = activePackId ? packConfigs[activePackId] : null
  const packUnlocked = activePackId ? unlockedPackIds.includes(activePackId) : false

  const steps: (WizardStep | 'pack_questions')[] = useMemo(() => {
    const base: (WizardStep | 'pack_questions')[] = [
      'communication_method',
      'payment_method',
      'experience_level',
      'negotiation_stage',
      'help_needed',
      'car_context',
    ]
    if (packUnlocked && packConfig?.questions && packConfig.questions.length > 0) {
      return ['pack_questions', ...base]
    }
    return base
  }, [packUnlocked, packConfig])

  // Fetch competitive offers when user reaches comparing_offers stage
  useEffect(() => {
    if (answers.currentStage === 'comparing_offers' && user) {
      fetchCompetitiveOffers()
    }
  }, [answers.currentStage, user])

  // Load competitive offers from localStorage (from Research page)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedOffers = localStorage.getItem('competitiveOffers')
      if (savedOffers) {
        try {
          const parsed = JSON.parse(savedOffers)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCompetitiveOffers(parsed)
            localStorage.removeItem('competitiveOffers')
          }
        } catch (e) {
          console.error('Error parsing competitive offers:', e)
        }
      }
    }
  }, [])

  const fetchCompetitiveOffers = async () => {
    setLoadingOffers(true)
    try {
      // Fetch recent deals and analyses
      const { data: deals } = await supabase
        .from('deals')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (deals && deals.length > 0) {
        // Fetch analyses for these deals
        const dealIds = deals.map((d) => d.id)
        const { data: analyses } = await supabase
          .from('analyses')
          .select('*')
          .in('deal_id', dealIds)
          .or('analysis_type.eq.offer_comparison,analysis_type.eq.listing_analyzer')

        // Extract competitive offers from analyses
        const offers: CompetitiveOffer[] = []
        analyses?.forEach((analysis) => {
          if (analysis.ai_output?.offers) {
            analysis.ai_output.offers.forEach((offer: any) => {
              offers.push({
                dealer: offer.dealer || 'Unknown Dealer',
                price: offer.price || 0,
                otdPrice: offer.otdPrice,
                distance: offer.distance,
                notes: offer.notes,
              })
            })
          }
          if (analysis.ai_output?.bestOffer) {
            offers.push({
              dealer: 'Previous Best Offer',
              price: analysis.ai_output.bestOffer,
              notes: 'From previous comparison',
            })
          }
        })

        if (offers.length > 0) {
          setCompetitiveOffers(offers)
          setShowCompetitiveStep(true)
        }
      }
    } catch (err) {
      console.error('Error fetching competitive offers:', err)
    } finally {
      setLoadingOffers(false)
    }
  }

  const handleAnswer = (key: keyof WizardAnswers, value: any) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const handleBack = () => {
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const handleGenerate = async () => {
    if (!answers.carContext || !answers.communicationMethod || !answers.paymentMethod || 
        !answers.experienceLevel || !answers.currentStage || !answers.helpNeeded) {
      setError('Please complete all steps')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get the session token to pass in headers
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          wizardAnswers: answers as WizardAnswers,
          carContext: answers.carContext,
          dealId: prefilledDealId,
          competitiveOffers: competitiveOffers.length > 0 ? competitiveOffers : undefined,
          packType: packUnlocked ? activePackId : undefined,
          packAnswers: packUnlocked ? packAnswers : undefined,
        }),
      })

      const data: GenerateScriptResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate script')
      }

      setResult(data.data)
      setCurrentStep('results')
      
      if (onComplete) {
        onComplete(data.data)
      }

      // Show financing helper if relevant
      if (answers.helpNeeded === 'financing_questions' || answers.paymentMethod === 'finance') {
        setShowFinancingHelper(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate script')
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'pack_questions':
        if (!packConfig || !packUnlocked || !packConfig.questions || packConfig.questions.length === 0) {
          return (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Pack Questions</h2>
              <p className="text-sm text-gray-600">Pack questions unavailable.</p>
              <div className="flex gap-3">
                <Button onClick={handleBack} variant="secondary">
                  Back
                </Button>
                <Button onClick={() => setCurrentStep(steps[steps.indexOf('pack_questions') + 1] || 'communication_method')}>
                  Continue
                </Button>
              </div>
            </div>
          )
        }
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">{packConfig.name} Questions</h2>
            <p className="text-sm text-gray-600">Answer these to tailor your script for this pack.</p>
            <div className="space-y-4">
              {packConfig.questions.map((q) => (
                <div key={q.id} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900">
                    {q.label} {q.required && <span className="text-red-500">*</span>}
                  </label>
                  {q.helpText && <p className="text-xs text-gray-600">{q.helpText}</p>}
                  {q.type === 'select' && q.options && (
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={packAnswers[q.id] ?? ''}
                      onChange={(e) => setPackAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    >
                      <option value="">Select...</option>
                      {q.options.map((opt) => (
                        <option key={String(opt.value)} value={String(opt.value)}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {q.type === 'number' && (
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={q.placeholder}
                      value={packAnswers[q.id] ?? ''}
                      onChange={(e) =>
                        setPackAnswers((prev) => ({ ...prev, [q.id]: e.target.value ? Number(e.target.value) : '' }))
                      }
                    />
                  )}
                  {q.type === 'text' && (
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={q.placeholder}
                      value={packAnswers[q.id] ?? ''}
                      onChange={(e) => setPackAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    />
                  )}
                  {q.type === 'textarea' && (
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder={q.placeholder}
                      value={packAnswers[q.id] ?? ''}
                      onChange={(e) => setPackAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    />
                  )}
                  {q.type === 'boolean' && (
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={packAnswers[q.id] === true ? 'primary' : 'secondary'}
                        onClick={() => setPackAnswers((prev) => ({ ...prev, [q.id]: true }))}
                      >
                        Yes
                      </Button>
                      <Button
                        type="button"
                        variant={packAnswers[q.id] === false ? 'primary' : 'secondary'}
                        onClick={() => setPackAnswers((prev) => ({ ...prev, [q.id]: false }))}
                      >
                        No
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button onClick={handleBack} variant="secondary">
                Back
              </Button>
              <Button onClick={() => setCurrentStep(steps[steps.indexOf('pack_questions') + 1] || 'communication_method')}>
                Next
              </Button>
            </div>
          </div>
        )

      case 'communication_method':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">How are you negotiating?</h2>
            <div className="space-y-3">
              <button
                onClick={() => handleAnswer('communicationMethod', 'remote')}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-gray-900">Remote (Email/Text)</div>
                <div className="text-sm text-gray-600 mt-1">I'm communicating via email or text message</div>
              </button>
              <button
                onClick={() => handleAnswer('communicationMethod', 'in_person')}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-gray-900">In Person</div>
                <div className="text-sm text-gray-600 mt-1">I'm at the dealership negotiating face-to-face</div>
              </button>
            </div>
          </div>
        )

      case 'payment_method':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">How are you planning to pay?</h2>
            <div className="space-y-3">
              <button
                onClick={() => handleAnswer('paymentMethod', 'cash')}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-gray-900">Cash</div>
                <div className="text-sm text-gray-600 mt-1">Paying with cash</div>
              </button>
              <button
                onClick={() => handleAnswer('paymentMethod', 'finance')}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-gray-900">Financing</div>
                <div className="text-sm text-gray-600 mt-1">Planning to finance the purchase</div>
              </button>
              <button
                onClick={() => handleAnswer('paymentMethod', 'unsure')}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-gray-900">Not Sure Yet</div>
                <div className="text-sm text-gray-600 mt-1">Still deciding between cash and financing</div>
              </button>
            </div>
          </div>
        )

      case 'experience_level':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">What's your experience level?</h2>
            <div className="space-y-3">
              <button
                onClick={() => handleAnswer('experienceLevel', 'first_time')}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-gray-900">First-Time Buyer</div>
                <div className="text-sm text-gray-600 mt-1">This is my first time buying a car</div>
              </button>
              <button
                onClick={() => handleAnswer('experienceLevel', 'experienced')}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-gray-900">Experienced</div>
                <div className="text-sm text-gray-600 mt-1">I've bought cars before</div>
              </button>
            </div>
          </div>
        )

      case 'negotiation_stage':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">What stage are you at?</h2>
            <div className="space-y-3">
              <button
                onClick={() => handleAnswer('currentStage', 'just_starting')}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-gray-900">Just Starting</div>
                <div className="text-sm text-gray-600 mt-1">Just beginning to talk to dealers</div>
              </button>
              <button
                onClick={() => handleAnswer('currentStage', 'comparing_offers')}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-gray-900">Comparing Offers</div>
                <div className="text-sm text-gray-600 mt-1">I have multiple offers to compare</div>
              </button>
              <button
                onClick={() => handleAnswer('currentStage', 'sitting_on_offer')}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-gray-900">Sitting on an Offer</div>
                <div className="text-sm text-gray-600 mt-1">I have an offer and need to respond</div>
              </button>
              <button
                onClick={() => handleAnswer('currentStage', 'ready_to_close')}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-gray-900">Ready to Close</div>
                <div className="text-sm text-gray-600 mt-1">Finalizing the deal</div>
              </button>
            </div>
          </div>
        )

      case 'help_needed':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">What do you need help with?</h2>
            <div className="space-y-3">
              <button
                onClick={() => handleAnswer('helpNeeded', 'negotiate_price')}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-gray-900">Negotiate Price</div>
                <div className="text-sm text-gray-600 mt-1">Get a better price on the vehicle</div>
              </button>
              <button
                onClick={() => handleAnswer('helpNeeded', 'ask_otd')}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-gray-900">Ask for OTD Price</div>
                <div className="text-sm text-gray-600 mt-1">Get the out-the-door price breakdown</div>
              </button>
              <button
                onClick={() => handleAnswer('helpNeeded', 'push_back_fees')}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-gray-900">Push Back on Fees</div>
                <div className="text-sm text-gray-600 mt-1">Challenge unnecessary fees or add-ons</div>
              </button>
              <button
                onClick={() => handleAnswer('helpNeeded', 'trade_in_value')}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-gray-900">Trade-In Value</div>
                <div className="text-sm text-gray-600 mt-1">Negotiate trade-in value</div>
              </button>
              <button
                onClick={() => handleAnswer('helpNeeded', 'financing_questions')}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-gray-900">Financing Questions</div>
                <div className="text-sm text-gray-600 mt-1">Ask about financing terms and options</div>
              </button>
              <button
                onClick={() => handleAnswer('helpNeeded', 'general_guidance')}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-gray-900">General Guidance</div>
                <div className="text-sm text-gray-600 mt-1">General negotiation help</div>
              </button>
            </div>
          </div>
        )

      case 'car_context':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Tell us about the car</h2>
            <p className="text-sm text-gray-600">
              Provide details about the vehicle you're negotiating for (make, model, year, price, mileage, etc.)
            </p>
            <textarea
              value={answers.carContext || ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, carContext: e.target.value }))}
              placeholder="e.g., 2020 Honda Civic, 45,000 miles, listed at $25,000..."
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[150px]"
            />

            {/* Competitive Offers Section - shown when comparing offers */}
            {answers.currentStage === 'comparing_offers' && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Competitive Offers
                  </h3>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setCompetitiveOffers([
                        ...competitiveOffers,
                        { dealer: '', price: 0, notes: '' },
                      ])
                    }}
                  >
                    + Add Offer
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Add offers from other dealerships to leverage in your negotiation. The script will reference these to strengthen your position.
                </p>

                {loadingOffers && (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-gray-600 mt-2">Loading your previous offers...</p>
                  </div>
                )}

                {competitiveOffers.length > 0 && (
                  <div className="space-y-3">
                    {competitiveOffers.map((offer, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Dealer Name
                            </label>
                            <input
                              type="text"
                              value={offer.dealer}
                              onChange={(e) => {
                                const updated = [...competitiveOffers]
                                updated[index].dealer = e.target.value
                                setCompetitiveOffers(updated)
                              }}
                              placeholder="e.g., ABC Motors"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Price
                            </label>
                            <input
                              type="number"
                              value={offer.price || ''}
                              onChange={(e) => {
                                const updated = [...competitiveOffers]
                                updated[index].price = parseFloat(e.target.value) || 0
                                setCompetitiveOffers(updated)
                              }}
                              placeholder="e.g., 22000"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              OTD Price (optional)
                            </label>
                            <input
                              type="number"
                              value={offer.otdPrice || ''}
                              onChange={(e) => {
                                const updated = [...competitiveOffers]
                                updated[index].otdPrice = parseFloat(e.target.value) || undefined
                                setCompetitiveOffers(updated)
                              }}
                              placeholder="e.g., 24500"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Distance/Notes (optional)
                            </label>
                            <input
                              type="text"
                              value={offer.distance || offer.notes || ''}
                              onChange={(e) => {
                                const updated = [...competitiveOffers]
                                updated[index].distance = e.target.value
                                updated[index].notes = e.target.value
                                setCompetitiveOffers(updated)
                              }}
                              placeholder="e.g., 15 miles away"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setCompetitiveOffers(competitiveOffers.filter((_, i) => i !== index))
                          }}
                          className="mt-2"
                        >
                          Remove
                        </Button>
                      </Card>
                    ))}
                  </div>
                )}

                {competitiveOffers.length === 0 && !loadingOffers && (
                  <Card className="p-4 bg-gray-50 border-dashed">
                    <p className="text-sm text-gray-600 text-center">
                      No competitive offers added yet. Click "Add Offer" to include offers from other dealerships.
                    </p>
                  </Card>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleBack} variant="secondary">
                Back
              </Button>
              <Button onClick={handleGenerate} disabled={!answers.carContext || loading}>
                {loading ? 'Generating...' : 'Generate Script'}
              </Button>
            </div>
          </div>
        )

      case 'results':
        if (!result) return null

        return (
          <div className="space-y-6">
            <div className="pb-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Your Script</h2>
              <p className="text-sm text-gray-600 mt-1">Ready to use</p>
            </div>

            {/* Main Script */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 lg:p-8">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                {result.conversationFlow ? 'Your Talking Points' : 'Your Message'}
              </h3>
              <div className="prose max-w-none">
                <p className="text-sm lg:text-base text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {result.script}
                </p>
              </div>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(result.script)
                  alert('Script copied to clipboard!')
                }}
                size="sm"
                className="mt-4"
              >
                Copy to Clipboard
              </Button>
            </div>

            {/* Conversation Flow - for in-person negotiations */}
            {result.conversationFlow && (
              <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-6 lg:p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Conversation Flow Guide</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Use this guide to navigate the conversation. It shows what the dealer might say and how you can respond.
                </p>

                {/* User Opening */}
                <div className="mb-6">
                  <div className="bg-white border-2 border-blue-300 rounded-lg p-4 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                        You
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">Your Opening</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {result.conversationFlow.userOpening}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scenarios */}
                <div className="space-y-6">
                  {result.conversationFlow.scenarios.map((scenario, scenarioIndex) => (
                    <div key={scenarioIndex} className="space-y-4">
                      {/* Dealer Response */}
                      <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-gray-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                            Dealer
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 mb-1">Dealer Might Say:</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              "{scenario.dealerResponse}"
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* User Options */}
                      <div className="ml-4 space-y-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Your Response Options:
                        </p>
                        {scenario.userOptions.map((option, optionIndex) => (
                          <div
                            key={optionIndex}
                            className="bg-white border border-blue-200 rounded-lg p-4"
                          >
                            <div className="flex items-start gap-3">
                              <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-semibold text-xs">
                                {optionIndex + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-900 font-medium mb-1">
                                  "{option.response}"
                                </p>
                                <p className="text-xs text-gray-600 italic">
                                  When to use: {option.whenToUse}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  navigator.clipboard.writeText(option.response)
                                  alert('Response copied to clipboard!')
                                }}
                              >
                                Copy
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Notes */}
                      {scenario.notes && (
                        <div className="ml-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-yellow-900 mb-1">⚠️ Watch For:</p>
                          <p className="text-xs text-yellow-800">{scenario.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-Ups - only show if no conversation flow */}
            {result.followUps && result.followUps.length > 0 && !result.conversationFlow && (
              <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-5 lg:p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Follow-Up Responses</h3>
                <p className="text-sm text-gray-600 mb-4">
                  If the dealer pushes back, here are responses you can use:
                </p>
                <div className="space-y-4">
                  {result.followUps.map((followUp, index) => (
                    <div
                      key={index}
                      className="bg-white border border-blue-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-gray-700 flex-1 whitespace-pre-wrap">
                          {followUp}
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            navigator.clipboard.writeText(followUp)
                            alert('Follow-up copied to clipboard!')
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Educational Hints */}
            {result.educationalHints && result.educationalHints.length > 0 && (
              <div className="bg-yellow-50/50 border border-yellow-200 rounded-lg p-5 lg:p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-3">What to Watch For</h3>
                <ul className="space-y-2.5">
                  {result.educationalHints.map((hint, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-yellow-600 mr-2.5 mt-0.5">⚠️</span>
                      <span className="text-sm text-gray-700 flex-1">{hint}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Key Points */}
            {result.keyPoints && result.keyPoints.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 lg:p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Key Points</h3>
                <ul className="space-y-2">
                  {result.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 mr-2 mt-1">•</span>
                      <span className="text-sm text-gray-700 flex-1">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tips */}
            {result.tips && result.tips.length > 0 && (
              <div className="bg-green-50/50 border border-green-200 rounded-lg p-5 lg:p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Additional Tips</h3>
                <ul className="space-y-2">
                  {result.tips.map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-600 mr-2 mt-1">💡</span>
                      <span className="text-sm text-gray-700 flex-1">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Financing Helper */}
            {showFinancingHelper && <FinancingHelper className="mt-6" />}

            <div className="flex gap-3">
              <Button onClick={() => setCurrentStep('communication_method')} variant="secondary">
                Start Over
              </Button>
              {onCancel && (
                <Button onClick={onCancel} variant="secondary">
                  Done
                </Button>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const currentStepIndex = steps.indexOf(currentStep)
  const progress = currentStep === 'results' ? 100 : ((currentStepIndex + 1) / steps.length) * 100

  return (
    <Card className="p-6 lg:p-8">
      {/* Pack badge */}
      {activePackId && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
              Active Pack: {packConfig?.name || activePackId}
            </span>
            {!packUnlocked && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                Locked - unlock to enable pack questions & prompts
              </span>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => router.push('/packs')}>
            Manage Packs
          </Button>
        </div>
      )}

      {packUnlocked && packConfig?.education && packConfig.education.length > 0 && (
        <Card className="mb-4 bg-blue-50 border-blue-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Pack Education</h3>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {packConfig.education.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Card>
      )}

      {currentStep !== 'results' && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStepIndex + 1} of {steps.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {loading && currentStep !== 'results' ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Generating your personalized script...</p>
        </div>
      ) : (
        <div>{renderStep()}</div>
      )}
    </Card>
  )
}

