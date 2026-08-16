# Moteur canonique de tarification, capacité et territoire — Phase 1

Objectif de la phase 1 : le parcours entrepreneur fonctionne réellement de bout en bout —
1 $ → Alex collecte les objectifs manquants → plan personnalisé calculé côté serveur →
Stripe → webhook → capacité engagée. Le centre de contrôle Admin complet, l'intégration
recrutement et l'alignement des interfaces affiliées suivent en phase 2.

## Audit de l'existant (vérifié en production)

**KEEP**
- `compute-pricing-quote` (edge, 542 lignes) : moteur déterministe déjà côté serveur, lit
  `plans` + `pricing_config` + signaux de marché, retombe en facteurs neutres quand la donnée
  manque. C'est le moteur canonique à conserver et à étendre — aucun second moteur.
- `contractor_pricing_quotes` (17 devis réels) : persistance des devis, à enrichir.
- `plans` + `plan_features` (117 lignes) : catalogue et matrice de fonctionnalités.
- Tunnel 1 $ (`create-activation-checkout`, `/unpro/activate/:token`), webhooks
  `stripe-unpro-webhook`, `canonical_plan_code()`, `contractor_feature_access`.
- `appointment_values` (5), `extra_appointment_pricing_rules` (30), `trade_capacity_rules` (26),
  `exclusivity_rules` (5), `territories` (179), `pricing_config` (1).

**REPAIR**
- Grille de plans en base : `presence 49 / local 79 / croissance 149 / pro 299 / premium 599 /
  domination 1499`, RDV inclus 0/2/5/12/25/60 — incohérente avec la grille demandée.
- Prix du RDV supplémentaire : dérivé de règles génériques, pas de la valeur marché
  de l'entrepreneur.
- Sélection de plan : basée sur volume + objectif, sans contrainte de capacité marché.

**DEPRECATE**
- Code `local` (79 $) et anciens codes `recrue`, `elite`, `signature`, `premium`, `domination`
  → `active=false`, marqués legacy, jamais supprimés.
- Packs de rendez-vous universels (5/149, 10/249, 25/499) retirés des nouvelles offres.

**MISSING**
- Entité marché `service × territoire` opérationnelle : `market_capacity` existe mais est vide
  (0 ligne) et n'alimente rien.
- Plafond d'entrepreneurs par service × territoire, score de capacité, états
  UNDER_SUPPLIED / BALANCED / OVER_SUPPLIED.
- Journal d'audit tarifaire unifié.
- Flux Alex post-1 $ qui alimente réellement le moteur avec les objectifs manquants.

Risque legacy : **2 abonnements seulement** en base (1 actif, 1 annulé) — la bascule est sûre.

## Ce qui sera construit

### 1. Grille canonique (nouveaux codes)
Nouveaux codes actifs, avec RDV garantis et enveloppe territoriale :
`presence` 49 $/0 RDV · `depart` 149 $/1 · `croissance_v2` 299 $/3 · `pro_v2` 599 $/7 ·
`elite_v2` 999 $/12 · `signature_v2` 1499 $+/sur mesure.
Les six anciens codes passent `active=false` + `legacy=true` ; l'abonné actif conserve son prix,
son plan reste lisible et identifié comme legacy partout.

### 2. Stripe
Création des produits/prix LIVE manquants (149/299/599/999/1499) via l'outil Stripe, mappés dans
`plans.stripe_monthly_price_id`. Aucun price existant modifié, aucun doublon si un équivalent
existe déjà. Le checkout consomme le snapshot de prix accepté, jamais un prix recalculé côté client.

### 3. Valeur du rendez-vous et RDV supplémentaire
`appointment_values` devient la configuration de référence par catégorie (fourchettes
nettoyage 50–90 → rénovation majeure 300–600+), éditable en Admin sans déploiement, avec statut
`configured / inferred / calculated / overridden`. Toute surcharge exige motif, auteur, horodatage
et ligne d'audit. Le prix du RDV supplémentaire est la valeur marché calculée de l'entrepreneur,
jamais `prix du plan ÷ RDV inclus`, et il est affiché avant tout achat.

