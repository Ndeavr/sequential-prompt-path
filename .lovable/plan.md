## Root cause (verified before any change)

The activation link is generated and stored correctly — the **page simply does not exist**.

Evidence from inspection:

1. **Route `/unpro/activate/:token` does NOT exist.** `src/app/router.tsx` defines `/pro/activate`, `/invitation/:token/activate`, `/r/:token`, but no `/unpro/activate/*`. The hosting SPA fallback serves `index.html`, React Router hits the catch-all, and the contractor sees "Page non disponible". Not a 404 from hosting — an unmatched client route.
2. **Token IS created before the SMS.** `supabase/functions/send-verified-batch/index.ts` → `ensureActivationLink()` inserts the token, then builds `${origin}/unpro/activate/${token}`.
3. **Token IS stored.** Table `verified_prospect_tokens` (token, prospect_id, created_at, clicked_at, click_count) holds **234 rows**, most recent 2026-07-31.
4. **Lookup query does not exist yet.** No edge function or client code reads `verified_prospect_tokens` — nothing ever resolves token → contractor.
5. **Token expiry is not a factor.** There is no expiry column; tokens never expire today.
6. **Auth/middleware is not blocking.** No guard is involved because no route matches at all.
7. So: unmatched SPA route, not a server 404 and not RLS.

## What to build

### 1. Public token resolver (Edge Function `activation-token-resolve`)
- Input `{ token }`, service-role read (anonymous-safe, `verify_jwt = false`).
- Join `verified_prospect_tokens` → `verified_contractor_prospects` (business_name, city, category, phone_e164, email, website).
- Records the click: `clicked_at` (first only), `click_count + 1`, and `verified_contractor_prospects.outreach_clicked_at` — this also unblocks the "Clic sur le lien d'activation" milestone in the First Dollar tracker.
- Returns `{ ok, prospect: {...} }` or `{ ok:false, reason: "token_not_found" }` — never leaks PII beyond the prospect's own business data.

### 2. Activation page `/unpro/activate/:token`
- New `src/pages/activation/PageUnproActivate.tsx`, registered as a **public** route (no AuthGuard/RoleGuard), lazy-loaded like siblings.
- States: loading → resolved → invalid token → error, all in fr-CA, no placeholder copy.
- Resolved view: contractor's business name + city, the value proposition, and the **1 $ / 7 jours** CTA.
- CTA calls the existing `create-activation-checkout` with the prospect context (slug derived from the prospect, plus email when known), then redirects via `redirectToCheckout`.
- Success returns to the existing `PageProspectActivationSuccess` flow (`activation-confirm`), which already issues the dashboard magic link.
- Invalid-token view offers a direct fallback path instead of a dead end.

### 3. Checkout wiring
- `create-activation-checkout` gains an `activation_token` branch resolving `verified_prospect_tokens` → prospect, so payment metadata carries `prospect_id` and the activation is attributable end-to-end. Existing `slug` and `landing_token` branches stay untouched.

## End-to-end validation (real data, no mocks)
1. Create a real token for one Laval prospect and open the production URL — confirm the activation page renders with the real business name.
2. Verify `clicked_at` / `click_count` / `outreach_clicked_at` update in the database.
3. Send one real SMS (limit 1, existing controlled-test path) and open the received link on mobile width 390px.
4. Run the $1 Stripe checkout to payment confirmation, then verify `activation-confirm` returns the access link and the First Dollar tracker advances past "Clic sur le lien d'activation".

## Out of scope
No changes to SEO/sitemap/corpus, no new outreach campaigns beyond the single controlled test SMS, no changes to the pinned First Dollar run.
