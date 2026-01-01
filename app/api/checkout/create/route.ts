import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const supabase = await createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

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

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/packs?checkout=success`,
      cancel_url: `${baseUrl}/packs?checkout=cancel`,
      metadata: {
        user_id: userId,
        product_key: product_key,
      },
    })

    console.log(`[Checkout] Created session ${checkoutSession.id} for user ${userId}, product ${product_key}`)

    return NextResponse.json({
      success: true,
      url: checkoutSession.url,
    })
  } catch (error: any) {
    console.error('[Checkout] Error creating checkout session:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

