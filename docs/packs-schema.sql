-- Packs Schema for Negotiation Packs
-- Run in Supabase SQL Editor

-- Packs catalog
CREATE TABLE IF NOT EXISTS public.packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  features JSONB,
  is_active BOOLEAN DEFAULT TRUE
);

-- User packs (unlock status)
CREATE TABLE IF NOT EXISTS public.user_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  is_unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- User profile with selected pack
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  selected_pack_id TEXT REFERENCES public.packs(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Packs: public readable
DROP POLICY IF EXISTS "Packs are readable by all" ON public.packs;
CREATE POLICY "Packs are readable by all"
  ON public.packs
  FOR SELECT
  TO public
  USING (is_active = TRUE);

-- user_packs policies
DROP POLICY IF EXISTS "Users can view own user_packs" ON public.user_packs;
CREATE POLICY "Users can view own user_packs"
  ON public.user_packs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own user_packs" ON public.user_packs;
CREATE POLICY "Users can insert own user_packs"
  ON public.user_packs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own user_packs" ON public.user_packs;
CREATE POLICY "Users can update own user_packs"
  ON public.user_packs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own profile" ON public.user_profiles;
CREATE POLICY "Users can upsert own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Seed packs
INSERT INTO public.packs (id, name, description, features, is_active)
VALUES
  ('first_time', 'First-Time Buyer Pack', 'Guidance for first-time buyers: financing basics, affordability, clarity.', '["Budget & credit band questions","APR/term definitions","OTD vs monthly education","First-time friendly scripts"]', TRUE),
  ('cash', 'Cash Buyer Pack', 'Cash-specific tactics and proof-of-funds handling.', '["Cash disclosure timing","Proof-of-funds guidance","OTD and fees focus","No monthly payment talk"]', TRUE),
  ('financing', 'Financing Buyer Pack', 'Financing coaching: APR, term, pre-approval leverage.', '["Max monthly & OTD focus","Pre-approval leverage","APR/term questions","Payment anchoring avoidance"]', TRUE),
  ('in_person', 'In-Person Negotiation Pack', 'Dealership talk tracks and pressure handling.', '["Short talk tracks","Manager/pressure tactics","If they say X → say Y","Printable/notes mode"]', TRUE)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active;



