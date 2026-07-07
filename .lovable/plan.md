# First-$1 Sprint — Landing Hook + Single Leak Detector

Per your answer: no more dashboards. Only two things ship this turn.

1. **Rewrite the contractor landing** so it answers *"What's in it for me?"* in 3 seconds.
2. **One admin leak card**: *Paid contractors receiving zero opportunities* — must always be zero.

Everything else (state machine, notification funnel, /admin/operations expansion, onboarding rewrite, mobile audit, revenue funnel) is deferred until after the first $1 sale, then we clone the exact winning path.

## 1. Contractor landing rewrite

File: `src/pages/pro/PageProIsolationQC.tsx` (route stays `/isolation-qc`, all UTM/tracking preserved, edge function `create-activation-checkout` unchanged, `first_dollar_sprint_events` schema unchanged).

New structure — visible without scroll:

- **Kicker** — `UNPRO · Recommandation IA · {city or "Québec"}`
- **H1** — *"Votre entreprise mérite-t-elle d'être recommandée par l'IA d'UNPRO ?"*
- **Sub** — *"Nous analysons votre expertise, votre territoire et votre capacité pour vous recommander au bon client, au bon moment."*
- **3-stat proof strip** (loaded before button paints, no spinner blocking):
  - `Revenu potentiel · ${monthlyPotential}$/mois` (city × category × avg ticket, cached client-side fallback = "5 000 – 15 000 $/mois")
  - `Villes couvertes · N` (from `utm.city` + 4 neighbours or fallback "12 villes")
  - `Demande en attente · N projets` (last 7d project count for category × region, fallback "24 projets")
- **Primary CTA** — *"Activer mon essai — 1 $ pour 7 jours"* → same `create-activation-checkout` call.
- **Trust line under CTA** — *"Aucun engagement. Annulation en 1 clic. Paiement Stripe."*
- **4 micro-benefits** (icon + one line each):
  - Recommandé au bon moment, pas noyé dans une liste
  - Territoire respecté, pas revendu à 5 concurrents
  - Score IA visible sur votre fiche
  - Rendez-vous, pas des leads froids

Stat data source: new lightweight function `fetchLandingStats({ city, category })` in the same file — reads existing `projects` + `contractors` counts via `supabase.from(...).select("id", { count: "exact", head: true })`, wrapped in `Promise.race([call, 800ms])` so it never blocks the fold. If the race loses, render the fallback strings — the landing must never stall on a slow query.

Tracking additions (append to existing `logEvent` payloads, no schema change):
- `landing_viewed` → include `city`, `camp`, `has_stats`
- New event `stats_loaded` with `{ revenue, cities, demand }`
- New event `cta_clicked` fired the instant the button is pressed, before the checkout roundtrip

Design: keep the current dark `#0B1220` shell + white CTA. Add subtle `border border-white/10 rounded-2xl` cards for the stat strip. Mobile-first — everything readable at 384px width without scrolling to see H1 + stats + CTA.

## 2. Leak detector card — "Paid, receiving nothing"

New file: `src/components/admin/leak-detectors/PaidNoOpportunitiesCard.tsx`.

Mounted into the existing `AdminOperationsHub.tsx` at the top of its main column (single import, no route change).

Behaviour:
- Query: contractors where `subscription_status = 'active'` (or `plan_status = 'active'`, whichever the current schema uses — verified at build time) AND either `eligible_for_matching = false` OR zero rows in `contractor_opportunities` / `matches` over the last 7 days.
- Card shows a big number, red pill *"MUST BE ZERO"* if `> 0`, green *"OK"* if `= 0`.
- Expandable list (max 20 rows): contractor name, city, category, `subscription_status`, `eligible_for_matching`, last opportunity date, one-click **"Force match"** button that calls existing edge function if present (`launch-commander` or `match-project`), otherwise opens a toast *"Aucun moteur de matching disponible — investiguer manuellement"*.
- Refreshes every 60s.

Read-only query first — the "Force match" action lands only if a matching edge function already exists (I'll verify during build). Otherwise the row shows a copy-to-clipboard *contractor_id* so you can act manually.

## Out of scope (explicitly deferred)

- Project state machine enum expansion
- Notification queued/delivered/opened/clicked funnel
- Contractor 4-step auto-import onboarding
- Homeowner problem-first onboarding + progress tracker
- Mobile stability scanner
- Full revenue command center funnel
- New /admin/operations tabs beyond the single card above

These wait for signal from your real E2E test. Once one contractor pays, we clone that exact path and only then invest in observability.

## Success

- Landing renders H1 + 3 stats + CTA above the fold on 384px, ≤ 800ms after nav.
- Stripe checkout still opens in < 60s with UTM preserved.
- `PaidNoOpportunitiesCard` renders on `/admin/operations` and returns a number (0 or N) on first load.
- No new tables, no migrations, no schema changes.
