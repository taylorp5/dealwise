-- Fix duplicate policies issue
-- Run this in your Supabase SQL Editor
-- This will drop the duplicate policies and recreate them properly

-- First, drop the duplicate policies that might be causing conflicts
DROP POLICY IF EXISTS "Users can insert their own deals" ON public.deals;
DROP POLICY IF EXISTS "Users can select their own deals" ON public.deals;
DROP POLICY IF EXISTS "Users can update their own deals" ON public.deals;
DROP POLICY IF EXISTS "Users can delete their own deals" ON public.deals;

DROP POLICY IF EXISTS "Users can insert their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can select their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can update their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can delete their own analyses" ON public.analyses;

-- Now check if analyses table needs user_id column
-- Add user_id to analyses table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'analyses' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.analyses ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
    END IF;
END $$;

-- Recreate the policies with proper names (matching your existing schema style)
-- These should match what you already have, but we're ensuring they exist

-- Deals policies (should already exist, but ensuring they're correct)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'deals' 
        AND policyname = 'Users can insert own deals'
    ) THEN
        CREATE POLICY "Users can insert own deals"
        ON public.deals FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Analyses policies - using user_id directly (simpler than EXISTS subquery)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'analyses' 
        AND policyname = 'Users can insert own analyses'
    ) THEN
        CREATE POLICY "Users can insert own analyses"
        ON public.analyses FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;






