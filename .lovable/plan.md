
# Schema-First Repair — 15 Findings

Strategy: keep canonical schema, rewrite callers. Migrations only where a canonical column is genuinely missing or an RLS policy is unsafe. No parallel/mirror columns.

## Canonical schema (verified live)

| Table | Canonical | Wrong caller |
|---|---|---|
| `contractors` | `city` (no `services` col) | `primary_city`, `services` |
| `contractor_verification_runs` | `contractor_id` | `matched_contractor_id` |
| `plan_catalog` | `stripe_monthly_price_id`, `stripe_yearly_price_id` | `stripe_price_id_monthly`, `stripe_price_id_one_time` |
| `platform_operation_outcomes` | `business_outcome` (enum) | `success`, `duration_ms` |
| `notifications` | `profile_id` | `recipient_user_id` |
| `property_shares` RLS | `auth.jwt() ->> 'email'` | `SELECT email FROM auth.users` |

---

## CRITICAL — revenue / activation chain

### 1. `/activation` route hijacked by SolicitationActivationPage (post-payment CTA loops back to checkout)
- **Root cause**: `PageCheckoutSuccess.tsx` still calls `navigate("/activation")`, which now serves the cold-SMS $1 landing.
- **Fix**: change `PageCheckoutSuccess` CTA to `navigate("/activation/start")`. Grep all other `navigate("/activation")` / `<Link to="/activation">` in-app callers and route them to `/activation/start` when they mean the calendar-connect onboarding.
- **Migration**: none.

### 2. `/register` dead link after Scan IA $1 checkout
- **Root cause**: `PageScanIAActivationSuccess.tsx` links to `/register?scan=…` but signup lives at `/signup`.
- **Fix**: change link target to `/signup?scan=…`. Verify `LoginPageUnpro` consumes the `scan` param (post-signup redirect to claim `scan_ia_reports`).
- **Migration**: none.

### 3. `plan_catalog` missing columns break contractor checkout
- **Root cause**: `create-contractor-checkout` selects `stripe_price_id_monthly, stripe_price_id_one_time`; canonical columns are `stripe_monthly_price_id, stripe_yearly_price_id` (no one-time column).
- **Fix**: rewrite select + downstream `.stripe_price_id_monthly` refs to canonical names. Handle one-time via existing `price_data` fallback path (already present). Remove the swallowing try/catch so future missing columns fail loudly.
- **Migration**: none.

### 4. `contractors.primary_city` / `contractors.services` don't exist → Mon profil broken
- **Root cause**: `PageMonProfil.tsx` selects non-existent columns.
- **Fix**: rewrite select to `business_name, rbq_number, city, contractor_services(service_key, is_primary)`. Update the UI mapping.
- **Migration**: none.

### 5. `contractor_verification_runs.matched_contractor_id` doesn't exist
- **Root cause**: `useContractorVerificationIntegration.ts` filters wrong column.
- **Fix**: change `.eq("matched_contractor_id", contractorId)` → `.eq("contractor_id", contractorId)`. Grep the whole repo for the same typo on this table and correct all callers.
- **Migration**: none.

### 6. Alex recommendation eligibility — depends on #4/#5 being green
- **Verification only**: with Mon profil + verification hooks fixed, contractors regain `published=true + services + city + verification` — the fields Alex matching reads. No code fix beyond 1–5.

---

## HIGH — dashboards, monitoring, comms

### 7. `platform_operation_outcomes.success` / `duration_ms` don't exist → System Health + Edge Function Health dead
- **Root cause**: `systemHealthService.ts` + `system-health-probe` select non-existent columns.
- **Fix**: rewrite select to `operation, business_outcome, failure_code, created_at`. Compute success as `business_outcome IN ('succeeded','recovered')`. Drop `duration_ms` from selects and any UI card that shows latency (or replace with count-only).
- **Migration**: none.

### 8. `notifications.recipient_user_id` doesn't exist → contractor notifications empty
- **Root cause**: `useContractorDashboardData.ts` filters wrong column. Canonical is `profile_id` (FK to `profiles.id`).
- **Fix**: query with `.eq("profile_id", user.id)` (contractor `profiles.id == auth.uid()` in this app). Remove the error-swallowing catch so failures surface.
- **Migration**: none.

### 9. `property_shares` RLS raises "permission denied for table users"
- **Root cause**: policy USING clause reads `auth.users` as `authenticated`.
- **Fix (migration)**: DROP + CREATE the SELECT policy on `public.property_shares` to use `auth.jwt() ->> 'email'` instead of a subquery on `auth.users`. Keep semantics identical: `shared_with_user_id = auth.uid() OR shared_with_email = (auth.jwt() ->> 'email')`.
- **Migration**: yes, RLS-only.

