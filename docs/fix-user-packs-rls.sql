-- Fix RLS policies for user_packs to work with server-side API routes
-- Run this in your Supabase SQL Editor

-- The issue is that RLS policies check auth.uid() which may not work
-- properly with Bearer tokens in server-side API routes when the token
-- is passed in custom headers instead of the session.

-- Option 1: Ensure policies exist and are correct (run this first)
DROP POLICY IF EXISTS "Users can insert own user_packs" ON public.user_packs;
DROP POLICY IF EXISTS "Users can update own user_packs" ON public.user_packs;

-- Recreate INSERT policy - allow authenticated users to insert their own records
CREATE POLICY "Users can insert own user_packs" 
  ON public.user_packs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Recreate UPDATE policy - allow authenticated users to update their own records  
CREATE POLICY "Users can update own user_packs"
  ON public.user_packs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Option 2: If Option 1 doesn't work, temporarily disable RLS for testing
-- (NOT RECOMMENDED FOR PRODUCTION - only for debugging)
-- ALTER TABLE public.user_packs DISABLE ROW LEVEL SECURITY;

-- Option 3: Use service role key in API route (bypasses RLS)
-- This requires setting SUPABASE_SERVICE_ROLE_KEY in your .env.local
-- and using it instead of NEXT_PUBLIC_SUPABASE_ANON_KEY for server-side operations

