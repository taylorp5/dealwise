'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { ListingData } from '@/lib/types/listing'

interface ListingReviewStepProps {
  listingData: Partial<ListingData>
  onConfirm: (data: Partial<ListingData>) => void
  onCancel: () => void
  blocked?: boolean
}

export default function ListingReviewStep({
  listingData,
  onConfirm,
  onCancel,
  blocked,
}: ListingReviewStepProps) {
  const [editedData, setEditedData] = useState<Partial<ListingData>>(listingData)
  const [showDebug, setShowDebug] = useState(false)
  const [dealerNameCandidates, setDealerNameCandidates] = useState<Array<{ name: string; score: number }>>([])
  const [locationCandidates, setLocationCandidates] = useState<Array<{ city?: string; state?: string; zip?: string; score: number }>>([])
  
  // Initialize candidates from listingData.raw if available
  useEffect(() => {
    if (listingData.raw?.dealerNameCandidates) {
      setDealerNameCandidates(listingData.raw.dealerNameCandidates.map((c: any) => ({ name: c.name, score: c.score })))
    }
    if (listingData.raw?.locationCandidates) {
      setLocationCandidates(listingData.raw.locationCandidates.map((c: any) => ({ 
        city: c.city, 
        state: c.state, 
        zip: c.zip, 
        score: c.score 
      })))
    }
  }, [listingData])

  const handleFieldChange = (field: keyof ListingData, value: any) => {
    setEditedData((prev) => ({ ...prev, [field]: value }))
  }

  const confidence = listingData.confidence ?? 0
  const isLowConfidence = confidence < 0.75
  const hasPriceConflict = listingData.issues?.some(issue => 
    issue.includes('price conflict') || issue.includes('Multiple price')
  )
  
  // Check if fetch was blocked or failed
  const isBlocked = listingData.blocked || blocked
  const fetchInfo = (listingData as any).fetchInfo || {}
  const fetchStatus = fetchInfo.fetchStatus ?? -1
  const errorType = fetchInfo.errorType
  const errorMessage = fetchInfo.errorMessage
  const blockReason = fetchInfo.blockReason
  
  // Show clear message if blocked
  const getBlockMessage = () => {
    if (!isBlocked) return null
    
    if (fetchStatus === -1) {
      // Network error
      const errorMsg = errorMessage || 'Network error'
      const errorTypeMsg = errorType ? ` (${errorType})` : ''
      return `Couldn't read this dealer site${errorTypeMsg}: ${errorMsg}. Please paste listing text or enter details manually.`
    } else if (fetchStatus === 403 || fetchStatus === 429) {
      // HTTP block
      const reason = blockReason === 'rate_limited' ? 'rate limited' : 
                    blockReason === 'cloudflare' ? 'blocked by Cloudflare' :
                    blockReason === 'captcha' ? 'captcha required' :
                    'blocked'
      return `This dealer site is ${reason} (HTTP ${fetchStatus}). Please paste listing text or enter details manually.`
    } else {
      return `Couldn't read this dealer site (blocked). Please paste listing text or enter details manually.`
    }
  }
  
  const blockMessage = getBlockMessage()
  const requiresConfirmation = blocked || isLowConfidence || hasPriceConflict || listingData.sourceSite === 'other'

  return (
    <Card className="p-6 mb-6">
      {blocked && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-base font-semibold text-blue-900 mb-2">
            📋 Copy from Listing Page
          </p>
          <p className="text-sm text-blue-800 mb-3">
            This dealer site can't be read automatically. No worries — just copy the listing details from the page and paste them below.
          </p>
          <div className="bg-white border border-blue-200 rounded p-3 text-sm text-blue-900">
            <p className="font-medium mb-1">How to copy:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Go to the dealer listing page</li>
              <li>Select all (Ctrl+A / Cmd+A) or highlight the listing details</li>
              <li>Copy (Ctrl+C / Cmd+C)</li>
              <li>Paste into the box below</li>
            </ol>
          </div>
        </div>
      )}

      {requiresConfirmation && !blocked && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-yellow-800 mb-2">
            ⚠️ Please Confirm Listing Details
            {isLowConfidence && ` (Confidence: ${(confidence * 100).toFixed(0)}%)`}
            {hasPriceConflict && ' - Price conflict detected'}
            {listingData.sourceSite === 'other' && ' - Non-Cars.com source'}
          </p>
          <p className="text-sm text-yellow-700">
            We extracted the following information, but please verify all fields are correct before continuing.
          </p>
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {isBlocked ? 'Enter Listing Details' : 'Review Extracted Listing Data'}
      </h3>
      
      {isBlocked && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-base font-semibold text-blue-900 mb-2">
            This dealer site can't be read automatically.
          </p>
          <p className="text-sm text-blue-800">
            No worries — paste the listing details or enter the basics and we'll build your deal plan.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Price candidates selector */}
        {listingData.raw?.priceCandidates && listingData.raw.priceCandidates.length > 1 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">Price Candidates (click to select):</p>
            <div className="space-y-2">
              {listingData.raw.priceCandidates.slice(0, 3).map((candidate: any, i: number) => (
                <button
                  key={i}
                  onClick={() => handleFieldChange('price', candidate.value)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                    editedData.price === candidate.value
                      ? 'border-blue-500 bg-blue-100'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">${candidate.value.toLocaleString()}</p>
                      <p className="text-xs text-gray-600">{candidate.label}</p>
                      <p className="text-xs text-gray-500 mt-1">"{candidate.context.substring(0, 60)}..."</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-700">Score: {candidate.score.toFixed(0)}</p>
                      {candidate.isLikelyMonthlyPayment && (
                        <span className="text-xs text-red-600">⚠️ Monthly</span>
                      )}
                      {candidate.isLikelyMsrp && (
                        <span className="text-xs text-yellow-600">MSRP</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={editedData.price || ''}
              onChange={(e) => handleFieldChange('price', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 23450"
              min="2000"
              max="250000"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the sale price (not monthly payment, MSRP, or down payment)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              type="number"
              value={editedData.year || ''}
              onChange={(e) => handleFieldChange('year', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
            <input
              type="text"
              value={editedData.make || ''}
              onChange={(e) => handleFieldChange('make', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input
              type="text"
              value={editedData.model || ''}
              onChange={(e) => handleFieldChange('model', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trim</label>
            <input
              type="text"
              value={editedData.trim || ''}
              onChange={(e) => handleFieldChange('trim', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mileage</label>
            <input
              type="number"
              value={editedData.mileage || ''}
              onChange={(e) => handleFieldChange('mileage', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition <span className="text-red-500">*</span>
            </label>
            <select
              value={editedData.vehicleCondition || 'unknown'}
              onChange={(e) => handleFieldChange('vehicleCondition', e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="unknown">Unknown</option>
              <option value="new">New</option>
              <option value="used">Used</option>
              <option value="cpo">Certified Pre-Owned</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
            <input
              type="text"
              value={editedData.vin || ''}
              onChange={(e) => handleFieldChange('vin', e.target.value.toUpperCase() || undefined)}
              maxLength={17}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dealer Name</label>
            <input
              type="text"
              value={editedData.dealerName || ''}
              onChange={(e) => handleFieldChange('dealerName', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Victory Toyota Midtown"
            />
            {dealerNameCandidates.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-600 mb-1">Detected:</p>
                <div className="flex flex-wrap gap-2">
                  {dealerNameCandidates.slice(0, 3).map((candidate, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleFieldChange('dealerName', candidate.name)}
                      className={`text-xs px-2 py-1 rounded border ${
                        editedData.dealerName === candidate.name
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {candidate.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={editedData.dealerCity || ''}
              onChange={(e) => handleFieldChange('dealerCity', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Atlanta"
            />
            {locationCandidates.length > 0 && locationCandidates.some(c => c.city) && (
              <div className="mt-2">
                <p className="text-xs text-gray-600 mb-1">Detected:</p>
                <div className="flex flex-wrap gap-2">
                  {locationCandidates.filter(c => c.city).slice(0, 3).map((candidate, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        handleFieldChange('dealerCity', candidate.city)
                        if (candidate.state) handleFieldChange('dealerState', candidate.state)
                        if (candidate.zip) handleFieldChange('zip', candidate.zip)
                      }}
                      className={`text-xs px-2 py-1 rounded border ${
                        editedData.dealerCity === candidate.city
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {candidate.city}{candidate.state ? `, ${candidate.state}` : ''}{candidate.zip ? ` ${candidate.zip}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              type="text"
              value={editedData.dealerState || ''}
              onChange={(e) => handleFieldChange('dealerState', e.target.value.toUpperCase() || undefined)}
              maxLength={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
              placeholder="e.g., GA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
            <input
              type="text"
              value={editedData.zip || ''}
              onChange={(e) => handleFieldChange('zip', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 30309"
            />
          </div>
        </div>

        <div className={isBlocked ? 'mb-6 border-2 border-blue-300 rounded-lg p-4 bg-blue-50' : 'mb-6'}>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            {isBlocked ? (
              <>
                📋 Paste Listing Details Here
                <span className="ml-2 text-xs font-normal text-gray-600">(Required when blocked)</span>
              </>
            ) : (
              'Or Paste Listing Text / HTML (fallback)'
            )}
          </label>
          <textarea
            placeholder={isBlocked 
              ? "Paste the listing page content here (Ctrl+V / Cmd+V). We'll extract price, mileage, year, make, model, condition, VIN, dealer name, and location automatically..."
              : "Paste listing details or page source here (price, mileage, year, make, model, dealer, location, etc.)..."
            }
            className={`w-full px-3 py-2 border ${isBlocked ? 'border-blue-400 bg-white' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[180px] font-mono text-sm`}
            id="paste-textarea"
          />
          <div className="mt-3 flex items-center gap-3">
            <Button
              type="button"
              variant={isBlocked ? 'primary' : 'secondary'}
              onClick={async () => {
                const textarea = document.getElementById('paste-textarea') as HTMLTextAreaElement
                const pastedText = textarea?.value
                if (pastedText) {
                  try {
                    const { parseListingText } = await import('@/lib/utils/parse-listing-text')
                    const parsed = parseListingText(pastedText)
                    
                    // Debug: log parsed result
                    console.log('PASTE_PARSE_RESULT', parsed)
                    
                    // Extract data and confidence separately
                    const dataFields = parsed.data
                    const confidenceScores = parsed.confidence
                    
                    // Show what was found
                    const foundFields = Object.keys(dataFields).filter(k => dataFields[k as keyof typeof dataFields] !== undefined && dataFields[k as keyof typeof dataFields] !== null)
                    const foundCount = foundFields.length
                    
                    if (foundCount === 0) {
                      alert('Could not extract any data from the pasted text. Please fill in the fields manually.')
                      return
                    }
                    
                    // Update form fields - explicitly map all fields to ensure they're set
                    setEditedData((prev) => {
                      const updated = {
                        ...prev,
                        // Explicitly set each field from parsed data (don't overwrite with undefined)
                        dealerName: dataFields.dealerName ?? prev.dealerName,
                        dealerCity: dataFields.dealerCity ?? prev.dealerCity,
                        dealerState: dataFields.dealerState ?? prev.dealerState,
                        zip: dataFields.zip ?? prev.zip,
                        year: dataFields.year ?? prev.year,
                        make: dataFields.make ?? prev.make,
                        model: dataFields.model ?? prev.model,
                        trim: dataFields.trim ?? prev.trim,
                        price: dataFields.price ?? prev.price,
                        mileage: dataFields.mileage ?? prev.mileage,
                        vehicleCondition: dataFields.vehicleCondition ?? prev.vehicleCondition,
                        vin: dataFields.vin ?? prev.vin,
                      }
                      
                      return updated
                    })
                    
                    // Show success message with details
                    let message = `✅ Extracted ${foundCount} field${foundCount > 1 ? 's' : ''}: ${foundFields.join(', ')}`
                    if (dataFields.price) {
                      message += `\n💰 Price: $${dataFields.price.toLocaleString()}`
                    }
                    if (dataFields.dealerName) {
                      message += `\n🏢 Dealer: ${dataFields.dealerName}`
                    }
                    if (dataFields.dealerCity || dataFields.dealerState) {
                      message += `\n📍 Location: ${[dataFields.dealerCity, dataFields.dealerState].filter(Boolean).join(', ')}`
                    }
                    if (dataFields.zip) {
                      message += ` ${dataFields.zip}`
                    }
                    const confidenceAvg = Object.values(confidenceScores).length > 0
                      ? Object.values(confidenceScores).filter(c => c === 'high').length / Object.keys(confidenceScores).length
                      : 0
                    if (confidenceAvg > 0) {
                      message += `\n\nConfidence: ${(confidenceAvg * 100).toFixed(0)}%`
                    }
                    message += '\n\nPlease review and edit the fields above before continuing.'
                    
                    alert(message)
                  } catch (err) {
                    console.warn('Failed to parse listing text:', err)
                    alert('Could not automatically parse the text. Please fill in the fields manually.')
                  }
                } else {
                  alert('Please paste some text first.')
                }
              }}
            >
              {isBlocked ? '🔍 Extract & Auto-fill' : 'Auto-fill from Pasted Text'}
            </Button>
            {isBlocked && (
              <p className="text-xs text-gray-600">
                We'll intelligently extract price (ignoring monthly payments), mileage, year/make/model, condition, VIN, dealer name, and location.
              </p>
            )}
          </div>
        </div>

        {listingData.issues && listingData.issues.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900 mb-1">Issues Detected:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              {listingData.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button 
            variant="primary"
            onClick={() => {
              // Validate required fields
              if (!editedData.price || editedData.price < 2000 || editedData.price > 250000) {
                alert('Please enter a valid price between $2,000 and $250,000')
                return
              }
              if (!editedData.vehicleCondition || editedData.vehicleCondition === 'unknown') {
                alert('Please select the vehicle condition (New, Used, or CPO)')
                return
              }
              if (editedData.vehicleCondition === 'used' || editedData.vehicleCondition === 'cpo') {
                if (!editedData.mileage || editedData.mileage < 0) {
                  alert('Mileage is required for used or CPO vehicles')
                  return
                }
              }
              onConfirm(editedData)
            }}
            disabled={requiresConfirmation && !editedData.price}
          >
            {isBlocked ? '✅ Confirm & Generate Deal Plan' : (requiresConfirmation ? 'Confirm & Generate Deal Plan' : 'Generate Deal Plan')}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        {requiresConfirmation && !editedData.price && (
          <p className="text-sm text-red-600 mt-2">
            ⚠️ Price is required to continue
          </p>
        )}

        {/* Debug section - dev only */}
        {(() => {
          if (typeof window === 'undefined') return null
          const { isDevUIEnabled } = require('@/lib/utils/dev-ui')
          if (!isDevUIEnabled()) return null
          return (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {showDebug ? '▼' : '▶'} Debug Info
              </button>
              {showDebug && (
                <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs space-y-2">
                  <p className="font-medium mb-2">Extraction Details:</p>
                  <p>Confidence: {(confidence * 100).toFixed(0)}%</p>
                  
                  {/* Fetch diagnostics */}
                  {(listingData as any).fetchInfo && (
                    <div>
                      <p className="font-medium">Fetch Info:</p>
                      <p className="text-gray-600">Final URL: {(listingData as any).fetchInfo.finalUrl || listingData.sourceUrl}</p>
                      {(listingData as any).fetchInfo.pageTitle && (
                        <p className="text-gray-600">Page Title: "{(listingData as any).fetchInfo.pageTitle}"</p>
                      )}
                      {(listingData as any).fetchInfo.pagePreview && (
                        <p className="text-gray-600">Preview: "{(listingData as any).fetchInfo.pagePreview}..."</p>
                      )}
                    </div>
                  )}
                  
                  {listingData.raw?.platform && (
                    <div>
                      <p className="font-medium">Platform:</p>
                      <p className="text-gray-600">{listingData.raw.platform}</p>
                    </div>
                  )}
                  
                  {listingData.raw?.strategies && (
                    <div>
                      <p className="font-medium">Strategies Used:</p>
                      <p className="text-gray-600">{listingData.raw.strategies.join(' → ')}</p>
                      <p className="text-gray-500 mt-1">
                        Winner: <strong>{listingData.raw.strategies[0] || 'none'}</strong>
                      </p>
                    </div>
                  )}
                  
                  {listingData.raw?.priceCandidates && listingData.raw.priceCandidates.length > 0 && (
                    <div>
                      <p className="font-medium">Price Candidates (Ranked):</p>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {listingData.raw.priceCandidates.map((candidate: any, i: number) => (
                          <li key={i} className={i === 0 ? 'font-semibold' : ''}>
                            ${candidate.value.toLocaleString()} ({candidate.label}) - Score: {candidate.score.toFixed(0)}
                            {candidate.isLikelyMonthlyPayment && <span className="text-red-600 ml-1">⚠️ Monthly</span>}
                            {candidate.isLikelyMsrp && <span className="text-yellow-600 ml-1">MSRP</span>}
                            {candidate.isLikelyConditional && <span className="text-orange-600 ml-1">Conditional</span>}
                            <br />
                            <span className="text-gray-500 text-xs ml-4">"{candidate.context.substring(0, 60)}..."</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {listingData.raw?.mileageCandidates && listingData.raw.mileageCandidates.length > 0 && (
                    <div>
                      <p className="font-medium">Mileage Candidates:</p>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {listingData.raw.mileageCandidates.map((candidate: any, i: number) => (
                          <li key={i}>
                            {candidate.value.toLocaleString()} mi ({candidate.label}) - Score: {candidate.score.toFixed(0)}
                            <br />
                            <span className="text-gray-500 text-xs ml-4">"{candidate.context.substring(0, 50)}..."</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <details className="mt-2">
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800">Full Raw Data</summary>
                    <pre className="mt-2 text-xs overflow-auto max-h-40 bg-white p-2 rounded border">
                      {JSON.stringify(listingData.raw, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </Card>
  )
}

