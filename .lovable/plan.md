# Mode « Budget → Garantie » (bidirectionnel) dans le parcours existant

Ajout d'un second mode de calcul au moteur canonique déjà en place (`compute-pricing-quote`, `pricing_v3.capacity`). Aucune nouvelle architecture, aucun second moteur, aucun nouveau parcours.

## État actuel vérifié

- `supabase/functions/compute-pricing-quote/index.ts` est le moteur canonique unique. Entrée principale : `target_monthly_appointments` (mode Objectif implicite). Il calcule déjà : plafond de capacité marché (`capacityCeiling` = demande − engagements), sélection de plan avec garde de capacité, prix du RDV supplémentaire basé sur la valeur marché (`appointment_values`), exclusivité selon inventaire réel, multiplicateurs marché bornés 0.85–1.45, statut `waitlisted` si marché saturé/fermé, `pricing_explanation`, journalisation dans `pricing_audit_log`, sauvegarde dans `contractor_pricing_quotes`.
- `supabase/functions/activation-goals/index.ts` est le flux Alex post-1 $ (une question à la fois, `STEP_KEYS` de 8 étapes) et délègue déjà la recommandation au moteur canonique.
- `src/components/onboarding/StepPlanRecommendation.tsx` est déjà piloté serveur (aucun prix codé en dur).
- Admin existant : `src/pages/admin/PageAdminPricingIntelligence.tsx`.
- Stripe LIVE + `stripe-unpro-webhook` gèrent déjà l'engagement/libération de capacité (`market_capacity_commitments`).

Tout est donc réutilisé ; on étend, on ne recrée pas.

## Ce qui est ajouté

### 1. Moteur bidirectionnel (même formule, résolue dans les deux sens)

Dans `compute-pricing-quote`, ajout d'un champ d'entrée `pricing_mode: "goal" | "budget"` (défaut `goal`, rétrocompatible) et `monthly_budget_cents`.

- Mode `goal` : inchangé. Entrée `target_monthly_appointments` → sortie budget/plan recommandé.
- Mode `budget` : le moteur exécute **exactement la même chaîne de calcul**, mais résolue à l'envers. Recherche déterministe du plus grand nombre de RDV `N` tel que le prix personnalisé calculé par la chaîne existante (base plan + package RDV + exclusivité + multiplicateurs marché) reste ≤ budget, avec `N` borné par :
  - le plafond de capacité marché (`capacityCeiling`) ;
  - la capacité déclarée de l'entrepreneur (`monthly_capacity`) ;
  - la marge minimale (voir §2).
  Sortie : `guaranteed_appointments`, plan canonique correspondant, prix mensuel réel (jamais gonflé au budget), prix du RDV supplémentaire.

Aucune table d'équivalence budget→RDV. 350/750/1 500/2 500 ne sont que des raccourcis d'entrée UI.

Cas limites gérés explicitement, avec raison déterministe dans `pricing_explanation.mode_outcome` :
- `budget_below_floor` : aucun RDV garantissable → aucune garantie inventée, proposition Présence 49 $, ou augmenter le budget, ou réduire le territoire, ou marché alternatif réellement disponible.
- `capacity_limited` : le marché ne soutient pas tout le budget → on n'utilise que la capacité réelle et on affiche le reste comme non justifié.
- `contractor_capacity_limited` : la capacité déclarée limite l'offre ; l'entrepreneur peut modifier sa capacité et recalculer.
- `market_unavailable` : statut `waitlisted` existant conservé.

### 2. Protection des marges

Ajout au `pricing_config` existant (pas de nouvelle table) des paramètres manquants : coût estimé d'acquisition d'un RDV, coûts de communication, coûts opérationnels, marge minimale et marge cible. Le mode budget refuse toute garantie dont la marge tombe sous le plancher. La marge n'est jamais exposée côté public, seulement dans l'audit et l'admin.

### 3. Devis personnalisé (extension, pas de nouvelle table)