### 10. `email-live-test` returns 502 every 15 min → outbound email suspected down
- **Root cause**: candidates are (a) missing/invalid `RESEND_API_KEY`, (b) unverified sender `alex@mail.unpro.ca`, (c) Resend outage.
- **Fix**: run `email-live-test` once and read `email_health_checks.error_category` to determine which. If secret is missing/invalid → request `add_secret RESEND_API_KEY`. If sender not verified → surface actionable admin notice on `/admin/email-health`. No blind key rotation.
- **Migration**: none.

---

## MEDIUM — mobile, wizard, layout

### 11. Mobile bottom dock missing on `/` and `/index`
- **Root cause**: `HomeAbSwitch` and `PageHomeUnicorn` are not wrapped in `MainLayout` (the only mounter of `BottomDockGlass`).
- **Fix**: wrap both home routes in `MainLayout` in `router.tsx`. Verify no duplicate dock renders elsewhere (`PageHomeUnicorn` already removed its inline dock).

### 12. Mobile footer text hidden behind bottom dock
- **Root cause**: `SiteFooterPremium` lost the `pb-24` mobile clearance the old `SmartFooter` had.
- **Fix**: rely on the existing global `body:has([data-bottom-dock]) { padding-bottom: var(--dock-safe-pb) }` rule (already added). If footer still clips, add `pb-[calc(var(--dock-safe-pb)+1rem)] lg:pb-0` to `SiteFooterPremium` outer wrapper.

### 13. Scan IA Step 10 shows "+0 rendez-vous" when recommended plan is Recrue
- **Root cause**: `planCap = plan?.appointmentsIncluded ?? capacity` — `??` doesn't handle `0`.
- **Fix**: `const planCap = plan?.appointmentsIncluded && plan.appointmentsIncluded > 0 ? plan.appointmentsIncluded : capacity;` — preserves fallback semantics for Recrue.

### 14. Scan IA wizard drops second-scan users directly on payment step
- **Root cause**: Zustand store keeps `step` across scans; `setReport` doesn't reset step.
- **Fix**: extend `setReport` in `useScanWizardState.ts` to also call `set({ step: 1 })`. Add a `resetForNewReport(id)` action if a report id change is detected in `PageScanIAWizard` useEffect.

### 15. "Prêt à avancer? / Parler à Alex" CTA card auto-injected on most pages
- **Root cause**: `PageShell` defaults `cta="alex"` and `PageCTAFooter` only self-hides on `[data-cta-canonical]` which doesn't exist on legacy pages.
- **Fix**: flip `PageShell` default to `cta="none"`. Opt-in with `<PageShell cta="alex">` on pages that want it. Leaves current opt-outs (`/alex`, `/checkout`, etc.) unchanged.

---

## Migrations

Exactly one migration:

```text
20260712_property_shares_rls_no_auth_users
  DROP POLICY "Users can view their shares" ON public.property_shares;
  CREATE POLICY "Users can view their shares" ON public.property_shares
    FOR SELECT TO authenticated
    USING (
      shared_with_user_id = auth.uid()
      OR shared_with_email = (auth.jwt() ->> 'email')
    );
```

No new columns, no renames, no data moves.

---

## Validation matrix (must all pass)

| Check | How |
|---|---|
| Types regen | after property_shares migration |
| Type-check | `tsgo` on changed files |
| Mon profil loads | shell curl `contractors?select=business_name,rbq_number,city,contractor_services(...)&user_id=eq.<uid>` |
| Contractor verification history loads | curl `contractor_verification_runs?contractor_id=eq.<id>` |
| Contractor notifications load | curl `notifications?profile_id=eq.<uid>` |
| Contractor checkout price lookup | curl the fn, expect `client_secret` |
| `$1` activation checkout still creates `cs_live_` | live-fire `create-activation-checkout` |
| `/activation` renders solicitation, `/activation/start` renders `PageActivationStart` | Playwright |
| `PageCheckoutSuccess` "Connecter mon agenda" → `/activation/start` | Playwright |
| System Health / Edge Function Health pages load | Playwright |
| Property share dialog opens without RLS error | Playwright signed-in |
| Homepage `/` shows bottom dock at 384×706 | Playwright |
| Footer copyright fully visible on mobile | Playwright screenshot |
| Google Maps autocomplete on unpro.ca | already verified server-side; smoke-test again |

---

## Reporting format at the end

One table per finding with columns: `#`, `Issue`, `Root cause`, `Canonical schema`, `Files changed`, `Migration`, `Test result`, `Revenue impact`, `Final status`. Plus PASS/FAIL for: new contractor registration, existing contractor login, Mon profil, $1 Stripe payment, webhook receipt, paid status saved, profile published, Alex recommendation eligibility, address autocomplete, mobile top routes, admin health pages.

Success is declared only if the full chain **registration → payment → webhook → publication → recommendation eligibility** passes end-to-end. Any failure rolls back the offending edit.
