'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import Button from './ui/Button'
import Card from './ui/Card'
import { Link as LinkIcon, FileText, PenTool } from 'lucide-react'
import DealPlanDisplay from './DealPlanDisplay'
import ListingReviewStep from './ListingReviewStep'
import type { DealPlan } from '@/lib/types/api'
import type { ListingData } from '@/lib/types/listing'

interface ResearchPageContentProps {
  mode?: 'free' | 'first-time' | 'in-person'
}

const supabase = createBrowserSupabaseClient()

type EntryMethod = 'url' | 'paste' | 'manual'

export default function ResearchPageContent({ mode = 'free' }: ResearchPageContentProps) {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [entryMethod, setEntryMethod] = useState<EntryMethod>('url')
  const [listingUrl, setListingUrl] = useState('')
  const [pasteText, setPasteText] = useState('')
  // Manual entry fields
  const [manualYear, setManualYear] = useState('')
  const [manualMake, setManualMake] = useState('')
  const [manualModel, setManualModel] = useState('')
  const [manualPrice, setManualPrice] = useState('')
  const [manualMileage, setManualMileage] = useState('')
  const [manualCondition, setManualCondition] = useState<'new' | 'used' | 'cpo' | 'unknown'>('used')
  const [manualTrim, setManualTrim] = useState('')
  const [manualVin, setManualVin] = useState('')
  const [manualDealerName, setManualDealerName] = useState('')
  const [manualDealerCity, setManualDealerCity] = useState('')
  const [manualDealerState, setManualDealerState] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<DealPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showReviewStep, setShowReviewStep] = useState(false)
  const [reviewListingData, setReviewListingData] = useState<Partial<ListingData> | null>(null)
  const [reviewBlocked, setReviewBlocked] = useState(false)
  const [diagnostics, setDiagnostics] = useState<any>(null)

  // Map mode to variant for DealPlanDisplay
  const variant = mode === 'first-time' ? 'first_time' : mode === 'in-person' ? 'in_person' : 'free'

  // Clear all input state when switching entry methods
  useEffect(() => {
    setError(null)
    // Don't clear the current method's input, but clear others
    if (entryMethod !== 'url') setListingUrl('')
    if (entryMethod !== 'paste') setPasteText('')
    if (entryMethod !== 'manual') {
      setManualYear('')
      setManualMake('')
      setManualModel('')
      setManualPrice('')
      setManualMileage('')
      setManualCondition('used')
      setManualTrim('')
      setManualVin('')
      setManualDealerName('')
      setManualDealerCity('')
      setManualDealerState('')
    }
  }, [entryMethod])

  // Only load saved analysis if user explicitly wants to continue (not on mount)
  // For now, we'll clear on mount to prevent stale data
  useEffect(() => {
    // Clear any stale results on mount
    setAnalysisResult(null)
    setError(null)
    setShowReviewStep(false)
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

  // Validation functions
  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url.trim())
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  const validateInput = (): { valid: boolean; error: string | null } => {
    if (entryMethod === 'url') {
      const url = listingUrl.trim()
      if (!url) {
        return { valid: false, error: 'Please enter a listing URL' }
      }
      if (!isValidUrl(url)) {
        return { valid: false, error: 'Please enter a valid URL (must start with http:// or https://)' }
      }
      return { valid: true, error: null }
    } else if (entryMethod === 'paste') {
      const text = pasteText.trim()
      if (!text) {
        return { valid: false, error: 'Please paste listing details' }
      }
      if (text.length < 40) {
        return { valid: false, error: 'Please paste more listing details (at least 40 characters)' }
      }
      return { valid: true, error: null }
    } else if (entryMethod === 'manual') {
      // Required fields: year, make, model, price, mileage, condition
      if (!manualYear.trim()) {
        return { valid: false, error: 'Please enter the vehicle year' }
      }
      if (!manualMake.trim()) {
        return { valid: false, error: 'Please enter the vehicle make' }
      }
      if (!manualModel.trim()) {
        return { valid: false, error: 'Please enter the vehicle model' }
      }
      if (!manualPrice.trim()) {
        return { valid: false, error: 'Please enter the vehicle price' }
      }
      const price = parseFloat(manualPrice)
      if (isNaN(price) || price <= 0) {
        return { valid: false, error: 'Please enter a valid price (greater than 0)' }
      }
      if (!manualMileage.trim()) {
        return { valid: false, error: 'Please enter the vehicle mileage' }
      }
      const mileage = parseFloat(manualMileage)
      if (isNaN(mileage) || mileage < 0) {
        return { valid: false, error: 'Please enter a valid mileage (0 or greater)' }
      }
      return { valid: true, error: null }
    }
    return { valid: false, error: 'Please select an entry method' }
  }

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    // Validate input before proceeding
    const validation = validateInput()
    if (!validation.valid) {
      setError(validation.error || 'Please provide listing information')
      return
    }
    
    setAnalyzing(true)
    setError(null)
    setShowReviewStep(false)
    setReviewListingData(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      // Determine the input based on entry method
      let requestBody: any = {
        packVariant: mode === 'first-time' ? 'first_time' : mode === 'in-person' ? 'in_person' : 'free'
      }

      if (entryMethod === 'url') {
        requestBody.listingUrl = listingUrl.trim()
      } else if (entryMethod === 'paste') {
        requestBody.listingUrl = pasteText.trim()
      } else if (entryMethod === 'manual') {
        // Manual entry - construct confirmedData from form fields
        requestBody.listingUrl = 'manual://entry'
        requestBody.confirmedData = {
          year: parseInt(manualYear),
          make: manualMake.trim(),
          model: manualModel.trim(),
          price: parseFloat(manualPrice),
          mileage: parseFloat(manualMileage),
          vehicleCondition: manualCondition,
          trim: manualTrim.trim() || undefined,
          vin: manualVin.trim() || undefined,
          dealerName: manualDealerName.trim() || undefined,
          dealerCity: manualDealerCity.trim() || undefined,
          dealerState: manualDealerState.trim() || undefined,
        }
      }

      const response = await fetch('/api/analyze-listing', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Analysis failed: HTTP ${response.status}. ${text.slice(0, 300)}`)
      }

      const data = await response.json()

      if (!data?.success) {
        // Check if we need to show review step
        if (data?.requiresUserInput && data?.extractedListing) {
          setReviewListingData(data.extractedListing)
          setReviewBlocked(data.extractedListing.blocked || false)
          setShowReviewStep(true)
          setDiagnostics(data.diagnostics)
          setAnalyzing(false)
          return
        }
        throw new Error(data?.error || 'Failed to analyze listing')
      }

      // Success - we have a deal plan
      if (data.data?.dealPlan) {
        setAnalysisResult(data.data.dealPlan)
        setDiagnostics(data.data.diagnostics)
      } else if (data.dealPlan) {
        setAnalysisResult(data.dealPlan)
        setDiagnostics(data.diagnostics)
      } else {
        setAnalysisResult(data.data || data)
      }
      
      setAnalyzing(false)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze listing')
      setAnalyzing(false)
    }
  }

  const handleReviewConfirm = async (confirmedData: Partial<ListingData>) => {
    setShowReviewStep(false)
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
          listingUrl: listingUrl || pasteText || 'manual://entry',
          packVariant: mode === 'first-time' ? 'first_time' : mode === 'in-person' ? 'in_person' : 'free',
          confirmedData,
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

      if (data.data?.dealPlan) {
        setAnalysisResult(data.data.dealPlan)
        setDiagnostics(data.data.diagnostics)
      } else if (data.dealPlan) {
        setAnalysisResult(data.dealPlan)
        setDiagnostics(data.diagnostics)
      } else {
        setAnalysisResult(data.data || data)
      }
      
      setAnalyzing(false)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze listing')
      setAnalyzing(false)
    }
  }

  const handleReviewCancel = () => {
    setShowReviewStep(false)
    setReviewListingData(null)
    setReviewBlocked(false)
  }

  const handleAddToComparison = () => {
    // Navigate to comparison page with pre-filled data
    if (analysisResult && listingUrl) {
      const vehicleInfo = (analysisResult as any).vehicleInfo || {}
      const link = {
        url: listingUrl,
        price: analysisResult.targets?.askingPrice || 0,
        vehicle: `${vehicleInfo.year || ''} ${vehicleInfo.make || ''} ${vehicleInfo.model || ''}`.trim(),
      }
      localStorage.setItem('comparison_prefill', JSON.stringify(link))
      window.location.href = '/research?tab=compare'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header - Different for First-Time Buyer */}
        {mode === 'first-time' ? (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Deal Readiness Assessment
            </h1>
            <p className="text-lg text-gray-600">
              Expert review before you contact the dealer
            </p>
          </div>
        ) : mode === 'in-person' ? (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Listing Analyzer</h1>
            <p className="text-lg text-gray-600">Analyze vehicle listings and prepare for in-person negotiation</p>
          </div>
        ) : (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Listing Analyzer</h1>
            <p className="text-lg text-gray-600">Analyze vehicle listings and get deal insights</p>
          </div>
        )}

        {/* Entry Method Selection */}
        {!analysisResult && !showReviewStep && (
          <Card className="mb-8 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose how to enter listing</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setEntryMethod('url')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    entryMethod === 'url'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <LinkIcon className={`w-6 h-6 mb-2 ${entryMethod === 'url' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <h3 className="font-semibold text-gray-900 mb-1">Paste Listing URL</h3>
                  <p className="text-sm text-gray-600">Paste the URL from the dealer listing page</p>
                </button>

                <button
                  type="button"
                  onClick={() => setEntryMethod('paste')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    entryMethod === 'paste'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <FileText className={`w-6 h-6 mb-2 ${entryMethod === 'paste' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <h3 className="font-semibold text-gray-900 mb-1">Copy from Listing Page</h3>
                  <p className="text-sm text-gray-600">Copy and paste listing details from the page</p>
                </button>

                <button
                  type="button"
                  onClick={() => setEntryMethod('manual')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    entryMethod === 'manual'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <PenTool className={`w-6 h-6 mb-2 ${entryMethod === 'manual' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <h3 className="font-semibold text-gray-900 mb-1">Manual Entry</h3>
                  <p className="text-sm text-gray-600">Enter vehicle details manually</p>
                </button>
              </div>
            </div>

            {/* Entry Form Based on Selected Method */}
            <form onSubmit={handleAnalyze} className="space-y-4">
              {entryMethod === 'url' && (
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
              )}

              {entryMethod === 'paste' && (
                <div>
                  <label htmlFor="paste-text" className="block text-sm font-medium text-gray-700 mb-2">
                    Paste Listing Details
                  </label>
                  <textarea
                    id="paste-text"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste listing details here (price, year, make, model, mileage, dealer, location, etc.)..."
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    required
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Tip: Select all (Ctrl+A / Cmd+A) on the listing page, then copy and paste here
                  </p>
                </div>
              )}

              {entryMethod === 'manual' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      Enter the vehicle details below. Fields marked with <span className="text-red-500">*</span> are required.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="manual-year" className="block text-sm font-medium text-gray-700 mb-2">
                        Year <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="manual-year"
                        type="number"
                        value={manualYear}
                        onChange={(e) => setManualYear(e.target.value)}
                        placeholder="e.g., 2020"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="manual-make" className="block text-sm font-medium text-gray-700 mb-2">
                        Make <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="manual-make"
                        type="text"
                        value={manualMake}
                        onChange={(e) => setManualMake(e.target.value)}
                        placeholder="e.g., Honda"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="manual-model" className="block text-sm font-medium text-gray-700 mb-2">
                        Model <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="manual-model"
                        type="text"
                        value={manualModel}
                        onChange={(e) => setManualModel(e.target.value)}
                        placeholder="e.g., Civic"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="manual-price" className="block text-sm font-medium text-gray-700 mb-2">
                        Price ($) <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="manual-price"
                        type="number"
                        value={manualPrice}
                        onChange={(e) => setManualPrice(e.target.value)}
                        placeholder="e.g., 23450"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Sale price (not monthly payment)</p>
                    </div>

                    <div>
                      <label htmlFor="manual-mileage" className="block text-sm font-medium text-gray-700 mb-2">
                        Mileage <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="manual-mileage"
                        type="number"
                        value={manualMileage}
                        onChange={(e) => setManualMileage(e.target.value)}
                        placeholder="e.g., 45000"
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="manual-condition" className="block text-sm font-medium text-gray-700 mb-2">
                        Condition <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="manual-condition"
                        value={manualCondition}
                        onChange={(e) => setManualCondition(e.target.value as 'new' | 'used' | 'cpo' | 'unknown')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="used">Used</option>
                        <option value="new">New</option>
                        <option value="cpo">Certified Pre-Owned (CPO)</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="manual-trim" className="block text-sm font-medium text-gray-700 mb-2">
                        Trim (optional)
                      </label>
                      <input
                        id="manual-trim"
                        type="text"
                        value={manualTrim}
                        onChange={(e) => setManualTrim(e.target.value)}
                        placeholder="e.g., EX-L"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="manual-vin" className="block text-sm font-medium text-gray-700 mb-2">
                        VIN (optional)
                      </label>
                      <input
                        id="manual-vin"
                        type="text"
                        value={manualVin}
                        onChange={(e) => setManualVin(e.target.value.toUpperCase())}
                        placeholder="e.g., 1HGBH41JXMN109186"
                        maxLength={17}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label htmlFor="manual-dealer-name" className="block text-sm font-medium text-gray-700 mb-2">
                        Dealer Name (optional)
                      </label>
                      <input
                        id="manual-dealer-name"
                        type="text"
                        value={manualDealerName}
                        onChange={(e) => setManualDealerName(e.target.value)}
                        placeholder="e.g., ABC Motors"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="manual-dealer-city" className="block text-sm font-medium text-gray-700 mb-2">
                        Dealer City (optional)
                      </label>
                      <input
                        id="manual-dealer-city"
                        type="text"
                        value={manualDealerCity}
                        onChange={(e) => setManualDealerCity(e.target.value)}
                        placeholder="e.g., Chicago"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="manual-dealer-state" className="block text-sm font-medium text-gray-700 mb-2">
                        Dealer State (optional)
                      </label>
                      <input
                        id="manual-dealer-state"
                        type="text"
                        value={manualDealerState}
                        onChange={(e) => setManualDealerState(e.target.value.toUpperCase())}
                        placeholder="e.g., IL"
                        maxLength={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Error message above button */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <Button type="submit" disabled={analyzing}>
                {analyzing ? 'Analyzing...' : 'Analyze Listing'}
              </Button>
            </form>
          </Card>
        )}

        {/* Review Step */}
        {showReviewStep && reviewListingData && (
          <ListingReviewStep
            listingData={reviewListingData}
            onConfirm={handleReviewConfirm}
            onCancel={handleReviewCancel}
            blocked={reviewBlocked}
          />
        )}

        {/* Error Display */}
        {error && (
          <Card className="mb-8 p-6 bg-red-50 border-red-200">
            <p className="text-red-800">{error}</p>
          </Card>
        )}

        {/* Analysis Results - Use DealPlanDisplay */}
        {analysisResult && !showReviewStep && (
          <DealPlanDisplay
            dealPlan={analysisResult}
            listingUrl={listingUrl || pasteText || 'manual://entry'}
            onAddToComparison={handleAddToComparison}
            diagnostics={diagnostics}
            variant={variant}
          />
        )}
      </div>
    </div>
  )
}
