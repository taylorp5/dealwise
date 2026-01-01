import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    // Debug: Log request origin
    const origin = request.headers.get('origin') || request.headers.get('referer') || 'unknown'
    console.log('[Checkout] Request received from origin:', origin)

    // Check for Supabase cookies in cookieStore
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    const hasSupabaseCookie = allCookies.some(cookie => cookie.name.startsWith('sb-'))
    console.log('[Checkout] Supabase cookie present:', hasSupabaseCookie, `(${allCookies.filter(c => c.name.startsWith('sb-')).length} sb-* cookies found)`)

    // Create Supabase server client with cookie support
    const supabase = createServerSupabase()

    // Get authenticated user from cookies
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    // Debug: Log auth status (safe - no secrets)
    if (authError) {
      console.log('[Checkout] Auth error:', authError.message)
    }
    console.log('[Checkout] Auth check - user exists:', !!user)

    // Create response with debug headers
    const createResponse = (data: any, status: number) => {
      const response = NextResponse.json(data, { status })
      response.headers.set('x-debug-auth-user', user ? 'yes' : 'no')
      response.headers.set('x-debug-cookie-present', hasSupabaseCookie ? 'yes' : 'no')
      return response
    }

    // Return 401 if auth error or no user
    if (authError || !user) {
      if (authError) {
        console.log('[Checkout] Auth error message:', authError.message)
      }
      return NextResponse.json(
        { success: false, error: 'Not signed in' },
        { 
          status: 401,
          headers: {
            'x-debug-auth-user': 'no',
            'x-debug-cookie-present': hasSupabaseCookie ? 'yes' : 'no',
          },
        }
      )
    }

    const userId = user.id

    // Initialize Stripe (inside function to avoid build-time errors)
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      console.error('[Checkout] STRIPE_SECRET_KEY not configured')
      return NextResponse.json(
        { success: false, error: 'Payment processing not configured' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
    })

    // Parse request body
    const body = await request.json()
    const { product_key } = body

    if (!product_key) {
      return NextResponse.json(
        { success: false, error: 'Missing product_key' },
        { status: 400 }
      )
    }

    // Validate product_key
    const validProductKeys = ['first_time', 'in_person', 'bundle_both']
    if (!validProductKeys.includes(product_key)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product_key. Must be one of: first_time, in_person, bundle_both' },
        { status: 400 }
      )
    }

    // Map product_key to Stripe price ID from environment variables
    const priceIdMap: Record<string, string> = {
      first_time: process.env.STRIPE_PRICE_FIRST_TIME!,
      in_person: process.env.STRIPE_PRICE_IN_PERSON!,
      bundle_both: process.env.STRIPE_PRICE_BUNDLE!,
    }

    const priceId = priceIdMap[product_key]

    if (!priceId) {
      console.error(`[Checkout] Missing Stripe price ID for product_key: ${product_key}`)
      return NextResponse.json(
        { success: false, error: 'Product pricing not configured' },
        { status: 500 }
      )
    }

    // Validate that priceId is a Stripe Price ID (starts with "price_")
    if (!priceId.startsWith('price_')) {
      console.error(`[Checkout] Invalid Stripe price ID format. Got: ${priceId}`)
      return NextResponse.json(
        { success: false, error: `Invalid Stripe price ID. Expected price_... but got: ${priceId.substring(0, 20)}...` },
        { status: 400 }
      )
    }

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create Stripe Checkout Session
    // Ensure line_items uses Price ID (price_...) not Product ID (prod_...)
    let checkoutSession
    try {
      checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId, // Must be a Price ID (price_...), not Product ID (prod_...)
            quantity: 1,
          },
        ],
        client_reference_id: userId, // User ID for webhook lookup
        success_url: `${baseUrl}/packs?checkout=success`,
        cancel_url: `${baseUrl}/packs?checkout=cancel`,
        metadata: {
          user_id: userId,
          pack_key: product_key, // Store as pack_key for clarity
        },
      })
    } catch (stripeError: any) {
      // Handle Stripe API errors with clean JSON response
      console.error('[Checkout] Stripe API error:', stripeError.message)
      const errorMessage = stripeError.message || 'Failed to create checkout session'
      return NextResponse.json(
        { success: false, error: errorMessage },
        { 
          status: 400,
          headers: {
            'x-debug-auth-user': 'yes',
            'x-debug-cookie-present': hasSupabaseCookie ? 'yes' : 'no',
          },
        }
      )
    }

    console.log(`[Checkout] Created session ${checkoutSession.id} for user ${userId}, product ${product_key}`)

    // Return checkout URL for frontend redirect
    const response = NextResponse.json({
      success: true,
      url: checkoutSession.url,
    })
    response.headers.set('x-debug-auth-user', 'yes')
    response.headers.set('x-debug-cookie-present', hasSupabaseCookie ? 'yes' : 'no')
    return response
  } catch (error: any) {
    console.error('[Checkout] Error creating checkout session:', error.message || error)
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    const hasSupabaseCookie = allCookies.some(cookie => cookie.name.startsWith('sb-'))
    const response = NextResponse.json(
      { success: false, error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
    response.headers.set('x-debug-auth-user', 'no')
    response.headers.set('x-debug-cookie-present', hasSupabaseCookie ? 'yes' : 'no')
    return response
  }
}