Extension de `contractor_pricing_quotes` avec uniquement les champs manquants : `pricing_mode`, `monthly_budget`, `guaranteed_appointments`, `contractor_capacity`, `market_capacity_snapshot`. Les équivalents existants sont réutilisés tels quels (`target_monthly_appointments`, `extra_appointment_price`, `recommended_monthly_price`, `pricing_version`, `calculation_version`, `expires_at`, `input_payload`, `breakdown`). Le snapshot permet de reproduire un devis accepté.

### 4. Parcours entrepreneur — une étape ajoutée au bon endroit

Après services + territoires, une étape unique « Comment souhaitez-vous bâtir votre plan ? » avec deux choix (Objectif / Budget). Implémentée :
- dans `activation-goals` : ajout des clés d'étape `pricing_mode` puis, en branche, `monthly_budget` ou l'objectif de RDV déjà existant. Alex reste à une question à la fois et ne redemande jamais ce qui est déjà connu (service, territoire, capacité, objectif préremplis).
- dans l'UI existante (`StepObjective` / `StepPlanRecommendation`, parcours `/onboarding` et activation post-1 $) : sélecteur de mode mobile-first, puis champ budget avec raccourcis 350 / 750 / 1 500 / 2 500+ / Autre.

Le raccourci 350 $ signifie strictement `monthly_budget = 350` ; aucun lien avec un éventuel produit 350 $ d'activation accompagnée, qui reste séparé.

### 5. Écran de garantie

`StepPlanRecommendation` affiche en mode budget : budget, spécialité, territoire, « UNPRO peut vous garantir X rendez-vous exclusifs/mois », prix du RDV supplémentaire, CTA « Garantir ma capacité », secondaire « Modifier mon budget » (recalcul en place), message « Des rendez-vous exclusifs garantis. Jamais des leads partagés. ». Tous les X viennent du moteur. États : chargement, recalcul, erreur, marché indisponible, capacité insuffisante, devis expiré, paiement échoué, aucune garantie possible.

### 6. Stripe LIVE et concurrence

Réutilisation du checkout et du webhook existants. Une proposition affichée n'est jamais de la capacité vendue : la capacité n'est engagée qu'au webhook confirmé, via l'index unique existant sur `market_capacity_commitments`. Avant checkout, revalidation serveur de la disponibilité ; si la dernière position vient d'être prise, le devis est recalculé au lieu d'être vendu.

### 7. Admin

Extension de `PageAdminPricingIntelligence` (aucun second centre admin) : mode, budget demandé, RDV souhaités, RDV garantis, prix RDV supplémentaire, services, territoires, capacité entrepreneur, capacité marché, plan recommandé, prix mensuel, version de calcul.

### 8. Audit

Journalisation dans `pricing_audit_log` existant : choix du mode, budget soumis, objectif soumis, proposition générée, garantie calculée, modification du budget, recalcul, devis accepté, achat Stripe, capacité engagée.

## Plans canoniques

Aucune modification : Présence 49, Départ 149, Croissance 299, Pro 599, Élite 999, Signature 1 499+. Les plans legacy restent inactifs et les abonnés legacy sont préservés. Le mode Budget est une manière supplémentaire d'atteindre le bon plan.

## Tests

Tests unitaires du résolveur bidirectionnel (cohérence Budget→Garantie ↔ Objectif→Budget), puis exécution réelle : parcours 1 $, mode Objectif, mode Budget à 350 / 750 / 1 500 / montant libre, même budget sur deux métiers et deux villes, capacité entrepreneur limitée, marché presque plein, marché sans capacité, budget trop faible, budget supérieur à la capacité, recalcul après modification, checkout Stripe LIVE + webhook + engagement de capacité, admin, mobile.

## Critères de complétion

1 $ → profil → services → territoires → Objectif OU Budget → moteur canonique → proposition → garantie réelle → Stripe LIVE → abonnement → capacité engagée, sans architecture parallèle ni régression des parcours existants.
