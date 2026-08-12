# Convertir les clics existants en premier 1 $ réel

## Ce que les données de production disent (vérifié à l'instant)

Événements réels des 30 derniers jours (`pipeline_engagement_events`) :

```text
sent 120 · delivered 282 · undelivered 93
clicked            22 prospects
landing_viewed     22 prospects
profile_viewed      2 prospects
checkout_cta_clicked 2 prospects
checkout_opened     4 prospects (10 événements)
paid                0
```

Sessions Stripe réellement créées (`billing_checkout_sessions`) : **3 au total, toutes `cs_live_`** (donc Stripe est bien en mode LIVE), toutes encore `open / unpaid`. Deux des trois sont des tests internes (`instrumentation_test`, `priority1_live_run`) ; **une seule** vient d'un vrai prospect (`sms_activation`, 11 août).

Conclusion factuelle : « checkout → paid = 0/4 » n'est pas une panne Stripe démontrée — il n'y a jamais eu de vraie tentative de paiement carte. Le vrai blocage mesuré est **landing → CTA : 2 / 22 (9 %)**. Deuxième blocage : la promesse du CTA. Troisième : l'attribution (`prospect_id` est nul sur `sent`/`delivered`, donc on ne peut pas segmenter proprement le second envoi).

## Ce qu'on fait, dans l'ordre

### 1. Landing V2 — la page doit prouver « UNPRO comprend déjà mon entreprise »
Réutiliser la route existante `/unpro/activate/:token` et `activation-token-resolve` (déjà enrichi). Retravail de la page :
- Au-dessus de la ligne de flottaison : nom d'entreprise, logo (si réel), ville/territoire, catégorie, site web — puis le titre « Voici comment l'IA comprend {{company_name}} ».
- Aperçu profil : services détectés, territoires, informations publiques trouvées, signaux d'avis réels, statut de vérification. Chaque champ garde son étiquette Vérifié / Déclaré / Déduit / À confirmer. Aucun champ inventé, aucun bloc vide : un champ manquant disparaît ou devient « à confirmer ».
- Un seul CTA dominant : **« Voir et activer mon profil — 1 $ »**, répété une fois après l'aperçu, plus une barre CTA persistante en bas sur mobile. Suppression des CTA concurrents et de la navigation sur ce chemin.
- Bloc valeur court : réclamer le profil, corriger l'information, dire ses objectifs à Alex, devenir recommandable. Mention explicite « 1 $ aujourd'hui. Aucun engagement. »

### 2. Rendre le 1 $ vraiment sans engagement
`create-activation-checkout` bascule en `mode: "subscription"` avec le plan mensuel dès qu'un `plan_code`/`quote_id` est présent. Sur le chemin SMS/activation, on force le chemin **paiement unique** (`mode: "payment"`, 1 $ CAD, aucun abonnement créé) et on ignore tout `plan_code` entrant. Le choix de plan arrive après, via Alex.

### 3. Fiabiliser et prouver Stripe LIVE de bout en bout
- Journaliser chaque étape (création session, redirection, retour, webhook reçu, signature validée, activation DB) dans les logs d'audit existants, sans donnée de paiement sensible.
- Vérifier que `stripe-unpro-webhook` reçoit bien `checkout.session.completed` pour le mode `payment` et que les métadonnées `platform/brand` passent le filtre de quarantaine.
- Exécuter une vraie transaction 1 $ en production, du CTA jusqu'à l'écran de succès et l'entrée dans l'onboarding, puis rembourser. Sans cette preuve, aucune campagne n'est envoyée.

### 4. Réparer l'attribution du tunnel
`sent`/`delivered` arrivent sans `prospect_id`. On relie ces événements au prospect (via le message/token) pour que le cohorte « cliqué / non payé » soit exacte et que la comparaison Premier SMS vs Second SMS soit possible.

### 5. Après le paiement — Alex, une question à la fois
Le succès ne renvoie pas vers un tableau de bord générique : il enchaîne sur `activation-goals` (déjà en place). Alex demande, une par une : services, territoire, projet idéal, capacité, objectifs, croissance visée, exclusivité. Ensuite seulement, un plan personnalisé unique est recommandé via le moteur de plans existant. Tout ce que UNPRO sait déjà est préchargé : le contractant confirme ou corrige.

### 6. Second contact segmenté (seulement après la preuve Stripe)
- **Segment A** — les prospects ayant cliqué et vu la landing sans payer (22 identifiés) : message personnalisé « votre aperçu IA est prêt », lien personnalisé, 1 $ sans engagement.
- **Segment B** — livrés sans clic : variante différente, jamais le message identique.
- Passage obligatoire par les portes CASL, opt-out/STOP, suppression, garde anti-doublon 24 h et exclusion des contractants déjà payants/activés.

### 7. Visibilité CRM
Dans le CRM existant, afficher l'état par prospect : Envoyé → Livré → Cliqué → Landing → CTA → Checkout → Payé → Activé, plus un filtre **« Prospects chauds — cliqué, non activé »** qui devient la file de relance manuelle/affilié si l'automatisation échoue.

## Détails techniques
- Fichiers touchés : `src/pages/activation/PageUnproActivate.tsx` et `src/features/activationProfile/*` (landing V2), `supabase/functions/create-activation-checkout/index.ts` (paiement unique forcé + logs), `supabase/functions/stripe-unpro-webhook/index.ts` (audit), `second-touch-outreach` (segments), vues CRM/`/admin/conversion-lab` existantes.
- Aucune nouvelle table sauf besoin d'attribution ; réutilisation de `pipeline_engagement_events`, `billing_checkout_sessions`, `verified_prospect_tokens`.
- QA mobile obligatoire : chargement rapide, nom visible immédiatement, CTA sans scroll, aucun contraste cassé, retour de Stripe fonctionnel, onboarding Alex opérationnel.

## Critères de fin (résultats factuels, pas « implémenté »)
- Landing V2 en ligne : oui/non
- Nombre de prospects cliqué-non-payé identifiés
- Stripe LIVE vérifié : oui/non
- Transaction 1 $ réelle de bout en bout vérifiée : oui/non
- Second contact : éligibles / envoyés / livrés / cliqués / CTA / checkout / payés / activés
- Si payé reste à zéro : le blocage exact, avec preuve