### 4. Capacité service × territoire
`market_capacity` est activée et alimentée : demande mensuelle estimée, rendez-vous engagés,
livrés récemment, entrepreneurs actifs, `max_contractors` configurable par service × territoire,
positions restantes, score de capacité et statut UNDER_SUPPLIED / BALANCED / OVER_SUPPLIED avec
l'explication du calcul. Règle stricte : aucune rareté affichée qui ne soit prouvée par les
positions réellement disponibles — sinon la formulation reste neutre. Aucune vente de capacité
garantie au-delà de la capacité du marché ; sinon plan Présence, autre territoire, capacité
réduite ou liste d'attente.

### 5. Alex — objectifs après le 1 $
Une question à la fois, uniquement ce qui n'est pas déjà connu du profil : types de travaux,
villes, contrats possibles par mois, valeur moyenne d'un contrat, volume vs exclusivité.
Les réponses alimentent directement le moteur ; jamais deux fois la même question.

### 6. Plan recommandé
Un seul plan recommandé, calculé serveur, avec investissement mensuel, capacité de rendez-vous
garantis, territoires et prix du rendez-vous supplémentaire. CTA « Activer mon plan », secondaire
« Ajuster mes objectifs ». Alternatives consultables. Tous les chiffres proviennent du calcul de
production : si une donnée manque, l'écran l'indique — aucun chiffre de remplacement.

### 7. Exclusivité adossée à l'inventaire
Avant toute vente d'exclusivité : vérification territoire, service, accords existants, dates et
conflits. Deux accords contradictoires deviennent impossibles au niveau base.

### 8. Marges
Configuration Admin des coûts d'acquisition, de communication et de production d'un rendez-vous,
avec marge minimale et cible. À objectifs équivalents, l'offre à meilleure marge est préférée,
sans jamais inventer de demande, de rareté, ni augmenter un prix déjà accepté.

### 9. Audit et permissions
Journalisation de chaque évènement tarifaire (devis, plan accepté, changement de prix de RDV,
surcharge Admin, exclusivité attribuée, capacité modifiée, marché fermé/rouvert) avec acteur,
horodatage, état précédent, nouvel état, motif et version de calcul. RLS : l'entrepreneur lit son
plan, sa tarification et sa capacité, sans pouvoir modifier les champs faisant foi ;
la configuration tarifaire est réservée aux Admin.

### 10. États et messages
Chargement du calcul, informations insuffisantes, marché indisponible, capacité nulle, liste
d'attente, échec Stripe, devis périmé, configuration manquante, erreur de calcul — chacun avec un
message clair, mobile-first, sans chiffre fictif. Positionnement conservé :
« Des rendez-vous exclusifs garantis. Jamais des leads partagés. »

## Détails techniques

- Migrations : colonnes `legacy`/`superseded_by` sur `plans` ; insertion des nouveaux codes ;
  activation et remplissage de `market_capacity` (clé service × territoire, contrainte d'unicité,
  index sur statut et positions restantes) ; table d'audit tarifaire ; contrainte d'unicité sur
  l'exclusivité active par service × territoire ; GRANT + RLS sur tout nouvel objet.
- `compute-pricing-quote` étendu : contrainte de capacité marché dans la sélection de plan,
  prix du RDV supplémentaire issu de `appointment_values`, sortie enrichie
  (`capacity_availability`, `exclusivity_availability`, `pricing_explanation`,
  `calculation_version`) et snapshot reproductible persisté.
- Le checkout et le webhook consomment l'identifiant du devis accepté et engagent la capacité
  du marché à l'activation ; libération à l'annulation ou à l'échec de paiement.
- Aucun calcul de prix faisant foi dans les composants React.

## Tests de la phase 1

Activation 1 $ · complétion de profil · collecte Alex · recommandation de plan de base ·
plan personnalisé · plusieurs villes · service à forte et à faible valeur · marché sous-approvisionné ·
marché sur-approvisionné · plafond de capacité atteint · rendez-vous supplémentaire · conflit
d'exclusivité Signature · checkout Stripe · webhook · échec de paiement · surcharge Admin ·
abonné legacy · mobile. Aucun succès Stripe simulé.

## Hors phase 1 (phase 2)

Centre de contrôle Admin complet, priorisation du recrutement selon la capacité réelle via la
file d'acquisition existante (CASL et garde anti-doublon préservés), alignement des interfaces
affiliées et télémarketing sur la grille canonique avec surcharges auditées, et nettoyage des
pages publiques restantes.
