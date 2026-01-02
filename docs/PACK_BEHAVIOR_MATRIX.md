# Pack Behavior Matrix

## Overview
This document defines the correct behavior for each pack variant (Free, First-Time, In-Person) based on the pre-deploy working version.

## Pack Routes & Links

### Free Pack
- **Listing Analyzer**: `/analyzer/free`
- **Smart OTD Builder**: `/calculator` ✅
- **Negotiation Draft Builder**: `/copilot/free`

### First-Time Buyer Pack
- **Listing Analyzer** (Deal Readiness Assessment): `/analyzer/first-time` ✅
- **Smart OTD Builder**: `/calculator` ✅
- **Negotiation Draft Builder**: ❌ (Removed - functionality integrated into Deal Readiness Assessment)

### In-Person Negotiation Pack
- **Listing Analyzer**: `/analyzer/in-person`
- **Smart OTD Builder**: ❌ (Not available for in-person pack)
- **Negotiation Draft Builder**: `/copilot/in-person` (Mode Picker)
  - Mode Picker shows:
    - **Prepare Me** → `/copilot/in-person/prepare` ✅
    - **Dealer Simulation** → Coming Soon (shown as disabled card) ✅

## Pack-Specific Features

### Listing Analyzer Variants
- **Free**: Basic analysis, no pack-specific prompts
- **First-Time**: Includes first-time buyer education and guidance
- **In-Person**: Focuses on in-person negotiation preparation

### Negotiation Draft Builder Variants
- **Free**: Basic negotiation scripts
- **First-Time**: ❌ (Removed - safe written guardrail messages now embedded in Deal Readiness Assessment)
- **In-Person**: 
  - Mode Picker at `/copilot/in-person`
  - Prepare Me flow at `/copilot/in-person/prepare`
  - Live Coach at `/copilot/in-person/live`
  - Dealer Simulation: Coming Soon (shown in mode picker)

## URL Handling

### Cars.com URLs
- ✅ **Allowed**: All cars.com URLs should be accepted
- ✅ **Extraction**: Uses `extractCarsCom` function
- ✅ **Validation**: No special blocking for cars.com domains
- ✅ **Normalization**: URL parsing handles cars.com patterns

### Other Dealership URLs
- ✅ **Allowed**: Any dealership domain (not blocked)
- ✅ **Blocked**: Only social media domains (google.com, facebook.com, etc.)

## Entitlement Checks

### Analyzer Routes
- `/analyzer/free`: No entitlement check (always accessible)
- `/analyzer/first-time`: Requires `first_time` pack or `bundle` pack
- `/analyzer/in-person`: Requires `in_person` pack or `bundle` pack

### Copilot Routes
- `/copilot/free`: No entitlement check (always accessible)
- `/copilot/first-time`: Redirects to `/analyzer/first-time` (Deal Readiness Assessment)
- `/copilot/in-person`: Requires `in_person` pack or `bundle` pack
- `/copilot/in-person/prepare`: Requires `in_person` pack or `bundle` pack
- `/copilot/in-person/live`: Requires `in_person` pack or `bundle` pack

## Pack Context Persistence

- Pack variant is determined by the route (`/analyzer/first-time` = first_time variant)
- Pack context should NOT mix between variants
- Each route maintains its own variant context
- Entitlements are checked separately from pack context


