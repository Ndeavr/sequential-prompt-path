
# UNPRO AI Growth Diagnostic — Build Plan

A cinematic, voice-first AI business diagnostic for contractors. Single immersive page at **`/diagnostic-ia`** that orchestrates Alex, live calculations, floating insight bubbles, competitor analysis, before/after transformation and plan activation. Reuses existing engines (Alex voice, AIPP scoring, contractor plans, Stripe native checkout) — does **not** rebuild them.

---

## 1. Scope (Phase 1)

Ship one production-ready immersive flow:
- Hero → Discovery → Pain/Loss Reveal → Competitor Snapshot → Before/After → Plan Recommendation → Stripe activation
- Persist every diagnostic to Supabase (resumable)
- Alex auto-greets once per tab, narrates key reveals (event-driven, no autostart loops)
- Mobile-first, dark cinematic theme (matches `mem://style/premium-cinematic-theme`)

Out of scope for Phase 1 (will be Phase 2):
- Real competitor scrape (use stubbed top-3 + AIPP score where available)
- Full AI vision on uploaded business cards
- A/B reveal variants

---

## 2. Route & files

```
src/pages/diagnostic/PageAIGrowthDiagnostic.tsx              # shell, scroll-snap sections, orb mount
src/features/growthDiagnostic/
  engine.ts                                                  # pure calc: lossEngine, projection, planRecommender
  bubbles.ts                                                 # bubble generation from session state
  types.ts
  services.ts                                                # Supabase CRUD + RPC calls
  session.ts                                                 # sessionStorage + DB sync
  narration.ts                                               # Alex narration triggers (event-driven)
  components/
    HeroDiagnostic.tsx                                       # cinematic hero + CTA
    StepBusinessType.tsx                                     # chip grid (10 trades)
    StepLocation.tsx                                         # reuses useAddressAutocomplete
    StepTeam.tsx                                             # animated sliders
    StepRevenue.tsx                                          # counters + sliders
    StepSharedLeads.tsx                                      # Yes/No/Sometimes + cinematic comparison
    BubbleField.tsx                                          # floating glass bubbles around orb
    BubbleCard.tsx                                           # expanded insight card
    LiveMetricsHUD.tsx                                       # animated counters (revenue/loss/hours)
    CompetitorTable.tsx                                      # current vs optimized
    BeforeAfterReveal.tsx                                    # split-screen cinematic
    FinalDiagnosis.tsx                                       # Alex specific findings
    PlanRecommendationCard.tsx                               # dynamic plan + reason
    RevenueReveal.tsx                                        # 540k → 1.2M cinematic
    ScarcityBlock.tsx                                        # "3 spots left in your area"
    FinalCTA.tsx                                             # Activate / Reserve / $1 trial
src/styles/diagnostic.css                                    # bubble float keyframes, glass tokens
```

Add to router: `/diagnostic-ia` (public, no auth gate until plan selection).

---

## 3. Data model (Supabase migration)

Three new tables, all UUID + jsonb + RLS:

**`growth_diagnostics`** — one row per session
- `user_id` nullable, `guest_token` text, `business_type` text, `city` text, `team_size` int, `sales_reps` int, `trucks` int, `monthly_projects` int, `annual_revenue` numeric, `avg_contract_value` numeric, `monthly_appointments` int, `monthly_leads` int, `closing_rate` numeric, `seasonality` text, `uses_shared_leads` text, `current_step` text, `status` text, `recommended_plan` text, `projected_revenue` numeric, `projected_loss_monthly` numeric

**`growth_diagnostic_events`** — analytics + replay
- `diagnostic_id` fk, `event_type` text (`step_completed`, `bubble_expanded`, `narration_triggered`, `plan_recommended`, `cta_clicked`), `payload` jsonb

**`growth_diagnostic_bubbles`** — generated insight log (for AI tuning + future ML)
- `diagnostic_id` fk, `category` text (`insight|loss|opportunity|social_proof`), `title` text, `value_numeric` numeric, `payload` jsonb

