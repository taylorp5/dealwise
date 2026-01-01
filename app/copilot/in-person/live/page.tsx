'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useEntitlements } from '@/hooks/useEntitlements'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import DealStateCard from '@/components/copilot/inPerson/DealStateCard'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

const supabase = createBrowserSupabaseClient()

interface AdvisorResponse {
  whatsReallyHappening: string
  whyThisMatters: string
  yourBestMove: string
  exactlyWhatToSay: string
  confidenceSignal: string
}

export default function BetweenRoundsAdvisorPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { loading: entitlementsLoading, hasInPerson } = useEntitlements()
  
  // Entitlement guard - wait for entitlements to load before checking
  useEffect(() => {
    if (!authLoading && !entitlementsLoading && !hasInPerson) {
      router.push('/copilot/free')
    }
  }, [authLoading, entitlementsLoading, hasInPerson, router])

  // Prepare Me State (unchanged)
  const [vehiclePrice, setVehiclePrice] = useState('')
  const [targetOTD, setTargetOTD] = useState('')
  const [walkAwayOTD, setWalkAwayOTD] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')

  // Advisor State
  const [userInput, setUserInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [advisorResponse, setAdvisorResponse] = useState<AdvisorResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dealerOTD, setDealerOTD] = useState<number | null>(null)

  // Load Prepare Me state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('copilot_in_person_prepare_state')
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState)
          if (parsed.vehiclePrice) setVehiclePrice(parsed.vehiclePrice)
          if (parsed.targetOTD) setTargetOTD(parsed.targetOTD)
          if (parsed.walkAwayOTD) setWalkAwayOTD(parsed.walkAwayOTD)
          if (parsed.state) setState(parsed.state)
        } catch (e) {
          console.error('Failed to parse saved state:', e)
        }
      }
    }
  }, [])

  // Save Prepare Me state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && (vehiclePrice || targetOTD || walkAwayOTD || state)) {
      const stateToSave = {
        vehiclePrice,
        targetOTD,
        walkAwayOTD,
        state,
        zip,
      }
      localStorage.setItem('copilot_in_person_prepare_state', JSON.stringify(stateToSave))
    }
  }, [vehiclePrice, targetOTD, walkAwayOTD, state, zip])

  const handleUpdateDealState = (updates: {
    vehiclePrice?: string
    targetOTD?: string
    walkAwayOTD?: string
    state?: string
    zip?: string
  }) => {
    if (updates.vehiclePrice !== undefined) setVehiclePrice(updates.vehiclePrice)
    if (updates.targetOTD !== undefined) setTargetOTD(updates.targetOTD)
    if (updates.walkAwayOTD !== undefined) setWalkAwayOTD(updates.walkAwayOTD)
    if (updates.state !== undefined) setState(updates.state)
    if (updates.zip !== undefined) setZip(updates.zip)
  }

  const handleDealerOTDChange = (value: number | null) => {
    // Store dealer OTD for advisor context (used silently in API call)
    setDealerOTD(value)
  }

  const handleAskAdvisor = async () => {
    if (!userInput.trim()) {
      setError('Please describe what just happened')
      return
    }

    setGenerating(true)
    setError(null)
    setAdvisorResponse(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const targetOTDNum = parseFloat(targetOTD) || 0
      const walkAwayNum = parseFloat(walkAwayOTD) || (targetOTDNum > 0 ? targetOTDNum + 1000 : 0)
      const vehiclePriceNum = parseFloat(vehiclePrice) || 0

      const payload = {
        mode: 'between_rounds_advisor',
        userInput: userInput.trim(),
        context: {
          vehiclePrice: vehiclePriceNum,
          targetOTD: targetOTDNum,
          walkAwayOTD: walkAwayNum,
          dealerOTD: dealerOTD || undefined,
          state: state.trim().toUpperCase() || undefined,
        },
      }

      const response = await fetch('/api/copilot/in-person/advisor', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to get advice: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to get advice')
      }

      setAdvisorResponse(data.data)
    } catch (err: any) {
      setError(err.message || 'Failed to get advice')
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back to Mode Picker */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <Button
            onClick={() => router.push('/copilot/in-person')}
            variant="secondary"
            size="sm"
          >
            ← Back to In-Person Pack
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Deal Decision Advisor</h1>
          <p className="text-gray-600">
            Clear next steps after stepping away from the salesperson.
          </p>
        </div>

        {/* Prepare Me Section - Unchanged */}
        <Card className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Prepare Me</h2>
          <p className="text-sm text-gray-600 mb-4">
            Set your numbers before you negotiate. The advisor uses these silently to give you better guidance.
          </p>
          
          <DealStateCard
            dealerOTD={dealerOTD}
            targetOTD={targetOTDNum}
            walkAwayOTD={parseFloat(walkAwayOTD) || targetOTDNum + 1000}
            onDealerOTDChange={handleDealerOTDChange}
            onUpdate={() => {
              // State is already updated via onDealerOTDChange when user types
              // This button is just for visual confirmation
            }}
            disabled={generating}
          />
        </Card>

        {/* Advisor Input */}
        <Card className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">What Just Happened?</h2>
          <p className="text-sm text-gray-600 mb-4">
            Paste what the dealer said or describe the situation. Dollar amounts are optional.
          </p>
          
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Example: 'They said the OTD is $28,500 but I need $27,000. They keep asking about monthly payments.'"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
            rows={5}
            disabled={generating}
          />

          <Button
            onClick={handleAskAdvisor}
            disabled={generating || !userInput.trim()}
            className="w-full mt-4 text-lg py-6 font-semibold"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Analyzing situation...
              </span>
            ) : (
              'Get Decision'
            )}
          </Button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </Card>

        {/* Advisor Output - Decision Cards (Not Chat) */}
        {advisorResponse && !generating && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Section 1: Situation Diagnosis */}
            <Card className="bg-blue-50 border-2 border-blue-300">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  🔍
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-2">Situation Diagnosis</h3>
                  <p className="text-sm text-gray-800 leading-relaxed font-medium">
                    {advisorResponse.whatsReallyHappening}
                  </p>
                </div>
              </div>
            </Card>

            {/* Section 2: Why This Matters */}
            <Card className="bg-red-50 border-2 border-red-300">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  ⚠️
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-2">Why This Matters</h3>
                  <p className="text-sm text-gray-800 leading-relaxed font-medium">
                    {advisorResponse.whyThisMatters}
                  </p>
                </div>
              </div>
            </Card>

            {/* Section 3: Correct Move */}
            <Card className="bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/40 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                  ✅
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-2">Correct Move</h3>
                  <p className="text-base text-gray-900 leading-relaxed font-semibold">
                    {advisorResponse.yourBestMove}
                  </p>
                </div>
              </div>
            </Card>

            {/* Section 4: Say This (Exact Script) */}
            <Card className="bg-white border-2 border-primary/30 shadow-md">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                  🗣️
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-2">Say This (Exact Script)</h3>
                </div>
              </div>
              <div className="bg-slate-50 border-2 border-slate-300 rounded-lg p-4 ml-11">
                <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap font-medium">
                  {advisorResponse.exactlyWhatToSay}
                </p>
                <Button
                  onClick={() => copyToClipboard(advisorResponse.exactlyWhatToSay)}
                  variant="primary"
                  size="sm"
                  className="mt-4"
                >
                  📋 Copy Script
                </Button>
              </div>
            </Card>

            {/* Section 5: Confidence Check */}
            <Card className="bg-green-50 border-2 border-green-300">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  🧠
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-2">Confidence Check</h3>
                  <p className="text-sm text-gray-800 leading-relaxed font-medium italic">
                    {advisorResponse.confidenceSignal}
                  </p>
                </div>
              </div>
            </Card>

            {/* Why This Isn't ChatGPT Block */}
            <Card className="bg-slate-100 border-2 border-slate-300 mt-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Why this is different than asking ChatGPT</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <p className="text-xs text-gray-700">Uses your exact negotiation numbers</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <p className="text-xs text-gray-700">Applies dealership-specific tactics</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <p className="text-xs text-gray-700">Makes a single clear decision for you</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <p className="text-xs text-gray-700">Tells you exactly what to say — no prompt engineering</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Helper Note */}
        <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-xs text-slate-600 italic text-center">
            💡 This decision advisor is designed for between conversations, not live negotiation. Step away from the salesperson to use it.
          </p>
        </div>
      </div>
    </div>
  )
}
