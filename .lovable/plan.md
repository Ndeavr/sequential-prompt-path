

# Build & Refine — 4 Core Flows

This is a massive scope covering 4 interconnected flows. I recommend breaking this into 4 sequential implementation phases to avoid quality issues.

---

## Phase 1: Onboarding Flow (Refine — 10 steps exist, need real backend)

**Current state**: All 10 UI steps are built with premium animations. Data is 100% mock (`simulateRetrieval` generates fake data). No Supabase persistence. Payment uses fake card fields (no Stripe integration).

**Refinements needed**:

1. **Connect Import to real APIs** — Replace `simulateRetrieval` with an edge function that calls Google Places API (key exists: `GOOGLE_PLACES_API_KEY`) and Firecrawl (`FIRECRAWL_API_KEY`) to fetch real business data. Keep the progressive UI pattern but feed real results.

2. **Persist onboarding state** — Create a `contractor_onboarding_sessions` table to save progress (step, businessData, aippScore). On page reload, resume from last step.

3. **Wire Payment to Stripe** — Replace fake card inputs with Stripe Checkout (`STRIPE_SECRET_KEY` exists). Create a `create-checkout-session` edge function. On success, create `contractor_subscriptions` row and advance to activation.

4. **Create contractor on completion** — Step 8 (Activation) should insert into `contractors` table, `contractor_services`, `contractor_service_areas` using the collected data. Link to authenticated user.

5. **French-first copy** — All step text is currently English. Translate to French per platform convention.

---

## Phase 2: Quote Request Flow (Build — partial, needs full pipeline)

**Current state**: `CompareQuotesPage` is a landing page only. `QuoteUploadPage` exists with basic form + file upload. `QuotesList` and `QuoteDetail` exist. No AI analysis pipeline.

**Build needed**:

1. **Multi-quote upload wizard** — Allow uploading 1-3 quote PDFs in a single flow with drag-and-drop.

2. **AI Quote Analysis edge function** — Parse uploaded PDFs using Lovable AI (Gemini), extract line items, pricing, scope. Store results in `quotes` table with `analysis_result` JSONB column.

3. **Comparison dashboard** — Side-by-side view of analyzed quotes: price fairness, scope coverage, risk flags, recommendation.

4. **Connect to project** — Link quotes to a `projects` entry so the homeowner's full project context is maintained.

---

## Phase 3: Contractor Verification Flow (Refine — exists, needs tightening)

**Current state**: `VerifierEntrepreneurPage` and `VerifyContractorPage` exist with working edge function `verify-contractor`. Admin review via `AdminVerificationRunDetail`. Badge system documented.

**Refinements needed**:

1. **Streamline public entry** — Merge the two verify pages into one clean `/verifier-entrepreneur` flow with clear input (name, RBQ, phone).

2. **Real-time progress UI** — Show verification steps as they complete (similar to onboarding retrieval).

3. **Result page refinements** — Clearer verdict display with the 4-tier color system (Succès/Attention/Non-succès/Se tenir loin).

4. **Admin action flow** — Improve admin review with one-click approve/flag/reject and automatic `admin_verified` update.

---

## Phase 4: Lead Management Flow (Refine — exists, needs enrichment)

**Current state**: `ProLeads` page lists leads with quality scores, status filters. `ProLeadDetail` shows individual lead. `ProIncomingProjects` enriches with scope coverage. Hooks (`useContractorLeads`) query real data.

**Refinements needed**:

1. **Lead pipeline kanban** — Add a visual pipeline view (New → Contacted → Scheduled → Won/Lost) alongside the existing list.

2. **Quick actions** — Accept/decline/schedule directly from the list without navigating to detail.

3. **Notifications** — Real-time alerts when new leads arrive (using Supabase realtime on `appointments` table).

4. **Performance metrics** — Response time, conversion rate, revenue tracking at the top of the leads page.

---

## Recommended Implementation Order

1. **Phase 1** (Onboarding) — Highest value, drives contractor acquisition
2. **Phase 4** (Lead Management) — Quick wins, data already exists
3. **Phase 2** (Quote Request) — New build, most effort
4. **Phase 3** (Verification) — Refinement only

## Technical Notes

- Database migrations needed for: `contractor_onboarding_sessions`, `quotes.analysis_result` JSONB column
- Edge functions needed: `onboarding-import` (Google Places + Firecrawl), `create-checkout-session` (Stripe), `analyze-quote` (Lovable AI)
- Existing secrets cover all required API keys
- All new tables need RLS policies scoped to authenticated users

