# Premier 1 $ — instrumenter et débloquer l'étape clic → paiement

Diagnostic terminé sur les données de production. Le funnel n'est plus bloqué à l'envoi : il est bloqué **après le clic**, et cette portion du parcours n'est mesurée nulle part.

## Ce que disent les données réelles (vérifié)

- SMS 14 derniers jours : 267 livrés, 89 non livrés, 25 en file, 6 envoyés.
- Échecs : 69 « 30006 landline/porteur injoignable », 14 « 30034 » (A2P), 3 autres. Ce sont des numéros fixes, pas une panne d'envoi.
- Liens d'activation : 266 jetons émis, **16 cliqués** (≈6 %). Le lien testé en production répond 200 et résout bien l'entreprise (ACGM Plomberie, Laval).
- Paiements : `billing_checkout_sessions` = 0 ligne depuis toujours ; `acq_payment_events`, `plan_activations`, `acq_subscriptions` = 0. Les 102 lignes de `checkout_sessions` appartiennent toutes au compte de test interne, en statut `pending`, avec des codes de plan hérités (recrue/elite/signature).
- `click_events` des 7 derniers jours ne contient que les clics synthétiques du self-test quotidien (`__e2e_*` à 06 h 17). Les vrais clics d'activation vivent dans `verified_prospect_tokens.clicked_at` — deux systèmes séparés, d'où l'impression de « 0 clic ».

Conclusion : 16 vraies personnes ont ouvert la page d'activation et aucune n'a payé. Entre le clic et Stripe, **aucun événement n'est enregistré** : impossible de savoir si elles ont vu la page, cliqué le bouton, atteint Stripe, ou abandonné au paiement.

## Ce que je vais faire

### 1. Rendre l'étape clic → paiement observable (priorité absolue)

Aucune décision fiable n'est possible sans ça.

- Journaliser côté serveur, dans `create-activation-checkout`, chaque session créée : prospect, jeton, montant, `session_id` Stripe, dans une table existante de sessions (réutilisation de `billing_checkout_sessions`, pas de nouvelle table).
- Journaliser l'affichage de la page et le clic sur le bouton comme événements du prospect (`acquisition_events`, en respectant les contraintes CHECK existantes : `channel` ∈ system/sms/email/manual, `event_type` ∈ scraped/contacted/sent/delivered/failed/clicked/paid, le détail va dans `metadata`).
- Unifier l'affichage : une seule vue de funnel qui additionne les clics de `verified_prospect_tokens` et de `click_events`, et exclut explicitement les lignes de test `__e2e_*`.

### 2. Purger le bruit de test des compteurs

Les self-tests quotidiens polluent les clics. Ils restent actifs mais sont marqués et exclus des chiffres affichés dans le cockpit.

### 3. Basculer les 69 numéros fixes vers le courriel

Ces prospects sont perdus par SMS de façon définitive (erreur 30006). Ils sont routés vers la relance courriel existante plutôt que retentés par SMS.

### 4. Réobserver, puis agir sur la vraie cause

Une fois l'instrumentation en place, une nouvelle vague permettra de distinguer trois cas très différents, chacun avec un correctif différent :
- page vue mais bouton jamais cliqué → problème d'offre ou de confiance sur la page,
- bouton cliqué mais pas de session Stripe → défaut technique du paiement,
- session Stripe créée mais abandonnée → friction dans le checkout (carte demandée pour 1 $).

Je ne réécris ni la page ni l'offre avant de savoir lequel des trois se produit.

## Ce que je ne toucherai pas

Ni SEO, ni sitemap, ni corpus IA, ni Alex, ni contenu. Aucune refonte, aucune nouvelle page admin, aucun nouveau moteur. Réparation et réutilisation de l'existant uniquement.

## Notes techniques

- Édités : `supabase/functions/create-activation-checkout/index.ts` (persistance de session + événement), `src/pages/activation/PageUnproActivate.tsx` (deux appels de tracking, aucun changement visuel), la vue de funnel du cockpit, et le routage de repli courriel dans le worker d'outreach existant.
- Aucune migration créant de nouvelles tables : `billing_checkout_sessions` et `acquisition_events` existent déjà et conviennent.
- Vérification : après déploiement, un parcours réel de bout en bout (lien de production → page → Stripe) doit produire une ligne dans `billing_checkout_sessions` et les événements correspondants, visibles dans le cockpit sous 30 s.
