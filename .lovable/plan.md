

# ContractorOnboardingAIPPActivationFunnel — Implementation Plan

## Phase 1 — Database Migration (23 new tables + 4 columns)

**Single migration** creating all missing tables with RLS, indexes, and triggers. SQL is fully drafted (436 lines). Key tables:

- `contractor_profiles` (extended profile: descriptions, categories, languages, flags)
- `contractor_businesses` (NEQ, RBQ, business type, employee range)
- `contractor_locations` (addresses with lat/lng)
- `contractor_specialties`, `contractor_licenses`, `contractor_certifications`, `contractor_insurances`
- `contractor_brand_assets` (logo, cover, gallery, team photos)
- `contractor_portfolio_projects` (before/after, gallery)
- `contractor_faqs` (AI-generated + manual, by category/service)
- `contractor_profile_gaps` (detected gaps with severity/impact)
- `contractor_objectives` (10 goal flags + targets)
- `contractor_plan_fits` (fit score, projections, reasoning)
- `contractor_checkout_sessions` (Stripe tracking)
- `contractor_activation_checklists`, `contractor_activation_events`
- `contractor_public_profiles` (SEO, FAQ schema, AI summary)
- `contractor_visibility_metrics`, `contractor_ai_indexing_snapshots`
- `contractor_import_jobs`, `contractor_import_sources`, `contractor_import_events`
- `contractor_review_sources`

4 columns added to `contractors`: `account_status`, `onboarding_status`, `activation_status`, `recommended_plan_id`

RLS: Owner CRUD via `user_owns_contractor()`, admin full access via `is_admin()`, public read for published profiles/FAQs/portfolio.

## Phase 2 — Types + Hooks + Shared Logic

**New files:**
- `src/types/contractorOnboarding.ts` — All funnel types, states, constants
- `src/hooks/useContractorOnboarding.ts` — Central hook managing funnel state (sessionStorage persistence, step navigation, auto-save)
- `src/hooks/useContractorImport.ts` — Import job management, source status polling
- `src/hooks/useContractorFAQ.ts` — FAQ CRUD, AI generation trigger
- `src/hooks/useContractorAssets.ts` — Brand asset upload, portfolio management
- `src/hooks/useContractorObjectives.ts` — Business objectives CRUD
- `src/hooks/useContractorPlanFit.ts` — Plan fit calculation, comparison
- `src/hooks/useContractorActivation.ts` — Activation checklist, status management

## Phase 3 — Pages (12 new pages)

### Landing & Auth
- `src/pages/contractor-funnel/PageContractorLandingAcquisition.tsx` — Hero with cinematic animation, value props, dual CTA
- Auth handled by existing `LoginPageUnpro` with funnel state preservation

### Onboarding Flow
- `PageContractorOnboardingStart.tsx` — Minimal form (name, website, phone, address, RBQ)
- `PageContractorImportWorkspace.tsx` — Real-time import with source cards + timeline
- `PageContractorAIPPBuilder.tsx` — Generated profile + live preview + score before/after
- `PageContractorAssetsStudio.tsx` — Logo/portfolio/certificates upload zones
- `PageContractorFAQBuilder.tsx` — AI FAQ generation, edit, sort, assign to services

### Plan & Checkout
- `PageContractorPlanRecommendation.tsx` — Objectives, sliders, plan comparison
- `PageContractorCheckout.tsx` — Summary, Stripe checkout, founder offer
- `PageContractorActivationSuccess.tsx` — Checklist + next actions
- `PageContractorActivationPending.tsx` — Paid but incomplete

### Post-Activation
- `PageContractorProfilePreviewPublic.tsx` — Full public profile preview
- `PageContractorDashboardPostActivation.tsx` — Score, completeness, tasks, upgrade

## Phase 4 — Components (50+ new components)

### Hero & Sections
- `HeroSectionContractorJoinUNPRO` — Cinematic hero with floating data cards
- `SectionProofWhyJoin`, `SectionHowAIPPWorks`, `SectionTrustSignals`
- `SectionBusinessGoals`, `SectionRecommendedPlan`, `SectionCheckoutGuarantees`

