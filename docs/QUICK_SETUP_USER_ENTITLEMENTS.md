# Quick Setup: Create user_entitlements Table

## The Error
```
"Could not find the table 'public.user_entitlements' in the schema cache"
```

This means the table doesn't exist in your Supabase database yet.

## Solution: Run the Migration

### Step 1: Open Supabase SQL Editor

1. Go to your **Supabase Dashboard**
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"**

### Step 2: Copy and Paste the Migration

Copy the entire contents of `supabase/migrations/001_user_entitlements.sql` and paste it into the SQL Editor:

```sql
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
```

### Step 3: Run the Query

1. Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`)
2. You should see: **"Success. No rows returned"**

### Step 4: Verify the Table Exists

1. Go to **"Table Editor"** in the left sidebar
2. Look for **`user_entitlements`** in the table list
3. If you see it, the table was created successfully!

### Step 5: Test the Webhook Again

1. Go to **Stripe Dashboard** → **Webhooks**
2. Find the failed webhook event
3. Click **"Resend"** to retry
4. The webhook should now succeed (200 status)

## Alternative: Check if Table Already Exists

If you're not sure if the table exists, run this query first:

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_entitlements'
);
```

If it returns `true`, the table exists. If `false`, run the migration above.

## Troubleshooting

### "Permission denied" error
- Make sure you're logged into Supabase Dashboard with admin access
- The SQL Editor should have full permissions

### "Relation already exists" error
- The table already exists - this is fine!
- Skip to Step 4 to verify

### Still getting webhook errors after creating table
- Wait a few seconds for Supabase to update the schema cache
- Try resending the webhook event in Stripe
- Check Vercel logs for any other errors


