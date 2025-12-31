import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { resolveTaxRate } from '@/lib/utils/tax-lookup'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const state = searchParams.get('state')
    const zip = searchParams.get('zip')

    if (!state) {
      return NextResponse.json(
        { success: false, error: 'State is required' },
        { status: 400 }
      )
    }

    const result = await resolveTaxRate(state, zip || undefined)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error('Tax lookup error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to lookup tax rate' },
      { status: 500 }
    )
  }
}


