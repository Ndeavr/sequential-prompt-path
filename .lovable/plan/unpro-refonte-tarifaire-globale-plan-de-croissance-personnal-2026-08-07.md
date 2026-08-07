# UNPRO — Refonte tarifaire globale + Plan de croissance personnalisé

## Ce qui existe déjà (vérifié)

- `plan_catalog` (5 forfaits actifs : Recrue 149, Pro 349, Premium 599, Élite 999, Signature 1799) **et** la table `plans` (matrice d'habilitations, colonne `audience`). Deux sources concurrentes.
- `src/config/contractorPlans.ts` re-déclare les mêmes prix en dur, réexporté par `src/config/pricing.ts`.
- Moteur personnalisé déjà présent : Edge Function `compute-pricing-quote` + table `contractor_pricing_quotes` (0 ligne) + page d'intake `/entrepreneur/devis-personnalise` + `/admin/pricing-intelligence`.
- Activation 1 $ : `create-activation-checkout` crée un paiement **unique** de 1 $ (`mode: "payment"`), sans abonnement de suite. C'est le point de rupture principal.
- Données marché réelles : `market_demand` = 1 ligne, `city_service_demand_grid` = 0, `capacity_snapshots` = 0, `market_capacity` = 0, `demand_signals` = 1, `recruitment_capacity_targets` = 9, `territories` = 179, `contractors` = 29, `contractor_subscriptions` = 2.
- ~100 fichiers `src/` et 18 Edge Functions contiennent des prix hérités (149/349/599/999/1799, Fondateur 19995/29995).

**Conséquence directe :** la demande et la concurrence réelles ne sont pas encore mesurables pour la plupart des couples métier × ville. Le moteur affichera donc « Disponibilité en cours de calcul » / « Données insuffisantes » là où c'est le cas, sans jamais inventer de rareté. La capacité restante sera dérivée uniquement de `recruitment_capacity_targets` + contractants actifs réels.

## Hypothèses (dites-le si c'est faux)

1. Les 6 nouveaux forfaits **remplacent** les 5 anciens. Les 2 abonnements existants sont préservés en legacy (`active = false`, aucune surfacisation client).
2. Les offres Fondateur (19995 / 29995) sont retirées des surfaces client, conservées en données historiques admin.
3. Nouveaux produits/prix Stripe créés pour les 6 forfaits (CAD, mensuel), plus un prix d'essai 1 $ / 7 jours.
4. Le personnalisé s'ancre sur les 6 paliers : le prix calculé est arrondi vers le palier le plus proche, avec un ajustement territoire/exclusivité borné entre 49 $ et 1 499 $.

## Livraison par phases

### Phase 1 — Source unique de vérité (fondation)
- Migration : `plans` devient la seule table tarifaire contractant. Insertion des 6 forfaits (`presence` 49, `local` 79, `croissance` 149, `pro` 299, `premium` 599, `domination` 1499) avec habilitations, `appointments_included`, multiplicateurs, `stripe_monthly_price_id`. Anciennes lignes et `plan_catalog` désactivées (données conservées).
- Table `pricing_config` (poids, bornes, `pricing_version`) — un seul endroit pour les formules.
- `src/config/contractorPlans.ts` devient un simple fallback typé, alimenté par `usePlanCatalog` branché sur `plans`. Suppression des prix en dur des composants.
- Guard de régression étendu (`src/dev/legacyPlanGuard.ts`) : échec si un ancien prix/nom apparaît dans une surface client.

### Phase 2 — Moteur de plan personnalisé (extension, pas remplacement)
- Extension de `compute-pricing-quote` : lecture réelle de `market_demand`, `demand_signals`, `recruitment_capacity_targets`, `territories`, contractants actifs par métier × ville.
- Sortie structurée : `recommendedPlan`, `monthlyPrice`, `trialPrice`, `trialDays`, `territories`, `desiredVolume`, `marketDemand`, `competition`, `availableSlots`, `exclusivity`, `explanation`, `dataStatus` (`verified` / `declared` / `inferred` / `insufficient`), `pricingVersion`.
- Calcul 100 % serveur, journalisé dans `contractor_pricing_quotes` avec la trace du calcul (chaque facteur, sa valeur, sa source).
- Profil de croissance persistant (`contractor_growth_profiles`) : métier, villes, rayon, capacité, volume désiré, objectif, exclusivité, valeur moyenne de projet.

### Phase 3 — Disponibilité réelle
- Fonction SQL `territory_availability(trade, city)` : places cibles (`recruitment_capacity_targets`) moins contractants actifs éligibles. Retourne `unknown` quand la cible n'existe pas.
- UI : « 4/5 places occupées » seulement si `status = verified`, sinon « Disponibilité en cours de calcul ».
- Admin : panneau expliquant le calcul (cible, occupants, source, date).

### Phase 4 — UX tarifaire
- Nouvelle page tarifs contractants, mobile-first : CTA primaire « Créer mon plan avec Alex », carte de recommandation (territoire, objectif, opportunité, capacité, prix mensuel, « 1 $ aujourd'hui · 7 jours · puis X $/mois »), actions Activer / Personnaliser territoire / Modifier objectif.
- Secondaire replié : « Je préfère choisir un forfait » → les 6 paliers. Présence (49 $) positionné présence/réputation, sans promesse de rendez-vous garantis.
- Recalcul en direct sur changement de ville, rayon, catégorie, volume, objectif, exclusivité, budget, avec explication du delta.
- États chargement / vide / erreur : si le marché n'est pas calculable, les forfaits standards restent sélectionnables et le flux 1 $ n'est jamais bloqué.

### Phase 5 — Objectif contractant + Alex
- Onboarding conversationnel : une question à la fois, objectif de croissance capté puis persisté (plus de répétition).
- Prompts Alex contractants réécrits : lecture de la même source tarifaire, recommandation motivée, distinction explicite VÉRIFIÉ / DÉCLARÉ / INFÉRÉ / DONNÉES INSUFFISANTES, interdiction d'inventer demande, concurrence, places ou exclusivité.

### Phase 6 — Stripe et abonnements
- `create-activation-checkout` passe en `mode: "subscription"` avec `trial_period_days: 7` et frais d'activation 1 $, plan de suite = Présence 49 $ par défaut, ou le forfait explicitement accepté.
- Prix jamais accepté depuis le navigateur : revalidation serveur du devis avant création de session.
- Webhooks (`stripe-webhook`, `stripe-unpro-webhook`) : fin d'essai, renouvellement, upgrade, downgrade, annulation, échec de paiement → mise à jour des habilitations et de l'état tableau de bord. Déduplication client/abonnement.

### Phase 7 — Habilitations, admin, analytics, nettoyage
- Alignement des limites réelles (rendez-vous, territoires, exclusivité, visibilité, fonctions Alex) sur les 6 forfaits.
- Admin CRM/acquisition existant enrichi : métier, territoire, objectif, capacité, forfait choisi vs recommandé, prix personnalisé, essai, abonnement, demande, concurrence, places, version de calcul.
- Événements analytiques du tunnel (`pricing_view` → `cancel`) avec contexte forfait/objectif/territoire.
- Balayage final : chaque prix hérité restant est soit migré, soit marqué explicitement comme donnée historique admin.

### Phase 8 — Tests bout en bout
Scénarios A à J du brief exécutés sur la production : activation 1 $ → 7 jours → 49 $, parcours Alex personnalisé, changement de ville, demande d'exclusivité, données insuffisantes, upgrade/downgrade, webhook, cohérence Alex/checkout/admin, absence d'anciens prix côté client.

## Détails techniques

- Migrations : `plans` (6 lignes + désactivation legacy), `pricing_config`, `contractor_growth_profiles`, fonction `territory_availability`, extension de `contractor_pricing_quotes` (trace de calcul, `pricing_version`).
- Edge Functions modifiées : `compute-pricing-quote`, `create-activation-checkout`, `create-contractor-checkout`, `create-checkout-session`, `stripe-webhook`, `stripe-unpro-webhook`, `compute-plan-recommendation`, `api_generate_dynamic_plan`, plus les fonctions Alex ventes (`alex-sales-process-turn`, `alex-voice-sales`, `alex-sales-analyzer`).
- Front : `src/config/contractorPlans.ts`, `src/config/pricing.ts`, `src/hooks/usePlanCatalog.ts`, `src/features/planSystem/*`, pages tarifs contractants, onboarding, tableau de bord, admin pricing/CRM.
- Stripe : 6 produits/prix mensuels CAD + prix d'essai 1 $ / 7 jours, créés via l'outil Stripe et référencés en base, jamais en dur.

## Ordre d'exécution proposé

Phases 1 → 2 → 3 en premier (fondation vérifiable sans risque de revenu), puis 6 (Stripe) avant 4/5 pour que l'UX pointe sur un checkout déjà correct, puis 7 et 8.
