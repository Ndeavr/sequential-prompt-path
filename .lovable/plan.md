# Plan personnalisé entrepreneur — Pricing Intelligence

Objectif : passer d'une grille fixe à un devis personnalisé calculé à partir des objectifs réels, avec Alex qui collecte, un moteur qui chiffre, une page de résultat "Votre plan recommandé", un paiement Stripe direct, et un cockpit admin pour superviser les devis.

Réutilise l'existant (`plan_catalog`, `contractors`, `contractor_objectives`, `pricing-calculate`, `create-checkout-session`, `PageContractorPlanRecommendation`, Alex chat). N'ajoute qu'une couche **devis personnalisé** par-dessus.

## Phase 1 — Schéma `contractor_pricing_quotes`

Table dédiée (séparée de `contractor_plan_recommendations` pour garder le cycle de vie commercial : draft → offered → accepted → paid → waitlisted → rejected).

Colonnes (exactement celles demandées) :
`id, contractor_id (nullable, FK contractors), company_name, trade_primary, city, territory_cluster, target_monthly_appointments, average_project_value (cents), estimated_close_rate (0–1), estimated_monthly_revenue_potential (cents), base_platform_fee, appointment_package_fee, territory_competition_multiplier, seasonality_multiplier, exclusivity_fee, aipp_optimization_fee, recommended_plan (FK plan_catalog.code), recommended_monthly_price, min_monthly_price, max_monthly_price, roi_estimate (numeric), pricing_status (enum), created_at, updated_at, user_id, input_payload jsonb, breakdown jsonb, stripe_checkout_session_id`

Enum `pricing_quote_status` : `draft | offered | accepted | paid | waitlisted | rejected`.

RLS :
- propriétaire : `auth.uid() = user_id` (CRUD)
- admin : `has_role(auth.uid(),'admin')` (all)
- anon : aucun accès
GRANT `SELECT, INSERT, UPDATE` à `authenticated`, `ALL` à `service_role`.

## Phase 2 — Edge function `compute-pricing-quote`

Entrée : tous les champs collectés par Alex (trade_primary/secondary, city, service_radius_km, target_monthly_appointments, average_project_value, monthly_capacity, close_rate_estimate, desired_growth_level, wants_exclusivity, preferred_project_types, seasonal_priority, current_google_presence, current_ai_visibility_score, rbq_number, company_name, website_url).

Logique :
1. `estimated_monthly_revenue_potential = target_monthly_appointments × estimated_close_rate × average_project_value`
2. `base_platform_fee` = prix mensuel du plan candidat (`plan_catalog.monthly_price`)
3. `appointment_package_fee` = surcharge si `target_monthly_appointments` dépasse `appointments_included` du plan candidat (lookup `appointment_pricing_benchmarks` si dispo, sinon barème intégré ; +35 $ / RDV supplémentaire en défaut).
4. `territory_competition_multiplier` : lookup `cluster_pricing_multipliers` par (`city`, `trade_primary`) → 0.9 à 1.6. Si saturation détectée (`contractor_capacity_state` au plafond) → `pricing_status = 'waitlisted'` et `recommended_plan = 'recrue'` (plan alternatif).
5. `seasonality_multiplier` : table `seasonal_pricing_rules` selon `seasonal_priority` + mois courant (0.95 à 1.25).
6. `exclusivity_fee` : 0 si `wants_exclusivity=false`, sinon +30 % du base fee, plafonné selon le plan (verrouillé à `signature` au-delà de 6 mois).
7. `aipp_optimization_fee` : 0 si `current_ai_visibility_score ≥ 70`, sinon palier 49/149/299 $ selon écart.
8. Sélection `recommended_plan` :
   - `monthly_capacity < 5` ou `target_monthly_appointments < 4` → `recrue`
   - `average_project_value ≥ 25 000 $` → minimum `premium`, sinon `elite` si revenus potentiels ≥ 100 k$
   - `wants_exclusivity=true` + capacité ≥ 20 → `signature`
   - sinon mapping par `target_monthly_appointments` (4–8 pro, 9–15 premium, 16–25 elite, 26+ signature, >40 = "sur mesure" → plan custom 2500$+)
9. `recommended_monthly_price = base_platform_fee + appointment_package_fee + exclusivity_fee + aipp_optimization_fee` puis appliquer `× territory_competition_multiplier × seasonality_multiplier`.
10. `min/max_monthly_price` = ±15 % autour de la reco (option "commencer petit" / "accélérer").
11. `roi_estimate = estimated_monthly_revenue_potential / recommended_monthly_price`.

Sortie : insère en `contractor_pricing_quotes` (`pricing_status='offered'`, ou `waitlisted` si territoire saturé), retourne l'objet complet + `breakdown` jsonb pour affichage.

`verify_jwt = true`. Utilise `https://esm.sh/@supabase/supabase-js@2.49.1`.

## Phase 3 — Flow Alex : collecte des objectifs

