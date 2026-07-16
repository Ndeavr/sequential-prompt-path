# UNPRO Affiliate Recruitment Operating System V1 (+ Module 16)

Build a protected affiliate portal that turns scraped contractor data into paying UNPRO contractors, with SMS visibility, one-click proposals, $1/7-day Stripe activation, recurring 20% commissions, and a **Revenue Intelligence Panel** that shows every affiliate exactly what each contractor is worth to them.

Success story: Lorraine logs in at `/affiliate/dashboard` and within 10 seconds sees who to call today, what SMS was sent, who clicked, who's waiting on a proposal or payment, her current commission, **and her full potential commission pipeline**. On each contractor page she sees the recommended plan and exact monthly / annual / lifetime commission if she closes them today.

## Scope decisions

- Reuse existing acquisition pipeline (`contractor_leads`, `verified_contractor_prospects`, `acquisition-queue-worker`, `enrich-contractor-from-official-site`, `send-verified-batch`, `daily-acquisition-audit`) — no new scraping.
- Add an **affiliate assignment + workflow + revenue-intelligence layer** on top of existing lead tables + a dedicated affiliate portal UI.
- Auth: reuse existing Supabase auth (magic link + phone OTP in `LoginPageUnpro`) — add `affiliate` role + dedicated login route.
- SMS: reuse existing outbound infra; expose message history read-only to the assigned affiliate.
- Payments: existing Stripe seamless payments — new $1 / 7-day activation SKU.
- All commission math is **client-side derived** from `affiliates.commission_rate` × canonical plan prices in `src/config/contractorPlans.ts` (Recrue 0, Pro 349, Premium 599, Elite 999, Signature 1799). One helper, one source of truth.

## Data model (new / extended, all with RLS + GRANTs)

New tables:

- `affiliates` — `user_id`, `slug`, name, email, phone, `territory` (jsonb: cities/regions), `commission_rate` (default 0.20), `avg_contractor_lifetime_months` (default 24), `active`, `bio`, `photo_url`.
- `affiliate_assignments` — `affiliate_id`, `contractor_lead_id`, `assigned_at`, unique(contractor_lead_id).
- `affiliate_activities` — timeline: type (call/note/proposal_sent/follow_up), notes, outcome, `next_action_at`.
- `affiliate_proposals` — snapshot: score, strengths, opportunities, preview_url, offer, sent_at, email_status.
- `affiliate_activation_links` — Stripe session id, url, status, paid_at, contractor_lead_id, affiliate_id.
- `affiliate_commissions` — affiliate_id, contractor_lead_id, stripe_subscription_id, amount_cents, status (pending/approved/paid), period_start/end.

Extend contractor lead tables:
- `unpro_score` (0-100), `score_breakdown` (jsonb), `score_summary` (text, AI), `ai_strengths` (jsonb), `ai_opportunities` (jsonb).
- `recommended_plan` enum (recrue/pro/premium/elite/signature), `recommended_plan_reason` (text), `demand_level` (low/medium/high), `territory_size` (small/medium/large).
- `workflow_status`: discovered → enriched → validated → sms_sent → sms_clicked → assigned → called → proposal_sent → trial_started → paid → active → inactive.
- `assigned_affiliate_id` (FK).

Add `affiliate` to the app_role enum. RLS: affiliates only see leads where `assigned_affiliate_id = <their id>`; admins see everything; commissions strictly scoped by `affiliate_id`.

## Backend / edge functions

1. `contractor-scoring-engine` — computes `unpro_score` + breakdown + AI summary (Gemini via Lovable AI).
2. `contractor-plan-recommender` — **new**. Inputs: review count, demand_level, territory_size, category, coverage, response rate, company maturity. Outputs: `recommended_plan` + short reason. Runs after scoring and on lead updates. Deterministic rule table + AI-written reason.
3. `contractor-discovery-scheduler` — cron nightly, orchestrates existing scrapers, re-scores + re-recommends.
4. `assign-leads-to-affiliates` — territory match, 25/day cap.
5. `affiliate-priority-ranker` — today's 25-lead list, ranked by clicked > score > review count > demand > no prior contact.
6. `generate-proposal` — proposal payload + preview URL + transactional email.
7. `create-activation-checkout` — Stripe $1/7d then recurring; carries `{ affiliate_id, contractor_lead_id }` metadata.
8. `stripe-activation-webhook` — `checkout.session.completed` → paid; `invoice.paid` → write `affiliate_commissions` at affiliate's rate.
9. `affiliate-sms-history` — read-only SMS log for a lead (delivery + click), scoped by assignment.
10. `generate-plan-talking-points` — **Module 16**. Given lead + recommended plan → objection-helper bullets (fit, visibility gains, expected appointment volume, score weaknesses, upgrade opportunities). AI, cached.

