## Packs & Access Gating (Placeholder Paywall)

### Tables (Supabase)
- `packs`: catalog of packs (seeded in `docs/packs-schema.sql`)
- `user_packs`: user unlocks (`is_unlocked`, `unlocked_at`)
- `user_profiles`: stores `selected_pack_id`

### API Endpoints
- `GET /api/packs`: returns packs, user unlocks, selectedPackId
- `POST /api/packs/select`: set selected pack for user
- `POST /api/packs/unlock`: placeholder unlock (no Stripe) — marks `is_unlocked=true`

### UI
- `/packs`: show pack cards, locked/unlocked, select pack, unlock pack (placeholder)
- Script Generator: shows active pack badge; if locked, pack questions/education are hidden; if unlocked, pack questions + education appear and pack-aware prompt is used.

### Prompt Integration
- Script Generator sends `selectedPackId`, `packAnswers`, and competitive offers.
- Backend loads pack education and passes to prompt builder; prompts remain suggestive (no guarantees).

### Stripe Placeholder
- No Stripe wired. `POST /api/packs/unlock` simply upserts `user_packs.is_unlocked=true`.
- Replace this endpoint later with real Stripe checkout; keep the UI button but wire to Stripe when ready.

# Packs & Paywall (Placeholder)

This implementation adds packs with locked/unlocked status, selection, and pack-aware prompts. No Stripe integration yet; unlocking is a placeholder that marks the pack as unlocked in Supabase.

## Schema (Supabase)
- `packs`: catalog (seeded)
- `user_packs`: unlock status
- `user_profiles`: selected_pack_id

See `docs/packs-schema.sql` to run the SQL (includes RLS).

## API
- `GET /api/packs`: list packs, user unlock status, selected pack
- `POST /api/packs/unlock`: placeholder unlock (marks is_unlocked=true)
- `POST /api/packs/select`: set selected pack in `user_profiles`

## UI
- `/packs`: shows pack cards, locked/unlocked, unlock button (placeholder), select pack, CTA to Script Generator.
- Script Generator shows active pack badge, pack questions when unlocked, and passes pack type/answers to the prompt.

## Prompts
- `lib/prompts/script-wizard.ts` now accepts `packType` and `packAnswers` and includes them in the user prompt.
- Pack definitions live in `lib/packs/config.ts` and are easy to edit.

## Stripe
- Not implemented. Replace `/api/packs/unlock` with Stripe flow later; keep its use isolated so it can be swapped.

