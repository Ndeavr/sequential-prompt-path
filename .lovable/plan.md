

## UNPRO Syndicate Dashboard — Premium Control Panel

### What exists today
- `SyndicateDashboard.tsx`: Basic list of syndicates with links to sub-pages (members, reserve, maintenance, votes)
- Database tables: `syndicates`, `syndicate_members`, `syndicate_reserve_fund_snapshots`, `syndicate_maintenance_plans`, `syndicate_maintenance_items`, `syndicate_capex_forecasts`, `syndicate_votes`
- Hooks: `useSyndicate`, `useReserveFundSnapshots`, `useMaintenancePlans`, `useCapexForecasts`, `useSyndicateVotes`
- Landing page `/copropriete` exists with simulated score and timeline

### What we will build

Replace the basic syndicate detail view (`/dashboard/syndicates/:id`) with a premium dark-mode dashboard containing 8 sections, all using mock/simulated data where real data is absent.

### Plan

**1. Create `SyndicateDetailDashboard.tsx`** — the main premium page

Uses existing hooks (`useSyndicate`, `useReserveFundSnapshots`, `useCapexForecasts`, `useMaintenancePlans`) for real data, with fallback mock data for demo.

**Sections:**

- **Building Health Score** — Large score ring (74/100) with animated breakdown bars (Structure, Roof, Windows, Reserve Fund). Uses framer-motion for progressive fill animations.

- **Building Timeline** — Vertical timeline with year markers (2027-2037). Each item expandable to show cost, contractor recommendations, and inspection notes.

- **Reserve Fund** — Current vs recommended comparison with deficit alert. Recharts AreaChart projection over 10-25 years. Dark glass card styling.

- **Special Assessment Simulator** — Interactive sliders (project cost, units, planning horizon). Real-time calculation of cost/condo with and without early planning. Uses existing `Slider` component.

- **Active Projects** — Cards with budget, status badge, contractor count, and "Invite contractors" button.

- **Verified Contractors** — Cards showing license validation, AIPP score, review count, availability badge.

- **Document Center** — Upload area for reserve fund studies, inspection reports, quotes. AI analysis button (connects to existing edge functions).

- **AI Insights** — Automated recommendation cards based on building age and component data.

**2. Update router** — Point `/dashboard/syndicates/:id` to the new detail dashboard instead of reusing `SyndicateDashboard`.

**3. Design system**
- Dark gradient background (`bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950`)
- Glass cards (`bg-white/5 border-white/10 backdrop-blur`)
- Emerald for good metrics, Rose for warnings
- Space Grotesk headings, Manrope body (already in project)
- Framer-motion staggered reveals on all sections

**No database changes needed** — all existing tables support the dashboard. Mock data fills gaps until real data is populated.

**Files:**
- Create: `src/pages/dashboard/SyndicateDetailDashboard.tsx`
- Edit: `src/app/router.tsx` (new import + route update)

