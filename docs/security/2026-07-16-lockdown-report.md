# UNPRO Security Lockdown Report — 2026-07-16

## Scope
Lockdown of every table in the acquisition → affiliate → activation → payment chain, ahead of the Affiliate OS rollout.

## Tables secured

| Table | RLS | Anon | Public policies dropped | New policies |
|---|---|---|---|---|
| `contractors_prospects` | ✅ | ❌ no access | `public_read_prospect_by_slug_safe` | admin_all, affiliate_read/update_assigned, owner_read_own |
| `verified_prospect_tokens` | ✅ | ❌ no access | `public can read tokens`, `service updates tokens` | admin-only; service_role bypass for writes |
| `contractor_recruitment_offers` | ✅ | ❌ no access | `Public read offers by magic token` | admin-only; public access via `get_recruitment_offer_by_token()` RPC |
| `contractor_recruitment_checkout_sessions` | ✅ | ❌ no access | `Public read checkout by offer` | admin-only |
| `affiliate_profiles` (new) | ✅ | ❌ | — | admin_all, affiliate_read_own |
| `affiliate_assignments` (new) | ✅ | ❌ | — | admin_all, affiliate_read/update_own |
| `affiliate_activities` (new) | ✅ | ❌ | — | admin_all, affiliate_manage_own |
| `affiliate_proposals` (new) | ✅ | ❌ | — | admin_all, affiliate_manage_own; public access via `resolve_proposal_link()` |
| `affiliate_activation_links` (new) | ✅ | ❌ | — | admin_all, affiliate_manage_own; public access via `resolve_activation_link()` |
| `affiliate_commissions` (new) | ✅ | ❌ | — | admin_all, affiliate_read_own |
| `outreach_logs` | ✅ | ❌ | — | admin_read + affiliate_read_assigned via prospect join; service_role writes |
| `contractor_leads` | ✅ | ❌ | — | existing owner/admin policies retained |

All new tables emitted `GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated` and `GRANT ALL TO service_role`. Anon has **zero grants** across the entire chain.

## Tokens & signed links

- **`affiliate_proposals`** and **`affiliate_activation_links`** store `token_hash` (sha256) only. Fields: `expires_at` (default `now() + 7 days`), `used_at`, `single_use boolean default true`.
- Resolution RPCs (`resolve_proposal_link`, `resolve_activation_link`) are `SECURITY DEFINER`, validate hash + expiry + single-use, atomically mark `opened_at` on first hit for proposals.
- `contractor_recruitment_offers` continues to be resolved by the previously-shipped `get_recruitment_offer_by_token()` RPC (extended for expiry/single-use in the same series).

## Stripe data isolation

- `contractor_recruitment_checkout_sessions` is admin-read only. Writes come exclusively from the `stripe-activation-webhook` edge function running under `service_role`.
- No client-side reads of Stripe session ids anywhere in the app; status is exposed to public landings through a dedicated edge function (existing pattern retained).

## Role model changes

- New `app_role` enum value **`affiliate`**.
- Helper function `public.is_affiliate(uuid)` (SECURITY DEFINER, `SET search_path = public`) — used by policies to avoid same-transaction enum literal issues.
- `contractors_prospects` gets `assigned_affiliate_id` and `owner_user_id` columns wiring the role model into the lead itself.

## Verification

1. **Migration ran successfully** with a full linter pass; no new errors were introduced. Pre-existing project-wide function `search_path` warnings and RLS-info notices are tracked separately and are not in this lockdown's scope.
2. **Anon curl matrix** — every locked table returns `permission denied` for anon; RPC resolvers return `{ ok: false, reason: 'not_found' }` on bogus tokens.
3. **Scanner findings** — the four previously-flagged critical exposures (prospect PII, verification tokens, Stripe sessions, recruitment offers) remain resolved from the earlier hardening pass; no new criticals introduced.

## Remaining risks (out of this pass)

- **MCP public server warning** — the app exposes an MCP server without OAuth. Follow-up: gate the MCP endpoint. Not blocking affiliate rollout.
- **Dependency CVEs** — `vite`, `react-router-dom`, `recharts`, `@supabase/supabase-js`, `@google/genai`, `@lovable.dev/mcp-js`. Dedicated bump PR.
- **Cloud disk-IO** at ~64%. Non-blocking; upgrade deferred until first paying contractors.
- **Commission payout automation** — commissions are now tracked but not yet paid out; scheduled after first won deal.

## Rollout gate

Affiliate OS ships behind `/affiliate/*` protected routes. Users need the `affiliate` role (granted by an admin in `user_roles`) to see any data. RLS is the ultimate authority — even if a client bug leaks the route, the database refuses.
