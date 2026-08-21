# Calculateur de forfait entrepreneur

Nouvelle expérience mobile-first « Calculez le forfait adapté à votre croissance » sur une route dédiée `/entrepreneur/calculateur-forfait`, branchée sur le moteur de prix canonique existant. Aucun système de tarification parallèle.

## Ce qui existe déjà (vérifié)

- Moteur canonique unique : edge function `compute-pricing-quote` + `supabase/functions/_shared/pricingModes.ts` (modes `goal`, `budget`, `pack`).
- Catalogue réel : `plans` (audience contractor, actifs) — Départ 149, Croissance 299, Pro 599, Élite 999, Signature 1499 $/mois. Aucun prix annuel Stripe n'existe encore sur ces plans (`stripe_yearly_price_id` vide).
- Config prix : `pricing_config` (poids, marges, multiplicateurs) — source de vérité admin.
- Données marché réelles : `market_capacity` (179 lignes), `appointment_values` (5), `service_categories` (32), `cities` (15), `territory_availability`, `market_demand`.
- Devis : table `contractor_pricing_quotes` (déjà : mode, exclusivité, capacité, snapshot capacité, explication, statut d'approbation).
- Pack d'entrée 350 $ : `PACK_350_TOTAL_CENTS` / `solvePack`, plafond 5 RDV.
- Calculateurs existants conservés intacts : `/entrepreneur/devis-personnalise`, `/entrepreneur/garantie`, `/entrepreneur/pricing-calculator`.

## Décisions confirmées

- Frais uniques de création et d'optimisation du profil : **350 $**, séparés, modifiables par l'admin.
- Paiement annuel : **équivalent de 2 mois offerts** (10 × mensuel), prix annuels Stripe à créer pour les 5 plans actifs.
- Pack d'entrée 350 $ (paiement unique) : proposé en **seconde option** après la recommandation mensuelle/annuelle, incluant la création du profil et « jusqu'à X rendez-vous exclusifs garantis », X déterminé par domaine + territoire + disponibilité réelle, avec mention explicite que le nombre est confirmé avant paiement.

## Parcours entrepreneur

1. **Intake conversationnel** (une section à la fois, mobile-first) : nom d'entreprise, domaine (autocomplétion sur `service_categories`), ville principale (autocomplétion sur `cities`), rayon / villes desservies, chiffre d'affaires annuel, marge brute %, valeur moyenne d'un contrat, taux de conversion, croissance souhaitée (bascule $ / %), capacité max de nouveaux contrats/mois, niveau d'exclusivité, mensuel ou annuel. Placeholders d'exemple uniquement, aucun préremplissage.
2. **Calculs affichés en direct** (client, déterministes) :
   - `growth_amount` = revenu × % / 100, ou montant saisi
   - `contracts_needed` = growth_amount / valeur moyenne
   - `appointments_needed` = contracts_needed / close_rate
   - `monthly_appointments` = appointments_needed / 12
   - `potential_gross_profit` = growth_amount × marge
   - `expected_gross_profit_per_appointment` = valeur moyenne × marge × close_rate
   - Avertissement « capacité dépassée » si contrats requis > capacité déclarée.
3. **Tarification serveur** : appel de `compute-pricing-quote` en mode `goal` avec les vraies entrées (domaine, ville, villes desservies, RDV/mois, valeur projet, capacité, close rate, exclusivité). Le prix vient exclusivement du moteur. Si une donnée marché manque, le facteur reste neutre et l'écran affiche « Une validation du territoire est requise pour confirmer ce forfait. »
4. **Jauge de compétition** horizontale vert → jaune → orange → rouge (Faible / Modérée / Élevée / Très élevée), alimentée uniquement par les signaux réels retournés (facteur de compétition, positions restantes, demande). Facteurs listés sous la jauge. Si signaux insuffisants → « Évaluation en cours ».
5. **Résultats** : croissance visée, contrats supplémentaires, RDV/an, RDV/mois recommandés, profit brut potentiel, montant mensuel, montant annuel, économie annuelle, frais de profil (ligne distincte), territoire couvert, exclusivité, « jusqu'à X rendez-vous exclusifs garantis », plus un résumé de rendement présenté comme estimation, jamais comme promesse.
6. **Récapitulatif et paiement** : choix mensuel/annuel, frais de profil séparés, sauvegarde du devis avant redirection, reprise après connexion, Stripe Checkout, webhook, confirmation, reçu, statut d'activation visible au tableau de bord.

## Administration

Nouvel onglet dans `/admin/pricing-intelligence` :
- paramètres de calcul (poids `pricing_config`), prix par domaine et territoire, frais de profil, réduction annuelle, plafond de RDV garantis;
- validation manuelle d'un territoire;
- liste des calculs abandonnés et conversion d'un calcul en proposition personnalisée;
- hypothèses utilisées derrière chaque recommandation (`pricing_explanation`, `factors`);
- journal d'audit de toute modification de prix, garantie, territoire ou forfait.

## Détails techniques

Base de données (migrations) :
- `pricing_profile_fees` (ou clés dédiées dans `pricing_config`) : frais de profil 350 $, rabais annuel (2 mois), plafond de RDV garantis — versionnés et modifiables.
- `pricing_territory_overrides` (domaine × ville/région) : multiplicateur ou prix plancher, validation manuelle du territoire.
- `pricing_audit_log` : acteur, entité, valeurs avant/après, horodatage. RLS admin, GRANT explicites.
- `contractor_pricing_quotes` : ajout des champs de croissance (`annual_revenue`, `gross_margin_percent`, `growth_mode`, `growth_value`, `profile_fee_cents`, `billing_interval`, `annual_savings_cents`) + statut `abandoned` pour les calculs non convertis.

Backend :
- extension de `compute-pricing-quote` pour renvoyer, sans changer la formule : intervalle de facturation, prix annuel dérivé (10 × mensuel), frais de profil, niveau de compétition + facteurs, et l'option pack 350 $ résolue par `solvePack`.
- `create-checkout-session` étendu pour une session mixte : abonnement (mensuel ou annuel) + frais de profil uniques, ou pack 350 $ unique. Métadonnée `quote_id` transportée.
- Création des 5 prix annuels Stripe manquants (10 × mensuel) et enregistrement dans `plans.stripe_yearly_price_id`.
- `stripe-unpro-webhook` : confirmation du paiement, écriture du reçu, activation du forfait, statut du devis.

Frontend :
- `src/pages/entrepreneur/PageForfaitGrowthCalculator.tsx` + composants sous `src/components/forfait-calculator/` (intake par étapes, jauge de compétition, panneau de résultats, récapitulatif sticky mobile).
- Hook `useGrowthPlanCalculator` pour les calculs locaux, `useGrowthPlanQuote` pour l'appel serveur et la sauvegarde.
- États couverts : chargement, catégorie introuvable, ville non desservie, données insuffisantes, objectif irréaliste, capacité dépassée, territoire complet, validation manuelle requise, échec Stripe, paiement réussi, calcul sauvegardé.
- Route ajoutée dans `src/app/router.tsx`; devis retrouvables dans le tableau de bord entrepreneur.

Tests : vérification navigateur mobile avec vraies catégories et villes (croissance en $ et en %, marge faible/forte, objectif > capacité, territoire sans données, mensuel, annuel, connecté et non connecté, retour Stripe).