Étendre `src/services/alexContractorOnboardingService.ts` avec un mode `pricing_intake` :
- Alex demande, **une question à la fois** (style Concierge Décisif), les 17 champs requis, en regroupant intelligemment (ex : "Combien de rendez-vous par mois visez-vous ?" + "Quel est votre taux de fermeture estimé ?" dans une même bulle si l'utilisateur est en confiance).
- Pré-remplissage depuis `contractor_objectives` / `contractor_goal_profiles` / `contractors` si déjà connu (skip questions répondues).
- À la fin : appelle `compute-pricing-quote`, persiste le quote, redirige vers `/entrepreneur/plan-personnalise/:quoteId`.
- Aucune fuite technique (jamais "Running task…", "Analyse en cours…" OK).

## Phase 4 — Page résultat `/entrepreneur/plan-personnalise/:quoteId`

Nouvelle page `PageContractorPersonalizedPlan.tsx` (mobile-first, glassmorphism dark cinematic — base `#050816`, glass `rgba(255,255,255,0.04)` blur 24, radius 28).

Sections (verticales, scroll naturel) :
1. **Header personnalisé** : "Bonjour {company_name}. Voici votre plan recommandé."
2. **HeroPlanCard** : nom du plan + prix `recommended_monthly_price $ / mois`, badge "Personnalisé pour {city} · {trade_primary}".
3. **PotentialRevenueCard** : `estimated_monthly_revenue_potential` formaté, sous-titre "Basé sur vos objectifs réels". Ring SVG + ROI estimé (×N).
4. **TerritoryCard** : "Territoire disponible" (vert) ou "Territoire en forte demande → liste d'attente" (orange) selon `pricing_status`.
5. **GuaranteesStrip** : "Rendez-vous garantis · Pas de leads partagés · RBQ vérifié · Sans engagement annuel".
6. **BreakdownAccordion** : transparence (base, RDV, multiplicateurs, exclusivité, AIPP) — replié par défaut.
7. **ChoiceTrio** (3 cards horizontal-scroll mobile) :
   - "Commencer petit" → `min_monthly_price` (plan inférieur d'un cran)
   - "Plan recommandé" → mis en avant
   - "Accélérer + exclusivité" → `max_monthly_price` (upsell)
8. **StickyFooterCTA** : `Activer mes rendez-vous` (primary, gradient amber) → appelle `create-checkout-session` avec le `recommended_plan` + un `metadata.quote_id` (passe `pricing_status` à `accepted` au retour Stripe via webhook ou polling). CTAs secondaires : `Réserver mon territoire` (exclusivité) · `Parler à Alex`.
9. Si `pricing_status='waitlisted'` : remplace CTA principal par "Rejoindre la liste d'attente" + plan alternatif (recrue gratuit limité).

Tokens existants uniquement (jamais de hex en dur dans les composants).

## Phase 5 — Admin Pricing Intelligence

Nouvelle page `/admin/pricing-intelligence` (`PageAdminPricingIntelligence.tsx`) :
- **KPIs en haut** : quotes 7j, taux d'acceptation, panier moyen, % waitlisted, MRR projeté.
- **Filtres** : statut, métier, ville, plan recommandé, période.
- **Table** (TanStack) : entreprise · métier · ville · cluster · plan suggéré · prix reco · ROI · statut · date. Click row → drawer détail (`input_payload`, `breakdown`, journal Stripe).
- **Actions admin** : changer statut manuellement, overrider le prix, marquer "waitlisted", forcer "rejected", générer un lien Checkout Stripe avec override.
- Lien depuis `/admin/operations`.

## Phase 6 — Câblage routes & navigation

- `src/app/router.tsx` : ajoute `/entrepreneur/plan-personnalise/:quoteId` et `/admin/pricing-intelligence`.
- Bouton "Voir mon prix personnalisé" depuis `PageContractorOnboardingStart` et depuis la fin de l'onboarding Alex.
- L'ancienne `/entrepreneur/plan` reste en fallback (grille statique) ; redirige vers la version personnalisée si un `quoteId` est en session.

## Détails techniques

- Aucune modif sur `plan_catalog` ni `create-checkout-session` (déjà OK depuis le fix produit Stripe).
- `metadata.quote_id` ajouté dans la session Stripe pour réconcilier `accepted` → `paid` côté `verify-checkout-session` (édition mineure d'une edge function existante).
- Calcul 100 % serveur (jamais exposé au client en clair pour éviter manipulation).
- i18n : fr-CA exclusivement. Format monétaire `Intl.NumberFormat('fr-CA', { style:'currency', currency:'CAD', maximumFractionDigits:0 })`.
- Analytics : événements `pricing_quote_created`, `pricing_quote_offered`, `pricing_quote_accepted`, `pricing_quote_paid`, `pricing_quote_waitlisted`.
- Mémoire : crée `mem://features/contractor-personalized-pricing` après livraison.

## Hors scope (Phase 2+ ultérieure)

- Re-calcul automatique mensuel des quotes existants.
- Notifications email aux entrepreneurs en waitlist quand un slot s'ouvre.
- Comparaison multi-quotes / négociation en live avec Alex.
- Ajout d'un plan "Sur mesure 2500$+" dans `plan_catalog` (à faire seulement si tu confirmes les prix Stripe à créer).

## Critère de succès

Un entrepreneur démarre une conversation Alex → répond à ≤ 10 questions → atterrit sur `/entrepreneur/plan-personnalise/:quoteId` avec son prix, son potentiel, son territoire → clique "Activer mes rendez-vous" → arrive sur Stripe Checkout avec le bon price_id et `quote_id` en metadata → revient avec `pricing_status='paid'`. Aucune intervention humaine sur le chemin critique. Admin voit chaque devis dans Pricing Intelligence.
