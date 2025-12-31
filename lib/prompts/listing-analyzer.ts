// Prompts for Listing Analyzer - Generates Deal Plan

export function buildListingAnalyzerSystemPrompt(): string {
  return `You are an expert car buying advisor that analyzes vehicle listings and creates actionable "Deal Plans" for buyers.

Your job is to transform a listing URL and basic vehicle information into a structured, decision-grade report with SPECIFIC DOLLAR AMOUNTS (not ranges like "3-7%").

CRITICAL RULES:
- Always provide EXACT dollar amounts for all targets
- Compute fair price, opening offer, acceptable deal, and walk-away ceiling
- Use reasonable heuristics: if comps exist, use midpoint; if only asking price, use conservative bands (fair = asking - 3%, opening = asking - 6%, acceptable = asking - 4%)
- Adjust for mileage/year if available (higher mileage → lower fair price)
- Label estimates as "est." when uncertain
- Provide leverage scores (0-100) for each factor
- Generate specific counter-scripts for dealer tactics
- Create listing-specific scripts with actual dollar amounts filled in
- Keep all advice educational and avoid guarantees

OUTPUT FORMAT:
You must return valid JSON matching this structure:
{
  "targets": {
    "askingPrice": number,
    "estimatedFairPrice": number,
    "strongOpeningOffer": number,
    "acceptableDealPrice": number,
    "walkAwayOTDCeiling": number,
    "percentRange": "string (optional, e.g., '3-7% below asking')",
    "estimationMethod": "string (optional, how we estimated)"
  },
  "leverage": {
    "points": [
      {
        "factor": "string (e.g., 'Position in comp range')",
        "score": number (0-100),
        "strength": "high|medium|low",
        "explanation": "string"
      }
    ],
    "bestAngles": ["string", "string", "string"] (top 2-3)
  },
  "otdEstimate": {
    "assumptions": {
      "taxRate": { "range": { "low": number, "high": number } },
      "docFee": { "range": { "low": number, "high": number } },
      "registrationTitle": { "range": { "low": number, "high": number } },
      "dealerAddOns": { "value": 0, "riskBand": { "low": 0, "high": 1500 } }
    },
    "expectedOTD": { "low": number, "expected": number, "high": number },
    "warningThreshold": number,
    "checklist": ["string", "string"]
  },
  "tactics": [
    {
      "tactic": "string",
      "likelihood": "high|medium|low",
      "counter": "string (1-2 sentences)"
    }
  ],
  "scripts": [
    {
      "title": "string",
      "text": "string (with actual dollar amounts)"
    }
  ],
  "nextMoves": {
    "copilotLink": {
      "vehiclePrice": "string",
      "desiredOTD": "string",
      "stage": "initial_outreach",
      "goal": "get_otd",
      "carContext": "string"
    },
    "otdBuilderLink": {
      "price": "string"
    },
    "comparisonLink": {
      "dealer": "string",
      "price": number,
      "otdLow": number,
      "otdHigh": number
    }
  }
}

For OTD calculations:
- Tax rate: The backend will provide tax rate assumptions based on buyer registration location. Use the provided taxRate.value or taxRate.range in your calculations.
- Use $299-$699 doc fee range if state unknown
- Use $200-$600 registration/title range
- Dealer add-ons: $0 default, but show $0-$1,500 risk band
- Warning threshold: expected OTD + 5-10% (must be within ±30% of expected OTD, otherwise omit)
- Formula: OTD = vehiclePrice + (vehiclePrice * taxRateDecimal) + fees + addOns
- IMPORTANT: Do NOT guess or estimate tax rates. Use only the taxRate values provided in the assumptions.`
}

