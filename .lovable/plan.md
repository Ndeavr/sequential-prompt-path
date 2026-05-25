# UNPRO Smart Context Engine — Global UX Intelligence Layer

Build a reusable system that turns every strategic field, metric, and setting across UNPRO into an explained, recommended, AI-guided decision — never a raw form input.

---

## 1. Core primitive: `SmartContext`

A single source of truth for "what is this / why it matters / what should I do".

**New module:** `src/features/smartContext/`

- `types.ts` — `SmartContextEntry`:
  ```
  {
    id: string;                    // e.g. "territory.radius_km"
    label: string;
    what: string;                  // 1 phrase
    why: string;                   // impact on revenue/visibility
    moneyImpact?: string;          // "+12% conversion typique"
    ifEnabled?: string;            // consequence of enabling
    warning?: string;
    recommendation?: {
      value: string | number;
      reasonFr: string;
      source: "ai" | "benchmark" | "territory";
    };
    aiVisibilityImpact?: "high" | "medium" | "low" | "none";
    examples?: string[];           // dynamic, city/trade-aware
    alexScript?: string;           // what Alex says, NOT label readout
  }
  ```
- `registry.ts` — static catalog of all ~60 strategic UNPRO fields (territory, cities, plans, response time, calendar sync, photos, AI score, XL projects, automation, badges, verification…).
- `resolver.ts` — `useSmartContext(id, ctx)` hook merging static registry + dynamic signals from `useContractorProfile`, `useDemandGrid`, `useCityServiceDemandGrid`, `useAippScore`, `useGoalProfile` (new) to personalize `recommendation`, `examples`, `moneyImpact`.

---

## 2. UI primitives (reusable everywhere)

**New components:** `src/components/smart-context/`

- `<SmartBubble id="...">` — premium glass popover (desktop hover, mobile tap-sheet). Sections: What → Why → Money impact → AI recommendation → "Demander à Alex".
- `<SmartBubbleTrigger>` — subtle `info` icon, glow on AI-recommended/warning state.
- `<SmartFieldShell>` — wraps any input/setting; renders label + bubble trigger + inline AI recommendation chip ("UNPRO recommande 25 km") + accept-suggestion action.
- `<SmartRecommendationCard>` — for dashboards: `Recommended | Not Recommended | Upgrade | Opportunity | High-demand | Visibility | Capacity warning` variants.
- `<SmartGoalSelector>` — the "Quel est votre objectif principal ?" gate (7 options from spec). Stores to `contractor_goal_profile`.
- `<AlexFieldHighlight>` — listens to `alexUiActionDispatcher` events (`highlight_field`, `suggest_value`) → glow + auto-scroll + recommended-range overlay.

Design tokens: glassmorphism (`bg-card/80 backdrop-blur-xl`), 24px radius, 420ms `cubic-bezier(.22,1,.36,1)`, mobile-first, no blocking overlays, swipe-to-close on mobile sheet.

---

## 3. Goal-based personalization

**New table:** `contractor_goal_profiles`
```
contractor_id (pk fk), primary_goal enum, secondary_goals jsonb,
capacity_per_month int, avg_contract_value numeric,
updated_at timestamptz
```
RLS: owner read/write, admin read.

**Hook:** `useGoalProfile()` — drives recommendation logic across plans, territory radius, city suggestions, automation defaults, Alex tone.

Gate: before showing plans / territory / visibility / automation pages, if `primary_goal` missing → render `<SmartGoalSelector>` first.

---

## 4. Recommendation engine

**New service:** `src/services/smartRecommendationEngine.ts`

Pure function: `recommend(fieldId, { profile, goal, demandGrid, aippScore, capacity }) → SmartRecommendation`.

Rules (deterministic, no LLM call on render):
- `territory.radius_km` → goal × trade × demand density.
- `territory.cities` → cross `useCityServiceDemandGrid` gap score; flag saturated vs opportunity.
- `plan.tier` → capacity + goal + current AIPP.
- `response_time` → benchmark vs trade median.
- `calendar.sync`, `photos.before_after`, `xl_projects.access`, `automation.*` → binary recommend with reason.

LLM-backed enrichment (cached): edge function `smart-context-enrich` (Gemini 3 Flash) generates 1-phrase `examples[]` per (fieldId, city, trade) → cached in `smart_context_cache` (24h TTL).

---

## 5. Alex integration

- Extend `src/lib/alexUiActionDispatcher.ts` with actions: `highlight_field(id)`, `suggest_value(id, value)`, `open_bubble(id)`.
- Update Alex system prompt (mem `ai/alex/system-prompt-active`) with a "Strategist Guidance" section: when user lands on a strategic field, Alex speaks the `alexScript` from the registry — never reads labels. Examples (city, radius, plan) from spec embedded as few-shot.
- `useSmartContext` exposes `askAlex(id)` → opens Alex chat with pre-loaded context + dispatches `highlight_field`.

---

## 6. Coverage map (where it ships)

Phase 1 retrofit (this build):
- Contractor onboarding wizard (`ProSetupWizard` — all 6 steps)
- Territory & city selection screens
- Plan selection / pricing pages
- Contractor dashboard strategic widgets (AIPP score, response time, calendar sync, XL access)
- Profile completion fields (photos, bio, badges, verification)

Phase 2 (next build, scoped separately): automation settings, CRM integrations, growth dashboards, project qualification, AIPP cockpit, condo manager flows, homeowner-side trust badges.

---

## 7. Admin

`/admin/smart-context` — edit/override registry entries, A/B test copy, see top-clicked bubbles, accept-rate of AI recommendations, per-field conversion lift.

Table: `smart_context_overrides` (id, field_id, lang, payload jsonb, active, updated_by).

---

## Technical details

- All copy fr-CA, follows localization memory.
- No new top-level routes except `/admin/smart-context`.
- Storage: 2 new tables + 1 cache table; reuses existing demand/AIPP/contractor data.
- 1 edge function (`smart-context-enrich`) using Lovable AI Gateway (`google/gemini-3-flash-preview`).
- Bubble component shared between desktop popover and mobile bottom-sheet via `useIsMobile`.
- Zero impact on existing forms — `<SmartFieldShell>` wraps without changing form state.
- Telemetry: `conversion_events` `bubble_opened`, `recommendation_accepted`, `goal_set`, `alex_field_guidance`.

---

## Out of scope

- Rewriting plan pricing logic, AIPP scoring, demand grid (already shipped).
- Homeowner-side bubbles (Phase 2).
- Voice generation changes (only prompt + dispatcher additions).
- Migrating existing tooltips/Popovers everywhere — Phase 1 retrofits only the 5 surfaces above; rest follows incrementally.

---

## Success criteria

- Every strategic field on the 5 Phase 1 surfaces has a `SmartBubble` with What/Why/Money/AI-reco.
- Goal selector gates plans/territory/automation.
- Alex highlights fields and speaks strategist scripts, never label readouts.
- Recommendations visibly personalize by city + trade + goal.
- Admin can edit copy live without redeploy.

Confirm and I ship Phase 1.
