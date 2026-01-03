-- Support Tickets Schema
-- Run this in your Supabase SQL Editor

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email TEXT NOT NULL,
  topic TEXT NOT NULL,
  message TEXT NOT NULL,
  page_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at);

-- Create index on email for lookups
CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON public.support_tickets(email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow INSERT for anon and authenticated users (anyone can submit)
DROP POLICY IF EXISTS "Anyone can submit support tickets" ON public.support_tickets;
CREATE POLICY "Anyone can submit support tickets"
  ON public.support_tickets
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- RLS Policy: Deny SELECT/UPDATE/DELETE for anon users (only admins/service role can read)
-- No policy means denied by default for anon users
-- Authenticated users cannot read their own tickets either (admin-only access)

