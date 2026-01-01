-- Entitlements Schema for Stripe Checkout
-- Run this in your Supabase SQL Editor

-- Create entitlements table
CREATE TABLE IF NOT EXISTS public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_key TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  stripe_checkout_session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Unique constraint on (session_id, product_key) to allow multiple products per session (e.g., bundle_both)
  UNIQUE(stripe_checkout_session_id, product_key)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_entitlements_user_id ON public.entitlements(user_id);

-- Create index on stripe_checkout_session_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_entitlements_session_id ON public.entitlements(stripe_checkout_session_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can SELECT their own entitlements
DROP POLICY IF EXISTS "Users can view own entitlements" ON public.entitlements;
CREATE POLICY "Users can view own entitlements"
  ON public.entitlements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No client inserts/updates (only server-side via service role key)

