# Admin Cockpit Redesign

## Problem

- `AdminDashboard` shows a flat grid of 8 stat cards + 4 generic "recent" lists. No priority, no actions, no "what should I do now?".
- `AdminLayout` sidebar dumps **35+ flat links** + a 7-group Outbound mega-menu. No hierarchy, no grouping, no search. Visually chaotic.
- Nothing tells the admin: *what's broken, what needs approval, what made money today, what to do next*.

## Goal

Transform `/admin` into a **premium operator cockpit** ordered by decision urgency, and clean up the sidebar into grouped, collapsible sections.

---

## 1. New `/admin` dashboard — order of importance

```text
┌─────────────────────────────────────────────────────────┐
│  HERO — "Bonjour, X. Voici l'état d'UNPRO aujourd'hui."│
│  Live system pulse · Date · Quick search                │
└─────────────────────────────────────────────────────────┘

[1] ALERTS STRIP            ← red/amber, dismissible
    Critical blockers · failed jobs · expiring trials

[2] À FAIRE MAINTENANT      ← actionable to-do queue
    • N entrepreneurs à vérifier   → /admin/verification
    • N soumissions à valider      → /admin/quotes
    • N prospects à approuver      → /admin/outbound/leads
    • N alertes ouvertes           → /admin/alerts
    Each = card with count, ETA, primary CTA button

[3] KPI STRIP (today / 7d / 30d toggle)
    Revenus · Conversions · Nouveaux pros · MRR
    Audits payés · AIPP moyens · Taux closing
    (reuse KpiStrip component pattern)

[4] PIPELINE SNAPSHOT
    Funnel: Cibles → Engagés → Audits → Checkouts → Convertis
    Mini sparklines per stage

[5] FAIT AUJOURD'HUI       ← positive reinforcement
    Recent wins: signups, payments, contractors verified,
    campaigns sent. Auto-refreshing feed.

[6] PROCHAINES ÉTAPES      ← AI-suggested next moves
    From automation_blockers + revenue_signals.
    e.g. "Lancer la campagne Montréal-Plomberie",
         "Réviser 3 audits AIPP en attente"

[7] MODULE HEALTH GRID     ← collapsible
    Outbound · Alex · Stripe · Email · Edge functions
    Status dot + last_run + open issues count
```

Every section is **interactive**: clickable, shows a drawer or routes to the dedicated page.

## 2. Sidebar restructure

Group the 35+ links into **7 collapsible sections**, each with an icon header:

```text
⚡ COCKPIT          Tableau de bord · Omega · Operations Hub
👥 PEOPLE           Utilisateurs · Entrepreneurs · Vérifications · Validation
💰 REVENUE          Leads · Rendez-vous · Soumissions · Coupons · Pricing
📡 OUTBOUND         (existing OutboundNavGroup, kept as-is)
🧠 INTELLIGENCE     Agents · Optimisation · Predictive Leads · Answer · Home Graph
📈 GROWTH           Croissance · Growth Engine · Demand Grid · Campaign Lab · SEO
🛠️ OPS              Alertes · Documents · Médias · Automation · UNPRO OS · Settings
```

- Each group: collapsible (controlled, defaults open if active route inside).
- Add a sticky **search input** at top of nav to filter links by label.
- Active route stays highlighted, parent group auto-expands.

## 3. Files to change / create

**Edit**
- `src/pages/admin/AdminDashboard.tsx` — full redesign per layout above.
- `src/layouts/AdminLayout.tsx` — replace flat `navItems` with grouped `adminNavGroups` + search, reuse the existing `OutboundNavGroup` pattern.

**Create (small focused components)**
- `src/components/admin/cockpit/CockpitHero.tsx`
- `src/components/admin/cockpit/AlertsStrip.tsx`
- `src/components/admin/cockpit/TodoQueue.tsx`
- `src/components/admin/cockpit/KpiStripAdmin.tsx`
- `src/components/admin/cockpit/PipelineSnapshot.tsx`
- `src/components/admin/cockpit/RecentWinsFeed.tsx`
- `src/components/admin/cockpit/NextStepsPanel.tsx`
- `src/components/admin/cockpit/ModuleHealthGrid.tsx`
- `src/components/admin/nav/AdminNavGroup.tsx` (collapsible group primitive)
- `src/components/admin/nav/AdminNavSearch.tsx`

**Data sources** (reuse existing hooks; no new tables)
- `useAdminStats`, `useAdminRecentActivity` (already used)
- `useAutomationCommandCenter` / `automationCommandCenterService` for blockers + recent actions
- `useGrowthMetrics` for KPIs
- `useEmailHealthCenter` / module status hooks for ModuleHealthGrid

## 4. Visual style

- Cinematic Dark `#060B14`, semantic tokens only, glassmorphism cards (`bg-card/30 backdrop-blur-sm border-border/20 rounded-2xl`).
- Subtle entry animations (framer-motion stagger, no per-card `opacity:0` traps).
- Mobile: sections stack; KPI strip horizontally scrolls (already pattern in `KpiStrip`).

## 5. Out of scope

- No DB schema changes.
- No business-logic changes — UI/presentation only.
- Outbound mega-menu stays internally identical, just rehomed under the OUTBOUND group.

## Done when

- Landing on `/admin` immediately shows: alerts → to-do → KPIs → pipeline → wins → next steps → health.
- Every card is clickable and routes to the right operational page.
- Sidebar shows ≤7 expandable groups + a search; active route auto-expands its group.
- No regressions on mobile (≤384px) or existing admin sub-pages.
