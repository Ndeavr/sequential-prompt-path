# UNPRO — Système "Plan IA Personnalisé"

Remplace la grille SaaS "Choisissez un forfait" par une consultation stratégique pilotée par IA. Prix, exclusivité et capacité sont calculés à partir du métier, du territoire, du marché et des objectifs de l'entrepreneur. Construit en 3 phases, livrables incrémentaux.

---

## Phase 1 — Fondations data & moteur (livraison immédiate)

### Migrations Supabase (1 migration unique)

Nouvelles tables `public.*` avec GRANTs + RLS :

1. **`contractor_growth_profiles`** — profil capacité/objectifs (clé `contractor_id` unique)
   Champs : `monthly_capacity`, `avg_ticket_cents`, `teams_count`, `target_growth_percent`, `preferred_job_types text[]`, `preferred_territories text[]`, `wants_exclusivity bool`, `max_distance_km`, `quality_vs_volume smallint` (0–100), `seasonality_notes`, `availability_score smallint`, `response_speed_minutes`, `generated_plan_id`, `generated_at`.

2. **`territory_market_scores`** — score marché par couple (territoire × métier)
   Champs : `territory text`, `trade text`, `competition_score smallint`, `avg_cpc_cents`, `demand_score smallint`, `avg_project_value_cents`, `ai_difficulty_score smallint`, `rarity_score smallint`, `exclusivity_slots_total smallint`, `exclusivity_slots_taken smallint`, `recommended_min_plan text`, `seasonality_multiplier numeric`, `updated_at`.
   Index unique `(territory, trade)`.

3. **`dynamic_plan_recommendations`** — historique des recommandations générées
   Champs : `contractor_id`, `recommended_plan_slug` (recrue/pro/premium/elite/signature/custom), `recommended_price_cents`, `base_plan_price_cents`, `price_modifier_pct`, `estimated_monthly_appointments_min/max`, `estimated_revenue_min_cents/max_cents`, `exclusivity_level` (none/partial/full), `territory_priority` (low/medium/high/critical), `market_score smallint`, `opportunity_score smallint`, `competition_score smallint`, `recommendation_reason jsonb` (breakdown), `accepted bool`, `accepted_at`, `generated_at`.

4. **`pricing_engine_coefficients`** — coefficients admin-ajustables (singleton row)
   `key text unique`, `value numeric`, `description text`, `updated_by uuid`, `updated_at`. Seed avec : `competition_weight=0.30`, `demand_weight=0.25`, `ticket_weight=0.20`, `exclusivity_premium=0.40`, `rarity_premium=0.25`, `seasonality_weight=0.10`, `min_price_floor_cents=14900`, `max_price_ceiling_cents=499900`.

5. **`pricing_overrides`** — overrides manuels admin par (contractor_id OU territory+trade)
   `contractor_id?`, `territory?`, `trade?`, `forced_price_cents?`, `forced_plan_slug?`, `reason`, `expires_at?`, `created_by`, `created_at`.

GRANTs : `authenticated` lecture/écriture sur ses propres lignes via RLS (sauf `pricing_engine_coefficients` admin-only et `territory_market_scores` lecture publique authenticated). `service_role` ALL partout. Pas de `anon`.

### Engine TypeScript pur (testable, sans DB)

`src/features/dynamicPricing/engine/`
- `types.ts` — `GrowthProfile`, `MarketScore`, `PlanRecommendation`, `PricingCoefficients`, `PlanSlug`.
- `marketScoring.ts` — `computeMarketScore(market, coefficients)` → score 0–100.
- `opportunityScoring.ts` — `computeOpportunityScore(profile, market)` → score 0–100.
- `planSelector.ts` — règles déterministes : score marché × ticket × capacité × exclusivité → `recommended_plan_slug`.
- `priceCalculator.ts` — `computeDynamicPrice(plan, profile, market, coefficients, overrides)` : applique premiums exclusivité/rareté/saisonnalité, respecte floor/ceiling.
- `revenueEstimator.ts` — `estimateMonthlyAppointments` + `estimateRevenue` (range min/max basé sur ticket × capacité × conversion).
- `recommendationEngine.ts` — orchestrateur principal `generateRecommendation(profile, market, coefficients, overrides)`.

Règles métier dures :
- Demande forte (>70) ET exclusivité demandée → premium ×1.4.
- Compétition élevée (>70) → boost visibilité IA, plan minimum Pro.
- Ticket > 5000$ → réduit `appointments_needed` (peu de RDV très qualifiés).
- Capacité faible (<5/mois) → cap au plan Recrue/Pro même si marché premium.
- Si `exclusivity_slots_taken >= total` → `exclusivity_level=none`, prix de base.

### Edge function `api_generate_dynamic_plan`
Reçoit `contractor_id` + `growth_profile` (form data). Lit `territory_market_scores` pour les couples préférés. Lit `pricing_engine_coefficients` + `pricing_overrides`. Appelle `recommendationEngine.generateRecommendation`. Persiste dans `contractor_growth_profiles` + `dynamic_plan_recommendations`. Retourne recommandation complète.

---

## Phase 2 — Flow entrepreneur conversationnel

Route : `/entrepreneur/plan-ia` (mobile-first, cinematic dark, lié post-AIPP).

### Étapes (single page, progressive disclosure)

1. **Hero** — "Votre Plan IA personnalisé" — sous-titre "Optimisé pour votre marché, votre métier et votre capacité réelle."
2. **Wizard `GrowthProfileWizard`** (5–7 questions, 1 par écran, max 90 secondes) :
   - Capacité mensuelle (slider 1–100)
   - Ticket moyen (slider $500–$50k)
   - Équipes (1–20)
   - Territoires (chips multi-select, pré-rempli depuis profil)
   - Objectif croissance (slider 0–100 %)
   - Exclusivité territoriale (toggle premium)
   - Volume vs qualité (slider)
