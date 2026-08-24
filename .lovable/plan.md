# Fin du passage de réparation activation / paiement

Suite du travail déjà fait : le correctif de schéma (`aipp_profiles.primary_city`) est appliqué dans `activation-token-resolve` mais pas encore déployé ni vérifié. Voici les éléments restants, strictement limités au chemin activation → paiement. Aucun envoi SMS/courriel, aucun paiement fabriqué.

## 1. Déployer et vérifier l'enrichissement de la page d'activation

- Redéployer `activation-token-resolve`.
- Appeler la fonction avec le jeton QA existant (`qagoldenpath20260824`) et confirmer que logo, résumé IA, note Google et ville se chargent réellement.
- Les champs absents doivent rester « En attente » et jamais faire planter la page.

## 2. Purge des sémantiques obsolètes « 1 $ » / abonnement

Cibles confirmées par inspection :

- `supabase/functions/dispatch-priority-outreach/index.ts` — message de repli codé en dur « UNPRO: 1$ pour 7 jours ».
- `supabase/functions/create-isr-promo-checkout/index.ts` et `create-isr-demo-checkout/index.ts` — libellés produit « Activation 1$ ».
- `supabase/functions/funnel-audit-report/index.ts` et `tunnel-reality-report/index.ts` — étiquettes de rapport « Paiement 1$ ».

Traitement :
- Les libellés commerciaux visibles (outreach, produits Stripe) passent par la configuration canonique `src/lib/copy/offer350.ts` / équivalent partagé côté edge.
- Les flux ISR démo/promo, s'ils ne sont plus utilisés en production, sont marqués retirés plutôt que reprix — décision prise après vérification de leur usage réel.
- Les étiquettes de rapport interne sont renommées de façon neutre (« Paiement réussi »), sans changer la logique de comptage.

## 3. Points d'entrée checkout : une seule source de prix

Auditer chaque appelant de `create-activation-checkout` / `create-contractor-checkout` :
`PageUnproActivate.tsx`, `PageInvitationActivate.tsx`, `SolicitationActivationPage.tsx`, `PageContractorAIScoreLanding.tsx`, `PageGuaranteeCalculator.tsx`, `CheckoutPanel.tsx`, `PlanProposalPanel.tsx`, `alexContractorOnboardingService.ts`.

- `PageInvitationActivate.tsx` affiche « 350,00 $ CA » en dur — à dériver de la configuration canonique.
- Aucun montant ni libellé d'offre codé en dur ne doit subsister ; le serveur reste l'autorité sur le prix.
- Aucun nouveau prix n'est inventé : l'offre reste 350 $ CA paiement unique / jusqu'à 5 rendez-vous exclusifs là où elle s'applique.

## 4. Action admin « lien d'activation »

- Vérifier que le contrôle admin de génération/envoi de lien n'affiche plus « Lien 1 $ ».
- S'assurer qu'il ne peut pas rapporter un succès si le fournisseur n'a pas réellement accepté/mis en file l'envoi. Aucun envoi effectué dans cette tâche.

## 5. Vérification finale

- Build + typecheck.
- Parcours QA contrôlé : jeton QA → page d'activation personnalisée → données enrichies rendues → clic CTA → création de session Stripe uniquement. Session expirée immédiatement après.
- Rapport factuel : problèmes détectés disparus, fichiers/fonctions modifiés, route testée, blocages restants.

## Hors périmètre

Omega, affiliés, refonte visuelle, EXTerra, tout envoi d'outreach, toute validation de paiement réel (elle reste en attente de la première transaction live).
