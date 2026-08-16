# Offre d'entrée 350 $ — « Jusqu'à 5 rendez-vous exclusifs garantis »

Extension du moteur canonique existant (`compute-pricing-quote` + `_shared/pricingModes.ts`). Aucun deuxième calculateur, aucun deuxième workflow, aucun nouveau système d'envoi.

Décisions confirmées : le 350 $ est un **paiement unique** (pack, livraison sur une période maximale), l'offre **1 $ est retirée de toutes les surfaces publiques entrepreneur** (historique conservé), et **seul le plafond 350 $ → 5** est imposé (les budgets supérieurs restent entièrement calculés par le marché).

## 1. Moteur — mode « pack » et plafond serveur

Ajout dans `_shared/pricingModes.ts` (même formule, nouvelle direction de résolution) :

- Nouveau mode `pack` : entrée = montant unique en cents + durée maximale de livraison ; sortie = nombre de rendez-vous réellement soutenables.
- Résolution identique à `solveBudget` : le plus grand N tel que prix canonique(N) ≤ montant, N ≤ plafond marché réel, N ≤ capacité déclarée de l'entrepreneur, et marge ≥ marge minimale configurée.
- Nouveau plafond dur, appliqué **après** le calcul : `if (total_price_cents <= 35000) guaranteed = min(calculated, 5)`.
- Les offres historiques sous 350 $ ne sont jamais requalifiées ; le plafond ne s'applique qu'aux devis créés avec `offer_kind = 'pack_350'`.
- Aucune règle de trois : le plafond ne s'applique qu'à 350 $. 700 $ / 1 050 $ / 1 500 $ passent par la même résolution marché, sans plafond, ce qui laisse le moteur favoriser la marge sur les paliers supérieurs.
- Territoire sans données exploitables (`market_ceiling` inconnu ou marché fermé) → aucune garantie inventée : sortie `analysis_required`, affichée « Analyse du territoire requise ».

Nouveaux tests dans `src/__tests__/pricingModes.test.ts` : calcul 1/3/5 rendu tel quel, calcul 6 à 350 $ plafonné à 5, capacité inconnue → aucune garantie, cohérence pack ⇄ budget sur la même chaîne de prix.

## 2. Base de données et application côté serveur

Migration sur `contractor_pricing_quotes` :

- `offer_kind text NOT NULL DEFAULT 'subscription'` (`subscription` | `pack_350`), `total_price_cents integer`, `guarantee_duration_months integer`, `appointments_delivered integer NOT NULL DEFAULT 0`.
- Trigger `trg_enforce_pack_guarantee_cap` : bloque toute écriture où `offer_kind = 'pack_350'` et `guaranteed_appointments > 5`, avec le message exact « Le forfait de 350 $ est limité à un maximum de 5 rendez-vous garantis. Augmentez le budget ou réduisez la garantie. » Le trigger couvre l'admin, les edge functions et toute écriture directe — la validation frontend ne suffit pas.
- Toute modification manuelle d'un devis est journalisée dans `pricing_audit_log` (déjà en place) avec l'acteur, l'ancienne et la nouvelle garantie.
- Vue `v_pack350_performance` : vendus, RDV garantis, livrés, restants, revenu par RDV, marge estimée, avec segmentation des offres 4–5 RDV.

## 3. Checkout, webhook et livraison

- `create-checkout-session` : ligne unique 350 $ en `mode: "payment"` via un produit/prix Stripe LIVE dédié, avec `quote_id` et `guaranteed_appointments` en metadata.
- `stripe-unpro-webhook` : à la confirmation, la garantie persistée est **exactement** celle du devis (jamais recalculée, jamais le maximum public) ; création de l'engagement de livraison et du compteur de rendez-vous restants.
- Le compteur `appointments_delivered` s'incrémente à chaque rendez-vous livré ; `guarantee_completed` est émis à l'atteinte de la garantie.

## 4. Message public et carte 350 $

Copie centralisée dans une nouvelle constante `src/lib/copy/offer350.ts`, consommée partout (landing entrepreneur, pricing, CTA, cartes, SEO) :

- Titre : « Jusqu'à 5 rendez-vous exclusifs garantis dès 350 $ »
- Sous-texte : « Le nombre de rendez-vous que nous pouvons garantir dépend de votre domaine, de votre territoire et de la capacité disponible. »
- CTA principal : « Voir ce que 350 $ peut me garantir »
- Carte : « À partir de 350 $ / Jusqu'à 5 rendez-vous exclusifs garantis » — jamais partagés, selon vos critères, territoire défini, durée déterminée, garantie calculée avant paiement. CTA « Calculer ma garantie », mention « Le nombre réel varie selon votre domaine, votre territoire et la capacité disponible. »

