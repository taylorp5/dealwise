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
      // Extract metadata
      const userId = session.metadata?.user_id
      const productKey = session.metadata?.product_key
      const sessionId = session.id

      if (!userId || !productKey || !sessionId) {
        console.error('[Webhook] Missing required metadata:', { userId, productKey, sessionId })
        return NextResponse.json(
          { error: 'Missing required metadata' },
          { status: 400 }
        )
      }

      console.log(`[Webhook] Processing checkout.session.completed for user ${userId}, product ${productKey}, session ${sessionId}`)

      // Create Supabase admin client
      const supabase = getSupabaseAdmin()

      // Handle bundle_both: insert TWO rows (first_time and in_person)
      if (productKey === 'bundle_both') {
        const entitlementsToInsert = [
          {
            user_id: userId,
            product_key: 'first_time',
            stripe_checkout_session_id: sessionId,
            status: 'active',
          },
          {
            user_id: userId,
            product_key: 'in_person',
            stripe_checkout_session_id: sessionId,
            status: 'active',
          },
        ]

        // Insert both entitlements
        // Handle idempotency: if entitlement already exists, treat as success
        for (const entitlement of entitlementsToInsert) {
          try {
            const { error: insertError } = await supabase
              .from('entitlements')
              .insert(entitlement)

            if (insertError) {
              // If it's a unique constraint violation, treat as success (idempotent)
              if (insertError.code === '23505') {
                console.log(`[Webhook] Entitlement already exists for session ${sessionId}, product ${entitlement.product_key} - treating as success`)
              } else {
                throw insertError
              }
            } else {
              console.log(`[Webhook] Created entitlement for user ${userId}, product ${entitlement.product_key}`)
            }
          } catch (err: any) {
            // Handle unique constraint violation as success (idempotent)
            if (err.code === '23505') {
              console.log(`[Webhook] Entitlement already exists for session ${sessionId}, product ${entitlement.product_key} - treating as success`)
            } else {
              console.error(`[Webhook] Error inserting entitlement for ${entitlement.product_key}:`, err)
              throw err
            }
          }
        }
      } else {
        // Insert single entitlement
        const entitlement = {
          user_id: userId,
          product_key: productKey,
          stripe_checkout_session_id: sessionId,
          status: 'active',
        }

        try {
          const { error: insertError } = await supabase
            .from('entitlements')
            .insert(entitlement)

          if (insertError) {
            // If it's a unique constraint violation, treat as success (idempotent)
            if (insertError.code === '23505') {
              console.log(`[Webhook] Entitlement already exists for session ${sessionId}, product ${productKey} - treating as success`)
            } else {
              throw insertError
            }
          } else {
            console.log(`[Webhook] Created entitlement for user ${userId}, product ${productKey}`)
          }
        } catch (err: any) {
          // Handle unique constraint violation as success (idempotent)
          if (err.code === '23505') {
            console.log(`[Webhook] Entitlement already exists for session ${sessionId}, product ${productKey} - treating as success`)
          } else {
            console.error('[Webhook] Error inserting entitlement:', err)
            throw err
          }
        }
      }

      console.log(`[Webhook] Successfully processed checkout.session.completed for session ${sessionId}`)
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

