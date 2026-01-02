-- User Entitlements Schema for Stripe Checkout
-- Run this in your Supabase SQL Editor

-- Create user_entitlements table
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_time BOOLEAN NOT NULL DEFAULT FALSE,
  in_person BOOLEAN NOT NULL DEFAULT FALSE,
  bundle BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id (already primary key, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id ON public.user_entitlements(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can SELECT their own entitlements
DROP POLICY IF EXISTS "Users can view own entitlements" ON public.user_entitlements;
CREATE POLICY "Users can view own entitlements"
  ON public.user_entitlements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No direct user insert/update policies (only service role updates via server)


