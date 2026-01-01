# Required Vercel Environment Variables

## Required (Must Have)

1. `NEXT_PUBLIC_SUPABASE_URL`
   - Your Supabase project URL
   - Example: `https://xxxxx.supabase.co`
   - Find in: Supabase Dashboard → Project Settings → API → Project URL

2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Your Supabase anonymous/public key
   - Find in: Supabase Dashboard → Project Settings → API → Project API keys → `anon` `public`

3. `OPENAI_API_KEY`
   - Your OpenAI API key
   - Get from: https://platform.openai.com/api-keys

## Recommended (For Full Functionality)

4. `SUPABASE_SERVICE_ROLE_KEY`
   - Your Supabase service role key (bypasses RLS)
   - Find in: Supabase Dashboard → Project Settings → API → Project API keys → `service_role` `secret`
   - **IMPORTANT**: Keep this secret, never expose in client-side code

## Optional (For Enhanced Features)

5. `TAXJAR_API_KEY` (optional)
   - TaxJar API key for accurate tax rate lookups

6. `AVALARA_ACCOUNT_ID` (optional)
   - Avalara account ID for tax rate lookups

7. `AVALARA_LICENSE_KEY` (optional)
   - Avalara license key (used with AVALARA_ACCOUNT_ID)

## Notes

- Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- `SUPABASE_SERVICE_ROLE_KEY` should only be used server-side
- Without `SUPABASE_SERVICE_ROLE_KEY`, some pack unlock features may not work due to RLS
- Tax lookup will fall back to state-based estimates if TaxJar/Avalara keys are not provided





