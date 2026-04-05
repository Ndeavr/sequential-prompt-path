
# ContractorOnboardingAIPPActivationFunnel — Build Plan

## Reality Check: What Already Exists

**Database (75+ contractor tables already in Lovable Cloud):**
- `contractors` — full profile (business_name, rbq_number, neq, google_business_url, booking fields, aipp_score, etc.)
- `contractor_services`, `contractor_service_areas`, `contractor_category_assignments` — services/zones
- `contractor_credentials` — licenses/certs
- `contractor_media` — portfolio/logos
- `contractor_ai_profiles` — AI-generated profiles
- `contractor_public_pages` — public profile publishing
- `contractor_scores`, `contractor_live_scores`, `contractor_public_scores` — scoring
- `contractor_subscriptions` — Stripe subscriptions (stripe_customer_id, stripe_subscription_id, plan_id, status, billing_interval)
- `contractor_onboarding_sessions` — tracks step, business_data, aipp_score, objective, selected_plan
- `contractor_import_sessions` — import tracking (import_mode, consent_status, completion_percent)
- `contractor_import_script_events` — step-by-step import logs
- `contractor_import_consents`, `contractor_import_followups`
- `contractor_capabilities`, `contractor_dna_profiles`, `contractor_wallet`
- `plan_catalog`, `plan_definitions`, `plan_activations`, `plan_recommendations`
- `pricing_quotes`, `pricing_checkout_sessions`
- `aipp_scores`, `aipp_score_checks`
- `reviews`, `contractor_review_aggregates`
- `storage_documents`

**Frontend already built:**
- `PageAlexGuidedOnboarding` — 15-step funnel with import, score reveal, revenue projection, objectives, plan recommendation
- `MultiAgentImportAnimation` — real-time import animation
- `StepScoreReveal`, `StepRevenueProjection`, `StepObjectivesCapture`, `StepPlanRecommendation`, `StepActivationSuccess`
- `ProfilePreviewCard`, `ProfileCompletionChecklist`, `SignatureOfferCard`
- `LandingContractorAIActivation` — acquisition page with AIPP score reveal
- `ProSetupWizard` — 6-step setup (Profile, Services, Zones, Documents, Photos, Activation)
- Existing edge functions: `onboarding-import`, `import-business-website`, `search-gmb-profile`, `compute-contractor-score`, `create-checkout-session`, `stripe-webhook`, `verify-contractor`

