

# Plan: Make QA Simulation Module Real and Executable

## Problem
The current `simulateStep()` function in `useQASimulation.ts` uses `Math.random()` to randomly pass/fail each step. Nothing actually tests real infrastructure — no real edge function calls, no real route validation, no real database checks.

## What "Real" Means

Replace each mock step with actual validation logic that tests the live system:

### Step 1 — Extract (Real)
- Call the real `edge-enrich-prospect` or `fn-extract-business-data` edge function with a test company payload
- Validate the response contains required fields (business_name, category, city, email, phone)
- Check `outbound_companies` table for correct data insertion/update
- Report actual missing fields or errors from the real function

### Step 2 — Email (Real)
- Call `process-outbound-queue` or `send-transactional-email` with a dry-run/test flag
- Validate template rendering by calling `preview-transactional-email` with test variables
- Check that CTA URLs in the template resolve to valid routes
- Validate tracking pixel and open/click URL formation

### Step 3 — CTA Click (Real)
- Dynamically import the router config and check that target routes exist (`/entrepreneur/join`, `/entrepreneur/onboarding-voice`, `/join/:token`, etc.)
- Fetch each critical route's lazy component to verify it loads without error
- Validate URL parameters are preserved through navigation

### Step 4 — Signup (Real)
- Query `profiles` table to validate schema is correct for new contractor insertion
- Query `contractors` table to confirm FK structure
- Validate the auth flow by checking edge function `auth-email-hook` is deployed
- Check `user_roles` table structure for contractor role assignment

### Step 5 — Payment (Real)
- Call `create-checkout-session` edge function with a test payload (dry-run mode)
- Validate Stripe webhook edge function `stripe-webhook` is deployed and responds to OPTIONS
- Check `contractor_checkout_sessions` table schema
- Validate plan catalog exists in `plan_catalog` table

### Step 6 — Profile (Real)
- Query `contractors` table schema to verify all required columns exist
- Validate profile completion calculation logic against real column list
- Check that `contractor_category_assignments` and `service_regions` tables accept inserts
- Verify activation flow edge functions are deployed (`admin-activation-publish`)

## Implementation

### 1. Create Edge Function `edge-qa-simulation-executor`
A single edge function that receives a step_code and executes the real validation server-side (with service_role access):

- `extract`: Calls `fn-extract-business-data` internally, validates response
- `email`: Calls `preview-transactional-email`, validates template + CTA URLs  
- `cta_click`: Makes HTTP HEAD requests to critical app routes
- `signup`: Validates table schemas and auth infrastructure
- `payment`: Pings checkout/webhook edge functions, validates plan_catalog
- `profile`: Validates contractor table schema and activation functions

Returns structured `{ passed, actual, checks[], errors[] }` for each step.

### 2. Update `useQASimulation.ts`
- Replace `simulateStep()` mock with a call to the real edge function
- Keep the same DB insertion logic (steps, events, errors)
- Add detailed check-level reporting in `event_payload_json`
- Fallback to mock mode if edge function is unreachable (with warning)

### 3. Update UI Components
- **CardSimulationStepStatus**: Show individual check results (expandable list of sub-checks)
- **PanelSimulationResultSummary**: Show real infrastructure health, not random results
- Add a toggle "Mode réel / Mode mock" in PanelSimulationRunLauncher

### 4. Add Sub-Check Granularity
Each step runs multiple sub-checks. Example for `extract`:
- ✅ Edge function `fn-extract-business-data` responds (200)
- ✅ Response contains `business_name`
- ✅ Response contains `category`  
- ❌ Response missing `phone` → EXTRACT_MISSING_FIELD

## Files Changed/Created

- **New**: `supabase/functions/edge-qa-simulation-executor/index.ts` — real validation engine
- **Modified**: `src/hooks/useQASimulation.ts` — replace mock with real edge function call
- **Modified**: `src/components/qa-simulation/CardSimulationStepStatus.tsx` — show sub-checks
- **Modified**: `src/components/qa-simulation/PanelSimulationRunLauncher.tsx` — add mode toggle
- **Modified**: `src/components/qa-simulation/PanelSimulationResultSummary.tsx` — real health display

## Technical Details

- Edge function uses service_role key to access all tables
- Each sub-check has a timeout (5s default)
- Results are deterministic (no randomness) — same infrastructure state = same results
- French-first labels on all check descriptions
- Backward compatible: existing simulation_runs data still displays correctly

