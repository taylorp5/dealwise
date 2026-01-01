-- Quick fix: Remove duplicate policies
-- Copy and paste this into your Supabase SQL Editor

-- Drop the duplicate policies that are causing the error
DROP POLICY IF EXISTS "Users can insert their own deals" ON public.deals;
DROP POLICY IF EXISTS "Users can select their own deals" ON public.deals;
DROP POLICY IF EXISTS "Users can update their own deals" ON public.deals;
DROP POLICY IF EXISTS "Users can delete their own deals" ON public.deals;

DROP POLICY IF EXISTS "Users can insert their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can select their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can update their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can delete their own analyses" ON public.analyses;

-- Add user_id to analyses table if it doesn't exist (needed for API)
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

-- Update existing analyses to have user_id (if any exist)
UPDATE public.analyses a
SET user_id = d.user_id
FROM public.deals d
WHERE a.deal_id = d.id
AND a.user_id IS NULL;