**What's missing (and needs to be built):**
- ~12 tables from the prompt (FAQs, brand assets, portfolio projects, profile gaps, objectives, plan fits, activation checklists/events, visibility metrics, AI indexing snapshots, etc.)
- Dedicated funnel pages (the prompt's 12 pages vs current monolithic `PageAlexGuidedOnboarding`)
- Assets studio, FAQ builder, profile gap detection UI
- Several edge functions (FAQ generation, plan-fit calculation, profile activation/publish)
- Post-activation dashboard

---

## Build Strategy: 6 Phases

### Phase 1 — Schema: Create Missing Tables
**Migration to add ~15 tables that don't exist yet:**

1. `contractor_profiles` — extended profile (short/long description, primary_category, secondary_categories, languages, emergency_flag, financing_flag, warranty_summary, is_public, published_at)
2. `contractor_businesses` — business details (neq_number, rbq_number, business_type, employee_range, avg_project_size, verified_identity_status)
3. `contractor_locations` — addresses with lat/lng, is_primary
4. `contractor_specialties` — specialty + proof + confidence
5. `contractor_licenses` — authority, type, number, status, verified_at, expiry
6. `contractor_certifications` — name, issuer, dates, document_url
7. `contractor_insurances` — type, provider, expiry, proof, verification_status
8. `contractor_brand_assets` — asset_type, url, variant, alt_text, source, is_primary, review_status
9. `contractor_portfolio_projects` — title, description, before/after images, gallery, featured
10. `contractor_faqs` — category, question, answer, related_service_id, is_published, sort_order, source_type
11. `contractor_profile_gaps` — gap_type, label, severity, impact_score, suggested_action, resolved
12. `contractor_objectives` — goals (appointments, visibility, exclusivity, etc.), targets (revenue, capacity, radius), urgency, growth_stage
13. `contractor_plan_fits` — plan_id, fit_score, is_recommended, reasoning_json, projections
14. `contractor_checkout_sessions` — stripe_checkout_session_id, status, amounts, coupon, plan_code
15. `contractor_activation_checklists` — checklist_key, label, status, required, completed_at
16. `contractor_activation_events` — event_type, label, payload, created_at
17. `contractor_visibility_metrics` — metric_date, estimated visibility, views, clicks, intents

All with RLS: owner can CRUD own rows, admin full access via `has_role()`.

Add columns to existing `contractors` table:
- `account_status` (text, default 'active')
- `onboarding_status` (text, default 'not_started')
- `activation_status` (text, default 'not_ready')
- `recommended_plan_id` (text)

### Phase 2 — Acquisition Landing + Auth
**Pages:**
- `PageContractorLandingAcquisition` — Hero with cinematic animation, value props (AIPP, matching, booking), proof section, CTA "Créer mon profil AIPP"
- Reuse existing `LandingContractorAIActivation` components (HeroSectionAIPPReveal, CardScoreAIPPBreakdown, etc.)
- Light auth gate: magic link / Google / Apple, preserving funnel state via sessionStorage

**Components:**
- `HeroSectionContractorJoinUNPRO` — animated hero with floating cards (logo, RBQ, reviews, services, score)
- `SectionProofWhyJoin`, `SectionHowAIPPWorks`, `SectionTrustSignals`

### Phase 3 — Import + AIPP Builder (Core Funnel)
**Pages:**
- `PageContractorOnboardingStart` — minimal form (business name, website, phone, address, RBQ)
- `PageContractorImportWorkspace` — real-time import with `PanelImportSourcesRealtime`, `TimelineImportProgress`
- `PageContractorAIPPBuilder` — generated profile sections + `PreviewPublicProfileAIPP` + `CardAIPPScoreBeforeAfter` + `PanelProfileCompletenessRadar`

**Edge Functions:**
- `generate-aipp-profile` — uses AI to generate profile sections from imported data
- `calculate-aipp-score` — scores completeness, trust, visibility, conversion
- `detect-profile-gaps` — populates `contractor_profile_gaps`

**Components:**
- `PanelImportSourcesRealtime` — per-source status cards (Google, RBQ, website, etc.)
- `TimelineImportProgress` — step-by-step with animations
- `CardDataSourceDetected`, `PanelImportErrorRecovery`
- `CardAIPPScoreBeforeAfter`, `PanelProfileCompletenessRadar`
- `PreviewPublicProfileAIPP` — live preview of public profile
- `PanelTrustComplianceSignals`, `CardMissingTrustSignals`, `CardVisibilityGap`

### Phase 4 — Assets Studio + FAQ Builder
**Pages:**
- `PageContractorAssetsStudio` — logo upload with crop/preview, portfolio multi-upload, certificates/insurance docs
- `PageContractorFAQBuilder` — AI-generated FAQs, editable, sortable, assignable to services

**Edge Functions:**
- `generate-contractor-faq` — AI generates FAQs from services, reviews, zone, common objections

**Components:**
- `PanelBrandAssetsUploader`, `UploadZoneLogoIdentity`, `UploadZonePortfolioImages`, `UploadZoneCertificatesDocuments`
- `BuilderFAQSmartGenerator`, `CardFAQPreview`

### Phase 5 — Plan Recommendation + Checkout + Activation
**Pages:**
- `PageContractorPlanRecommendation` — objectives selector, sliders, plan-fit calculation, comparison
- `PageContractorCheckout` — summary, Stripe checkout, founder offer
- `PageContractorActivationSuccess` — checklist, profile status, next actions
- `PageContractorActivationPending` — for paid but incomplete profiles

**Edge Functions:**
- `calculate-plan-fit` — uses AIPP score, objectives, capacity, competition to recommend plan
- `calculate-revenue-projection` — uses JVE data for realistic projections
- `activate-contractor-profile` — validates checklist, publishes if ready
- Reuse existing `create-checkout-session` + `stripe-webhook`

**Components:**
- `PanelBusinessObjectivesSelector`, `SliderCapacityRevenue`, `SliderTerritoryCoverage`
- `SelectorPlanByObjectives`, `CardPlanRecommendation`, `PanelPlanComparisonPremium`
- `PanelCheckoutSummary`, `BannerFounderOfferUrgency`
- `PanelActivationChecklist`, `PanelActivationStatus`
- `WidgetProjectedAppointments`, `WidgetProjectedGoogleVisibility`, `WidgetProjectedAIVisibility`, `WidgetPlanFitScore`
- `PanelRevenueProjection` (enhance existing `StepRevenueProjection`)

### Phase 6 — Post-Activation Dashboard + Alex
**Pages:**
- `PageContractorDashboardPostActivation` — AIPP score, completeness, visibility, appointments, priority tasks, upgrade prompts
- `PageContractorProfilePreviewPublic` — full public profile view

**Components:**
- `PanelNextBestActions` — smart recommendations based on `get_upgrade_recommendations()`
- `FloatingOrbAlexContractor` — contextual Alex assist throughout funnel
- `PanelAlexAssist` — step-by-step guidance panel

**Routes:**
- `/entrepreneur/onboarding` → `PageContractorOnboardingStart`
- `/entrepreneur/import` → `PageContractorImportWorkspace`
- `/entrepreneur/aipp-builder` → `PageContractorAIPPBuilder`
- `/entrepreneur/assets` → `PageContractorAssetsStudio`
- `/entrepreneur/faq` → `PageContractorFAQBuilder`
- `/entrepreneur/plan` → `PageContractorPlanRecommendation`
- `/entrepreneur/checkout` → `PageContractorCheckout`
- `/entrepreneur/activation` → `PageContractorActivationSuccess`
- `/entrepreneur/activation-pending` → `PageContractorActivationPending`
- `/entrepreneur/profile-preview` → `PageContractorProfilePreviewPublic`
- `/pro/dashboard` → `PageContractorDashboardPostActivation`
- `/activation-ia` → `PageContractorLandingAcquisition`

---

## Key Decisions

1. **Reuse existing `PageAlexGuidedOnboarding` logic** — extract into modular pages rather than rebuild from scratch
2. **Wire to existing tables first** — `contractors`, `contractor_services`, `contractor_service_areas`, `contractor_media`, `contractor_credentials`, `contractor_subscriptions`, `contractor_onboarding_sessions`, `contractor_import_sessions`
3. **Create only genuinely missing tables** — ~17 new tables for FAQs, assets, gaps, objectives, plan-fits, activation tracking
4. **Stripe already configured** — STRIPE_SECRET_KEY exists, `create-checkout-session` and `stripe-webhook` edge functions exist
5. **AI generation** — use Lovable AI supported models (gemini-2.5-flash) for FAQ generation, profile generation, gap detection — no extra API keys needed

## Estimated Scope
- **~17 new tables** (migration)
- **~4 columns** added to existing `contractors` table
- **~12 new pages**
- **~50 new components**
- **~6 new edge functions**
- **~12 new routes**

Each phase is independently deployable and testable.
