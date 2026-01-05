# V2 Live Pressure Mode Feature

## Overview

Live Pressure Mode is a V2 feature that provides an interactive dealership pressure simulation. Users practice responding to dealer tactics and receive real-time feedback on their negotiation responses.

## What Was Added

### New Route
- **Path**: `/copilot/in-person/live-pressure`
- **Access**: Requires In-Person Negotiation Pack entitlement
- **Guard**: Uses existing `useEntitlements()` hook pattern

### New Components

1. **LeverageMeter** (`components/live-pressure/LeverageMeter.tsx`)
   - Visual horizontal bar showing negotiation leverage
   - States: Dealer Control ↔ Neutral ↔ Buyer Control
   - Updates dynamically based on user responses

2. **SuggestedReplyChips** (`components/live-pressure/SuggestedReplyChips.tsx`)
   - Beginner-friendly suggested response buttons (2-3 chips)
   - Clicking a chip fills the input field

3. **FeedbackPanel** (`components/live-pressure/FeedbackPanel.tsx`)
   - Shows response classification (Strong/Neutral/Weak)
   - Displays 1-2 bullet points explaining why the response was classified that way

### Simulation Engine

**File**: `lib/simulation/live-pressure-engine.ts`

- **Tactics Library**: Three tactics with 3 canned dealer lines each:
  - Scarcity: "Last one on the lot", "Selling fast", etc.
  - Authority: "Manager said...", "Best price we can do", etc.
  - Urgency: "Price only good today", "Promotion ending", etc.

- **Response Classification**: Simple keyword-based heuristics
  - Strong: "walk", "leave", "compare offers", "send OTD breakdown", "not deciding today", "out-the-door", etc.
  - Weak: "love this car", "need it today", "what can you do", "I can stretch my budget", "monthly payment focus", etc.
  - Neutral: Default for questions, requests for details, or unclear responses

- **Leverage System**: Integer score from -2 to +2
  - -2/-1: Dealer control
  - 0: Neutral
  - +1/+2: Buyer control
  - Updates based on response classification

- **Turn Management**: 5-7 turns per simulation (randomized)

### Updated Files

- **`app/copilot/in-person/page.tsx`**: Added "Live Pressure Mode" card replacing the "Coming Soon" placeholder

## How to Run Locally

1. Ensure you're on the `v2-live-pressure-mode` branch:
   ```bash
   git checkout v2-live-pressure-mode
   ```

2. Install dependencies (if needed):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Navigate to the In-Person Pack page:
   - Sign in with a user that has In-Person Negotiation Pack entitlement
   - Go to `/copilot/in-person`
   - Click "Start Practice" on the Live Pressure Mode card

## How to Access the Route

### Direct Access
- URL: `http://localhost:3000/copilot/in-person/live-pressure`
- **Note**: Will redirect to `/packs` if user lacks In-Person entitlement

### Via In-Person Pack Page
1. Navigate to `/copilot/in-person`
2. Click "Start Practice" button on the Live Pressure Mode card

## Environment Variables

**No new environment variables required.** This feature uses:
- Existing Supabase client (for entitlement checks)
- Client-side state management (no database writes)
- No external API calls

## Testing Checklist

- [ ] User without entitlement cannot access `/copilot/in-person/live-pressure` (redirects to packs)
- [ ] User with entitlement can access and run simulation
- [ ] Leverage meter updates after each turn
- [ ] Response classification works (Strong/Neutral/Weak)
- [ ] Feedback panel shows after each user response
- [ ] Simulation ends after 5-7 turns
- [ ] End state summary shows final leverage and biggest mistake/win
- [ ] "Try Again" button resets simulation
- [ ] "Back to In-Person Pack" button navigates correctly
- [ ] Suggested reply chips fill the input when clicked
- [ ] No runtime errors in browser console

## Vercel Preview Deployment

### Creating Preview Deployment

1. **Push the branch** (do NOT merge to main):
   ```bash
   git push origin v2-live-pressure-mode
   ```

2. **Vercel will automatically**:
   - Detect the push
   - Create a Preview Deployment
   - Generate a preview URL (e.g., `https://dealwise-v2-live-pressure-mode.vercel.app`)

3. **Verify Preview URL**:
   - Check Vercel dashboard for the preview deployment
   - Test the feature on the preview URL
   - Confirm production (main branch) is untouched

### Safety Checklist

- [x] All changes are on `v2-live-pressure-mode` branch only
- [x] No changes to production routes (`/packs`, `/checkout`, webhooks)
- [x] No changes to Stripe integration
- [x] No changes to entitlement logic (only uses existing helpers)
- [x] No new environment variables
- [x] No database schema changes
- [x] Preview deployment tested and working

## Production Safety

**CRITICAL**: This feature is V2-only and must remain on the preview branch until ready for production.

- **DO NOT** merge `v2-live-pressure-mode` into `main` without explicit approval
- **DO NOT** promote the preview deployment to production
- **DO NOT** modify any production environment variables
- All changes are isolated to the feature branch

## Future Enhancements (Not in MVP)

- Multiple scenarios (currently only "Price discussion on the lot")
- Voice input
- Multi-scenario selector
- Subscription/payment integration
- Advanced NLP for response classification
- More tactics beyond the three included

## Files Changed Summary

### New Files
- `lib/simulation/live-pressure-engine.ts` - Simulation engine
- `components/live-pressure/LeverageMeter.tsx` - Leverage visualization
- `components/live-pressure/SuggestedReplyChips.tsx` - Suggested replies UI
- `components/live-pressure/FeedbackPanel.tsx` - Feedback display
- `app/copilot/in-person/live-pressure/page.tsx` - Main feature page
- `docs/v2-live-pressure-mode.md` - This documentation

### Modified Files
- `app/copilot/in-person/page.tsx` - Added Live Pressure Mode card

### No Changes To
- Stripe integration
- Checkout flow
- Webhook handlers
- Entitlement database schema
- Production routes
- Environment variables


