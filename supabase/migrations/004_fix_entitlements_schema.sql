CREATE TABLE IF NOT EXISTS public.user_entitlements (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_time BOOLEAN NOT NULL DEFAULT FALSE,
  in_person BOOLEAN NOT NULL DEFAULT FALSE,
  bundle BOOLEAN NOT NULL DEFAULT FALSE,
  pack_id TEXT,
  status TEXT DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,
  payment_intent_id TEXT,
  checkout_session_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_entitlements' 
                 AND column_name = 'pack_id') THEN
    ALTER TABLE public.user_entitlements ADD COLUMN pack_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_entitlements' 
                 AND column_name = 'status') THEN
    ALTER TABLE public.user_entitlements ADD COLUMN status TEXT DEFAULT 'active';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_entitlements' 
                 AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE public.user_entitlements ADD COLUMN stripe_customer_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_entitlements' 
                 AND column_name = 'stripe_payment_intent_id') THEN
    ALTER TABLE public.user_entitlements ADD COLUMN stripe_payment_intent_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_entitlements' 
                 AND column_name = 'payment_intent_id') THEN
    ALTER TABLE public.user_entitlements ADD COLUMN payment_intent_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_entitlements' 
                 AND column_name = 'checkout_session_id') THEN
    ALTER TABLE public.user_entitlements ADD COLUMN checkout_session_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_entitlements' 
                 AND column_name = 'created_at') THEN
    ALTER TABLE public.user_entitlements ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_entitlements' 
                 AND column_name = 'updated_at') THEN
    ALTER TABLE public.user_entitlements ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_entitlements_user_pack 
ON public.user_entitlements(user_id, pack_id) 
WHERE pack_id IS NOT NULL;

DROP INDEX IF EXISTS idx_user_entitlements_checkout_session;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_entitlements_checkout_session 
ON public.user_entitlements(checkout_session_id) 
WHERE checkout_session_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_entitlements_checkout_session_id_key'
  ) THEN
    ALTER TABLE public.user_entitlements 
    ADD CONSTRAINT user_entitlements_checkout_session_id_key 
    UNIQUE (checkout_session_id);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id ON public.user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_pack_id ON public.user_entitlements(pack_id) WHERE pack_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_entitlements_status ON public.user_entitlements(status);

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own entitlements" ON public.user_entitlements;
CREATE POLICY "Users can view own entitlements"
  ON public.user_entitlements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