3. **Écran "Analyse marché en cours"** — animation cinématique 4–6 sec, appelle `api_generate_dynamic_plan`.
4. **Écran "Votre Plan IA"** — `DynamicPlanReveal` :
   - Plan name + prix proposé (gros)
   - 4 score-rings : `MarketScore`, `OpportunityScore`, `CompetitionScore`, `ExclusivityScore`
   - `EstimatedRevenueCard` (range min/max)
   - `TerritoryAuthorityCard` (slots disponibles)
   - `ReasoningBreakdown` (3–5 puces "Pourquoi ce plan")
   - CTA primaire "Activer ce plan" → `/entrepreneur/checkout?plan=<slug>&recommendation=<id>`
   - CTA secondaire "Créer mon plan sur mesure" → ouvre Alex (`openAlex("custom_plan_consultation", "fr")`).

### Composants
`src/features/dynamicPricing/components/`
- `GrowthProfileWizard.tsx`
- `DynamicPlanReveal.tsx`
- `ScoreRing.tsx` (réutilisable 4 fois)
- `EstimatedRevenueCard.tsx`
- `TerritoryAuthorityCard.tsx`
- `ReasoningBreakdown.tsx`
- `CustomPlanCTA.tsx`

### Intégration Alex
Nouveau mode dans `src/config/alexModes.ts` : `custom_plan_consultation`. Prompt FR axé sur consultation stratégique : capacité, objectifs, exclusivité, territoires, génération sur mesure. Alex appelle `api_generate_dynamic_plan` via tool-call et propose un checkout inline (réutilise `mem://ai/alex/in-chat-orchestration` + `mem://features/voice-sales-checkout`).

---

## Phase 3 — Cockpit admin

Route : `/admin/dynamic-pricing` (protégé admin).

### Vues
- **`TableMarketSaturation`** — liste territoires × métiers, slots exclusivité pris/total, demande, compétition, prix moyen recommandé. Tri/filtre.
- **`PanelCoefficients`** — éditeur live des poids de `pricing_engine_coefficients` (sliders + preview impact sur 3 scénarios types).
- **`TableDominatedTerritories`** — territoires saturés (>80 % slots pris).
- **`TableUnderservedTrades`** — métiers à faible saturation × forte demande (signaux d'acquisition).
- **`DialogPricingOverride`** — créer un override manuel (contractor OU territory+trade).
- **`TableRecommendationsAudit`** — historique des recommandations générées, taux d'acceptation, prix moyen.

### Fichiers
`src/pages/admin/PageAdminDynamicPricing.tsx`
`src/features/dynamicPricing/admin/` (composants ci-dessus)

---

## Routing
- `src/app/router.tsx` :
  - `/entrepreneur/plan-ia` → `PageDynamicPlanGeneration` (lazy)
  - `/admin/dynamic-pricing` → `PageAdminDynamicPricing` (lazy, admin guard)
- Remplacer le CTA "Voir mon plan" sur `/entrepreneur/checkout` et post-AIPP pour pointer vers `/entrepreneur/plan-ia` quand `contractor_id` connu.

---

## Garde-fous (memory contracts)
- Pricing core respecte `mem://pricing/contractor-plans-dynamic` (catalogue de base) — le moteur **module** les prix de base, ne les remplace pas.
- Caps `AppointmentCalculator` à $100k/mo respectés dans `revenueEstimator`.
- Checkout reste natif Stripe Payment Element (`mem://pricing/checkout-architecture`).
- Cinematic Dark + Inter, glass cards 28px, easing `cubic-bezier(.22,1,.36,1)`.
- Aucune copie "Choisissez un forfait" — toujours "Votre Plan IA" / "Optimisé pour votre marché".

---

## Ordre d'exécution

1. Migration Supabase (Phase 1 schema complet, en attente d'approbation).
2. Engine TS pur + tests rapides.
3. Edge function `api_generate_dynamic_plan`.
4. Flow entrepreneur `/entrepreneur/plan-ia` (Wizard + Reveal).
5. Cockpit admin `/admin/dynamic-pricing`.
6. Intégration Alex mode `custom_plan_consultation`.
7. Branchement post-AIPP et remplacement CTA pricing existants.

---

## Détails techniques

### Formule prix dynamique (resumé)

```text
base_price = plans[recommended_slug].price
market_modifier = (competition * w_comp + demand * w_dem + ticket * w_tic) / 100
exclusivity_mod = wants_exclusivity && slots_available ? exclusivity_premium : 0
rarity_mod = rarity_score > 70 ? rarity_premium : 0
season_mod = seasonality_multiplier * w_season
final = base_price * (1 + market_modifier + exclusivity_mod + rarity_mod + season_mod)
final = clamp(final, floor, ceiling)
if override exists → override wins
```

### Sélection du plan (extrait)

```text
if capacity < 5            → recrue
elif market_score < 40     → recrue/pro
elif market_score < 70     → pro
elif wants_exclusivity     → elite/signature
elif avg_ticket > 10k      → premium/elite
else                       → premium
```

### Questions à confirmer

Avant d'exécuter la migration, je veux confirmer :
1. **Catalogue de plans** : on garde strictement les 5 slugs existants (Recrue/Pro/Premium/Élite/Signature) et on **module** leur prix, ou on accepte un slug `custom` libre piloté par Alex ?
2. **Marché initial** : seed `territory_market_scores` avec un échantillon (Laval/Montréal/Terrebonne × Isolation/Plomberie/Électricité/Toiture) ou attendre des données réelles via une autre source ?
3. **Phasage** : tout livrer dans cette boucle, ou phase 1+2 maintenant et phase 3 (admin) ensuite ?