La formulation « 5 rendez-vous pour 350 $ » est interdite : un garde de contenu (`src/content-guard/rules.ts`) échoue la vérification si elle réapparaît.

Surfaces mises à jour : `PageEntrepreneursLanding`, `PageEntrepreneurPricing`, `PageEntrepreneurPlans`, `PagePricingCalculator`, `PageEntrepreneurGoalToPlanLanding`, `PageEntrepreneurJoin`, `PageProLandingNuclearClose`, `PageAlexPersonalizedLanding`.

## 5. Résultat du calculateur

Après calcul, « jusqu'à » disparaît. Affichage de la garantie contractuelle réelle :

```text
Votre offre UNPRO
350 $
3 rendez-vous exclusifs garantis
Isolation · Laval + Terrebonne · Jusqu'à 6 mois
[ Activer ma garantie — 350 $ ]
```

Un bloc distingue explicitement « Maximum public : jusqu'à 5 » de « Garantie contractuelle calculée : 3 ». Toutes les valeurs proviennent de la réponse serveur ; une valeur modifiée dans le navigateur est rejetée au checkout (revalidation du devis côté serveur).

## 6. Alex

Dans `alexPlanTruthEngine` / `alex-voice-sales` / prompts actifs :

- Avant calcul : « Les forfaits commencent à 350 $ et peuvent inclure jusqu'à 5 rendez-vous exclusifs garantis, selon votre domaine et votre territoire. »
- Après calcul : « Selon votre domaine, votre territoire et la capacité actuellement disponible, UNPRO peut vous garantir {{guaranteed_appointments}} rendez-vous exclusifs pour {{price}} $ sur une période maximale de {{duration}}. »
- Garde-fou dans `validate-alex-response` : toute promesse de type « vous recevrez 5 » sans devis calculé est bloquée.

## 7. SMS, second touch et courriel

Modification des templates canoniques existants (`_shared/masterOutreachCopy.ts`, `smsSprintVariants.ts`, `second-touch-outreach`) — CASL, désabonnement, duplicate guard 24 h, fenêtres et quotas d'envoi inchangés :

- SMS principal et version courte tels que fournis, avec `{{short_link}}` via `_shared/outreachLink.ts`.
- Second touch : « Petit suivi pour {{company_name}} : les forfaits UNPRO commencent à 350 $ et peuvent inclure jusqu'à 5 rendez-vous exclusifs garantis… »
- Courriel : objet « Jusqu'à 5 rendez-vous exclusifs dès 350 $ » et corps fourni, dans la coquille existante avec double CTA.

## 8. Affiliés et télémarketeurs

Script mis à jour sur leurs pages existantes, avec la formulation fournie. Le représentant ne peut pas saisir un nombre de rendez-vous : il ouvre le calculateur ou sélectionne une offre approuvée déjà calculée. Toute tentative de garantie manuelle est refusée par le trigger.

## 9. Admin

Dans `PageAdminPricingIntelligence` : Prix 350 $ · Maximum autorisé 5 · Garantie calculée X · Durée X mois · RDV livrés X · Restants X. Le formulaire d'édition affiche le message de blocage exact renvoyé par le serveur et journalise chaque modification.

Tableau de bord : 350 $ vendus | RDV garantis | RDV livrés | RDV restants | revenu/RDV | marge estimée, avec mise en évidence des offres 4–5 RDV sous la marge cible.

## 10. Analytics

Événements ajoutés/normalisés via les traqueurs existants : `offer_350_viewed`, `guarantee_calculation_started`, `guarantee_calculated` (avec `guaranteed_appointments`, `offer_amount`), `checkout_started`, `payment_success`, `guarantee_activated`, `appointment_delivered`, `guarantee_completed`.

## 11. SEO / OG / retrait du 1 $

Audit puis remplacement, sur les pages entrepreneur **actives uniquement** (les données historiques et d'audit sont laissées intactes) : mentions d'activation 1 $, essai 1 $, profil 1 $, anciens prix, anciennes descriptions OG et FAQ → nouveau positionnement. Les checkouts 1 $ existants restent fonctionnels pour les prospects déjà engagés mais ne sont plus exposés publiquement.

## 12. Tests du parcours réel

Exécution en production sur le golden path, puis correction jusqu'au succès : calcul 1/3/5 fidèle, 6 plafonné à 5, admin bloqué à 7, frontend trafiqué rejeté côté serveur, territoire sans données sans garantie, garantie conservée du devis au checkout puis au webhook, CRM cohérent, SMS/courriel/Alex en « jusqu'à 5 » avant calcul et chiffre exact après, aucune offre publique entrepreneur à 1 $ restante.