## Frontend routes (affiliate portal)

Guarded by `RoleGuard allowedRoles={['affiliate']}` in a new `AffiliateLayout`.

- `/affiliate/login`
- `/affiliate/dashboard` — 6 KPI cards + **`PotentialCommissionPipeline`** widget (Module 16 dashboard summary).
- `/affiliate/call-list` — today's 25 with 🔥/⭐.
- `/affiliate/company/:id` — contractor workspace + **`AffiliateRevenueIntelligencePanel`** (sticky right on desktop, top on mobile).
- `/affiliate/company/:id/profile-builder`
- `/company-preview/:slug` — public
- `/affiliate/proposals`
- `/affiliate/commissions`
- `/:affiliateSlug` — optional public page

Admin: extend `/admin/acquisition` (Found/Validated/SMS/Clicked/Called/Trial/Paid/MRR + alerts) and add `/admin/affiliates` (CRUD, commission rate, territory, manual assign).

## Module 16 — Affiliate Revenue Intelligence Panel

New component `AffiliateRevenueIntelligencePanel` on `/affiliate/company/:id`:

- **Recommended Plan** — big card with plan name, "Best fit…" tagline, estimated appointments/month (from plan rules).
- **Why This Plan** — score, review count, demand level, territory size, current recommendation (from `recommended_plan_reason`).
- **Revenue Opportunity table** — all 5 plans + monthly price.
- **Affiliate Commission Preview table** — monthly commission per plan = `plan_price × commission_rate`.
- **Annual Commission Preview** — `plan_price × 12 × commission_rate`.
- **Lifetime Value Estimate** — `plan_price × commission_rate × avg_contractor_lifetime_months` (default 24).
- **AI Upgrade Recommendation** — reason narrative (Pro vs Premium upgrade logic).
- **Affiliate Motivation Widget** — large green card: "Close this contractor today" + potential monthly / annual / lifetime commission for the recommended plan.
- **Objection Helper** — button "Show Talking Points" → calls `generate-plan-talking-points`, renders bullet list.

Dashboard addition (`/affiliate/dashboard`), **`PotentialCommissionPipeline`** card:
- "N contractors assigned"
- Potential Monthly = Σ(recommended_plan_price × commission_rate) across active assignments
- Potential Annual = Monthly × 12
- Potential Lifetime = Monthly × avg_contractor_lifetime_months

All math lives in `src/features/affiliate/revenueMath.ts` with unit tests.

## Key UI components

- `AffiliateHeader`, `KpiCard`, `PotentialCommissionPipeline`
- `PriorityCallTable`, `ContractorScoreRing`
- `SmsHistoryTimeline`, `AiCallAssistantPanel`
- `ProfileBuilderForm`, `LivePreviewCard`
- `ProposalGeneratorButton`, `ActivationLinkButton`
- `CommissionTable`
- **Module 16:** `AffiliateRevenueIntelligencePanel`, `PlanRecommendationCard`, `CommissionMatrixTable`, `MotivationWidget`, `TalkingPointsDrawer`

## Build order (revenue-first)

1. Migrations: affiliates, assignments, extended lead fields (incl. `recommended_plan`), roles, RLS, GRANTs. Seed Lorraine.
2. `/affiliate/login` + role redirect + `AffiliateLayout` + guard.
3. Scoring engine + AI summary on existing verified leads.
4. **Plan recommender** + revenue math helper + unit tests.
5. Assignment + priority ranker cron; dashboard KPIs + **PotentialCommissionPipeline** live.
6. Call list + contractor workspace + SMS history + **AffiliateRevenueIntelligencePanel**.
7. AI Call Assistant + Talking Points + Profile Builder + Live Preview.
8. Proposal generator + email.
9. Stripe $1/7d activation + webhook + commission writer.
10. Commissions page + admin acquisition MRR/alerts + public affiliate page.

## Technical details

- Priority = 100·clicked + 40·(unpro_score/100) + min(review_count,200)/10 + 20·high_demand + 15·no_human_contact.
- 25/day cap in ranker.
- SMS visibility from existing `outreach_sms_events` / `outbound_sent_messages`, filtered by lead phone + assignment.
- AI via Lovable AI Gateway (Gemini 2.5 Flash) — scoring summary, plan reason, talking points.
- Stripe metadata `{ affiliate_id, contractor_lead_id, product: "activation_1$_7d" }`; webhook is the sole source of truth for commissions.
- Public `/:affiliateSlug` added last with reserved-slug list.

## Out of scope for V1

- New scraping sources beyond current pipeline.
- Sub-affiliate hierarchies.
- In-app calling/VoIP.
- Full CRM (custom fields, pipelines).
- Multi-language toggle (French only).