export function buildListingAnalyzerUserPrompt(
  listingUrl: string,
  listingData?: {
    price?: number
    year?: number
    make?: string
    model?: string
    mileage?: number
    location?: string
    state?: string
  },
  taxRateResult?: {
    stateBaseRate: number
    estimatedLocalAddOn?: number
    combinedRate?: number
    combinedRateRange?: { low: number; high: number }
    confidence: 'high' | 'medium' | 'low'
    source: string
    disclaimer?: string
  } | null
): string {
  // Build a more detailed data section
  const extractedFields: string[] = []
  if (listingData?.price) extractedFields.push(`Price: $${listingData.price.toLocaleString()}`)
  if (listingData?.year) extractedFields.push(`Year: ${listingData.year}`)
  if (listingData?.make) extractedFields.push(`Make: ${listingData.make}`)
  if (listingData?.model) extractedFields.push(`Model: ${listingData.model}`)
  if (listingData?.mileage) extractedFields.push(`Mileage: ${listingData.mileage.toLocaleString()} miles`)
  if (listingData?.location) extractedFields.push(`Location: ${listingData.location}`)
  if (listingData?.state) extractedFields.push(`State: ${listingData.state}`)
  
  const dataSection = extractedFields.length > 0
    ? `
EXTRACTED LISTING DATA (from URL parsing):
${extractedFields.map(f => `- ${f}`).join('\n')}

USE THIS DATA: The information above was extracted from the URL structure. You MUST use these values when available:
- If price is provided, use it as the askingPrice
- If year/make/model are provided, use them for market analysis and fair price estimation
- If mileage is provided, adjust fair price accordingly (higher mileage = lower price)
- Tax rate will be provided by the backend based on buyer registration location - do not estimate tax rates
`
    : `
NOTE: No vehicle data could be automatically extracted from the URL. You must analyze the URL structure yourself to extract:
- Year, make, model from URL path patterns (e.g., /2020-honda-civic)
- Price from URL path or query parameters
- Mileage if mentioned
- Location/state if present
`

  // Build tax rate section for prompt
  let taxRateSection = ''
  if (taxRateResult) {
    if (taxRateResult.combinedRate) {
      taxRateSection = `
TAX RATE ASSUMPTIONS (provided by backend):
- State Base Rate: ${taxRateResult.stateBaseRate}%
- Estimated Local Add-on: ${taxRateResult.estimatedLocalAddOn?.toFixed(2) || 0}%
- Combined Rate: ${taxRateResult.combinedRate.toFixed(2)}%
- Confidence: ${taxRateResult.confidence}
- Source: ${taxRateResult.source}
- Use this exact rate (${taxRateResult.combinedRate.toFixed(2)}%) in OTD calculations
`
    } else if (taxRateResult.combinedRateRange) {
      taxRateSection = `
TAX RATE ASSUMPTIONS (provided by backend):
- State Base Rate: ${taxRateResult.stateBaseRate}%
- Estimated Local Add-on: ${taxRateResult.estimatedLocalAddOn?.toFixed(2) || 0}%
- Combined Rate Range: ${taxRateResult.combinedRateRange.low.toFixed(2)}% - ${taxRateResult.combinedRateRange.high.toFixed(2)}%
- Confidence: ${taxRateResult.confidence}
- Source: ${taxRateResult.source}
- Use this range (${taxRateResult.combinedRateRange.low.toFixed(2)}% - ${taxRateResult.combinedRateRange.high.toFixed(2)}%) in OTD calculations
`
    }
    if (taxRateResult.disclaimer) {
      taxRateSection += `- Note: ${taxRateResult.disclaimer}\n`
    }
  } else {
    taxRateSection = `
TAX RATE ASSUMPTIONS:
- No registration location provided
- Use default range: 6-7% (low confidence)
- User should provide registration state and ZIP for accurate rates
`
  }

  return `Analyze this vehicle listing and create a comprehensive Deal Plan with SPECIFIC DOLLAR AMOUNTS.

LISTING URL: ${listingUrl}
${dataSection}
${taxRateSection}

IMPORTANT: The URL structure itself may contain valuable information:
- URL paths often include: year, make, model (e.g., /2020-honda-civic, /used/2020/honda/civic)
- Price may be in the URL path or query parameters (price=, listPrice=, etc.)
- Mileage may be mentioned in the URL
- Location/state may be in the URL path
- Dealer name may be in the URL structure

TASK:
1. FIRST: Use the extracted data provided above if available. This data was parsed from the URL structure.
2. SECOND: If data is missing, carefully analyze the URL structure yourself to extract any additional vehicle information (year, make, model, price, mileage, location, state)
3. Extract or estimate the asking price - PRIORITIZE the extracted price if provided, otherwise analyze the URL
3. Compute exact targets:
   - Estimated Fair Price (midpoint if comps exist, or asking - 3% if not)
   - Strong Opening Offer (fair - 2-4% if comps exist, or asking - 6% if not)
   - Acceptable Deal Price (fair - 0-2% if comps exist, or asking - 4% if not)
   - Walk-Away OTD Ceiling (expected OTD + 5-10%)
4. Assess leverage (4-8 factors with 0-100 scores):
   - Position in comp range
   - Mileage vs comps (use extracted mileage if available)
   - Trim rarity (if available from URL/model info)
   - Dealer type (if known from URL)
   - Price volatility (if price drops visible)
   - Missing info (CARFAX, accident history)
5. Calculate OTD estimates using the tax rate assumptions provided by the backend (doc fee $299-$699, registration $200-$600, add-ons $0-$1,500 risk)
   - Tax rate will be provided in the assumptions - do not estimate or guess tax rates
6. Predict 4-6 likely dealer tactics with counter-scripts
7. Generate 3 ready-to-send scripts with actual dollar amounts:
   - Initial email/text requesting itemized OTD
   - First counter offer (includes Opening Offer and OTD ceiling)
   - Walk-away/follow-up message
8. Set up next move links (Copilot, OTD Builder, Comparison)
   - Include extracted make/model/year in carContext if available

If you cannot extract specific numbers from the URL, use reasonable estimates based on:
- Typical pricing for the vehicle type (if make/model known)
- Market conditions
- Standard negotiation ranges

Return ONLY valid JSON matching the DealPlan structure.`
}
