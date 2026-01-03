-- Migration: Make pack entitlements persistent with Stripe metadata and idempotency
-- This migration adds Stripe metadata columns and webhook event tracking

-- Add Stripe metadata columns to user_entitlements
ALTER TABLE public.user_entitlements
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Create index on checkout_session_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_entitlements_checkout_session ON public.user_entitlements(checkout_session_id);

-- Create webhook_events table for idempotency tracking
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  checkout_session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  payload JSONB
);

-- Create indexes for webhook_events
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id ON public.webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_checkout_session ON public.webhook_events(checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id ON public.webhook_events(user_id);

-- Enable RLS on webhook_events (only service role can insert/select)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: No client access (only service role)
DROP POLICY IF EXISTS "No client access to webhook_events" ON public.webhook_events;
CREATE POLICY "No client access to webhook_events"
  ON public.webhook_events
  FOR ALL
  TO authenticated
  USING (false);

-- Add comment for documentation
COMMENT ON TABLE public.user_entitlements IS 'Stores pack entitlements per user. Flags are set to true when packs are purchased via Stripe.';
COMMENT ON TABLE public.webhook_events IS 'Tracks processed Stripe webhook events for idempotency. Prevents duplicate entitlement grants.';

