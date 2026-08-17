# Audit et réparation du recrutement (production)

Objectif : prouver qu'un entrepreneur réel peut passer de prospect → SMS/courriel → landing → profil → paiement 350 $ → onboarding. Priorité aux catégories isolation/enveloppe et ventilation (VRC/HRV), rayon ~50 km de Montréal.

## Ce que les données de production disent déjà (mesuré aujourd'hui)

- `contractor_prospects` : 230 prospects jamais contactés (225 avec téléphone, 41 avec courriel). Répartition : isolation 51, toiture 51, plomberie 53, drain 35, **ventilation 3**.
- `verified_contractor_prospects` : 232 vérifiés, mais **seulement 2 lignes ont un statut de validation téléphonique réel** (`valid_mobile`) — 197 sont marquées `sms_eligible = true` avec `phone_validation_status = unverified`.
- **Zéro SMS envoyé aujourd'hui.** Dernier envoi : 2 messages le 16 août. Aucun événement d'acquisition aujourd'hui sauf 1 clic.
- Le lot d'envoi (`send-verified-batch`) bloque sur `missing_public_provenance` (porte CASL) — porte légitime, à ne pas contourner.
- Mentions « 1 $ » encore présentes dans `create-activation-checkout`, `create-founder-activation-checkout`, `stripe-webhook`, `tunnel-reality-report`.

Diagnostic préliminaire : le premier goulot est **PROSPECT → ÉLIGIBLE** (provenance publique + validation téléphonique), pas la livraison. À confirmer stade par stade avant toute réparation.

## Plan d'exécution

### 1. Audit chiffré réel (aucune modification)
Construire une requête d'inventaire unique produisant, pour aujourd'hui et pour le stock total : prospects disponibles / qualifiés / rejetés / en enrichissement, split isolation vs ventilation, géographie 50 km Montréal, puis les compteurs d'outreach (sélectionnés, tentés, SMS envoyés/livrés/échoués, courriel de repli, doublons ignorés, bloqués CASL, autres blocages) et de conversion (clics, sessions landing, profils vus, réponses, checkouts, paiements 350 $, onboarding, activations). Uniquement des données réelles ; les zéros restent visibles.

### 2. Vérifier pourquoi rien n'est parti aujourd'hui
Contrôler l'exécution des tâches planifiées (`cron.job` via l'outil base de données, le rôle psql n'y a pas accès), le worker d'acquisition, la sélection de catégories/géographie, la validation téléphonique Twilio Lookup, la porte CASL, le garde anti-doublon 24 h, les identifiants Twilio et le repli courriel. Le garde 24 h et les portes légales restent actifs.

### 3. Débloquer l'éligibilité (la réparation principale attendue)
- Lancer la validation téléphonique sur les prospects isolation/ventilation prioritaires afin de remplacer `unverified` par un vrai verdict Twilio.
- Lancer l'enrichissement de provenance publique (crawl officiel des sites, fiche publique) sur les mêmes prospects, pour satisfaire la porte CASL sans la contourner.
- Recalculer `sms_eligible` à partir du verdict réel plutôt que d'une valeur par défaut.
- Prospects ventilation quasi inexistants (3) : lancer une passe de découverte ciblée VRC/HRV/échangeur d'air dans le rayon Montréal via les sources officielles déjà en place.

### 4. Message : offre 350 $ uniquement
Purger les dernières références « 1 $ » des fonctions de checkout, du webhook et du rapport, pour que toute la chaîne parle du pack 350 $ (paiement unique, rendez-vous exclusifs garantis, nombre calculé avant paiement). Vérifier que chaque CTA sortant résout vers une URL UNPRO fonctionnelle.

### 5. Parcours doré testé de bout en bout
Suivre l'URL exacte reçue par SMS sur mobile 390 px et desktop : chargement, identité d'entreprise correcte, raison du contact claire, logo officiel, aucune image cassée, offre 350 $ compréhensible, garantie non trompeuse, CTA fonctionnel, état du tunnel préservé après connexion/OTP. Puis profil (Vérifié / Déclaré / Inféré / En attente, aucune donnée fabriquée) → objectifs via Alex, une question à la fois → checkout Stripe 350 $. Le test s'arrête avant toute vraie charge : si une transaction réelle est nécessaire, elle est signalée comme étape externe.

### 6. Cockpit admin recrutement
Étendre l'écran admin de recrutement existant (aucune nouvelle infrastructure) avec : bandeau AUJOURD'HUI (qualifiés, envoyés, livrés, réponses, clics, checkout, payés, activés), entonnoir 11 étapes avec compte, taux de conversion, échecs et principale cause d'échec par étape, mise en évidence du premier goulot matériel, plus un panneau ÉTAT SYSTÈME (worker, SMS, courriel, anti-doublon, landing, Stripe, webhook, onboarding) en VERT / JAUNE / ROUGE.

### 7. Boucle audit → blocage → réparation → retest
Chaque blocage interne réparable est corrigé puis le test correspondant est rejoué, jusqu'à ce que le parcours doré passe ou qu'un blocage externe (Twilio, Stripe, source de données) soit identifié.

## Détails techniques

- Réutilise l'existant : `send-verified-batch`, `twilio-lookup-phone` / `validate-contractor-phone`, `enrich-official-website`, `acquisition-funnel-live`, `recruitment-orchestrator`, `_shared/offerCopy.ts`, `_shared/outreachLink.ts`.
- Les vues d'entonnoir s'appuient sur `acquisition_events`, `acq_sms_logs`, `verified_contractor_prospects`, `contractor_pricing_quotes` et les événements Stripe déjà journalisés ; ajout d'une vue de lecture si nécessaire, aucune table dupliquée.
- Aucun contournement du garde anti-doublon 24 h ni de la porte CASL ; aucun appel payant DataForSEO sans autorisation explicite.

## Livrable final

Rapport unique : CHIFFRES DU JOUR — PREMIER GOULOT (étape + preuve) — RÉPARATIONS — PARCOURS DORÉ (PASS/FAIL par étape) — BLOCAGES EXTERNES — PROCHAINE ACTION.
