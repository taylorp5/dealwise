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
      // Create Supabase admin client
      const supabase = getSupabaseAdmin()

      // IDEMPOTENCY CHECK: Check if this event has already been processed
      const { data: existingEvent } = await supabase
        .from('webhook_events')
        .select('id, processed_at')
        .eq('stripe_event_id', event.id)
        .single()

      if (existingEvent) {
        console.log(`[Webhook] Event ${event.id} already processed at ${existingEvent.processed_at}. Skipping.`)
        return NextResponse.json({ 
          received: true, 
          message: 'Event already processed',
          processed_at: existingEvent.processed_at 
        })
      }

      // Extract user_id from client_reference_id OR metadata.user_id
      const userId = session.client_reference_id || session.metadata?.user_id
      const packKey = session.metadata?.pack_key
      const sessionId = session.id
      const customerId = session.customer as string | null
      const paymentIntentId = session.payment_intent as string | null

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

      // Get existing entitlements to preserve them (OR logic)
      const { data: existingEntitlements } = await supabase
        .from('user_entitlements')
        .select('first_time, in_person, bundle')
        .eq('user_id', userId)
        .single()

      // Map pack_key to entitlement flags (OR with existing)
      let firstTime = existingEntitlements?.first_time || false
      let inPerson = existingEntitlements?.in_person || false
      let bundle = existingEntitlements?.bundle || false

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

      // Upsert entitlements with Stripe metadata
      const { error: upsertError } = await supabase
        .from('user_entitlements')
        .upsert(
          {
            user_id: userId,
            first_time: firstTime,
            in_person: inPerson,
            bundle: bundle,
            stripe_customer_id: customerId,
            stripe_payment_intent_id: paymentIntentId,
            checkout_session_id: sessionId,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        )

      if (upsertError) {
        console.error('[Webhook] Error upserting entitlements:', upsertError)
        
        // Provide helpful error message if table doesn't exist
        if (upsertError.message?.includes('does not exist') || upsertError.message?.includes('schema cache')) {
          console.error('[Webhook] Table user_entitlements does not exist. Please run the migration: supabase/migrations/003_entitlements_persistence.sql')
          return NextResponse.json(
            { 
              error: 'Database table not found. Please run migration 003_entitlements_persistence.sql',
              details: upsertError.message 
            },
            { status: 500 }
          )
        }
        
        throw upsertError
      }

      // Record webhook event for idempotency
      const { error: eventError } = await supabase
        .from('webhook_events')
        .insert({
          stripe_event_id: event.id,
          event_type: event.type,
          checkout_session_id: sessionId,
          user_id: userId,
          payload: event.data.object as any,
        })

      if (eventError) {
        // Log but don't fail - entitlements were already updated
        console.error('[Webhook] Error recording webhook event (non-fatal):', eventError)
      }

      console.log(`[Webhook] Successfully updated entitlements for user ${userId}: first_time=${firstTime}, in_person=${inPerson}, bundle=${bundle}`)
      return NextResponse.json({ received: true })
    } catch (error: any) {
      console.error('[Webhook] Error processing checkout.session.completed:', error)
      // Return 500 so Stripe will retry (idempotency check will prevent duplicates)
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

