import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Disable body parsing, we need the raw body for signature verification
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Create Supabase admin client with service role key (bypasses RLS)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration for webhook')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY

  if (!webhookSecret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  if (!stripeSecretKey) {
    console.error('[Webhook] STRIPE_SECRET_KEY not configured')
    return NextResponse.json(
      { error: 'Stripe secret key not configured' },
      { status: 500 }
    )
  }

  // Initialize Stripe (inside function to avoid build-time errors)
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-12-15.clover',
  })

  // Get raw body for signature verification
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('[Webhook] Missing stripe-signature header')
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    )
  }

  // Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    try {
      // Extract user_id from client_reference_id OR metadata.user_id
      const userId = session.client_reference_id || session.metadata?.user_id
      const packKey = session.metadata?.pack_key
      const sessionId = session.id

      if (!userId) {
        console.error('[Webhook] Missing user_id in client_reference_id and metadata:', { sessionId })
        return NextResponse.json(
          { error: 'Missing user_id' },
          { status: 400 }
        )
      }

      // Determine purchased pack from line items or metadata
      let purchasedPackKey: string | null = packKey || null

      // If pack_key not in metadata, fetch line items to determine price
      if (!purchasedPackKey && session.line_items) {
        const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 1 })
        if (lineItems.data.length > 0) {
          const priceId = lineItems.data[0].price?.id
          
          // Map price ID to pack key
          const priceToPackMap: Record<string, string> = {
            [process.env.STRIPE_PRICE_FIRST_TIME || '']: 'first_time',
            [process.env.STRIPE_PRICE_IN_PERSON || '']: 'in_person',
            [process.env.STRIPE_PRICE_BUNDLE || '']: 'bundle',
          }
          
          purchasedPackKey = priceId ? priceToPackMap[priceId] || null : null
        }
      }

      if (!purchasedPackKey) {
        console.error('[Webhook] Could not determine purchased pack:', { sessionId, userId })
        return NextResponse.json(
          { error: 'Could not determine purchased pack' },
          { status: 400 }
        )
      }

      console.log(`[Webhook] Processing checkout.session.completed for user ${userId}, pack ${purchasedPackKey}, session ${sessionId}`)

      // Create Supabase admin client
      const supabase = getSupabaseAdmin()

      // Map pack_key to entitlement flags
      let firstTime = false
      let inPerson = false
      let bundle = false

      if (purchasedPackKey === 'first_time') {
        firstTime = true
      } else if (purchasedPackKey === 'in_person') {
        inPerson = true
      } else if (purchasedPackKey === 'bundle' || purchasedPackKey === 'bundle_both') {
        // Bundle unlocks both packs
        bundle = true
        firstTime = true
        inPerson = true
      }

      // Upsert entitlements (set flags true, keep existing trues)
      const { error: upsertError } = await supabase
        .from('user_entitlements')
        .upsert(
          {
            user_id: userId,
            first_time: firstTime,
            in_person: inPerson,
            bundle: bundle,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        )

      if (upsertError) {
        console.error('[Webhook] Error upserting entitlements:', upsertError)
        throw upsertError
      }

      console.log(`[Webhook] Successfully updated entitlements for user ${userId}: first_time=${firstTime}, in_person=${inPerson}, bundle=${bundle}`)
      return NextResponse.json({ received: true })
    } catch (error: any) {
      console.error('[Webhook] Error processing checkout.session.completed:', error)
      // Return 200 to prevent Stripe from retrying (we'll handle manually if needed)
      // Or return 500 if you want Stripe to retry
      return NextResponse.json(
        { error: 'Error processing webhook', message: error.message },
        { status: 500 }
      )
    }
  }

  // Return 200 for other event types (we only care about checkout.session.completed)
  console.log(`[Webhook] Received unhandled event type: ${event.type}`)
  return NextResponse.json({ received: true })
}

