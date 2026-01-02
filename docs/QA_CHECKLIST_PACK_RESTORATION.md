# QA Checklist: Pack Functionality Restoration

## Pre-Testing Setup
1. Ensure you have test accounts with:
   - Free pack (no entitlements)
   - First-Time Buyer Pack unlocked
   - In-Person Negotiation Pack unlocked
   - Bundle Pack unlocked (both packs)

## 1. Pack Unlock Links Routing

### First-Time Buyer Pack
- [ ] Go to `/packs` page
- [ ] Unlock First-Time Buyer Pack (if not already unlocked)
- [ ] Click "Listing Analyzer" link
  - **Expected**: Should land on `/analyzer/first-time`
  - **Verify**: Page shows "Analyzer Variant: first_time" (dev mode) or first-time specific content
- [ ] Click "Smart OTD Builder" link
  - **Expected**: Should land on `/calculator`
- [ ] Verify "First-Time Buyer Negotiation Draft Builder" link is **NOT** shown (removed - functionality integrated into Deal Readiness Assessment)

### In-Person Negotiation Pack
- [ ] Go to `/packs` page
- [ ] Unlock In-Person Negotiation Pack (if not already unlocked)
- [ ] Click "Listing Analyzer" link
  - **Expected**: Should land on `/analyzer/in-person`
  - **Verify**: Page shows "Analyzer Variant: in_person" (dev mode) or in-person specific content
- [ ] Verify "Smart OTD Builder" link is **NOT** shown (in-person pack doesn't include it)
- [ ] Click "In-Person Negotiation Tools" link
  - **Expected**: Should land on `/copilot/in-person` (Mode Picker)
  - **Verify**: Mode Picker shows:
    - "Prepare Me" card with "Start Preparing" button
    - "Dealer Simulation (Coming Soon)" card (disabled, shows Coming Soon badge)

### Bundle Pack
- [ ] Go to `/packs` page
- [ ] Unlock Bundle Pack (if not already unlocked)
- [ ] Verify bundle pack shows "You have access" but **NO deep links** (links appear in individual packs)

## 2. In-Person Pack Flow

### Prepare Me Page
- [ ] From `/packs`, click "In-Person Negotiation Tools" for unlocked in-person pack
- [ ] Should land on `/copilot/in-person` (Mode Picker)
- [ ] Click "Start Preparing" button
- [ ] **Expected**: Should navigate to `/copilot/in-person/prepare`
- [ ] **Verify**: Prepare Me page loads with 6 steps
- [ ] **Verify**: Can navigate through steps
- [ ] **Verify**: Can complete Step 1 (Set Your Numbers)
- [ ] **Verify**: Can print/save checklist

### Dealer Simulation (Coming Soon)
- [ ] From `/copilot/in-person` (Mode Picker)
- [ ] **Verify**: "Dealer Simulation (Coming Soon)" card is visible
- [ ] **Verify**: Card shows "Coming Soon" badge
- [ ] **Verify**: Card is styled as disabled (grayed out)
- [ ] **Verify**: Card shows feature list but no active button

## 3. Listing Analyzer URL Handling

### Cars.com URLs
- [ ] Go to `/analyzer/free` (or any analyzer variant)
- [ ] Paste a cars.com listing URL (e.g., `https://www.cars.com/vehicles/detail/...`)
- [ ] Click "Analyze Listing"
- [ ] **Expected**: URL should be accepted
- [ ] **Expected**: Listing should be fetched and analyzed
- [ ] **Expected**: Deal Plan should be generated
- [ ] **Verify**: No "Domain not allowed" or "Invalid URL" errors

### Other Dealership URLs
- [ ] Test with AutoTrader URL
- [ ] Test with CarGurus URL
- [ ] Test with generic dealer website URL
- [ ] **Expected**: All should work (not blocked)

### Blocked Domains
- [ ] Test with `https://google.com` (should be blocked)
- [ ] Test with `https://facebook.com` (should be blocked)
- [ ] **Expected**: Should show "Domain not allowed" error

## 4. Pack Context Persistence

### Analyzer Routes
- [ ] Navigate to `/analyzer/first-time`
- [ ] **Verify**: Page shows first-time variant (check dev label or content)
- [ ] Navigate to `/analyzer/in-person`
- [ ] **Verify**: Page shows in-person variant (check dev label or content)
- [ ] Navigate to `/analyzer/free`
- [ ] **Verify**: Page shows free variant

### Entitlement Checks
- [ ] While logged out, try to access `/analyzer/first-time`
  - **Expected**: Should redirect to `/analyzer/free`
- [ ] While logged in without first-time pack, try to access `/analyzer/first-time`
  - **Expected**: Should redirect to `/analyzer/free`
- [ ] While logged in with first-time pack, access `/analyzer/first-time`
  - **Expected**: Should load successfully

## 5. Pack Variant Mixing Prevention

### Test Pack Context Isolation
- [ ] Start at `/analyzer/first-time`
- [ ] Analyze a listing
- [ ] Click "Open Negotiation Draft Builder" from Deal Plan
- [ ] **Expected**: Should navigate to `/copilot/first-time` (not in-person)
- [ ] Start at `/analyzer/in-person`
- [ ] Analyze a listing
- [ ] Click "Open Negotiation Draft Builder" from Deal Plan
- [ ] **Expected**: Should navigate to `/copilot/in-person` (mode picker, not first-time)

## 6. Build Verification

- [ ] Run `npm run build`
- [ ] **Expected**: Build should complete without errors
- [ ] **Expected**: No TypeScript errors
- [ ] **Expected**: No linting errors

## Issues to Report

If any test fails, report:
1. Which test failed
2. What you expected vs what happened
3. Browser console errors (if any)
4. Network tab errors (if any)
5. Screenshots if applicable


