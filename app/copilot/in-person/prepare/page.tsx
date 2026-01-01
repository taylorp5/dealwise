'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useEntitlements } from '@/hooks/useEntitlements'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

type PrepareStep = 1 | 2 | 3 | 4 | 5 | 6

interface PrepareState {
  step: PrepareStep
  completedSteps: PrepareStep[]
  // Step 1 data
  vehiclePrice: string
  targetOTD: string
  walkAwayOTD: string
  state: string
  // Computed ladder
  ladderAsk: number
  ladderAgree: number
  ladderWalk: number
}

export default function InPersonPreparePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { loading: entitlementsLoading, hasInPerson } = useEntitlements()
  
  // Entitlement guard - wait for entitlements to load before checking
  useEffect(() => {
    if (!authLoading && !entitlementsLoading && !hasInPerson) {
      router.push('/copilot/free')
    }
  }, [authLoading, entitlementsLoading, hasInPerson, router])

  const [currentStep, setCurrentStep] = useState<PrepareStep>(1)
  const [completedSteps, setCompletedSteps] = useState<PrepareStep[]>([])
  
  // Step 1 data
  const [vehiclePrice, setVehiclePrice] = useState('')
  const [targetOTD, setTargetOTD] = useState('')
  const [walkAwayOTD, setWalkAwayOTD] = useState('')
  const [state, setState] = useState('')
  
  // Computed ladder
  const [ladderAsk, setLadderAsk] = useState<number>(0)
  const [ladderAgree, setLadderAgree] = useState<number>(0)
  const [ladderWalk, setLadderWalk] = useState<number>(0)

  // Load state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('copilot_in_person_prepare_state')
      if (savedState) {
        try {
          const parsed: PrepareState = JSON.parse(savedState)
          setCurrentStep(parsed.step || 1)
          setCompletedSteps(parsed.completedSteps || [])
          if (parsed.vehiclePrice) setVehiclePrice(parsed.vehiclePrice)
          if (parsed.targetOTD) setTargetOTD(parsed.targetOTD)
          if (parsed.walkAwayOTD) setWalkAwayOTD(parsed.walkAwayOTD)
          if (parsed.state) setState(parsed.state)
          if (parsed.ladderAsk) setLadderAsk(parsed.ladderAsk)
          if (parsed.ladderAgree) setLadderAgree(parsed.ladderAgree)
          if (parsed.ladderWalk) setLadderWalk(parsed.ladderWalk)
        } catch (e) {
          console.error('Failed to parse saved state:', e)
        }
      }
    }
  }, [])

  // Save state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stateToSave: PrepareState = {
        step: currentStep,
        completedSteps,
        vehiclePrice,
        targetOTD,
        walkAwayOTD,
        state,
        ladderAsk,
        ladderAgree,
        ladderWalk,
      }
      localStorage.setItem('copilot_in_person_prepare_state', JSON.stringify(stateToSave))
    }
  }, [currentStep, completedSteps, vehiclePrice, targetOTD, walkAwayOTD, state, ladderAsk, ladderAgree, ladderWalk])

  // Compute ladder when targetOTD changes
  useEffect(() => {
    const target = parseFloat(targetOTD)
    if (!isNaN(target) && target > 0) {
      setLadderAgree(target)
      setLadderAsk(target + 500) // Small cushion
      const walk = parseFloat(walkAwayOTD) || target + 1000
      setLadderWalk(walk)
    }
  }, [targetOTD, walkAwayOTD])

  const handleStepComplete = (step: PrepareStep) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step])
    }
  }

  const handleStepUncomplete = (step: PrepareStep) => {
    setCompletedSteps(completedSteps.filter(s => s !== step))
  }

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep((currentStep + 1) as PrepareStep)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as PrepareStep)
    }
  }

  const handleOpenLiveCoach = () => {
    // Prefill live coach with prepare data
    if (typeof window !== 'undefined') {
      const liveState = {
        step: 0,
        vehiclePrice: parseFloat(vehiclePrice) || 0,
        targetOTD: parseFloat(targetOTD) || 0,
        walkAwayOTD: parseFloat(walkAwayOTD) || parseFloat(targetOTD) + 1000 || 0,
        stateCode: state,
        ladder: {
          ask: ladderAsk || parseFloat(targetOTD) + 500 || 0,
          agree: ladderAgree || parseFloat(targetOTD) || 0,
          walk: ladderWalk || parseFloat(walkAwayOTD) || parseFloat(targetOTD) + 1000 || 0,
          locked: true,
        },
      }
      localStorage.setItem('copilot_in_person_live_state', JSON.stringify(liveState))
    }
    router.push('/copilot/in-person/live')
  }

  const handlePrint = () => {
    window.print()
  }

  if (authLoading || entitlementsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mb-4"></div>
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

  if (!hasInPerson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">In-Person Negotiation Pack required</p>
          <a href="/packs" className="text-blue-600 hover:text-blue-700">View Packs</a>
        </div>
      </div>
    )
  }

  const targetOTDNum = parseFloat(targetOTD) || 0
  const isStep1Complete = targetOTDNum > 0 && state.trim().length === 2

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-break {
            page-break-after: always;
          }
        }
      `}</style>
      {/* Back to Mode Picker */}
      <div className="bg-white border-b border-gray-200 no-print">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <button
            onClick={() => router.push('/copilot/in-person')}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            ← Back to Mode Picker
          </button>
        </div>
      </div>

      {/* Progress Header */}
      <div className="bg-white border-b border-gray-200 mb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Prepare Me</h1>
            <Button
              onClick={handlePrint}
              variant="secondary"
              size="sm"
              className="no-print"
            >
              📄 Print / Save Checklist
            </Button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5, 6].map((step) => {
              const stepNum = step as PrepareStep
              const isActive = currentStep === stepNum
              const isCompleted = completedSteps.includes(stepNum)
              
              return (
                <div key={step} className="flex items-center flex-shrink-0">
                  <button
                    onClick={() => setCurrentStep(stepNum)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-orange-600 text-white' 
                        : isCompleted 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }
                      cursor-pointer hover:opacity-80
                    `}
                  >
                    <span className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${isActive 
                        ? 'bg-white text-orange-600' 
                        : isCompleted 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-300 text-gray-600'
                      }
                    `}>
                      {isCompleted ? '✓' : step}
                    </span>
                    <span className="hidden sm:inline">Step {step}</span>
                  </button>
                  {step < 6 && (
                    <div className={`
                      w-8 h-0.5 mx-1
                      ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}
                    `} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* STEP 1: Set Your Numbers */}
        {currentStep === 1 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Step 1: Set Your Numbers</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={completedSteps.includes(1)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleStepComplete(1)
                    } else {
                      handleStepUncomplete(1)
                    }
                  }}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-gray-700">Done</span>
              </label>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Price (optional)
                </label>
                <input
                  type="number"
                  value={vehiclePrice}
                  onChange={(e) => setVehiclePrice(e.target.value)}
                  placeholder="Enter vehicle price if known"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Target OTD *
                </label>
                <input
                  type="number"
                  value={targetOTD}
                  onChange={(e) => setTargetOTD(e.target.value)}
                  placeholder="Enter target OTD"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Walk-Away Ceiling (optional)
                </label>
                <input
                  type="number"
                  value={walkAwayOTD}
                  onChange={(e) => setWalkAwayOTD(e.target.value)}
                  placeholder={targetOTDNum > 0 ? `Default: $${targetOTDNum + 1000}` : 'Enter if you have a hard limit'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">If dealer goes above this, you walk away</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  placeholder="State code (e.g., CA)"
                  maxLength={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Negotiation Ladder */}
            {targetOTDNum > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Negotiation Ladder</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">ASK:</span>
                    <span className="font-medium">${(targetOTDNum + 500).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">AGREE:</span>
                    <span className="font-medium text-green-600">${targetOTDNum.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">WALK:</span>
                    <span className="font-medium text-red-600">
                      ${(parseFloat(walkAwayOTD) || targetOTDNum + 1000).toLocaleString()}
                    </span>
                  </div>
                </div>
                {!walkAwayOTD && (
                  <p className="text-xs text-blue-600 mt-2 italic">
                    💡 Tip: Set a walk-away ceiling to protect yourself from overspending.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleNext}
                disabled={!isStep1Complete}
                className="flex-1"
              >
                Next: Your First Ask
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 2: Your First Ask */}
        {currentStep === 2 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Step 2: Your First Ask</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={completedSteps.includes(2)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleStepComplete(2)
                    } else {
                      handleStepUncomplete(2)
                    }
                  }}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-gray-700">Done</span>
              </label>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Purpose</h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Get the full out-the-door breakdown in writing before any negotiation</li>
                  <li>See all fees, taxes, and add-ons on one sheet</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">What to Do</h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Ask for the buyer's order / OTD worksheet printed or emailed</li>
                  <li>Request it includes: sale price, taxes, doc fee, title/registration, every add-on</li>
                  <li>Don't discuss numbers until you have it in writing</li>
                </ul>
              </div>

              <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Say This:</h3>
                <p className="text-base font-bold text-gray-900">
                  "Can you print the buyer's order / OTD worksheet with sale price, taxes, doc fee, title/registration, and every add-on? I want the full out-the-door number on one sheet."
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Common Dealer Move</h3>
                <p className="text-sm text-gray-700 mb-2">
                  "Come in to discuss numbers" or "Let's talk monthly payment first"
                </p>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">What You Do</h3>
                <p className="text-sm text-gray-700">
                  "I need the written OTD breakdown first. Can you email it to me?"
                </p>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-sm font-semibold text-red-900 mb-2">Red Flags</h3>
                <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                  <li>They refuse to give written OTD</li>
                  <li>They push monthly payment talk before OTD</li>
                  <li>They say "come in and we'll work it out"</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleBack}
                variant="secondary"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1"
              >
                Next: Fees & Add-ons
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 3: Fees & Add-ons */}
        {currentStep === 3 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Step 3: Fees & Add-ons</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={completedSteps.includes(3)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleStepComplete(3)
                    } else {
                      handleStepUncomplete(3)
                    }
                  }}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-gray-700">Done</span>
              </label>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Purpose</h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Challenge unnecessary fees and add-ons</li>
                  <li>Keep focus on total OTD, not individual line items</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">What to Do</h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Review the OTD breakdown for add-ons (warranty, protection, etc.)</li>
                  <li>Ask which are removable</li>
                  <li>If they say "mandatory", ask to reduce sale price to hit your target OTD</li>
                </ul>
              </div>

              <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Say This:</h3>
                <p className="text-base font-bold text-gray-900">
                  "Which add-ons are removable? If they're mandatory, let's adjust the sale price to hit my target OTD of ${targetOTDNum > 0 ? targetOTDNum.toLocaleString() : 'X'}."
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Common Dealer Move</h3>
                <p className="text-sm text-gray-700 mb-2">
                  "These add-ons are mandatory" or "Everyone pays these fees"
                </p>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">What You Do</h3>
                <p className="text-sm text-gray-700">
                  "If they're fixed, reduce the sale price to keep OTD at my target."
                </p>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-sm font-semibold text-red-900 mb-2">Red Flags</h3>
                <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                  <li>They won't show which add-ons are removable</li>
                  <li>They add fees after you agree to a price</li>
                  <li>They say "everyone pays this" without explanation</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleBack}
                variant="secondary"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1"
              >
                Next: Monthly Payment Trap
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 4: Monthly Payment Trap */}
        {currentStep === 4 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Step 4: Monthly Payment Trap</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={completedSteps.includes(4)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleStepComplete(4)
                    } else {
                      handleStepUncomplete(4)
                    }
                  }}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-gray-700">Done</span>
              </label>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Purpose</h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Avoid the monthly payment trap that hides total cost</li>
                  <li>Keep focus on OTD until it's locked</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">What to Do</h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Refuse to discuss monthly payments until OTD is agreed</li>
                  <li>Redirect every payment question back to OTD</li>
                  <li>Don't let them stretch the loan term to lower monthly</li>
                </ul>
              </div>

              <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Say This:</h3>
                <p className="text-base font-bold text-gray-900">
                  "I'm not discussing monthly payments yet. What's the out-the-door price?"
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Common Dealer Move</h3>
                <p className="text-sm text-gray-700 mb-2">
                  "What monthly payment are you comfortable with?"
                </p>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">What You Do</h3>
                <p className="text-sm text-gray-700">
                  "I'm focused on total OTD. Once we agree on that, we can talk financing."
                </p>
              </div>

              <div className="p-3 bg-red-50 border-red-200 rounded-lg">
                <h3 className="text-sm font-semibold text-red-900 mb-2">Red Flags</h3>
                <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                  <li>They keep pushing monthly payment talk</li>
                  <li>They stretch loan term to make payment seem lower</li>
                  <li>They won't give OTD until you discuss payments</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleBack}
                variant="secondary"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1"
              >
                Next: Manager + Urgency
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 5: Manager + Urgency Tactics */}
        {currentStep === 5 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Step 5: Manager + Urgency Tactics</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={completedSteps.includes(5)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleStepComplete(5)
                    } else {
                      handleStepUncomplete(5)
                    }
                  }}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-gray-700">Done</span>
              </label>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Purpose</h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Handle pressure tactics without weakening your position</li>
                  <li>Stay calm and repeat your number</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">What to Do</h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>When manager joins, repeat your target OTD clearly</li>
                  <li>Use silence - don't fill the air with explanations</li>
                  <li>If they create urgency ("someone else is interested"), stay firm</li>
                </ul>
              </div>

              <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Say This:</h3>
                <p className="text-base font-bold text-gray-900">
                  "If you can do ${targetOTDNum > 0 ? `$${targetOTDNum.toLocaleString()}` : '$X'} OTD, I'm ready to move forward now."
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Common Dealer Move</h3>
                <p className="text-sm text-gray-700 mb-2">
                  "Let me get my manager" or "Someone else is looking at this car"
                </p>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">What You Do</h3>
                <p className="text-sm text-gray-700">
                  Repeat your target OTD. Stay silent. Don't explain or justify.
                </p>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-sm font-semibold text-red-900 mb-2">Red Flags</h3>
                <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                  <li>They create fake urgency to pressure you</li>
                  <li>Manager "can't go lower" but won't show you why</li>
                  <li>They ask you to sign before showing final OTD</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleBack}
                variant="secondary"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1"
              >
                Next: Switch to Live Coach
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 6: When to Switch to Live Coach */}
        {currentStep === 6 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Step 6: When to Switch to Live Coach</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={completedSteps.includes(6)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleStepComplete(6)
                    } else {
                      handleStepUncomplete(6)
                    }
                  }}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-gray-700">Done</span>
              </label>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Purpose</h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Know when to switch from preparation to real-time coaching</li>
                  <li>Get situation-specific guidance during active negotiation</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Switch to Live Coach If:</h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
                  <li>They give you a counter offer</li>
                  <li>They add fees or add-ons you didn't expect</li>
                  <li>Manager joins and tactics escalate</li>
                  <li>They pressure you to sign today</li>
                  <li>Trade-in offer seems low</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Live Coach Will:</h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Give you exact talk tracks for the current situation</li>
                  <li>Help you update deal state as negotiation progresses</li>
                  <li>Provide real-time guidance based on dealer's moves</li>
                </ul>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <Button
                  onClick={handleOpenLiveCoach}
                  className="w-full"
                  variant="primary"
                >
                  Open Live Coach
                </Button>
                <p className="text-xs text-gray-600 mt-2 text-center">
                  Your numbers from Step 1 will be pre-filled
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleBack}
                variant="secondary"
                className="flex-1"
              >
                Back
              </Button>
            </div>
          </Card>
        )}

        {/* Rules of the Room */}
        <Card className="mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Rules of the Room</h3>
          <ul className="space-y-2">
            <li className="flex items-start text-sm text-gray-700">
              <span className="text-orange-600 font-bold mr-2">1.</span>
              <span>OTD is the only number that matters. Everything else is noise.</span>
            </li>
            <li className="flex items-start text-sm text-gray-700">
              <span className="text-orange-600 font-bold mr-2">2.</span>
              <span>Get everything in writing before you agree to anything.</span>
            </li>
            <li className="flex items-start text-sm text-gray-700">
              <span className="text-orange-600 font-bold mr-2">3.</span>
              <span>Silence is powerful. Repeat your number and wait.</span>
            </li>
            <li className="flex items-start text-sm text-gray-700">
              <span className="text-orange-600 font-bold mr-2">4.</span>
              <span>If they won't give written OTD, walk away.</span>
            </li>
            <li className="flex items-start text-sm text-gray-700">
              <span className="text-orange-600 font-bold mr-2">5.</span>
              <span>You can always walk. There are other cars and other dealers.</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
