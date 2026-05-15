## UNPRO — Contractor Capacity Framework (CCF)

A single source of truth for "how many pros UNPRO can support per Trade × City/Cluster", how scarce each slot is, what it's worth, and who unlocks exclusivity. Built on top of existing tables (`cluster_domain_capacity`, `market_capacity`, `territory_assignments`, `jve_trades`, `cities_quebec_clusters`, `signature_territory_locks`) — no duplication, only the missing connective tissue.

### Why it matters
- Pricing power: scarcity → premium plans (Élite/Signature) sell themselves
- AI ranking: Alex recommends the trade × zone with real openings
- Conversion: "2 places restantes à Laval — Plomberie" closes faster than open marketplaces
- Defensibility: locked territories = recurring MRR moat

---

## 1. Capacity model

`recommended_caps_per_trade_city` = function of:
```text
base_cap = round( population / inhabitants_per_pro[trade] )
× competitiveness_factor (Google Ads CPC tier)
× seasonality_factor (QC climate, current month)
× cluster_density_factor (urban / suburban / rural)
× demand_signal_factor (intents, searches, leads last 90d)
clamped to [min_cap, max_cap] per trade
```

Tier table per trade (stored in `trade_capacity_rules`):
| Trade family | Inhab/pro | Min/city | Max/city |
|---|---|---|---|
| Plomberie, Électricité, CVAC | 8 000 | 2 | 25 |
| Toiture, Fenêtres, Revêtement | 12 000 | 2 | 18 |
| Rénovation, Cuisine, SdB | 6 000 | 3 | 30 |
| Paysagement, Déneigement | 5 000 | 3 | 35 |
| Spécialités (gicleurs, ascenseurs) | 40 000 | 1 | 5 |

Major-city seed examples (final_cap, all trades summed):
- Montréal ~1.78M → ~620 slots
- Laval ~440k → ~180 slots
- Québec ~550k → ~210 slots
- Gatineau ~290k → ~120 slots
- Sherbrooke ~170k → ~85 slots

## 2. Google Ads competitiveness

Tier S/A/B/C/D from `cpc_cad`:
- S ≥ $25 (urgences, sinistres) → cap × 0.8, premium price × 1.6
- A $15–25 (plomberie, élec) → × 0.9, × 1.3
- B $7–15 (toiture, CVAC) → × 1.0, × 1.15
- C $3–7 (rénovation, paysagement) → × 1.1, × 1.0
- D < $3 (entretien) → × 1.2, × 0.85

## 3. Saturation Score (0–100)
```text
saturation = 100 × (active_pros / final_cap)
+ bonus for (avg_aipp_score > 75) and (response_rate > 80%)
- penalty for (open complaints, low conversion)
```
Bands: Vert 0–50 (open), Jaune 51–80 (limited), Rouge 81–100 (locked / waitlist).

## 4. Exclusivity engine
- Trade × City × Slot Class (`signature`, `elite`, `premium`, `pro`, `recrue`) — already in `territory_assignments`
- New rule: `signature` slot only unlocks when `saturation ≥ 70` AND `cpc_tier ∈ {S, A}` AND `gap_score ≥ 40`
- Locked zones surface in Alex sales flow as "1 place Signature disponible — Laval Plomberie"
- Auto-expiry & renewal grace via `signature_territory_locks`

## 5. Database (delta only)

Existing reused: `cluster_domain_capacity`, `market_capacity`, `cluster_plan_capacity`, `cluster_pricing_multipliers`, `territory_assignments`, `jve_trades`, `jve_trade_city_factors`, `cities_quebec_clusters`, `signature_territory_locks`.

New tables:
- `trade_capacity_rules` — inhab_per_pro, min/max cap, seasonality JSON, family
- `trade_cpc_benchmarks` — trade × city, cpc_cad, tier (S/A/B/C/D), source, refreshed_at
- `capacity_snapshots` — daily snapshot per (trade, city): final_cap, active_pros, saturation, gap, tier
- `exclusivity_rules` — slot_class × conditions JSON, auto-eligibility flags
- `capacity_recommendations` — Alex-facing: trade, city, slot_class, status (open/limited/locked), justification

New views:
- `v_capacity_live` — joins snapshots + assignments + cpc tier
- `v_exclusivity_eligible` — zones meeting Signature/Élite criteria

## 6. Engine services (TS, no edge function unless cron)
- `src/services/capacity/capacityEngine.ts` — `computeFinalCap()`, `computeSaturation()`, `computeBands()`
- `src/services/capacity/exclusivityEngine.ts` — `evaluateExclusivity(trade, city)`
- `src/services/capacity/cpcTierService.ts` — tier mapping + factor lookup
- `src/services/capacity/capacitySnapshotter.ts` — invoked daily by edge function `capacity-snapshot-cron`
- Edge function `capacity-snapshot-cron` — nightly write to `capacity_snapshots` + `capacity_recommendations`

## 7. Admin cockpit
Route `/admin/capacity-framework`:
- `PageAdminCapacityFramework` with tabs: Overview · Trades · Cities · Exclusivity · CPC Tiers
- `PanelCapacityHeatmap` (trade × city, color-coded saturation)
- `PanelMajorCities` (Montréal, Laval, Québec, Gatineau, Sherbrooke deep-dive)
- `PanelExclusivityPipeline` (zones eligible for Signature upsell)
- `PanelCpcBenchmarks` (editable CPC tiers)
- `TableCapacityRecommendations` (Alex-ready feed)
- `DrawerZoneDeepDive` (per trade × city: cap, active, saturation, slots, MRR, waitlist)

## 8. Alex / sales integration
- `alexCapacityAdvisor.ts` — `getZoneStatus(trade, city)` returns one human line: "Plomberie Laval — 2 places Élite restantes (saturation 78%)"
- Plan recommendation engine reads `capacity_recommendations` to push Élite/Signature when scarcity bands are red/jaune
- Public `/territoire/:trade/:ville` page reads `v_capacity_live` for the public scarcity badge

## 9. Phasing
**Phase 1 (this build):**
1. Migration: 5 new tables + 2 views + RLS (admin write, public read on aggregates)
2. Seed `trade_capacity_rules` for ~40 QC trade families
3. Seed `trade_cpc_benchmarks` for top 30 cities × top 20 trades (deterministic defaults)
4. Engine services (capacity, exclusivity, cpc tier)
5. Edge function `capacity-snapshot-cron` + first manual run
6. Admin cockpit `/admin/capacity-framework` (Overview + Trades + Cities tabs)

**Phase 2 (deferred):**
- Live CPC refresh via Google Ads / Semrush sync
- Public scarcity widget on `/territoire/...`
- Auto-upsell in Alex pricing flow
- Waitlist auto-promotion when slot frees

## 10. Constraints / guardrails
- No business logic duplication: reuse `territoryService`, `zoneValueScoring`, `appointmentPricingService`
- All public copy outcome-oriented (UX rule): never "saturation 81%" → "Bientôt complet"
- French-first labels (fr-CA), admin can stay technical
- RLS: admin-only write; pros see only their assigned zones
- All caps configurable per trade — no hard-coded magic numbers in components

## 11. Success criteria
- Every (trade × city) in QC has a `final_cap`, `saturation`, `band`, `slot_status`
- 5 major cities show real numbers in admin cockpit on day one
- Alex can answer "y a-t-il de la place pour un plombier à Laval?" with real data
- At least 50 zones flagged Signature-eligible to feed sales pipeline
- Snapshotter runs nightly and writes deltas without locking tables

Ready to build Phase 1 on approval.