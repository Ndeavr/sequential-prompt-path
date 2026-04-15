

# Plan: ModuleContractorRecruitmentAutomationEngine

## Summary
Build a full contractor recruitment automation engine — from cluster/capacity management through prospect extraction, outreach sequences, onboarding, checkout, payment, activation, and automatic stop rules when clusters fill up. This is a net-new module; nothing from the prompt exists yet.

## Phase 1 — Database Foundation

**Migration** creating all 21 tables with proper types, indexes, FKs, and RLS (admin-only on sensitive tables):

- `recruitment_clusters` — geographic clusters (Laval, Montérégie, Rive-Nord)
- `recruitment_cluster_categories` — category × season per cluster
- `recruitment_capacity_targets` — quota tracking with fill_ratio_cached
- `contractor_prospects` — core prospect data with all status columns
- `contractor_prospect_contacts` — multi-contact per prospect
- `contractor_prospect_enrichment` — SEO/AEO/GMB signals (1:1)
- `contractor_prospect_scores` — fit/urgency/payment probability per cluster
- `contractor_recruitment_campaigns` — campaign metadata
- `contractor_recruitment_sequences` — sequence variants per campaign
- `contractor_recruitment_steps` — ordered steps (email/SMS)
- `contractor_recruitment_messages` — individual send records
- `contractor_recruitment_events` — generic event log
- `contractor_recruitment_replies` — reply classification
- `contractor_recruitment_tasks` — auto-generated follow-up tasks
- `contractor_recruitment_offers` — personalized offers
- `contractor_recruitment_checkout_sessions` — Stripe session tracking
- `contractor_recruitment_payments` — payment records
- `contractor_recruitment_conversions` — final conversion log
- `contractor_recruitment_stop_rules` — auto-stop thresholds
- `contractor_recruitment_exceptions` — error center
- `contractor_recruitment_audit_logs` — full audit trail

**RLS**: All tables admin-only except `contractor_recruitment_offers`, `contractor_recruitment_checkout_sessions` which allow prospect self-access via magic token.

**Seed data**: 3 clusters, 3 categories (isolation/toiture/asphalte), 60 prospects, 3 campaigns, 3 sequences, 10 mock payments, 1 cluster pre-filled to demonstrate stop rules.

**RPC functions**: `rpc_get_cluster_fill_ratio`, `rpc_get_recruitment_funnel_stats`.

## Phase 2 — Hooks & Data Layer

Create 6 dedicated hooks in `src/hooks/`:

- `useRecruitmentClusters` — CRUD clusters + categories + capacity targets
- `useRecruitmentProspects` — query/filter/search prospects, scores, enrichment
- `useRecruitmentCampaigns` — campaigns + sequences + steps management
- `useRecruitmentAutomation` — trigger automation cycle, stop rules, retry
- `useRecruitmentOffers` — offer generation, simulation, acceptance
- `useRecruitmentPayments` — payment tracking, checkout sessions, conversions

## Phase 3 — Admin Pages (8 pages)

All under `/admin/recruitment/*`, guarded for admin role:

1. **PageAdminRecruitmentOverview** — KPI dashboard (funnel widget, cluster fill meters, revenue projection, health status)
2. **PageAdminRecruitmentClusters** — Cluster CRUD, capacity targets, season/category assignment, fill progress bars, stop rule config
3. **PageAdminRecruitmentCampaigns** — Campaign list, launch control, sequence preview, channel mix
4. **PageAdminRecruitmentProspects** — Filterable prospect table with scores, enrichment status, timeline drawer
5. **PageAdminRecruitmentSequences** — Sequence builder, step editor, template preview
6. **PageAdminRecruitmentOnboarding** — Onboarding funnel tracking
7. **PageAdminRecruitmentPayments** — Payment table, checkout recovery, conversion log
8. **PageAdminRecruitmentLogs** — Audit events, exceptions center, retry actions

## Phase 4 — UI Components (~40 components)

All in `src/components/recruitment-engine/`:

- **Hero**: `HeroSectionRecruitmentAutomation`
- **Panels**: ClusterCapacityControl, CategorySeasonSelector, CampaignLaunchControl, SequencePreview, ProspectEnrichmentStatus, RecruitmentHealthStatus, AlexRecruitmentAssist
- **Cards**: ClusterFillProgress, ProspectRecruitmentScore, OfferRecommendation, PaymentStatus
- **Tables**: RecruitmentProspects, Campaigns, Messages, Payments, AuditEvents, Exceptions
- **Widgets**: ClusterSlotsRemaining, CampaignConversionFunnel, OutreachPerformance, PaymentConversionRate, RevenueProjection
- **Banners**: ClusterFullStop, SequencePaused, PaymentFailedRecovery
- **Modals/Drawers**: ProspectReview, ClusterRules, OfferSimulation, ProspectTimeline, CampaignDetails
- **Forms**: RecruitmentFilters, ClusterDefinition, OfferConfiguration, CheckoutIdentity, CheckoutBilling, CheckoutBusinessValidation
- **Stepper**: ContractorRecruitmentOnboarding

## Phase 5 — Prospect-Facing Pages (5 pages)

- `/join/:token` → **PageContractorJoinOffer** — personalized offer with scarcity, value prop, plan recommendation
- `/join/:token/checkout` → **PageContractorJoinCheckout** — identity + billing forms, inline Stripe checkout
- `/join/:token/success` → **PageContractorJoinSuccess** — confirmation, activation status
- `/join/:token/resume` → **PageContractorJoinResume** — abandoned checkout recovery
- `/join/access/:magicToken` → **PageContractorPublicMagicAccess** — magic link entry point

## Phase 6 — Automation Edge Functions

Mock implementations (provider-abstracted, ready for real integrations):

- `edge-recruitment-automation-cycle` — main scheduler entry point
- `edge-recruitment-stop-rules` — check and enforce cluster capacity limits

These will use mock logic internally but structure the code for future real email/SMS provider and Stripe webhook integration.

## Technical Details

- All tables use UUID PKs, jsonb for flexible payloads, timestamptz
- Indexes on all FK columns and commonly filtered status columns
- Realtime enabled on `recruitment_capacity_targets` for live fill updates
- Routes added to `router.tsx` with lazy loading and admin guard
- Mobile-first responsive design with glassmorphism cards
- French-first labels throughout

## Files Created/Modified

- 1 migration file (all 21 tables + seed data + RLS + RPC)
- 6 hook files
- ~40 component files in `src/components/recruitment-engine/`
- 8 admin page files
- 5 prospect-facing page files
- 1 edge function
- `src/app/router.tsx` (route registration)

