# P0 — réclamation de fiche ≠ activation payante

## Périmètre et sécurité
Correctif **préparé, non appliqué aux fonctions actives**. Les fonctions gérées se déploient automatiquement à l'édition : respecter l'interdiction de déploiement impose un patch documentaire. Aucun accès distant, SQL, fournisseur, paiement, invitation, cron, verrou ou file modifié. Les nombres de claims/paiements fournis par le propriétaire ne sont pas revalidés ici.

## Preuves locales
- `supabase/functions/activation-claim/index.ts:239-299` : création/reprise de contractor et registre claim marqués `activated`, prospect marqué `activated`, sans preuve Stripe.
- Même handler `:360-366` : événement `profile_activated` sur simple rattachement.
- `src/features/activationProfile/components/ActivationClaimPanel.tsx:95-100,164,237` : événement et affichage d'activation gratuite sur succès de claim.
- `src/lib/billing/contractorActivationState.ts:7-12` : `activated`/`active` suffisent au badge d'entente; un état erroné peut donc produire un faux badge.
- Migration `20260405185111_9e89b97b-6db0-4085-b1cb-06e1a8f6baff.sql:6-10` : état contractor par défaut `not_ready`, déjà pris en charge.
- Migration `20260907110825_71c81bc3-8ba4-4ecb-9c2b-11ca184f993e.sql:1-12` : claim `status text`, sans CHECK/enum; `claimed` ne nécessite aucun schéma nouveau. Son trigger ne fait qu'actualiser l'heure. Les consommateurs retrouvés utilisent l'ownership, pas ce texte comme droit payant.
- `send-verified-batch/index.ts:354` : `registered` existe déjà dans la progression des prospects.

## Diff proposé
`activation-claim-account-only.patch` cible uniquement le handler et son panneau immédiat :
1. Nouvelle fiche `not_ready`, nouveau claim `claimed`.
2. Aucune modification du statut d'activation d'une fiche existante; aucun upsert de claim lors de sa reprise, attribution conservée.
3. Prospect `registered` uniquement si statut non payé/non activé; ne pas rétrograder les historiques.
4. Retrait des deux événements `profile_activated`; conserver `profile_claimed`.
5. Affichage « rattaché à votre compte » et CTA « Réclamer ma fiche »; inscription et accès `/pro` conservés.
6. RPC gratuite `claim_local_service_free_year` et réponse `free_year` inchangées, aucun reçu payant fabriqué.

## Paiement et droits : limites importantes
Le claim proposé ne vérifie ni ne certifie **aucun paiement**. Il ne crée ni ledger, abonnement, entitlement, ni preuve Stripe. Les droits restent dans le mécanisme canonique existant.

`drizzle/migrations/0023_entry_350_presence_entitlement.sql:25-53` exige ledger `entry_activation_350_paid`, événement LIVE corrélé, session payée, CAD35000 HT, durée 12 mois et absence de révocation enregistrée. Il **ne vérifie pas lui-même un PaymentIntent réglé** ni une absence de remboursement fraîche chez Stripe. Par conséquent le contrat renforcé demandé (PaymentIntent serveur + webhook signé + rattachement exact + absence de remboursement) n'est pas entièrement attesté par cette passe; aucune certification commerciale/revenu n'en découle. Aucune vérification fournisseur n'a été faite.

Les anciens statuts `activated` ne sont pas corrigés : cela nécessiterait une revue séparée, autorisée, des preuves. Le badge historique peut rester trompeur; les vues SQL anciennes fondées sur activation_status/paid_at restent non probantes. FirstRevenueTracker reste explicitement non vérifié/non disponible. Ne pas transformer ces compteurs en revenus.

La RPC gratuite demeure l'unique mécanisme gratuit; les mocks prouvent la conservation de son appel et réponse, pas l'activation hébergée ni tous ses consommateurs. Le rattachement reste non transactionnel : la course multi-utilisateur et les écritures partielles préexistantes ne sont pas résolues par ce patch. Les erreurs secondaires de mise à jour prospect sont toujours non bloquantes; elles ne produisent toutefois plus de statut payé/activé dans le correctif proposé.

## Validation synthétique
- 4 suites, **73/73 tests** : claim/token/résolveur 44; droits Presence 12; catégories gratuites 6; diagnostic Stripe SELECT-only 11.
- Reproduction : source active marque un nouveau contractor `activated` sans ledger; source proposée marque `not_ready` et le badge reste inactif.
- Tests : token exact/préfixe/révoqué/expiré/autre utilisateur, reprise propriétaire, attribution conservée, offre gratuite acceptée/refusée, aucun ledger/abonnement premium sur claim.
- Tests canoniques de droits : LIVE CAD35000 + ledger, TEST/forgé/mauvaise devise/montant, durée, révocation, abonnement existant. Ils ne simulent pas un nouveau contrôle PaymentIntent absent du code.
- `git diff --check` : réussi.
- Compilation automatique : `build OK`, 2026-10-26T09:51:52Z. Aucun build/typecheck manuel lancé.
- `git apply --check` refusé par l'environnement; reconstruction du patch handler testée avec correspondance stricte de chaque ligne, aucun contournement.
- Révision observée après tests : `87663d72bb2bf0aaa4ec02d3acce144dbc80ce8e`; le système gère les commits. Gardes exact-token/résolveur conservées; aucune opération Git sur PR #39/#45/#47.

## Accord humain requis
Autorisation distincte de déploiement et QA isolée avant application. Revue séparée des preuves de PaymentIntent/remboursement et des anciens badges/claims avant certification payante ou correction historique. Aucun déverrouillage commercial implicitement autorisé.