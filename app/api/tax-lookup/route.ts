import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { resolveTaxRate } from '@/lib/utils/tax-lookup'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const state = searchParams.get('state')
    const zip = searchParams.get('zip')

    if (!state) {
      // Graceful fallback: return default rate instead of error
      const { getTaxRateForState } = require('@/lib/utils/tax-rates')
      const defaultRate = getTaxRateForState('CA') || 6.5
      return NextResponse.json({
        success: true,
        data: {
          stateBaseRate: defaultRate,
          combinedRate: defaultRate,
          confidence: 'low',
          source: 'state_estimate',
          provider: 'fallback',
          disclaimer: 'State not provided. Using default estimate. Tax rates are estimates. Always verify with dealer.',
        },
      })
    }

    const result = await resolveTaxRate(state, zip || undefined)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.warn('Tax lookup error, using fallback:', error)
    // Graceful fallback: always return success with fallback data
    const { getTaxRateForState } = require('@/lib/utils/tax-rates')
    const searchParams = request.nextUrl.searchParams
    const state = searchParams.get('state')
    const fallbackRate = state ? (getTaxRateForState(state) || 6.5) : 6.5
    
    return NextResponse.json({
      success: true,
      data: {
        stateBaseRate: fallbackRate,
        combinedRate: fallbackRate,
        confidence: 'low',
        source: 'state_estimate',
        provider: 'fallback',
        disclaimer: 'Tax lookup unavailable. Using state estimate. Tax rates are estimates. Always verify with dealer.',
      },
    })
  }
}


