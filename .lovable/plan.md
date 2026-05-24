# Fix "Lien expiré" / Analysis Stopped

## Diagnosis

The `/pro/:slug` landing page (`PageProLandingNuclearClose`) calls the `pro-landing-resolve` edge function via `resolveProspect()`. A live curl test confirms it returns **404 not_found** — the function source exists in `supabase/functions/pro-landing-resolve/index.ts` but is **not deployed** on Lovable Cloud. The client treats 404 as "no prospect" → renders the "Lien expiré" empty state. The red error overlay is the runtime log from the same 404.

The previous deploy attempt in the last turn did not actually publish the function (still returns 404 on direct curl).

## Plan

1. **Redeploy** `pro-landing-resolve` via `supabase--deploy_edge_functions`.
2. **Verify** with `supabase--curl_edge_functions` POST `/pro-landing-resolve` with `{ "slug": "test" }` — expect 200 or a clean 404 JSON from inside the function (not the platform 404 wrapper).
3. **Smoke-check** with a real prospect slug from `war_prospects` (read one via `supabase--read_query`) to confirm the page loads with scores.
4. No code changes — the function source, CORS, and client caller are correct.

## Out of scope

- No UI/copy changes to the "Lien expiré" state.
- No changes to scoring logic or `war_prospects` schema.
