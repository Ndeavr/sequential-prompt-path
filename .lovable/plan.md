## UNPRO Contractor Acquisition + AIPP Onboarding — Production Build

End-to-end revenue workflow: admin imports a contractor → system enriches + scores → public AIPP page → email invite → $1 activation via `freetoday` coupon → Stripe checkout → live subscription. Seeded with **Isolation Solution Royal** (isroyal.ca, RBQ 5834-9101-01).

---

### 1. Database (single migration)

New tables (UUID PK, timestamps, RLS enabled, indexes on FKs + slugs/tokens):
- `contractors` — company profile + slug + status
- `contractor_media` — logo/image/video with sort_order
- `contractor_services` — service + category + city + is_primary
- `contractor_scores` — AIPP 0–100, 5 sub-scores, strengths/weaknesses/recos jsonb, lost_revenue_estimate_monthly, score_summary
- `contractor_objectives` — current → target with priority/status
- `contractor_aipp_pages` — public_token + page_slug + view tracking
- `contractor_invites` — invite_token + sent/opened/clicked timestamps
- `pricing_plans` — seeded: recrue 0, pro 349, premium 599 (popular), elite 999, signature 1799
- `coupons` — includes `min_charge_amount int default 1` and `discount_type` accepting `dynamic_to_1_dollar`. Seeded: `freetoday` (1 max redemption)
- `coupon_redemptions` — enforced via trigger checking `redemptions_count < max_redemptions`
- `subscriptions` — adds `trial_started_at`, `trial_ends_at`, status `trial_active`
- `payment_events` — Stripe webhook log

**RLS**: admins (via `has_role`) full access; public `SELECT` on `contractor_aipp_pages` + joined contractor/media/services/scores via SECURITY INVOKER view `aipp_public_view` exposing only safe fields (no email/phone/internal status).

---

### 2. Edge Functions

| Function | Purpose |
|---|---|
| `enrich-contractor` | Firecrawl `isroyal.ca` → extract title/desc/logo/images/services. Creates contractor + media + services + score + objectives + AIPP page + invite + ISR canonical overrides (RBQ 5834-9101-01, 7 services, 6 cities). |
| `generate-aipp-score` | Deterministic scoring from real signals (website present, RBQ valid, services count, media count, cities). ISR target range 78–86. Returns full breakdown + lost_revenue estimate. Marks unknown signals "Données à confirmer". |
| `send-contractor-invite` | If Resend connector available → send FR email with `{{aipp_page_url}}` + `freetoday` code. Otherwise stores rendered email and admin sees "Copier l'email" button. |
| `validate-coupon` | Server-side: exists, active, not expired, redemptions left. Returns `{ valid, discount_type, charge_amount: 1 }`. |
| `create-checkout-session` | **Always** creates real Stripe session. With `freetoday`: line item "Activation UNPRO" at $1 CAD. Without: full plan price subscription. Increments coupon on success via webhook. |
| `stripe-webhook` | On `checkout.session.completed` → create subscription `status=trial_active`, set `trial_started_at`, insert coupon_redemption, log payment_event. |

All functions use `https://esm.sh/@supabase/supabase-js@2.49.1` (per project rule), CORS, Zod validation, JWT verify on admin functions.

---

### 3. Frontend Routes

- **`/admin/acquisition`** — Admin dashboard
  - Add contractor form (website, email, optional name)
  - Big primary button: **"Créer ISR maintenant"** (prefilled isroyal.ca / info@isroyal.ca)
  - Table: contractor, score, email, page link, invite status, payment status
  - Per-row: "Envoyer l'invitation" / "Copier l'email" / "Voir page"
- **`/aipp/:slug`** — Public premium AIPP page (token-validated)
  - Hero "Votre profil AIPP UNPRO est prêt"
  - Logo, media gallery, video section
  - Big circular AIPP score + 5-axis breakdown
  - Forces / Opportunités manquées / Objectifs / Services / Villes
  - Lost revenue card (monthly $)
  - Recommended plan + coupon input + CTA "Activer mon profil"
  - Trust line: "Activation symbolique de 1$ pour sécuriser votre place."
- **`/activation/:slug`** — 5-step flow: confirm → plan → coupon → payment → confirmation
  - Coupon UI: "Offre spéciale aujourd'hui : activation pour 1$" + "1 seule activation disponible avec ce code"
  - If used → button disabled + "Offre déjà utilisée"
- **`/activation-success`** — "Votre profil est maintenant actif."
- **`/admin/payments`** — subscriptions, redemptions, active vs pending

---

### 4. Design System

Premium dark+light, glassmorphism, blue aura gradient, large score visuals (animated SVG ring), mobile-first. FR-CA Quebec copy throughout. No fake reviews — placeholder = "Données à confirmer".

---

### 5. Seed Action

Migration includes seed for `pricing_plans` + `freetoday` coupon. ISR contractor is **not** auto-seeded in SQL — created via "Créer ISR maintenant" button calling `enrich-contractor` (so the full enrichment pipeline runs end-to-end and is verifiable).

---

### 6. Required Setup (will request after approval)

- **Stripe** — call `payments--enable_stripe_payments` (project doesn't have native Stripe yet for this flow). Confirms `STRIPE_SECRET_KEY` available to edge functions.
- **Resend** (optional) — connect via `standard_connectors--connect` for live email send. If declined, admin uses "Copier l'email" fallback (no blocker).
- **Firecrawl** — already referenced in project memory for AIPP scans; reuse existing connection.

---

### 7. Files (high-level)

**Migration**: `supabase/migrations/<ts>_contractor_acquisition.sql` (12 tables + RLS + view + seed)

**Edge functions**: `enrich-contractor/`, `generate-aipp-score/`, `send-contractor-invite/`, `validate-coupon/`, `create-checkout-session/`, `stripe-webhook/`

**Pages**: `src/pages/admin/PageAcquisition.tsx`, `PageAdminPayments.tsx`, `src/pages/aipp/PageAippPublic.tsx`, `src/pages/activation/PageActivation.tsx`, `PageActivationSuccess.tsx`

**Components**: `AippScoreRing`, `AippScoreBreakdown`, `ContractorMediaGallery`, `LostRevenueCard`, `PlanRecommendationCard`, `CouponInput`, `ActivationStepper`, `AdminContractorTable`, `IsrQuickAction`

**Routes**: register in `App.tsx` / route registry

---

### 8. Success Criteria (validated post-build)

1. `/admin/acquisition` → "Créer ISR maintenant" → contractor + media + score + page + invite created
2. `/aipp/isolation-solution-royal` renders premium page with realistic score
3. Invite email sent to info@isroyal.ca (or copied)
4. `/activation/isolation-solution-royal` with code `freetoday` → real Stripe checkout at $1
5. After success: subscription `trial_active`, redemption logged, coupon disabled (1/1)
6. Second use of `freetoday` → blocked server-side
7. Repeatable for any new contractor

---

### Confirmation needed before implementation

Approving this plan will trigger: Stripe enablement prompt, Resend connector prompt (skippable), then full build in one pass.
