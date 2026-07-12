# Production Readiness Audit — Plan

## Scope
14 flows: registration, login, OTP, contractor onboarding, homeowner onboarding, Stripe checkout, $1 trial activation, profile publication, Google Maps, SMS, email, Alex recommendations, appointment booking, mobile UX.

The codebase is very large (553 edge functions, hundreds of pages). A single audit pass cannot execute all 14 flows end-to-end without exceeding a reasonable turn budget. The plan below runs the audit in **3 waves**, ranked by revenue → conversion → trust, and applies **only safe automatic fixes** in wave 1. Waves 2–3 return findings for your approval before edits.

## Wave 1 — Revenue-critical (auto-fix if safe)
Verify and fix same-turn:
1. **Stripe checkout** (`create-payment`, `activation-create-checkout`, `acq-create-checkout`) — verify success/cancel URLs resolve to real routes, `STRIPE_SECRET_KEY` present, price IDs valid, CORS headers, `FunctionsHttpError` handling on client.
2. **$1 trial activation** — verify `/activation` route → checkout → success → publish trigger chain, coupon validation (`acq-validate-coupon`), amount = 100 cents, plan mapping.
3. **Profile publication** (`admin-activation-publish`) — verify trigger on successful trial payment, RLS grants, contractor row status transitions, public route `/entrepreneur/:slug` renders published data.
4. **Registration + Login + OTP** — verify `/auth`, `/login`, `/signup`, `/role` routes exist and are reachable; Google OAuth uses `lovable.auth.signInWithOAuth` with `redirect_uri: window.location.origin` (not protected routes); `emailRedirectTo` set on signUp; `/reset-password` page exists; OTP via `verifyOtp` returns to correct route.

Safe auto-fixes applied without asking:
- Broken `redirect_uri` pointing at protected routes → replace with `window.location.origin`.
- Missing `emailRedirectTo` on `signUp` → add.
- Missing `/reset-password` public route → create.
- Dead links to routes not registered in `src/app/router.tsx` → remove or point to nearest live route.
- Stripe success/cancel URLs pointing at 404s → fix to real routes.
- Missing CORS headers on payment/auth edge functions → add.

Anything larger (schema changes, RLS, pricing, copy) → reported, not auto-fixed.

## Wave 2 — Conversion-critical (report + propose fixes)
5. **Contractor onboarding** — walk `/entrepreneur/*` funnel: landing → AIPP scan → checkout → activation → profile completion. Report every dead button, missing route, and gate that blocks reaching checkout.
6. **Homeowner onboarding** — walk `/` → Alex greet → intent capture → recommendation → booking. Report where value takes >5s to appear or a form appears before value.
7. **Alex recommendations** (`alex-best-match-select`, `alex-inline-booking`, `alex-respond`) — verify recommendation returns a single pro (Concierge Décisif), never "3 quotes"; verify handoff to booking works; verify FR-only guard fires on English input.
8. **Appointment booking** — verify `bookings` insert path, `availability_slots` respected, confirmation SMS+email fire, calendar reflects new booking.
9. **Google Maps integration** — verify `GOOGLE_MAPS_BROWSER_KEY` used in client (autocomplete, map render), `GOOGLE_MAPS_API_KEY` used server-side (geocode, places); no 403/REQUEST_DENIED; billing/referrer restrictions correct for `unpro.ca` + preview domains.

For each finding: **Issue → Impact → Proposed fix → Revenue/Conversion/Trust rank**.

## Wave 3 — Trust + delivery (report + propose fixes)
10. **SMS sending** (`acq-sms-send`, `approve-isr-sms`) — verify Twilio/provider secret configured, sender domain/number valid, opt-out compliant, failure logging.
11. **Email sending** — verify auth email hook (`auth-email-hook`) deployed, domain DNS status, transactional templates exist, bounce/complaint handling.
12. **Mobile UX** — run Playwright at 384×706 across: `/`, `/entrepreneur`, `/pro`, `/dashboard`, `/alex`, `/checkout`, `/activation`. Verify: floating dock does not overlap footer (fix already deployed), tap targets ≥44px, one-handed reach, forms not appearing before value, no horizontal overflow.
13. **Cross-cutting**: dead links scan (rg over all `<Link to=` and `href=` vs `router.tsx`), missing pages, hidden content behind `display:none` or `lg:hidden` on mobile, permission prompts firing on page load (should be event-driven per memory).

## Deliverable format (final report)
Table ranked by (Revenue → Conversion → Trust) with columns:

```text
| # | Flow | Issue | Impact | Auto-fixed? | Files touched | Recommended next step |
```

Plus a short executive summary of what is live, what is broken, and the top 5 revenue leaks.

## Technical notes
- Read-only exploration: `rg`, `code--view`, `supabase--read_query`, `supabase--linter`, edge function logs, `security--run_security_scan`.
- Runtime verification: Playwright against `http://localhost:8080` at mobile viewport with the injected Supabase session (per browser-use knowledge).
- Auto-fix scope in Wave 1 is intentionally narrow: only presentation/routing/redirect fixes that cannot break existing revenue. No schema, no RLS, no pricing, no Alex prompt edits without approval.
- Waves 2 and 3 return findings only; you approve before I edit.

## Out of scope for this pass
- Full load/performance testing.
- Full security scan (call `security--run_security_scan` separately if needed).
- Rewrites of Alex prompt, pricing, or brand copy.
- New features. Audit only.
