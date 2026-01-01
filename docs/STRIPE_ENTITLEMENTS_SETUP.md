# Stripe Entitlements Setup Guide

## Overview
This document describes the complete Stripe → Supabase entitlements unlock flow for DealWise.

## Architecture

1. **User clicks "Unlock This Pack"** → Frontend calls `/api/checkout/create`
2. **Checkout creates Stripe session** → Includes `user_id` and `pack_key` in metadata
3. **User completes payment** → Stripe sends `checkout.session.completed` webhook
4. **Webhook grants entitlements** → Updates `user_entitlements` table in Supabase
5. **UI reflects unlock** → `/packs` page shows "You have access" after refresh

## Database Schema

### Table: `public.user_entitlements`

```sql
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_time BOOLEAN NOT NULL DEFAULT FALSE,
  in_person BOOLEAN NOT NULL DEFAULT FALSE,
  bundle BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**RLS Policies:**
- Users can SELECT their own entitlements (`auth.uid() = user_id`)
- No client inserts/updates (only service role via webhook)

**Migration File:** `supabase/migrations/001_user_entitlements.sql`

## Environment Variables

### Required in Vercel:

1. **STRIPE_SECRET_KEY** - Stripe secret key (starts with `sk_`)
2. **STRIPE_WEBHOOK_SECRET** - Webhook signing secret (starts with `whsec_`)
3. **STRIPE_PRICE_FIRST_TIME** - Price ID for First-Time pack (starts with `price_`)
4. **STRIPE_PRICE_IN_PERSON** - Price ID for In-Person pack (starts with `price_`)
5. **STRIPE_PRICE_BUNDLE** - Price ID for Bundle pack (starts with `price_`)
6. **NEXT_PUBLIC_SUPABASE_URL** - Supabase project URL
7. **SUPABASE_SERVICE_ROLE_KEY** - Supabase service role key (bypasses RLS)

## Setup Steps

### 1. Create Database Table

Run the migration in Supabase SQL Editor:
```bash
# Copy contents of supabase/migrations/001_user_entitlements.sql
# Paste into Supabase Dashboard → SQL Editor → Run
```

### 2. Configure Stripe Webhook

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. **Endpoint URL:** `https://your-domain.com/api/stripe/webhook`
4. **Events to send:** Select `checkout.session.completed`
5. Click **"Add endpoint"**
6. Copy the **"Signing secret"** (starts with `whsec_`)
7. Add to Vercel as `STRIPE_WEBHOOK_SECRET`

### 3. Get Supabase Service Role Key

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Find **"service_role"** key (⚠️ Keep this secret!)
3. Copy the key
4. Add to Vercel as `SUPABASE_SERVICE_ROLE_KEY`

### 4. Verify Price IDs

Ensure Stripe Price IDs are set in Vercel:
- `STRIPE_PRICE_FIRST_TIME` = `price_...`
- `STRIPE_PRICE_IN_PERSON` = `price_...`
- `STRIPE_PRICE_BUNDLE` = `price_...`

**How to get Price IDs:**
1. Go to **Stripe Dashboard** → **Products**
2. Click on a product
3. Under **"Pricing"**, find the **Price ID** (starts with `price_`)
4. Copy the Price ID (not the Product ID which starts with `prod_`)

## Pack Prices

Current prices displayed in UI:
- **First-Time Buyer Pack:** $15
- **In-Person Negotiation Pack:** $10
- **Bundle (Both Packs):** $22

Update prices in `app/packs/page.tsx`:
```typescript
const PACK_PRICES: Record<string, number> = {
  first_time: 15,
  in_person: 10,
  bundle: 22,
}
```

## Testing Checklist

### Local Testing

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Start local server:**
   ```bash
   npm run start
   ```

3. **Test checkout flow:**
   - Sign in to the app
   - Go to `/packs`
   - Click "Unlock This Pack" on a locked pack
   - Complete test payment in Stripe (use test card: `4242 4242 4242 4242`)
   - Verify redirect back to `/packs?checkout=success`

### Production Testing

1. **Verify webhook receives events:**
   - Go to **Stripe Dashboard** → **Developers** → **Webhooks**
   - Click on your webhook endpoint
   - Check **"Recent events"** tab
   - Verify `checkout.session.completed` events show **200** status

2. **Verify entitlements in Supabase:**
   - Go to **Supabase Dashboard** → **Table Editor** → `user_entitlements`
   - Find row with your `user_id`
   - Verify correct flags are set:
     - `first_time = true` (if purchased first_time pack)
     - `in_person = true` (if purchased in_person pack)
     - `bundle = true` AND both flags = true (if purchased bundle)

3. **Verify UI reflects unlock:**
   - Refresh `/packs` page
   - Verify pack shows "You have access" badge
   - Verify "Activate This Pack" button is enabled
   - Verify deep links are accessible

### Bundle Unlock Test

1. Purchase bundle pack
2. Verify in Supabase:
   - `bundle = true`
   - `first_time = true`
   - `in_person = true`
3. Verify in UI:
   - Both packs show "You have access"
   - Both packs' deep links are accessible

## Troubleshooting

### Webhook returns 400/500

**Check:**
- `STRIPE_WEBHOOK_SECRET` is set correctly in Vercel
- Webhook endpoint URL in Stripe matches your deployment URL
- Check Vercel logs for error messages

### Entitlements not updating

**Check:**
- `SUPABASE_SERVICE_ROLE_KEY` is set correctly in Vercel
- `user_entitlements` table exists and RLS is enabled
- Check Vercel logs for webhook processing errors
- Verify `user_id` is present in checkout session metadata

### UI not showing unlock

**Check:**
- User is signed in (entitlements are user-specific)
- `useEntitlements` hook is loading correctly
- Check browser console for errors
- Verify entitlements exist in Supabase for that user

### Price IDs not working

**Check:**
- Price IDs start with `price_` (not `prod_`)
- Price IDs are correct in Vercel env vars
- Prices exist in Stripe Dashboard

## Code Files

### API Routes
- `app/api/checkout/create/route.ts` - Creates Stripe checkout session
- `app/api/stripe/webhook/route.ts` - Handles Stripe webhook events

### Client Hooks
- `hooks/useEntitlements.ts` - Reads entitlements from Supabase

### UI Components
- `app/packs/page.tsx` - Displays packs with prices and unlock states

### Database
- `supabase/migrations/001_user_entitlements.sql` - Table schema

## Security Notes

⚠️ **Important:**
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code
- Never expose `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET`
- Service role key bypasses RLS - only use server-side
- Webhook verifies Stripe signatures to prevent unauthorized requests

