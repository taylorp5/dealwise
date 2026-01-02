'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import Button from './ui/Button'
import Card from './ui/Card'
import { Copy, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

interface ResearchPageContentProps {
  mode?: 'free' | 'first-time' | 'in-person'
}

const supabase = createBrowserSupabaseClient()

export default function ResearchPageContent({ mode = 'free' }: ResearchPageContentProps) {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [listingUrl, setListingUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Load saved analysis from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageKey = `deal_plan_${mode}`
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.listingUrl && parsed.analysisResult) {
            setListingUrl(parsed.listingUrl)
            setAnalysisResult(parsed.analysisResult)
          }
        } catch (err) {
          console.error('Failed to load saved deal plan:', err)
        }
      }
    }
  }, [mode])

  // Save analysis result to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && analysisResult && listingUrl) {
      const storageKey = `deal_plan_${mode}`
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          listingUrl,
          analysisResult,
          timestamp: Date.now()
        }))
      } catch (err) {
        console.error('Failed to save deal plan:', err)
      }
    }
  }, [analysisResult, listingUrl, mode])

  // Guardrail messages for First-Time Buyer pack
  const guardrailMessages = [
    {
      title: 'Safe Opener',
      message: 'Hi, I\'m interested in this vehicle. Could you please send me a written itemized breakdown of the out-the-door price? I\'d like to see the sale price, taxes, doc fee, title/registration fees, and any add-ons all on one sheet. Thank you!',
    },
    {
      title: 'Clarify Add-ons',
      message: 'Thank you for the breakdown. Could you clarify which items are optional versus mandatory? If any add-ons are required, I\'d like to see the buyer\'s order or OTD worksheet in writing before we proceed. I want to make sure I understand the total cost clearly.',
    },
    {
      title: 'Disengage/Pause',
      message: 'Thank you for the information. I\'d like to review everything in writing and will follow up once I\'ve had a chance to go through the details. I appreciate your patience.',
    },
  ]

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!listingUrl.trim()) return

    setAnalyzing(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/analyze-listing', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          listingUrl,
          packVariant: mode === 'first-time' ? 'first_time' : mode === 'in-person' ? 'in_person' : 'free'
        }),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Analysis failed: HTTP ${response.status}. ${text.slice(0, 300)}`)
      }

      const data = await response.json()

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to analyze listing')
      }

      setAnalysisResult(data.data || data)
      setAnalyzing(false)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze listing')
      setAnalyzing(false)
    }
  }

  // Determine readiness verdict based on analysis result
  const getReadinessVerdict = () => {
    if (!analysisResult) return null

    // Check for confidence indicators
    const confidence = analysisResult.confidence || analysisResult.diagnostics?.confidence
    const hasPrice = analysisResult.price || analysisResult.askingPrice
    const hasVehicleInfo = analysisResult.year && analysisResult.make && analysisResult.model
    const hasIssues = analysisResult.issues && analysisResult.issues.length > 0
    const isBlocked = analysisResult.blocked || analysisResult.diagnostics?.blocked

    if (isBlocked || !hasPrice || !hasVehicleInfo) {
      return {
        status: 'not-ready',
        icon: XCircle,
        color: 'red',
        title: 'Not Ready — Missing Critical Info',
        message: 'We need more information to provide a complete assessment. Please use "Copy from Listing Page" or "Manual Entry" to provide vehicle details.',
      }
    }

    if (hasIssues || (confidence !== undefined && confidence < 0.7)) {
      return {
        status: 'caution',
        icon: AlertCircle,
        color: 'yellow',
        title: 'Proceed with Caution',
        message: 'Some information may be incomplete or unclear. Review the details carefully before proceeding.',
      }
    }

    return {
      status: 'ready',
      icon: CheckCircle2,
      color: 'green',
      title: 'Ready to Proceed',
      message: 'You have the key information needed. Review the assessment below before contacting the dealer.',
    }
  }

  const verdict = getReadinessVerdict()
  const VerdictIcon = verdict?.icon || CheckCircle2

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header - Different for First-Time Buyer */}
        {mode === 'first-time' ? (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Deal Readiness / Confidence Assessment
            </h1>
            <p className="text-lg text-gray-600">
              Expert review before you contact the dealer
            </p>
          </div>
        ) : (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Listing Analyzer</h1>
            <p className="text-lg text-gray-600">Analyze vehicle listings and get deal insights</p>
          </div>
        )}

        {/* Input Form */}
        <Card className="mb-8 p-6">
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label htmlFor="listing-url" className="block text-sm font-medium text-gray-700 mb-2">
                Listing URL
              </label>
              <input
                id="listing-url"
                type="url"
                value={listingUrl}
                onChange={(e) => setListingUrl(e.target.value)}
                placeholder="Paste vehicle listing URL here..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <Button type="submit" disabled={analyzing || !listingUrl.trim()}>
              {analyzing ? 'Analyzing...' : 'Analyze Listing'}
            </Button>
          </form>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-8 p-6 bg-red-50 border-red-200">
            <p className="text-red-800">{error}</p>
          </Card>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <div className="space-y-6">
            {/* Readiness Verdict - Only for First-Time Buyer */}
            {mode === 'first-time' && verdict && (
              <Card className={`p-6 ${
                verdict.color === 'red' ? 'bg-red-50 border-red-200' :
                verdict.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-start gap-4">
                  <VerdictIcon className={`w-6 h-6 flex-shrink-0 mt-1 ${
                    verdict.color === 'red' ? 'text-red-600' :
                    verdict.color === 'yellow' ? 'text-yellow-600' :
                    'text-green-600'
                  }`} />
                  <div>
                    <h2 className={`text-xl font-bold mb-2 ${
                      verdict.color === 'red' ? 'text-red-900' :
                      verdict.color === 'yellow' ? 'text-yellow-900' :
                      'text-green-900'
                    }`}>
                      {verdict.title}
                    </h2>
                    <p className={
                      verdict.color === 'red' ? 'text-red-800' :
                      verdict.color === 'yellow' ? 'text-yellow-800' :
                      'text-green-800'
                    }>{verdict.message}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Deal Plan / Assessment Results */}
            <Card className="p-6">
              {mode === 'first-time' ? (
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Deal Readiness Assessment</h2>
              ) : (
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Deal Plan</h2>
              )}

              {/* Display analysis results */}
              <div className="space-y-4">
                {analysisResult.price && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Asking Price: </span>
                    <span className="text-lg font-bold text-gray-900">
                      ${analysisResult.price.toLocaleString()}
                    </span>
                  </div>
                )}

                {analysisResult.year && analysisResult.make && analysisResult.model && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Vehicle: </span>
                    <span className="text-lg font-semibold text-gray-900">
                      {analysisResult.year} {analysisResult.make} {analysisResult.model}
                    </span>
                  </div>
                )}

                {analysisResult.otdEstimate && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Estimated Out-the-Door Price</h3>
                    <p className="text-2xl font-bold text-blue-900">
                      ${analysisResult.otdEstimate.total?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                )}

                {/* Additional analysis details can be displayed here */}
              </div>
            </Card>

            {/* Guardrail Messages - Only for First-Time Buyer */}
            {mode === 'first-time' && (
              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  If you proceed, send this (written only)
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Use these professional, beginner-safe messages when contacting the dealer. Copy and paste as needed.
                </p>
                <div className="space-y-4">
                  {guardrailMessages.map((guardrail, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{guardrail.title}</h3>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCopy(guardrail.message, index)}
                          className="flex items-center gap-2"
                        >
                          {copiedIndex === index ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {guardrail.message}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

