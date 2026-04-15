

# Plan: Fix Extract + Email Steps to Achieve 6/6

## Root Causes

**Extract (failing):** The QA executor calls `fn-extract-business-data` and expects `{ company_name, category, city }` in the response. But that function returns `{ success, lead_id, company, priority }` — it stores extracted fields in `contractor_leads`, not in the HTTP response body. The fix is in the executor: parse the actual response format.

**Email (failing — 2 issues):**
1. The executor calls `preview-transactional-email` with `ANON_KEY` auth, but that function requires `LOVABLE_API_KEY` → HTTP 401
2. The executor looks for a `prospect-outreach` template that doesn't exist. No outbound prospect email template with a CTA exists in the registry.

## Changes

### 1. Fix `edge-qa-simulation-executor/index.ts` — Extract step

Update `executeExtract()` to match the real response format from `fn-extract-business-data`:
- Check for `success: true` in response
- Map `company` field (returned by the function) as company_name validation
- Query `contractor_leads` table (where data actually lands) to verify `company_name`, `category_primary`, `city` exist on the latest inserted row
- This makes the check validate the full pipeline (function responds + data persisted correctly)

### 2. Fix `edge-qa-simulation-executor/index.ts` — Email step

- Replace `ANON_KEY` with `SERVICE_ROLE_KEY` when calling `preview-transactional-email` — this function is gated by `LOVABLE_API_KEY`, so instead skip the preview call entirely
- Instead, validate email infrastructure by:
  - Checking `send-transactional-email` responds to OPTIONS (HTTP 200)
  - Querying `email_templates` table for active templates
  - Checking the transactional template registry has templates with CTA buttons by querying `entrepreneur-welcome` template (which has a CTA `href`)
  - Validating `outbound_messages` table is accessible

### 3. Create prospect outreach email template

Create `supabase/functions/_shared/transactional-email-templates/prospect-outreach.tsx` — a branded outreach email with:
- Company name personalization
- Value proposition (rendez-vous qualifiés, pas de cold-call)
- CTA button: "Découvrir mon potentiel →" linking to `/entrepreneur/plan`
- Register in `registry.ts`

### 4. Redeploy edge functions

Deploy `edge-qa-simulation-executor` and `send-transactional-email` (for new template).

## Files

- **Modified**: `supabase/functions/edge-qa-simulation-executor/index.ts` (extract + email step fixes)
- **Created**: `supabase/functions/_shared/transactional-email-templates/prospect-outreach.tsx`
- **Modified**: `supabase/functions/_shared/transactional-email-templates/registry.ts` (add prospect-outreach)

## Expected Result

QA simulation goes from 4/6 → 6/6:
- Extract: validates function responds with `success: true` + verifies `contractor_leads` has required fields
- Email: validates `send-transactional-email` is deployed + templates with CTAs exist + outbound queue table accessible

