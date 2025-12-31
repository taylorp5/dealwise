import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { AnalyzeListingRequest, AnalyzeListingResponse, DealPlan } from '@/lib/types/api'
import { buildListingAnalyzerSystemPrompt, buildListingAnalyzerUserPrompt } from '@/lib/prompts/listing-analyzer'
import { parseListingUrl } from '@/lib/utils/listing-parser'
import { extractListing } from '@/lib/extractors/router'
import { resolveTaxRate } from '@/lib/utils/tax-lookup'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Support Authorization header (Bearer token) and cookie session
    const authHeader = request.headers.get('authorization')
    let userId: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const {
        data: { user },
      } = await supabase.auth.getUser(token)
      if (user) userId = user.id
    }

    if (!userId) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) userId = session.user.id
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body: AnalyzeListingRequest = await request.json()

    if (!body.listingUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing listingUrl' },
        { status: 400 }
      )
    }
    
    // Parse listing URL to extract vehicle information
    const url = body.listingUrl
    const isManualEntry = url === 'manual-paste' || url === 'manual-entry'
    let listingData: {
      price?: number
      year?: number
      make?: string
      model?: string
      trim?: string
      mileage?: number
      location?: string
      state?: string
      vehicleCondition?: 'new' | 'used' | 'cpo' | 'unknown'
      vin?: string
      dealerName?: string
      dealerCity?: string
      dealerState?: string
      zip?: string
    } = {}
    let extractedListing: any = null
    let blocked = false
    
    // If confirmed data is provided OR this is manual entry, use it directly (user reviewed/edited)
    if (body.confirmedData || isManualEntry) {
      // For manual entry, confirmedData should always be provided, but use what we have
      const dataToUse = body.confirmedData || {}
      
      listingData = {
        ...listingData,
        ...dataToUse,
        // Ensure state is set from dealerState if provided
        state: (dataToUse as any).dealerState || (dataToUse as any).state || listingData.state,
      }
      // Create extraction result from confirmed data
      extractedListing = {
        sourceUrl: url,
        sourceSite: isManualEntry ? 'manual' : 'other',
        ...dataToUse,
        confidence: 1.0, // High confidence since user confirmed
        issues: [],
      } as ListingData
      blocked = false
      
      // Log for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Using confirmed/manual data:', { url, isManualEntry, hasConfirmedData: !!body.confirmedData, listingData })
      }
    } else if (!isManualEntry) {
      // Try to fetch and extract from any dealership URL (skip if manual entry)
      try {
        // Fetch HTML
        const fetchResponse = await fetch(`${request.nextUrl.origin}/api/fetch-listing?url=${encodeURIComponent(url)}`)
        
        // Check if fetch-listing returned an error HTTP status
        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text().catch(() => '')
          blocked = true
          const urlObj = new URL(url)
          const hostname = urlObj.hostname.replace(/^www\./, '')
          
          extractedListing = {
            sourceUrl: url,
            sourceSite: hostname.includes('cars.com') ? 'cars.com' : 'other',
            blocked: true,
            confidence: 0,
            issues: [`Fetch failed: HTTP ${fetchResponse.status}`],
          }
          
          (extractedListing as any).fetchInfo = {
            finalUrl: url,
            fetchStatus: fetchResponse.status,
            pageTitle: null,
            errorMessage: `HTTP ${fetchResponse.status}: ${errorText.slice(0, 200)}`,
            errorType: 'http_error',
            blockReason: 'http_error',
            contentType: null,
            contentLength: null,
          }
          
          // Return early - don't proceed with deal plan generation
          const normalizedExtraction: ListingData = extractedListing
          const extractionDiagnostics: any = {
            sourceUrl: url,
            finalUrl: url,
            pageTitle: null,
            fetchStatus: fetchResponse.status,
            blocked: true,
            errorType: 'http_error',
            errorMessage: `HTTP ${fetchResponse.status}: ${errorText.slice(0, 200)}`,
            blockReason: 'http_error',
            platformDetected: 'unknown',
            extractionStrategyUsed: 'none',
            confidence: 0,
            issues: normalizedExtraction.issues || ['Fetch failed'],
            priceCandidates: [],
            mileageCandidates: [],
            fetchDebug: {
              attemptedHeaders: ['User-Agent', 'Accept', 'Accept-Language', 'Referer', 'Cache-Control', 'Pragma'],
              timeoutMs: 12000,
            },
          }
          
          return NextResponse.json({
            success: true,
            data: null,
            dealPlan: null,
            extractionResult: normalizedExtraction,
            diagnostics: extractionDiagnostics,
            extractedListing: normalizedExtraction,
          })
        }
        
        const fetchResult = await fetchResponse.json()
        
        // Check if fetch was blocked or failed
        // Rules: blocked=true if fetchStatus === -1 OR html is empty OR success=false
        const fetchStatus = fetchResult.fetchStatus ?? fetchResult.status ?? -1
        const hasHtml = fetchResult.html && fetchResult.html.trim().length > 0
        const isFetchBlocked = fetchResult.blocked || !hasHtml || !fetchResult.success || fetchStatus === -1
        
        if (isFetchBlocked) {
          blocked = true
          const urlObj = new URL(url)
          const hostname = urlObj.hostname.replace(/^www\./, '')
          const blockReason = fetchResult.blockReason || 'unknown'
          const errorMsg = fetchResult.errorMessage || fetchResult.error || 'Access blocked by website'
          const errorType = fetchResult.errorType || 'unknown'
          
          extractedListing = {
            sourceUrl: url,
            sourceSite: hostname.includes('cars.com') ? 'cars.com' : 'other',
            blocked: true,
            confidence: 0,
            issues: [`Fetch blocked: ${errorMsg} (${blockReason}, status: ${fetchStatus})`],
          }
          
          // Store fetch diagnostics for later use - preserve real error info
          (extractedListing as any).fetchInfo = {
            finalUrl: fetchResult.finalUrl || url,
            fetchStatus, // NEVER 0 - will be -1 or actual HTTP status
            status: fetchStatus, // Legacy
            pageTitle: fetchResult.pageTitle || null,
            errorMessage: errorMsg, // Real error message from fetch-listing
            errorType, // Real error type from fetch-listing
            blockReason,
            contentType: fetchResult.contentType,
            contentLength: fetchResult.contentLength,
            attemptedHeaders: ['User-Agent', 'Accept', 'Accept-Language', 'Referer', 'Cache-Control', 'Pragma'], // Headers we attempted
          }
          
          // Don't attempt to parse when blocked - return immediately
          // This will trigger the review step
        } else if (hasHtml) {
          // Extract using universal extractor (routes to appropriate extractor)
          extractedListing = await extractListing(url, fetchResult.html)
          
          // Add fetch diagnostics to extracted listing
          if (extractedListing) {
            (extractedListing as any).fetchInfo = {
              finalUrl: fetchResult.finalUrl || url,
              fetchStatus: fetchResult.fetchStatus ?? fetchResult.status ?? -1, // NEVER 0
              status: fetchResult.fetchStatus ?? fetchResult.status ?? -1, // Legacy - NEVER 0
              contentType: fetchResult.contentType,
              contentLength: fetchResult.contentLength,
              pageTitle: fetchResult.pageTitle ?? null,
              pagePreview: fetchResult.pagePreview,
            }
          }
          
          // Use extracted data
          listingData = {
            price: extractedListing.price,
            year: extractedListing.year,
            make: extractedListing.make,
            model: extractedListing.model,
            trim: extractedListing.trim,
            mileage: extractedListing.mileage,
            vehicleCondition: extractedListing.vehicleCondition,
            vin: extractedListing.vin,
            dealerName: extractedListing.dealerName,
            dealerCity: extractedListing.dealerCity,
            dealerState: extractedListing.dealerState,
            zip: extractedListing.zip,
            state: extractedListing.dealerState,
            location: extractedListing.dealerCity ? `${extractedListing.dealerCity}, ${extractedListing.dealerState}` : undefined,
          }
          
          // Build diagnostics object - preserve real fetch error info
          const diagnostics = {
            sourceUrl: url,
            finalUrl: fetchResult.finalUrl || url,
            pageTitle: fetchResult.pageTitle ?? null,
            fetchStatus: fetchResult.fetchStatus ?? fetchResult.status ?? -1, // NEVER 0
            blocked: fetchResult.blocked || false,
            errorType: fetchResult.errorType || undefined, // Real error type from fetch-listing, don't overwrite
            errorMessage: fetchResult.errorMessage || fetchResult.error || undefined, // Real error from fetch-listing, don't overwrite
            blockReason: fetchResult.blockReason,
            contentType: fetchResult.contentType,
            contentLength: fetchResult.contentLength,
            fetchDebug: {
              contentType: fetchResult.contentType,
              contentLength: fetchResult.contentLength,
              attemptedHeaders: ['User-Agent', 'Accept', 'Accept-Language', 'Referer', 'Cache-Control', 'Pragma'],
              timeoutMs: 12000,
            },
            platformDetected: extractedListing.raw?.platform || 'unknown',
            extractionStrategyUsed: extractedListing.raw?.strategies?.[0] || 'unknown',
            confidence: extractedListing.confidence || 0,
            issues: extractedListing.issues || [], // May include "No extraction performed" but errorMessage stays intact
            priceCandidates: (extractedListing.raw?.priceCandidates || []).slice(0, 5).map((c: any) => ({
              value: c.value || c.price,
              label: c.label || 'Unknown',
              source: c.source || 'unknown',
              context: c.context || '',
              score: c.score || 0,
              flags: {
                isMsrp: c.isLikelyMsrp || false,
                isMonthlyPayment: c.isLikelyMonthlyPayment || false,
                isConditional: c.isLikelyConditional || false,
              },
            })),
            mileageCandidates: (extractedListing.raw?.mileageCandidates || []).slice(0, 5).map((c: any) => ({
              value: c.value,
              source: 'dom', // mileage candidates don't have source yet
              context: c.context || '',
              score: c.score || 0,
            })),
          }
          
          // Log diagnostics in dev mode
          if (process.env.NODE_ENV === 'development') {
            console.debug('LISTING_EXTRACTION_DEBUG', {
              extractionResult: extractedListing,
              diagnostics,
            })
          }
          
          // Store diagnostics for response
          (extractedListing as any).diagnostics = diagnostics
        }
      } catch (fetchError: any) {
        console.warn('Failed to fetch/extract listing:', fetchError)
        // If fetch failed, mark as blocked and return early for manual input
        blocked = true
        const urlObj = new URL(url)
        const hostname = urlObj.hostname.replace(/^www\./, '')
        
        extractedListing = {
          sourceUrl: url,
          sourceSite: hostname.includes('cars.com') ? 'cars.com' : 'other',
          blocked: true,
          confidence: 0,
          issues: [`Fetch error: ${fetchError?.message || String(fetchError)}`],
        }
        
        (extractedListing as any).fetchInfo = {
          finalUrl: url,
          fetchStatus: -1,
          pageTitle: null,
          errorMessage: fetchError?.message || String(fetchError) || 'Unknown fetch error',
          errorType: 'unknown',
          blockReason: 'fetch_exception',
          contentType: null,
          contentLength: null,
        }
        
        // Don't fall back to URL parsing - require manual input
        // This will be caught by the blocked check below
      }
      
      // Only fallback to URL parsing if extraction didn't work AND not blocked AND not manual entry
      if (!blocked && !isManualEntry && !listingData.price && !listingData.year) {
        const parsedData = parseListingUrl(url)
        listingData = {
          price: parsedData.price || listingData.price,
          year: parsedData.year || listingData.year,
          make: parsedData.make || listingData.make,
          model: parsedData.model || listingData.model,
          mileage: parsedData.mileage || listingData.mileage,
          location: parsedData.location || listingData.location,
          state: parsedData.state || listingData.state,
        }
      }
    } else if (isManualEntry && !body.confirmedData) {
      // Manual entry without confirmedData - this shouldn't happen, but handle gracefully
      extractedListing = {
        sourceUrl: url,
        sourceSite: 'manual',
        blocked: false,
        confidence: 0,
        issues: ['Manual entry requires confirmed data'],
      } as ListingData
      blocked = true
    }

    // Check if we should generate Deal Plan
    // Only generate if:
    // 1. Extraction succeeded (not blocked, has data), OR
    // 2. User provided confirmedData (manual override)
    const shouldGenerateDealPlan = !blocked || !!body.confirmedData
    
    // If blocked and no confirmed data, skip deal plan generation
    // Return 200 with requiresUserInput: true (never 500)
    if (blocked && !body.confirmedData) {
      // Return early with extraction result and diagnostics, but no deal plan
      const normalizedExtraction: ListingData = extractedListing ? {
        ...extractedListing,
        sourceUrl: extractedListing.sourceUrl || url,
      } : {
        sourceUrl: url,
        sourceSite: 'other',
        blocked: true,
        confidence: 0,
        issues: ['Could not read this website automatically'],
      }
      
      // Build diagnostics with real fetch error info
      // Note: fetchResult may not be defined if fetch failed before JSON parsing
      const fetchInfo = (extractedListing as any)?.fetchInfo || {}
      const extractionDiagnostics: any = {
        sourceUrl: url,
        finalUrl: fetchInfo?.finalUrl || url,
        pageTitle: fetchInfo?.pageTitle ?? null,
        fetchStatus: fetchInfo?.fetchStatus ?? fetchInfo?.status ?? -1, // NEVER 0
        blocked: true,
        errorType: fetchInfo?.errorType,
        errorMessage: fetchInfo?.errorMessage,
        blockReason: fetchInfo?.blockReason,
        contentType: fetchInfo?.contentType,
        contentLength: fetchInfo?.contentLength,
        fetchDebug: {
          contentType: fetchInfo?.contentType,
          contentLength: fetchInfo?.contentLength,
          attemptedHeaders: fetchInfo?.attemptedHeaders || ['User-Agent', 'Accept', 'Accept-Language', 'Referer', 'Cache-Control', 'Pragma'],
          timeoutMs: 12000,
        },
        platformDetected: 'unknown',
        extractionStrategyUsed: 'none',
        confidence: 0,
        issues: normalizedExtraction.issues || ['Could not read this website automatically'],
        priceCandidates: [],
        mileageCandidates: [],
      }
      
      const response: AnalyzeListingResponse = {
        success: true,
        requiresUserInput: true, // Signal that manual entry is needed
        data: null, // No deal plan - user must confirm data first
        dealPlan: null,
        extractionResult: normalizedExtraction,
        diagnostics: extractionDiagnostics,
        // Legacy fields
        extractedListing: normalizedExtraction,
      }
      
      return NextResponse.json(response)
    }
    
    // Check if extraction succeeded but confidence is too low
    if (!blocked && extractedListing && extractedListing.confidence !== undefined && extractedListing.confidence < 0.3 && !body.confirmedData) {
      // Low confidence extraction - require user input
      const normalizedExtraction: ListingData = {
        ...extractedListing,
        sourceUrl: extractedListing.sourceUrl || url,
      }
      
      const fetchInfo = (extractedListing as any)?.fetchInfo || {}
      const extractionDiagnostics: any = {
        sourceUrl: url,
        finalUrl: fetchInfo?.finalUrl || url,
        pageTitle: fetchInfo?.pageTitle ?? null,
        fetchStatus: fetchInfo?.fetchStatus ?? fetchInfo?.status ?? -1,
        blocked: false,
        platformDetected: extractedListing.raw?.platform || 'unknown',
        extractionStrategyUsed: extractedListing.raw?.strategies?.[0] || 'unknown',
        confidence: extractedListing.confidence || 0,
        issues: extractedListing.issues || ['Low confidence extraction - please review'],
        priceCandidates: (extractedListing.raw?.priceCandidates || []).slice(0, 5),
        mileageCandidates: (extractedListing.raw?.mileageCandidates || []).slice(0, 5),
      }
      
      return NextResponse.json({
        success: true,
        requiresUserInput: true,
        data: null,
        dealPlan: null,
        extractionResult: normalizedExtraction,
        diagnostics: extractionDiagnostics,
        extractedListing: normalizedExtraction,
      })
    }

    // Resolve tax rate based on buyer registration location
    const registrationState = body.registrationState
    const registrationZip = body.registrationZip
    
    // Initialize taxRateResult with default fallback to ensure it's always defined
    let taxRateResult: any = {
      stateBaseRate: 6.5,
      combinedRateRange: { low: 6, high: 7 },
      confidence: 'low' as const,
      source: 'state_estimate' as const,
      provider: 'fallback' as const,
      disclaimer: 'Registration location not provided. Using default tax rate range. Please provide registration state and ZIP for accurate rates.',
    }
    
    if (registrationState) {
      try {
        taxRateResult = await resolveTaxRate(registrationState, registrationZip)
      } catch (error) {
        console.warn('Tax rate lookup failed:', error)
        // If lookup fails, create fallback based on state
        const { getTaxRateForState } = require('@/lib/utils/tax-rates')
        const stateBaseRate = getTaxRateForState(registrationState) || 6.5
        taxRateResult = {
          stateBaseRate,
          combinedRateRange: { low: stateBaseRate, high: stateBaseRate + 2.5 },
          confidence: 'low' as const,
          source: 'state_estimate' as const,
          provider: 'fallback' as const,
          disclaimer: 'Tax rate lookup failed. Using state base rate estimate. Please verify with dealer itemization.',
        }
      }
    }

    // Generate Deal Plan using AI
    const systemPrompt = buildListingAnalyzerSystemPrompt()
    const userPrompt = buildListingAnalyzerUserPrompt(url, listingData, taxRateResult)
    
    // Log extracted data for debugging (remove in production if needed)
    if (Object.keys(listingData).length > 0) {
      console.log('Extracted listing data:', listingData)
    }
    if (taxRateResult) {
      console.log('Tax rate resolved:', taxRateResult)
    }

    let dealPlan: DealPlan

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      })

      const aiResponse = completion.choices[0]?.message?.content
      if (!aiResponse) {
        throw new Error('No response from AI')
      }

      dealPlan = JSON.parse(aiResponse)
      
      // Ensure tax rate assumptions are populated from taxRateResult
      if (!dealPlan.otdEstimate) {
        dealPlan.otdEstimate = {
          assumptions: {},
          expectedOTD: { low: 0, expected: 0, high: 0 },
          warningThreshold: 0,
          checklist: []
        }
      }
      if (!dealPlan.otdEstimate.assumptions) {
        dealPlan.otdEstimate.assumptions = {}
      }
      
      // Populate tax rate information from resolved tax rate
      if (taxRateResult) {
        dealPlan.otdEstimate.assumptions.registrationState = registrationState
        dealPlan.otdEstimate.assumptions.registrationZip = registrationZip
        dealPlan.otdEstimate.assumptions.taxRate = {
          ...dealPlan.otdEstimate.assumptions.taxRate,
          stateBaseRate: taxRateResult.stateBaseRate,
          estimatedLocalAddOn: taxRateResult.estimatedLocalAddOn,
          combinedRate: taxRateResult.combinedRate,
          combinedRateRange: taxRateResult.combinedRateRange,
          confidence: taxRateResult.confidence,
          source: taxRateResult.source as any,
          disclaimer: taxRateResult.disclaimer,
          // Set value or range based on what we have
          value: taxRateResult.combinedRate,
          range: taxRateResult.combinedRateRange || {
            low: taxRateResult.stateBaseRate,
            high: taxRateResult.stateBaseRate + (taxRateResult.estimatedLocalAddOn || 0) * 2
          }
        }
      }
      
      // Ensure otdBuilderLink includes state and price
      if (dealPlan.nextMoves?.otdBuilderLink) {
        if (listingData.state) {
          dealPlan.nextMoves.otdBuilderLink.state = listingData.state
        }
        // Ensure price is set (use askingPrice if available)
        if (!dealPlan.nextMoves.otdBuilderLink.price && dealPlan.targets?.askingPrice) {
          dealPlan.nextMoves.otdBuilderLink.price = dealPlan.targets.askingPrice.toString()
        }
      }
    } catch (parseError) {
      // Fallback to a reasonable default if AI fails
      const { parseMoney, parsePercentToDecimal, calculateOTDRange } = require('@/lib/utils/number-parsing')
      
      const fallbackPrice = parseMoney(listingData.price || 25000)
      const fairPrice = Math.round(fallbackPrice * 0.97) // 3% below asking
      const openingOffer = Math.round(fallbackPrice * 0.94) // 6% below asking
      const acceptableDeal = Math.round(fallbackPrice * 0.96) // 4% below asking
      const taxRateDecimal = parsePercentToDecimal(6.5) // 6.5% average
      const fees = 400 // Typical fees
      
      // Calculate OTD using strict parsing
      const otdRange = calculateOTDRange({
        vehiclePrice: fairPrice,
        taxRateDecimal,
        docFee: { low: 299, high: 699 },
        registrationFee: { low: 200, high: 600 },
        otherFees: 0,
        addOns: 0,
      })
      
      const baseOTD = otdRange.expected
      const walkAwayOTD = Math.round(baseOTD * 1.08) // 8% above expected
      
      // Validate threshold is within ±30% of expected
      const thresholdMin = baseOTD * 0.7
      const thresholdMax = baseOTD * 1.3
      const validThreshold = walkAwayOTD >= thresholdMin && walkAwayOTD <= thresholdMax

      dealPlan = {
        targets: {
          askingPrice: fallbackPrice,
          estimatedFairPrice: fairPrice,
          strongOpeningOffer: openingOffer,
          acceptableDealPrice: acceptableDeal,
          walkAwayOTDCeiling: walkAwayOTD,
          percentRange: '3-7% below asking',
          estimationMethod: 'Conservative estimate based on asking price',
        },
        leverage: {
          points: [
            {
              factor: 'Position in comp range',
              score: 50,
              strength: 'medium',
              explanation: 'Listing appears to be in the middle of comparable range',
            },
            {
              factor: 'Mileage vs comps',
              score: 40,
              strength: 'medium',
              explanation: 'Mileage appears average for vehicle age',
            },
          ],
          bestAngles: ['Request OTD breakdown', 'Compare with similar listings'],
        },
        otdEstimate: {
          assumptions: {
            registrationState: registrationState,
            registrationZip: registrationZip,
            taxRate: taxRateResult ? {
              stateBaseRate: taxRateResult.stateBaseRate,
              estimatedLocalAddOn: taxRateResult.estimatedLocalAddOn,
              combinedRate: taxRateResult.combinedRate,
              combinedRateRange: taxRateResult.combinedRateRange,
              confidence: taxRateResult.confidence,
              source: taxRateResult.source as any,
              disclaimer: taxRateResult.disclaimer,
              value: taxRateResult.combinedRate,
              range: taxRateResult.combinedRateRange || {
                low: taxRateResult.stateBaseRate,
                high: taxRateResult.stateBaseRate + (taxRateResult.estimatedLocalAddOn || 0) * 2
              }
            } : { range: { low: 6, high: 7 } },
            docFee: { range: { low: 299, high: 699 } },
            registrationTitle: { range: { low: 200, high: 600 } },
            dealerAddOns: { value: 0, riskBand: { low: 0, high: 1500 } },
          },
          expectedOTD: {
            low: Math.round(otdRange.low),
            expected: Math.round(otdRange.expected),
            high: Math.round(otdRange.high),
          },
          warningThreshold: validThreshold ? walkAwayOTD : Math.round(baseOTD * 1.1), // Fallback to 10% if invalid
          checklist: ['Request itemized OTD in writing', 'Verify all fees are legitimate'],
        },
        tactics: [
          {
            tactic: 'May push for add-ons or extended warranty',
            likelihood: 'high',
            counter: 'Decline all add-ons and focus on base price. Say: "I\'m only interested in the base vehicle price."',
          },
          {
            tactic: 'May ask you to "come in to discuss"',
            likelihood: 'high',
            counter: 'Request written OTD breakdown first. Say: "I\'d like to see the full breakdown in writing before I come in."',
          },
        ],
        scripts: [
          {
            title: 'Initial Email/Text - Request Itemized OTD',
            text: `Hi, I'm interested in the vehicle listed at ${url}. Can you provide the out-the-door price including all fees and taxes? I'd like a written breakdown showing: vehicle price, tax, doc fee, title, registration, and any other fees.`,
          },
          {
            title: 'First Counter Offer',
            text: `I've found similar vehicles in the area for $${openingOffer.toLocaleString()}. Can you match or beat that price? My maximum out-the-door budget is $${walkAwayOTD.toLocaleString()}, so I need to see a complete breakdown to make sure we're in that range.`,
          },
          {
            title: 'Walk-Away / Follow-Up',
            text: `Thank you for your time. If you can get closer to $${acceptableDeal.toLocaleString()} out-the-door, I'm ready to move forward. Otherwise, I'll continue looking. Please let me know if anything changes.`,
          },
        ],
        nextMoves: {
          copilotLink: {
            vehiclePrice: fallbackPrice.toString(),
            desiredOTD: Math.round(baseOTD * 0.98).toString(),
            stage: 'initial_outreach',
            goal: 'get_otd',
            carContext: `Vehicle from ${url}`,
          },
          otdBuilderLink: {
            price: fallbackPrice.toString(),
            state: listingData.state || undefined,
          },
          comparisonLink: {
            dealer: url.match(/https?:\/\/(?:www\.)?([^/]+)/)?.[1]?.replace(/\.(com|net|org)/, '') || 'Dealer',
            price: fallbackPrice,
            otdLow: Math.round(baseOTD * 0.98),
            otdHigh: Math.round(baseOTD * 1.05),
            notes: `Target: $${acceptableDeal.toLocaleString()}`,
          },
        },
      }
    }

    // Normalize extraction result - ensure it has sourceUrl
    const normalizedExtraction: ListingData = extractedListing ? {
      ...extractedListing,
      sourceUrl: extractedListing.sourceUrl || url,
    } : {
      sourceUrl: url,
      sourceSite: 'other',
      confidence: 0,
      issues: ['No extraction performed'],
    }
    
    // Build diagnostics - always create one
    let extractionDiagnostics: any
    
    // Check if diagnostics were already built and stored
    const storedDiagnostics = (extractedListing as any)?.diagnostics
    
    if (storedDiagnostics) {
      // Use stored diagnostics
      extractionDiagnostics = storedDiagnostics
    } else if (extractedListing) {
      // Build diagnostics from extraction result
      const fetchInfo = (extractedListing as any).fetchInfo
      extractionDiagnostics = {
        sourceUrl: url,
        finalUrl: fetchInfo?.finalUrl || url,
        pageTitle: fetchInfo?.pageTitle || null,
        fetchStatus: fetchInfo?.fetchStatus ?? fetchInfo?.status ?? -1, // NEVER 0
        blocked: extractedListing.blocked || false,
        errorType: fetchInfo?.errorType || undefined, // Real error type from fetch-listing, don't overwrite
        errorMessage: fetchInfo?.errorMessage || fetchInfo?.error || undefined, // Real error from fetch-listing, don't overwrite
        blockReason: fetchInfo?.blockReason,
        contentType: fetchInfo?.contentType,
        contentLength: fetchInfo?.contentLength,
        fetchDebug: {
          contentType: fetchInfo?.contentType,
          contentLength: fetchInfo?.contentLength,
          attemptedHeaders: fetchInfo?.attemptedHeaders || ['User-Agent', 'Accept', 'Accept-Language', 'Referer', 'Cache-Control', 'Pragma'],
          timeoutMs: 12000,
        },
        platformDetected: extractedListing.raw?.platform || 'unknown',
        extractionStrategyUsed: extractedListing.raw?.strategies?.[0] || 'unknown',
        confidence: extractedListing.confidence || 0,
        issues: extractedListing.issues || [],
        priceCandidates: (extractedListing.raw?.priceCandidates || []).slice(0, 5).map((c: any) => ({
          value: c.value || c.price,
          label: c.label || 'Unknown',
          source: c.source || 'unknown',
          context: c.context || '',
          score: c.score || 0,
          flags: {
            isMsrp: c.isLikelyMsrp || false,
            isMonthlyPayment: c.isLikelyMonthlyPayment || false,
            isConditional: c.isLikelyConditional || false,
          },
        })),
        mileageCandidates: (extractedListing.raw?.mileageCandidates || []).slice(0, 5).map((c: any) => ({
          value: c.value,
          source: 'dom',
          context: c.context || '',
          score: c.score || 0,
        })),
      }
    } else {
      // No extraction - create minimal diagnostics
      // Note: If this path is reached, it means confirmedData was used or no fetch was attempted
      // In that case, we don't have fetch error info, so we use generic messages
      extractionDiagnostics = {
        sourceUrl: url,
        finalUrl: url,
        pageTitle: null,
        fetchStatus: -1, // NEVER 0
        blocked: true,
        errorType: undefined, // No fetch error info available
        errorMessage: undefined, // No fetch error info available - don't use "No extraction performed" here
        platformDetected: 'unknown',
        extractionStrategyUsed: 'none',
        confidence: 0,
        issues: ['No extraction performed'], // This is fine in issues array
        fetchDebug: {
          attemptedHeaders: ['User-Agent', 'Accept', 'Accept-Language', 'Referer', 'Cache-Control', 'Pragma'],
          timeoutMs: 12000,
        },
        priceCandidates: [],
        mileageCandidates: [],
      }
    }
    
    // If confirmedData was used, add confirmedOverrides to diagnostics
    if (body.confirmedData) {
      extractionDiagnostics.confirmedOverrides = Object.keys(body.confirmedData)
      // Update extraction result to include confirmed data
      Object.assign(normalizedExtraction, body.confirmedData)
      normalizedExtraction.confidence = 1.0 // High confidence since user confirmed
    }

      const response: AnalyzeListingResponse = {
        success: true,
        requiresUserInput: false, // Deal plan was generated successfully
        data: dealPlan,
        extractionResult: normalizedExtraction,
      diagnostics: extractionDiagnostics,
      // Legacy fields for backward compatibility
      dealPlan,
      extractedListing: normalizedExtraction,
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Listing analyzer error:', error)
    console.error('Error stack:', error?.stack)
    return NextResponse.json(
      { success: false, error: error?.message || String(error) || 'Failed to analyze listing' },
      { status: 500 }
    )
  }
}
