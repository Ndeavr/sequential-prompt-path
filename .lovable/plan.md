

# UNPRO Sales Command Center + Dynamic Pricing Engine — Full Build

## Summary

The current Sniper Command Center is a basic tabbed view with flat KPIs, no campaign tracking, no events feed, no recommended actions, no dedicated sub-routes, and no dynamic pricing engine. This plan rebuilds it into a full war dashboard with 8 real-time KPI cards, hot leads panel with recommended actions, pipeline board, rep action queue, territory gap analysis, campaign performance, live events feed, and enriched target drawer. It also creates the Plan Recommendation + Dynamic Pricing Engine with new database tables, pricing rules, and checkout integration.

---

## Technical Details

### Database Migration

Create two new tables:

```sql
-- pricing_rules: admin-managed modifiers
CREATE TABLE public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  applies_to_plan TEXT NULL,
  applies_to_category TEXT NULL,
  applies_to_city TEXT NULL,
  applies_to_cluster_key TEXT NULL,
  modifier_percent NUMERIC(6,4) NULL,
  override_price NUMERIC(10,2) NULL,
  priority INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- pricing_decisions: audit trail of every recommendation
CREATE TABLE public.pricing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NULL REFERENCES public.contractors(id) ON DELETE SET NULL,
  sniper_target_id UUID NULL REFERENCES public.sniper_targets(id) ON DELETE SET NULL,
  audit_id UUID NULL REFERENCES public.contractor_aipp_audits(id) ON DELETE SET NULL,
  recommended_plan TEXT NOT NULL,
  recommended_billing TEXT NOT NULL,
  base_price NUMERIC(10,2) NOT NULL,
  adjusted_price NUMERIC(10,2) NOT NULL,
  founder_price NUMERIC(10,2) NULL,
  pricing_modifiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  rationale JSONB NOT NULL DEFAULT '[]'::jsonb,
  founder_offer_visible BOOLEAN NOT NULL DEFAULT false,
  cluster_key TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS: public read on `pricing_rules` where `is_active = true`, admin-only write. Admin-only on `pricing_decisions`.

### Block 1 — Dynamic Pricing Engine Service

Create `src/services/dynamicPricingEngine.ts`:

- `BASE_PLAN_PRICES` map (recrue through signature, monthly + annual)
- `recommendPlanDynamic(input)` — enhanced version using AIPP score, job value, appointments, service areas, goal, plus category/territory/scarcity/founder inputs
- `computeAdjustedPrice(basePrice, modifiers[])` with 1.25x cap
- `buildPricingRecommendation(input)` returning full `PricingRecommendation` object with modifiers, rationale, founder logic
- `getRecommendedAction(input)` — deterministic action engine for command center (call_now, sms_now, send_email, etc.)

Types: `PricingRecommendation`, `PricingModifier`, `CommandCenterLead`, `PipelineColumn`, `RepActionItem`, `TerritoryGapRow`, `CampaignPerformanceRow`, `CommandCenterViewModel`

### Block 2 — Command Center View Model Hook

Create `src/hooks/useCommandCenterData.ts`:

- Fetches `sniper_targets` (sorted by heat DESC, limit 500)
- Fetches recent `sniper_engagement_events` (limit 100)
- Fetches `outreach_campaigns` with join counts
- Computes: KPIs (8 metrics including revenue + rev/100), pipeline columns with counts, hot leads sorted by heat/priority/founder/recency, rep action items with deterministic recommended actions, territory gaps grouped by city x category, campaign performance rows
- Returns typed `CommandCenterViewModel`
- Auto-refreshes every 30s

### Block 3 — Command Center Main Page

Rewrite `src/pages/admin/PageSniperCommandCenter.tsx` as the full war dashboard:

- **Top Command Bar**: Title "Command Center", filters (city, category, stage, founder toggle), search, quick action buttons (Import, Launch, Queue, Hot Leads)
- **KPI Strip**: 8 slim glassmorphic cards — Importés, Envoyés, Engagés, Audits, Checkouts, Convertis, Revenus, Rev/100 cibles — with animated counters
- **Desktop layout**: 12-col grid. Left 8 cols: Hot Leads + Pipeline. Right 4 cols: Rep Queue + Events Feed. Bottom full width: Territory Gaps + Campaigns
- **Mobile layout**: Stacked priority order — KPIs, Hot Leads, Rep Queue, Pipeline summary, Events, Territories, Campaigns

### Block 4 — Hot Leads Panel

Create `src/components/command-center/HotLeadsPanel.tsx`:

- Sorted by heat > priority > founder > recency
- Each row: business name, city · category, heat badge (Froid/Tiède/Chaud/Brûlant), priority score, stage badge, last activity with relative time, recommended next action badge
- Quick row actions: Open, Call, SMS, Email, View Landing, View Audit
- Heat color coding: red glow for 70+, orange for 40+, yellow for 20+

### Block 5 — Pipeline Board

Create `src/components/command-center/PipelineBoard.tsx`:

- 10 columns: imported → enriched → ready → sent → engaged → audit_started → audit_completed → checkout_started → converted → lost
- Each column: count + delta badge, mini list of top 3-5 targets
- Warning highlights: sent > 3 days no engagement, audit > 1 day no completion, checkout > 12h no payment
- Horizontal scroll on mobile, compact cards

### Block 6 — Rep Action Queue

Create `src/components/command-center/RepActionQueue.tsx`:

- Title: "Prochaines actions"
- Deterministic sorting: hot founder-eligible → checkout abandoners → audit complete no plan → page viewed no audit → high priority no send
- Each item: lead name, reason (fr), recommended action badge, urgency (Élevée/Moyenne/Basse), one-click action buttons
- Max 15 items visible

### Block 7 — Territory Gap Panel

Create `src/components/command-center/TerritoryGapPanel.tsx`:

- Table: Ville, Catégorie, Actifs, Cible (hardcoded 8-10 default), Gap, Cibles chaudes, Convertis, Places fondateur
- Sorted by gap DESC
- Red highlight for large gaps
- Founder slots column from cluster data

### Block 8 — Campaign Performance Panel

Create `src/components/command-center/CampaignPerformancePanel.tsx`:

- Table/cards: campaign name, channel, city, category, sent, opens, clicks, page views, audit starts, checkouts, conversions, revenue
- Color logic: green outperforming, amber average, red weak (based on click rate thresholds)
- Aggregated from `outreach_campaigns` + `sniper_targets` + `sniper_engagement_events`

### Block 9 — Recent Events Feed

Create `src/components/command-center/RecentEventsFeed.tsx`:

- Live feed of `sniper_engagement_events` sorted by created_at DESC
- Each event: timestamp (relative), event icon, business name, event label (fr)
- Event type mapping to French labels: page_view → "a vu sa page", identity_confirmed → "a confirmé son identité", etc.
- Max 20 events, auto-scroll

### Block 10 — Enhanced Target Drawer

Update `src/components/sniper/SniperTargetDrawer.tsx`:

- Add AIPP score display if available
- Add recommended action badge
- Add recommended plan display
- Add pricing decision history if any
- Add notes/tags edit capability

### Block 11 — Sub-Routes

Add to router.tsx:
- `/admin/command-center` → Main war dashboard (redirect from current sniper route)
- `/admin/command-center/leads` → Full lead table with all filters + bulk actions
- `/admin/command-center/campaigns` → Campaign detail view
- `/admin/command-center/territories` → Territory deep dive

Create lightweight page wrappers for each sub-route.

### Block 12 — Dynamic Pricing Recommendation UI

Create `src/components/pricing/PricingRecommendationCard.tsx`:

- Shows recommended plan badge + adjusted price + billing cadence
- 3 rationale bullets max
- Compare strip: lower plan, recommended (highlighted), higher plan
- Founder offer block (conditional): one-time price, remaining slots, urgency
- CTA into checkout with full metadata pass-through (plan, cadence, adjusted_price, founder_mode, pricing_decision_id)

### Block 13 — Memory Update

Update memory with command center architecture and dynamic pricing engine details.

---

## Files Created/Modified

| Action | File |
|---|---|
| Migration | Create `pricing_rules` and `pricing_decisions` tables |
| Create | `src/services/dynamicPricingEngine.ts` |
| Create | `src/hooks/useCommandCenterData.ts` |
| Rewrite | `src/pages/admin/PageSniperCommandCenter.tsx` |
| Create | `src/components/command-center/HotLeadsPanel.tsx` |
| Create | `src/components/command-center/PipelineBoard.tsx` |
| Create | `src/components/command-center/RepActionQueue.tsx` |
| Create | `src/components/command-center/TerritoryGapPanel.tsx` |
| Create | `src/components/command-center/CampaignPerformancePanel.tsx` |
| Create | `src/components/command-center/RecentEventsFeed.tsx` |
| Create | `src/components/command-center/KpiStrip.tsx` |
| Create | `src/components/command-center/TopCommandBar.tsx` |
| Create | `src/components/pricing/PricingRecommendationCard.tsx` |
| Create | `src/pages/admin/PageCommandCenterLeads.tsx` |
| Create | `src/pages/admin/PageCommandCenterCampaigns.tsx` |
| Create | `src/pages/admin/PageCommandCenterTerritories.tsx` |
| Modify | `src/components/sniper/SniperTargetDrawer.tsx` |
| Modify | `src/app/router.tsx` |