RLS: owner can CRUD own rows (by `user_id` or `guest_token` via session). Service role for edge functions.

---

## 4. Calculation engine (`engine.ts`)

Pure deterministic functions — no AI calls. Drives every counter, bubble and reveal.

```
lossPerMonth =
    missedCallsLoss(monthly_leads, closing_rate, avg_contract_value)
  + sharedLeadsTax(uses_shared_leads, monthly_appointments, avg_contract_value)
  + capacityGap(team_size, trucks, monthly_projects, avg_contract_value)

projectedRevenue =
    annual_revenue
  * uplift(business_type, city_demand, closing_rate, uses_shared_leads)

planRecommender → Recrue|Pro|Premium|Élite|Signature
  based on team_size, monthly_projects, projected_revenue gap, uses_shared_leads
  (uses existing pricing from mem core: 149/349/599/999/1799)
```

Bubbles generated from same inputs (`bubbles.ts`) so they always agree with the HUD numbers.

---

## 5. Alex narration (event-driven)

Reuses existing voice infra (no new voice config). Narration triggered on:
- Hero CTA tap → greet once per tab
- `step_completed:revenue` → reveal first loss bubble
- `shared_leads:yes` → cinematic competitor split + commentary
- `final_diagnosis` → 2-sentence specific finding
- `plan_recommended` → one-sentence "why this plan"

No autostart, no retries, voice failure → silent fallback to text reveal (per `mem://features/alex-event-driven-session`).

---

## 6. Bubble engine (visual)

- 5–9 bubbles orbit the Alex orb using CSS `@keyframes` + transform (no heavy lib)
- Categories color-coded: insight=cyan, loss=soft-red, opportunity=green, social-proof=white
- Hover/tap → expand card with sourced numbers from `engine.ts`
- Bubbles enter/exit per step (Framer Motion `AnimatePresence` already in project)

---

## 7. Stripe activation

Reuses native Stripe Payment Element flow already wired in project (`mem://pricing/checkout-architecture`).
- Plan card → "Activer mon profil" → existing checkout flow with recommended plan pre-selected
- "Démarrer à 1$" → existing $1 trial coupon path
- Auth gate only at checkout step (not earlier — matches `mem://features/homeowner-subscription-flow` "pay before account creation" pattern, adapted for contractor)

---

## 8. SEO / meta

- `<Helmet>` title: "Diagnostic IA de croissance pour entrepreneurs | UNPRO"
- Meta description, canonical `https://unpro.ca/diagnostic-ia`
- JSON-LD: Service + Organization
- Sitemap entry added (priority 0.9, weekly)

---

## 9. Tasks (build order)

1. Migration: 3 tables + RLS + indexes
2. `engine.ts` + unit-style sanity calc (pure functions)
3. `session.ts` + `services.ts` (sessionStorage + Supabase sync)
4. `PageAIGrowthDiagnostic.tsx` shell + scroll-snap sections
5. Step components (BusinessType → Location → Team → Revenue → SharedLeads)
6. `LiveMetricsHUD` + `BubbleField` + `BubbleCard`
7. `CompetitorTable` + `BeforeAfterReveal`
8. `FinalDiagnosis` + `PlanRecommendationCard` + `RevenueReveal` + `ScarcityBlock` + `FinalCTA`
9. Alex narration hooks (event-driven)
10. Stripe activation wire-up (recommended plan pre-selected)
11. Router entry + sitemap entry + SEO head
12. Mobile QA at 384px viewport

---

## 10. Decisions to confirm before build

1. **Auth gate placement** — only at "Activer mon profil" (Stripe step), letting guests complete entire diagnostic? **Recommended: yes** — maximizes completion + emotional commitment before friction.
2. **Competitor data** — Phase 1 uses deterministic stub (top-3 from local contractor table by city + AIPP score where available). Real-time Firecrawl scrape deferred to Phase 2. OK?
3. **Recommended plan default** — start from team_size + projected_revenue gap (deterministic), no AI call needed in Phase 1. OK?

If you answer "go" or "oui", I'll build all 12 tasks in one pass.
