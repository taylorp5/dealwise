import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { STRIPE_PRICES, getPriceConfigByPriceId } from '@/lib/stripe/prices'

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    console.error('[Webhook] STRIPE_SECRET_KEY not configured')
    return NextResponse.json(
      { error: 'Stripe secret key not configured' },
      { status: 500 }
    )
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-12-15.clover',
  })
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
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
      const userId = session.metadata?.user_id
      if (!userId) {
        console.error('[Webhook] Missing user_id in session metadata')
        return NextResponse.json(
          { error: 'Missing user_id in session metadata' },
          { status: 400 }
        )
      }

      // Retrieve the session to get line items
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items'],
      })

      const lineItems = fullSession.line_items?.data || []
      if (lineItems.length === 0) {
        console.error('[Webhook] No line items found in session')
        return NextResponse.json(
          { error: 'No line items found' },
          { status: 400 }
        )
      }

      // Get price ID from first line item
      const priceId = lineItems[0].price?.id
      if (!priceId) {
        console.error('[Webhook] No price ID found in line items')
        return NextResponse.json(
          { error: 'No price ID found' },
          { status: 400 }
        )
      }

      // Get price config to determine which packs to unlock
      const priceConfig = getPriceConfigByPriceId(priceId)
      if (!priceConfig) {
        console.error(`[Webhook] Unknown price ID: ${priceId}`)
        return NextResponse.json(
          { error: `Unknown price ID: ${priceId}` },
          { status: 400 }
        )
      }

      // Unlock packs based on price ID
      const supabase = createServerSupabase()
      
      // Use service role key for admin operations
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!serviceRoleKey) {
        console.error('[Webhook] SUPABASE_SERVICE_ROLE_KEY not configured')
        return NextResponse.json(
          { error: 'Service role key not configured' },
          { status: 500 }
        )
      }

      const { createClient } = await import('@supabase/supabase-js')
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
          auth: { persistSession: false, autoRefreshToken: false },
        }
      )

      // Unlock each pack in the price config
      for (const packId of priceConfig.packIds) {
        // Check if pack already unlocked
        const { data: existingPack } = await adminSupabase
          .from('user_packs')
          .select('id, is_unlocked')
          .eq('user_id', userId)
          .eq('pack_id', packId)
          .single()

        if (existingPack) {
          // Update if exists but not unlocked
          if (!existingPack.is_unlocked) {
            await adminSupabase
              .from('user_packs')
              .update({
                is_unlocked: true,
                unlocked_at: new Date().toISOString(),
              })
              .eq('id', existingPack.id)
          }
        } else {
          // Insert new unlock
          await adminSupabase
            .from('user_packs')
            .insert({
              user_id: userId,
              pack_id: packId,
              is_unlocked: true,
              unlocked_at: new Date().toISOString(),
            })
        }
      }

      console.log(`[Webhook] Unlocked packs ${priceConfig.packIds.join(', ')} for user ${userId}`)

      return NextResponse.json({ received: true })
    } catch (error: any) {
      console.error('[Webhook] Error processing checkout.session.completed:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to process webhook' },
        { status: 500 }
      )
    }
  }

  // Return 200 for other event types (we only care about checkout.session.completed)
  return NextResponse.json({ received: true })
}

