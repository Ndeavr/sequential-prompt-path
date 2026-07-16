# Security Lockdown — Before Affiliate Rollout

Fix the 4 critical scanner findings and lock down every table the affiliate system will touch. No new UI, no cloud upgrade. One migration + a few edge-function-only reads.

## Scope

**In:** RLS + policies + token hashing + public-safe views on prospect/recruitment/token/checkout tables. Admin bypass via existing `has_role(auth.uid(),'admin')`. Affiliate role placeholder (policies wired now, login flow ships next milestone).

**Out:** Affiliate dashboard, SMS history UI, commission engine, cloud upgrade — all deferred until this lockdown is green.

## Findings addressed

1. `contractors_prospects` — phone/email/legal_name publicly enumerable via `landing_slug` policy.
2. `verified_prospect_tokens` — `USING (true)` exposes every token.
3. `contractor_recruitment_checkout_sessions` — Stripe session ids readable by anon.
4. `contractor_recruitment_offers` — `magic_token IS NOT NULL` check lets anon read all offers.

## Changes (single migration)

### 1. `contractors_prospects`
- Drop `public_read_prospect_by_slug_safe`.
- Create `public.v_prospect_public` (SECURITY INVOKER) exposing only: `id, landing_slug, business_name, city, region, category, unpro_score, status`. **No phone, email, legal_name.**
- Landing pages read the view; base table SELECT restricted to `has_role(auth.uid(),'admin')` OR `has_role(auth.uid(),'affiliate') AND assigned_affiliate_id = auth.uid()`.
- Add `assigned_affiliate_id uuid` if missing.

### 2. `verified_prospect_tokens`
- Drop open SELECT policy.
- New RPC `public.resolve_prospect_token(_token text)` SECURITY DEFINER: hashes input, matches `token_hash`, returns prospect id + minimal payload only if not expired/used.
- Store `token_hash` (sha256) instead of raw token; add `expires_at`, `used_at`, `single_use boolean default true`. Backfill hashes from existing values then drop raw column.
- Base table: SELECT only for admin.

### 3. `contractor_recruitment_checkout_sessions`
- Drop `USING (true)` SELECT policy.
- SELECT: admin only. Writes: service_role only (edge function `stripe-activation-webhook`).
- Client never queries directly — status surfaced via edge function `get-checkout-status` keyed by hashed session token.

### 4. `contractor_recruitment_offers`
- Drop broken token-null policy.
- New RPC `public.get_offer_by_token(_token text)` SECURITY DEFINER validating hashed token + expiry, returning offer payload.
- Base table SELECT: admin only.

### 5. Cross-cutting on all affiliate-touching tables
Tables: `contractor_leads`, `affiliate_assignments`, `affiliate_activities`, `affiliate_proposals`, `affiliate_activation_links`, `affiliate_commissions`, `contractors_prospects`, `verified_prospect_tokens`, `contractor_recruitment_offers`, `contractor_recruitment_checkout_sessions`, plus any `outreach_logs` / `sms_*` tables that reference prospects.

For each:
- `ENABLE ROW LEVEL SECURITY` (verify).
- Revoke all from `anon`. Grant `SELECT,INSERT,UPDATE,DELETE` to `authenticated`, `ALL` to `service_role`.
- Policies:
  - **Admin:** `has_role(auth.uid(),'admin')` full access.
  - **Affiliate:** SELECT/UPDATE where `assigned_affiliate_id = auth.uid()` (or joined via `affiliate_assignments`).
  - **Contractor:** SELECT own row on `contractors_prospects` / lead where `owner_user_id = auth.uid()`.
  - **Anon:** no policies.

### 6. Activation & proposal links
- `affiliate_activation_links` / `affiliate_proposals`: store `token_hash` only, add `expires_at` (default now()+7 days), `used_at`, `single_use`.
- Resolver RPCs (`resolve_activation_link`, `resolve_proposal_link`) SECURITY DEFINER validate hash + expiry + single-use, then mark `used_at`.

### 7. Phone masking helper
- SQL function `public.mask_phone(text)` returning `•••-•••-1234`; used by any admin-facing lower-privilege view if needed later.

## Edge function updates
- `stripe-activation-webhook`: writes to checkout_sessions with service role (already the case — verify).
- New/updated `get-checkout-status`, `resolve-prospect-token`, `redeem-activation-link`: thin wrappers over the SECURITY DEFINER RPCs, called from public landings.
- Remove any client-side supabase-js reads against the 4 locked tables; replace with RPC/edge calls.

## Verification (post-deploy)
1. `supabase--linter` clean on the four findings.
2. Manual anon curl: `select * from contractors_prospects` → permission denied; `v_prospect_public` → rows without PII.
3. Anon call to `resolve_prospect_token` with bogus token → null; valid token → payload.
4. `security--run_security_scan` — all 4 criticals resolved; MCP warning noted separately (out of scope).
5. Mark findings fixed via `security--manage_security_finding` with explanations.
6. Update `@security-memory` with the new invariants (token hashing, view usage, no client reads on locked tables).

## Cloud instance
Not touched. 64% disk IO is not blocking acquisition; upgrading is deferred until acquisition produces paying contractors.

## Deliverable
One migration + edge function edits + type regen. No dashboard changes in this pass. After approval, next milestone is affiliate auth + daily call list.
