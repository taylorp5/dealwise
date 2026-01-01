'use client'

import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

const supabase = createBrowserSupabaseClient()
import { useRouter, useSearchParams } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import DealPlanDisplay from '@/components/DealPlanDisplay'
import ListingReviewStep from '@/components/ListingReviewStep'
import type { AnalyzeListingResponse, CompareOffersResponse } from '@/lib/types/api'
import { hasPack, hasAllAccess } from '@/lib/packs/entitlements'
import { usePackEntitlements } from '@/hooks/usePackEntitlements'

interface Offer {
  dealer: string
  price: number
  otdPrice?: number
  otdLow?: number
  otdHigh?: number
  mileage?: number
  year?: number
  notes?: string
  listingUrl?: string
  fromAnalysis?: boolean
}

interface ResearchPageContentProps {
  mode?: 'free' | 'first-time' | 'in-person'
}

export default function ResearchPageContent(props?: ResearchPageContentProps) {
  const mode = props?.mode
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { ownedPacks } = usePackEntitlements()
  const hasFirstTimePack = hasPack('first_time') || hasAllAccess()
  
  // Determine variant from mode prop or default to free
  const variant: 'free' | 'first_time' | 'in_person' = 
    mode === 'first-time' ? 'first_time' :
    mode === 'in-person' ? 'in_person' :
    'free'
  const [activeTab, setActiveTab] = useState<'analyze' | 'compare'>('analyze')
  const [inputMode, setInputMode] = useState<'url' | 'text' | 'manual'>('url')
  const [listingUrl, setListingUrl] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [manualData, setManualData] = useState<Partial<{
    year: number
    make: string
    model: string
    trim: string
    price: number
    mileage: number
    vehicleCondition: 'new' | 'used' | 'cpo' | 'unknown'
    vin: string
    dealerName: string
    dealerCity: string
    dealerState: string
    zip: string
  }>>({})
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisElapsed, setAnalysisElapsed] = useState(0) // Elapsed time in seconds
  const [analysisStatus, setAnalysisStatus] = useState<string>('') // Current status message
  const [analysisResult, setAnalysisResult] = useState<AnalyzeListingResponse['data'] | null>(null)
  const [extractedListing, setExtractedListing] = useState<any>(null) // Raw extraction data
  const [showReviewStep, setShowReviewStep] = useState(false)
  const [offers, setOffers] = useState<Offer[]>([])
  const [comparing, setComparing] = useState(false)
  const [compareResult, setCompareResult] = useState<CompareOffersResponse['data'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Buyer registration location (for tax calculation)
  const [registrationState, setRegistrationState] = useState('')
  const [registrationZip, setRegistrationZip] = useState('')
  
  // Handle comparison prefill from Deal Plan
  useEffect(() => {
    if (searchParams?.get('tab') === 'compare') {
      setActiveTab('compare')
      const prefill = localStorage.getItem('comparison_prefill')
      if (prefill) {
        try {
          const data = JSON.parse(prefill)
          setOffers((prev) => [
            ...prev,
            {
              dealer: data.dealer,
              price: data.price,
              otdLow: data.otdLow,
              otdHigh: data.otdHigh,
              notes: data.notes || '',
              listingUrl: data.listingUrl || listingUrl,
              fromAnalysis: true,
            },
          ])
          localStorage.removeItem('comparison_prefill')
        } catch (e) {
          console.error('Failed to parse comparison prefill', e)
        }
      }
    }
  }, [searchParams, listingUrl])

  // Timer for analysis progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (analyzing) {
      setAnalysisElapsed(0)
      setAnalysisStatus('Starting analysis...')
      interval = setInterval(() => {
        setAnalysisElapsed((prev) => {
          const newTime = prev + 1
          // Update status based on elapsed time
          if (newTime < 5) {
            setAnalysisStatus('Fetching listing page...')
          } else if (newTime < 15) {
            setAnalysisStatus('Extracting vehicle details...')
          } else {
            setAnalysisStatus('Generating deal plan...')
          }
          return newTime
        })
      }, 1000)
    } else {
      setAnalysisElapsed(0)
      setAnalysisStatus('')
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [analyzing])

  const handleAnalyzeListing = async (e: React.FormEvent) => {
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
          registrationState: registrationState || undefined,
          registrationZip: registrationZip || undefined,
        }),
      })

      // Check HTTP status before reading JSON
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Analyze failed: HTTP ${response.status}. ${text.slice(0, 300)}`)
      }

      const data: AnalyzeListingResponse = await response.json()

      // Verify success flag in response
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to analyze listing')
      }

      // Client-side debug log (dev mode only) - only log after verifying success
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('LISTING_EXTRACTION_DEBUG', {
          apiKeys: Object.keys(data ?? {}),
          success: data?.success,
          extractionResult: data?.extractionResult,
          diagnostics: data?.diagnostics,
          dealPlan: data?.data,
        })
      }

      // Check if we need to show review step
      // Show review step if:
      // 1. requiresUserInput flag is set, OR
      // 2. needsReview flag is set, OR
      // 3. dealPlan is null (blocked without confirmedData), OR
      // 4. extractionResult is blocked, OR
      // 5. diagnostics indicates blocked
      const isBlocked = data.diagnostics?.blocked || data.extractionResult?.blocked || false
      const needsReview = data.requiresUserInput || (data as any).needsReview || !data.data || isBlocked
      
      if (needsReview && (data.extractionResult || (data as any).extractedListing)) {
        const extracted = data.extractionResult || (data as any).extractedListing
        
        // Ensure sourceUrl is set
        const normalizedExtracted = {
          ...extracted,
          sourceUrl: extracted.sourceUrl || listingUrl,
          ...(data as any).listingData, // Merge with parsed data
        }
        
        setExtractedListing(normalizedExtracted)
        setShowReviewStep(true)
        setAnalyzing(false)
        return
      }
      
      // If dealPlan is null and blocked, show review step (paste/manual entry)
      if (!data.data && isBlocked) {
        const extracted = data.extractionResult || (data as any).extractedListing || {
          sourceUrl: listingUrl,
          blocked: true,
          confidence: 0,
          issues: ['Could not read this website automatically - please paste listing details or enter manually'],
        }
        
        setExtractedListing({
          ...extracted,
          sourceUrl: extracted.sourceUrl || listingUrl,
        })
        setShowReviewStep(true)
        setAnalyzing(false)
        return
      }
      
      // Also show review step if requiresUserInput is true (even if not explicitly blocked)
      if (data.requiresUserInput && !data.data) {
        const extracted = data.extractionResult || (data as any).extractedListing || {
          sourceUrl: listingUrl,
          blocked: true,
          confidence: 0,
          issues: ['Manual entry required - please paste listing details or enter manually'],
        }
        
        setExtractedListing({
          ...extracted,
          sourceUrl: extracted.sourceUrl || listingUrl,
        })
        setShowReviewStep(true)
        setAnalyzing(false)
        return
      }

      // Attach diagnostics to dealPlan for display
      if (data.data && data.diagnostics) {
        (data.data as any).diagnostics = data.diagnostics
      }

      setAnalysisResult(data.data)
      
      // Auto-add to offers with Deal Plan data
      if (data.data && data.data.targets?.askingPrice) {
        const dealerMatch = listingUrl.match(/https?:\/\/(?:www\.)?([^/]+)/)
        const dealer = dealerMatch ? dealerMatch[1].replace(/\.(com|net|org)/, '') : 'Dealer'
        
        setOffers((prev) => [
          ...prev,
          {
            dealer,
            price: data.data!.targets.askingPrice,
            otdLow: data.data!.otdEstimate.expectedOTD.low,
            otdHigh: data.data!.otdEstimate.expectedOTD.high,
            notes: `Target: $${data.data!.targets.acceptableDealPrice.toLocaleString()}`,
            listingUrl,
            fromAnalysis: true,
          },
        ])
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to analyze listing'
      setError(errorMsg)
      
      // Even on error, show manual input option if we have a URL
      if (listingUrl) {
        setExtractedListing({
          sourceUrl: listingUrl,
          blocked: true,
          confidence: 0,
          issues: [`Error: ${errorMsg}. Please enter listing details manually.`],
        })
        setShowReviewStep(true)
      }
    } finally {
      setAnalyzing(false)
    }
  }

  const addOfferFromAnalysis = () => {
    if (analysisResult && analysisResult.targets?.askingPrice && listingUrl) {
      const dealerMatch = listingUrl.match(/https?:\/\/(?:www\.)?([^/]+)/)
      const dealer = dealerMatch ? dealerMatch[1].replace(/\.(com|net|org)/, '') : 'Dealer'

      setOffers((prev) => [
        ...prev,
        {
          dealer,
          price: analysisResult.targets.askingPrice,
          otdLow: analysisResult.otdEstimate.expectedOTD.low,
          otdHigh: analysisResult.otdEstimate.expectedOTD.high,
          notes: `Target: $${analysisResult.targets.acceptableDealPrice.toLocaleString()}`,
          listingUrl,
          fromAnalysis: true,
        },
      ])
      setActiveTab('compare')
    }
  }

  const addOffer = () => {
    setOffers([...offers, { dealer: '', price: 0, notes: '' }])
  }

  const removeOffer = (index: number) => {
    setOffers(offers.filter((_, i) => i !== index))
  }

  const updateOffer = (index: number, field: keyof Offer, value: any) => {
    const updated = [...offers]
    updated[index] = { ...updated[index], [field]: value }
    setOffers(updated)
  }

  const handleCompareOffers = async (e: React.FormEvent) => {
    e.preventDefault()
    if (offers.length < 2) {
      setError('Please add at least 2 offers to compare')
      return
    }

    setComparing(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/compare-offers', {
        method: 'POST',
        headers,
        body: JSON.stringify({ offers }),
      })

      const data: CompareOffersResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to compare offers')
      }

      setCompareResult(data.data)
    } catch (err: any) {
      setError(err.message || 'Failed to compare offers')
    } finally {
      setComparing(false)
    }
  }

  const handleGenerateScript = () => {
    if (typeof window !== 'undefined') {
      // Save analysis data for script generator
      if (analysisResult) {
        localStorage.setItem('scriptCarContext', JSON.stringify(analysisResult))
      }
      // Save offers for competitive leverage
      if (offers.length > 0) {
        localStorage.setItem('competitiveOffers', JSON.stringify(offers))
      }
      router.push('/script')
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Research & Compare</h1>
          <p className="text-gray-600">
            Analyze listings and compare offers from multiple dealerships
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('analyze')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analyze'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analyze Listing
            </button>
            <button
              onClick={() => {
                console.log('Setting activeTab to compare')
                setActiveTab('compare')
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'compare'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Compare Offers
            </button>
          </nav>
        </div>

        {error && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
          </Card>
        )}

        {/* Analyze Tab */}
        {activeTab === 'analyze' ? (
          <Card className="p-6 lg:p-8">
            {/* Input Mode Toggle */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How would you like to provide the listing?
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="inputMode"
                    value="url"
                    checked={inputMode === 'url'}
                    onChange={(e) => setInputMode(e.target.value as 'url' | 'text' | 'manual')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Paste Listing URL</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="inputMode"
                    value="text"
                    checked={inputMode === 'text'}
                    onChange={(e) => setInputMode(e.target.value as 'url' | 'text' | 'manual')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Copy from Listing Page</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="inputMode"
                    value="manual"
                    checked={inputMode === 'manual'}
                    onChange={(e) => setInputMode(e.target.value as 'url' | 'text' | 'manual')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Manual Entry</span>
                </label>
              </div>
            </div>

            {inputMode === 'url' ? (
              <form onSubmit={handleAnalyzeListing} className="space-y-4">
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                    Listing URL
                  </label>
                  <input
                    type="url"
                    id="url"
                    value={listingUrl}
                    onChange={(e) => setListingUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Tip:</strong> Most Cars.com links will work automatically. For other dealer website links, we recommend using <strong>"Copy from Listing Page"</strong> or <strong>"Manual Entry"</strong> options above for more reliable results.
                    </p>
                  </div>
                </div>
                
                {/* Buyer Registration Location for Tax Calculation */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-blue-900">Buyer Registration Location</h3>
                      <p className="text-xs text-blue-700 mt-1">
                        Tax is calculated based on where you'll register the vehicle, not the dealer's location. This ensures accurate OTD estimates.
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="registrationState" className="block text-sm font-medium text-gray-700 mb-1">
                        Registration State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="registrationState"
                        value={registrationState}
                        onChange={(e) => setRegistrationState(e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="CA, TX, NY"
                        maxLength={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="registrationZip" className="block text-sm font-medium text-gray-700 mb-1">
                        Registration ZIP Code <span className="text-blue-600">(Recommended)</span>
                      </label>
                      <input
                        type="text"
                        id="registrationZip"
                        value={registrationZip}
                        onChange={(e) => setRegistrationZip(e.target.value.replace(/[^0-9-]/g, '').slice(0, 10))}
                        placeholder="90210"
                        maxLength={10}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        ZIP code provides more accurate tax rates (includes local taxes)
                      </p>
                    </div>
                  </div>
                </div>
                
                <Button type="submit" disabled={analyzing}>
                  {analyzing ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Analyzing... ({analysisElapsed}s)</span>
                    </span>
                  ) : (
                    'Analyze Listing'
                  )}
                </Button>
                {analyzing && analysisStatus && (
                  <div className="text-sm text-gray-600 mt-2">
                    <p className="font-medium">{analysisStatus}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      This usually takes 15-30 seconds. Please wait...
                    </p>
                  </div>
                )}
              </form>
            ) : inputMode === 'text' ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="pastedText" className="block text-sm font-medium text-gray-700 mb-2">
                    Paste Listing Details
                  </label>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <p className="font-medium text-blue-800 mb-1">Copy from Listing Page:</p>
                    <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                      <li>Go to the dealer listing page in your browser.</li>
                      <li>Select all content (Ctrl+A or Cmd+A).</li>
                      <li>Copy the selected content (Ctrl+C or Cmd+C).</li>
                      <li>Paste into the box below.</li>
                    </ol>
                  </div>
                  <textarea
                    id="pastedText"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste the listing page content here (Ctrl+V / Cmd+V). We'll extract price, mileage, year, make, model, condition, VIN, dealer name, and location automatically..."
                    className="w-full px-4 py-3 border-2 border-blue-300 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    We'll intelligently extract price (ignoring monthly payments), mileage, year/make/model, condition, VIN, dealer name, and location.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={async () => {
                    if (!pastedText.trim()) {
                      setError('Please paste some listing text first.')
                      return
                    }

                    try {
                      // Parse the pasted text
                      const { parseListingText } = await import('@/lib/extractors/cars')
                      const parsed = parseListingText(pastedText)
                      
                      console.log('PASTE_PARSE_RESULT', parsed)
                      
                      // Create extracted listing from parsed data
                      // Always use 'manual-paste' as sourceUrl to avoid using old listingUrl
                      const extracted = {
                        sourceUrl: 'manual-paste',
                        sourceSite: 'manual',
                        blocked: false,
                        ...parsed,
                      }
                      
                      setExtractedListing(extracted)
                      setShowReviewStep(true)
                      setError(null)
                    } catch (err: any) {
                      console.error('Failed to parse listing text:', err)
                      setError('Failed to parse listing text. Please try again or enter details manually.')
                    }
                  }}
                  disabled={!pastedText.trim()}
                >
                  🔍 Extract & Continue
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700">
                    Enter the vehicle details manually. Required fields are marked with <span className="text-red-500">*</span>.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vehicle Details */}
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Vehicle Details</h3>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={manualData.year || ''}
                      onChange={(e) => setManualData(prev => ({ ...prev, year: e.target.value ? parseInt(e.target.value) : undefined }))}
                      placeholder="2024"
                      min="1990"
                      max={new Date().getFullYear() + 1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Make <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualData.make || ''}
                      onChange={(e) => setManualData(prev => ({ ...prev, make: e.target.value || undefined }))}
                      placeholder="Toyota"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualData.model || ''}
                      onChange={(e) => setManualData(prev => ({ ...prev, model: e.target.value || undefined }))}
                      placeholder="Camry"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trim (optional)
                    </label>
                    <input
                      type="text"
                      value={manualData.trim || ''}
                      onChange={(e) => setManualData(prev => ({ ...prev, trim: e.target.value || undefined }))}
                      placeholder="XLE"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={manualData.price || ''}
                      onChange={(e) => setManualData(prev => ({ ...prev, price: e.target.value ? parseFloat(e.target.value) : undefined }))}
                      placeholder="25000"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mileage <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={manualData.mileage || ''}
                      onChange={(e) => setManualData(prev => ({ ...prev, mileage: e.target.value ? parseInt(e.target.value) : undefined }))}
                      placeholder="15000"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Condition <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={manualData.vehicleCondition || 'unknown'}
                      onChange={(e) => setManualData(prev => ({ ...prev, vehicleCondition: e.target.value as 'new' | 'used' | 'cpo' | 'unknown' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="unknown">Select condition...</option>
                      <option value="new">New</option>
                      <option value="used">Used</option>
                      <option value="cpo">Certified Pre-Owned (CPO)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      VIN (optional)
                    </label>
                    <input
                      type="text"
                      value={manualData.vin || ''}
                      onChange={(e) => setManualData(prev => ({ ...prev, vin: e.target.value.toUpperCase() || undefined }))}
                      placeholder="5TFDZ5BN1MX123456"
                      maxLength={17}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                  </div>
                  
                  {/* Dealer Details */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Dealer Information</h3>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dealer Name (optional)
                    </label>
                    <input
                      type="text"
                      value={manualData.dealerName || ''}
                      onChange={(e) => setManualData(prev => ({ ...prev, dealerName: e.target.value || undefined }))}
                      placeholder="Victory Toyota of Midtown"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City (optional)
                    </label>
                    <input
                      type="text"
                      value={manualData.dealerCity || ''}
                      onChange={(e) => setManualData(prev => ({ ...prev, dealerCity: e.target.value || undefined }))}
                      placeholder="Atlanta"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State (optional)
                    </label>
                    <input
                      type="text"
                      value={manualData.dealerState || ''}
                      onChange={(e) => setManualData(prev => ({ ...prev, dealerState: e.target.value.toUpperCase().slice(0, 2) || undefined }))}
                      placeholder="GA"
                      maxLength={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP (optional)
                    </label>
                    <input
                      type="text"
                      value={manualData.zip || ''}
                      onChange={(e) => setManualData(prev => ({ ...prev, zip: e.target.value || undefined }))}
                      placeholder="30309"
                      maxLength={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <Button
                  type="button"
                  onClick={async () => {
                    // Validate required fields
                    if (!manualData.year || !manualData.make || !manualData.model || !manualData.price || !manualData.mileage || !manualData.vehicleCondition || manualData.vehicleCondition === 'unknown') {
                      setError('Please fill in all required fields (Year, Make, Model, Price, Mileage, and Condition).')
                      return
                    }

                    try {
                      // Create extracted listing from manual data
                      // Always use 'manual-entry' as sourceUrl to avoid using old listingUrl
                      const extracted = {
                        sourceUrl: 'manual-entry',
                        sourceSite: 'manual',
                        blocked: false,
                        confidence: 1.0, // Manual entry is 100% confident
                        issues: [],
                        year: manualData.year,
                        make: manualData.make,
                        model: manualData.model,
                        trim: manualData.trim,
                        price: manualData.price,
                        mileage: manualData.mileage,
                        vehicleCondition: manualData.vehicleCondition,
                        vin: manualData.vin,
                        dealerName: manualData.dealerName,
                        dealerCity: manualData.dealerCity,
                        dealerState: manualData.dealerState,
                        zip: manualData.zip,
                      }
                      
                      setExtractedListing(extracted)
                      setShowReviewStep(true)
                      setError(null)
                    } catch (err: any) {
                      console.error('Failed to process manual entry:', err)
                      setError('Failed to process manual entry. Please try again.')
                    }
                  }}
                  disabled={!manualData.year || !manualData.make || !manualData.model || !manualData.price || !manualData.mileage || !manualData.vehicleCondition || manualData.vehicleCondition === 'unknown'}
                >
                  Continue to Deal Plan
                </Button>
              </div>
            )}

            {showReviewStep && extractedListing && (
              <ListingReviewStep
                listingData={extractedListing}
                 onConfirm={async (confirmedData) => {
                   // Re-analyze with confirmed data
                   setShowReviewStep(false)
                   setAnalyzing(true)
                   setAnalysisElapsed(0) // Reset timer
                   setAnalysisStatus('Generating deal plan from confirmed data...')
                   try {
                    const { data: { session } } = await supabase.auth.getSession()
                    const headers: HeadersInit = { 'Content-Type': 'application/json' }
                    if (session?.access_token) {
                      headers['Authorization'] = `Bearer ${session.access_token}`
                    }

                      // Determine the listing URL to use
                      // Prefer extractedListing.sourceUrl (which will be 'manual-paste' or 'manual-entry' for paste/manual)
                      // Only use listingUrl state if extractedListing doesn't have a sourceUrl (shouldn't happen)
                      const urlToUse = extractedListing?.sourceUrl || listingUrl || 'manual-paste'
                      
                      const response = await fetch('/api/analyze-listing', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                          listingUrl: urlToUse,
                          registrationState: registrationState || undefined,
                          registrationZip: registrationZip || undefined,
                          confirmedData, // Pass confirmed data - this is the source of truth
                        }),
                      })

                    // Check if response is OK before parsing JSON
                    if (!response.ok) {
                      const errorText = await response.text()
                      throw new Error(`HTTP ${response.status}: ${errorText}`)
                    }

                    const data: AnalyzeListingResponse = await response.json()
                    
                    // Client-side debug log for confirm re-analyze path
                    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
                      console.log('LISTING_EXTRACTION_DEBUG (Confirmed)', {
                        apiKeys: Object.keys(data ?? {}),
                        success: data?.success,
                        extractionResult: data?.extractionResult,
                        diagnostics: data?.diagnostics,
                        dealPlan: data?.data,
                        confirmedData,
                      })
                    }
                    
                    if (!data.success) {
                      throw new Error(data.error || 'Failed to analyze listing')
                    }

                    // Attach diagnostics to dealPlan for display
                    if (data.data && data.diagnostics) {
                      (data.data as any).diagnostics = data.diagnostics
                    }

                    setAnalysisResult(data.data)
                  } catch (err: any) {
                    setError(err.message || 'Failed to analyze listing')
                  } finally {
                    setAnalyzing(false)
                  }
                }}
                onCancel={() => {
                  setShowReviewStep(false)
                  setExtractedListing(null)
                }}
                blocked={extractedListing.blocked}
              />
            )}

            {/* Show progress indicator when generating deal plan after confirmation */}
            {!showReviewStep && analyzing && !analysisResult && (
              <Card className="mt-6 p-8">
                <div className="text-center">
                  <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating Your Deal Plan</h3>
                  <p className="text-sm text-gray-600 mb-1">
                    {analysisStatus || 'Processing your listing details...'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Elapsed time: {analysisElapsed}s
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    This usually takes 15-30 seconds. Please wait...
                  </p>
                </div>
              </Card>
            )}

            {!showReviewStep && analysisResult && (
              <DealPlanDisplay
                dealPlan={analysisResult}
                listingUrl={listingUrl}
                onAddToComparison={addOfferFromAnalysis}
                diagnostics={(analysisResult as any).diagnostics}
                variant={variant}
              />
            )}
          </Card>
        ) : null}

        {/* Compare Tab - Coming Soon */}
        {activeTab === 'compare' && (
          <Card key="compare-tab" className="text-center py-16">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-4">
                <svg
                  className="w-10 h-10 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h2>
              <p className="text-lg text-gray-600 mb-4">Research & Compare</p>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                We're building a powerful tool to help you compare multiple offers from different dealerships. 
                This feature will help you identify the best deal and negotiate with confidence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => setActiveTab('analyze')}>
                  Analyze a Listing
                </Button>
                <Button variant="secondary" onClick={() => router.push('/copilot/free')}>
                  Try Negotiation Draft Builder
                </Button>
              </div>
            </div>
          </Card>
        )}
        
        {/* OLD Compare Tab Code - Removed - All old comparison functionality has been replaced with Coming Soon */}
      </div>
    </div>
  )
}