### Import
- `PanelImportSourcesRealtime` — Per-source status cards with animated states
- `TimelineImportProgress` — Step-by-step timeline with animations
- `CardDataSourceDetected` — Match confidence + selection
- `PanelImportErrorRecovery` — Missing data + retry/upload options

### Profile & Score
- `CardAIPPScoreBeforeAfter` — Score comparison visualization
- `PanelProfileCompletenessRadar` — 8-axis radar chart
- `PreviewPublicProfileAIPP` — Live profile preview
- `PanelTrustComplianceSignals`, `CardMissingTrustSignals`, `CardVisibilityGap`

### Assets & FAQ
- `PanelBrandAssetsUploader`, `UploadZoneLogoIdentity`, `UploadZonePortfolioImages`, `UploadZoneCertificatesDocuments`
- `BuilderFAQSmartGenerator`, `CardFAQPreview`

### Plan & Revenue
- `PanelBusinessObjectivesSelector` — 10 goal toggles
- `SliderCapacityRevenue`, `SliderTerritoryCoverage`
- `SelectorPlanByObjectives`, `CardPlanRecommendation`, `PanelPlanComparisonPremium`
- `PanelRevenueProjection` — Conservative/realistic/ambitious modes
- `WidgetProjectedAppointments`, `WidgetProjectedGoogleVisibility`, `WidgetProjectedAIVisibility`, `WidgetPlanFitScore`

### Checkout & Activation
- `PanelCheckoutSummary`, `BannerFounderOfferUrgency`
- `PanelActivationChecklist`, `PanelActivationStatus`
- `PanelNextBestActions`

### Alex
- `FloatingOrbAlexContractor` — Contextual Alex throughout funnel
- `PanelAlexAssist` — Step-by-step guidance

## Phase 5 — Edge Functions (6 new)

- `generate-aipp-profile` — AI profile generation from imported data (uses gemini-2.5-flash)
- `generate-contractor-faq` — AI FAQ generation by service/category
- `calculate-aipp-score` — Completeness + trust + visibility + conversion scoring
- `detect-profile-gaps` — Gap detection and severity scoring
- `calculate-plan-fit` — Objective-based plan recommendation engine
- `activate-contractor-profile` — Checklist validation + publish trigger

Existing functions reused: `onboarding-import`, `import-business-website`, `search-gmb-profile`, `create-checkout-session`, `stripe-webhook`, `compute-contractor-score`

## Phase 6 — Routes

New routes added to `src/app/router.tsx`:
```
/entrepreneur/join → PageContractorLandingAcquisition
/entrepreneur/onboarding → PageContractorOnboardingStart
/entrepreneur/import → PageContractorImportWorkspace
/entrepreneur/aipp-builder → PageContractorAIPPBuilder
/entrepreneur/assets → PageContractorAssetsStudio
/entrepreneur/faq → PageContractorFAQBuilder
/entrepreneur/plan → PageContractorPlanRecommendation
/entrepreneur/checkout → PageContractorCheckout
/entrepreneur/activation → PageContractorActivationSuccess
/entrepreneur/activation-pending → PageContractorActivationPending
/entrepreneur/profile-preview → PageContractorProfilePreviewPublic
/pro/dashboard → PageContractorDashboardPostActivation
```

## Execution Order

1. Migration (all tables at once)
2. Types + shared hooks
3. Core components (import, profile, score)
4. Pages 1-4 (landing → import → AIPP builder)
5. Components (assets, FAQ, plan)
6. Pages 5-8 (assets → FAQ → plan → checkout)
7. Edge functions
8. Pages 9-12 (activation → dashboard)
9. Routes + integration testing

## Key Design Decisions

- **Dark-first premium UI** with unicorn visual system (glass, metal, light sweep)
- **Mobile-first** (384px viewport primary)
- **Auto-save** on every step via sessionStorage + Supabase
- **Progressive disclosure** — never show 40 fields at once
- **Import-first** — show value before asking for data
- **Stripe already configured** — STRIPE_SECRET_KEY exists, reuse existing checkout/webhook functions
- **AI via Lovable Cloud** — gemini-2.5-flash for FAQ/profile generation, no extra keys needed
- **Reuse existing `PageAlexGuidedOnboarding` patterns** for import animation and flow logic

