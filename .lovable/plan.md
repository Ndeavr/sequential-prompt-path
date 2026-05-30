# Plan — UNPRO Acquisition Pipeline End-to-End

This is a large system. Building it in one shot would be unstable. I'll deliver it in **4 phases**, each shippable and testable on its own. After your approval, I start Phase 1 immediately.

## Existing assets I'll reuse (no rebuild)
- `outbound_*` tables + edge functions (sniper-import, sniper-enrich, sniper-generate, sniper-send) → already cover scrape/enrich/outreach
- `aipp-real-scan`, `aipp-v2-analyze`, `enrich-business-profile` → AIPP scoring
- `create-contractor-checkout`, `contractorPlans.ts` (Recrue 149, Pro 349, Premium 599, Élite 999, Signature 1799) → Stripe
- `pricing-calculate`, `pricing-create-checkout`, `territory_market_scores` (if present) → dynamic pricing
- `/admin/operations`, `/admin/dispatch-center`, `/admin/sniper`, `/admin/outbound/*` → admin surfaces
- `pro/:slug` landing (Nuclear Close) → personalized landing

The plan **unifies** these into a single coherent funnel + admin under `/admin/acquisition`, fills the gaps, and adds the missing webhook + activation + health-check layer.

---

## Phase 1 — Foundation: unified schema + system health (ship first)

**Goal:** one canonical pipeline view, every blocker visible.

DB migration (single migration):
- `contractor_prospects` (canonical funnel row — see your spec; UNIQUE on `(business_name, city)` to dedupe, FKs to existing `outbound_prospects` via `source_id`)
- `acquisition_pipeline_runs` + `acquisition_pipeline_logs`
- `system_config_health` (seed rows: google_places, openai, lovable_ai, resend/email, twilio, stripe, stripe_webhook, supabase_edge, public_url, cron)
- RLS: admin-only via `has_role(auth.uid(),'admin')`, plus `service_role` GRANTS for edge functions
- View `v_acquisition_funnel` aggregating counts per step

Edge functions:
- `acquisition-health-check` — pings each service, writes `system_config_health` (idempotent, run via cron every 15 min)
- `acquisition-log` — shared logger used by all other functions (write to `acquisition_pipeline_logs`)

Admin UI:
- New route `/admin/acquisition` (uses existing `AdminLayout`)
- 7 KPI cards across top (Prospects / AIPP / Sent / Landings / Onboarding / Paid / Blocked)
- Pipeline visual: 8 segments (Scrape → Enrich → AIPP → Outreach → Landing → Onboarding → Stripe → Activation), color = green/yellow/red/gray from `system_config_health` + funnel counts
- "Errors & Missing Config" panel reading `system_config_health`

## Phase 2 — Unified prospect funnel + AIPP

- `acquisition-ingest-prospect` edge fn: wraps existing scrapers (sniper-import, outbound-firecrawl-scrape) and writes into `contractor_prospects` with idempotent dedupe
- `acquisition-enrich-prospect` edge fn: orchestrates `enrich-business-profile` + writes `enrichment_status` + `missing_data`
- `acquisition-generate-aipp` edge fn: calls `aipp-real-scan` → writes `contractor_aipp_profiles` (reuse existing scoring), generates `public_slug`
- Admin tab "Prospects" — paginated table with row actions: Enrich / Generate AIPP / Preview landing / Generate outreach
- Admin tab "Scraping Runs" + "AIPP Scores" tabs (read from `acquisition_pipeline_runs` + `contractor_aipp_profiles`)

## Phase 3 — Outreach + landing + onboarding tracking

- `acquisition-generate-outreach` edge fn: wraps existing `outbound-ai-personalize` → writes `contractor_outreach_messages` in `draft` status (NEVER auto-sends)
- `acquisition-send-outreach` edge fn: requires explicit trigger, verifies provider health before sending, supports `mode: 'test'` (sends to admin only) vs `'live'`
- `contractor_landing_sessions` tracking: add page-view + CTA-click logging to `/pro/:slug` (reuse existing route)
- Admin tabs: Outreach, Landing Sessions, Onboarding
- Per-prospect timeline drawer showing every log entry

## Phase 4 — Stripe checkout + webhook + activation + full test

- Extend `create-contractor-checkout` to accept `prospect_id` in metadata
- New `stripe-acquisition-webhook` edge fn (verify_jwt=false): on `checkout.session.completed` → write `contractor_payments`, convert prospect → contractor row, set `activation_status='active'`, create auth user (magic link email), log everything
- Admin "Stripe Payments" tab
- `acquisition-full-test` edge fn: creates a synthetic prospect tagged `is_test=true`, runs every step in dry-run, returns structured report `{step, status, error, next_action}[]`
- Admin "Test End-to-End" tab with "Run Full Pipeline Test" button → renders the report visually
- Manual "Activate" + "Retry failed step" + "Send test to admin" actions

---

## Technical notes

- **Dynamic pricing**: the existing `pricing-calculate` engine + `territory_market_scores` already covers your "Plan IA personnalisé" spec. Phase 4 wires its output into the onboarding flow + admin "Dynamic Pricing" tab (override coefficients, see saturation). No new engine needed — just UI surface + the "Créer mon plan sur mesure" Alex hand-off.
- **No silent failure**: every edge fn wraps its body in try/catch → `acquisition-log` with `status='failed'` + writes to `system_config_health` if root cause is a missing key.
- **Default = draft/test**: `acquisition-send-outreach` requires `confirm: true` AND `mode` to send live; otherwise it stores message only.
- **Reuse, don't duplicate**: I won't recreate scrapers, AIPP scoring, or pricing — Phase 2/4 functions are thin orchestrators over existing ones.

## Out of scope (this plan)
- New scraping sources (use existing Firecrawl + sniper-import)
- Rebuilding Alex onboarding chat (already exists in `alexContractorOnboardingService`)
- Live Stripe activation (test mode only until you confirm live)

## Questions before I start
1. **Confirm phasing**: ship Phase 1 first, then I open Phase 2 in a follow-up turn? Or do you want all 4 in one go (longer, riskier)?
2. **Stripe mode**: stay in **test mode** for Phase 4, then you flip to live manually after a successful end-to-end test? (recommended)
3. **Email/SMS provider**: use existing Lovable email infra + existing Twilio secret (if present), or do you want me to flag both as "missing" until you confirm?
