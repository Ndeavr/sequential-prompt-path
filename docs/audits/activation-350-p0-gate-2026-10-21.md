# Activation 350 $ — porte QA P0 (21 oct. 2026)

**Statut historique (21 octobre 2026) :** NEEDS VERIFICATION; HEAD alors inspecté : `1721e7160edb21b0bb9db8b11cd55f6b5926eabf`. Les défauts et l'état du drapeau décrits ci-dessous sont des constats datés, **pas une photographie du code actuel**.

## Réinspection de source — 1er novembre 2026 (sans déploiement)

- **GitHub `lovable-sync` au SHA `2f55796ce68b42c302afd1ffafe7a2d8b6e07614` :** la CI *Critical founder path* [#41357545320](https://github.com/Ndeavr/sequential-prompt-path/actions/runs/41357545320) est **verte** après fusion de la [PR #155](https://github.com/Ndeavr/sequential-prompt-path/pull/155). Ceci démontre le succès des contrôles CI au SHA, **pas** une recette navigateur Auth/Stripe TEST complète, un déploiement Edge ni un encaissement LIVE.
- **Durée :** `stripe-webhook/index.ts` utilise `addCalendarMonths(new Date(), 12)` pour `presence_ia_until`; le helper dans `_shared/checkoutGuards.ts` ajoute des mois calendaires UTC avec borne fin de mois. L'ancien `+365 jours` n'est plus présent à cet endroit.
- **Affiliation :** `create-checkout-session/index.ts` transmet une paire `ref` / `affiliate_id` résolue pour `entryActivation`; le webhook utilise `entry350CommissionArgs` et `record_affiliate_payment_conversion` uniquement sous ses conditions LIVE, paiement 350 $ avant taxes et affiliate identifié, avec protection contre session révoquée. **Le versement réel d'une commission et l'idempotence en environnement hébergé ne sont pas démontrés.**
- **Ventes / autorisation :** l'autorisation commerciale du fondateur du 29 octobre de permettre le parcours canonique LIVE n'est pas une preuve que le code Edge ni les droits sont déployés. Ne pas changer le drapeau, les paiements, les cron, les données ou les campagnes à partir de ce rapport. Le [P0 #86](https://github.com/Ndeavr/sequential-prompt-path/issues/86) reste **ouvert** pour E2E isolé Auth → Stripe TEST → webhook signé → registre → droit 12 mois, RLS, fiscalité, annulations et remboursements.
- **Conclusion :** les trois défauts de source décrits ci-dessous ont des correctifs **visibles dans le HEAD**, mais leur fonctionnement hébergé n'est pas validé. Refaire l'audit QA isolé avant de marquer l'étape E2E réussie. Aucun paiement ne devient admissible sans rapprochement Stripe LIVE + entreprise unique + webhook signé + droit matérialisé.

## Bloqueur
Une seule instance backend sert l'aperçu et le site publié. Toute modification d'une fonction serveur est déployée sur la production. Aucune base QA isolée n'existe, donc aucun événement Stripe TEST signé ne peut être rejoué sans écrire dans le registre réel. Les correctifs serveur ci-dessous sont **préparés et non appliqués**.

## Défauts de source observés le 21 octobre (historiques, corrigés dans le HEAD inspecté ci-dessus)
1. **Commission affiliée absente** : contrairement à entry_pack_350 (ligne 1221), la branche n'appelle pas `record_affiliate_payment_conversion`. Une vente LIVE via `?ref=LORRAINE-UNPRO` ne génère aucune commission.
2. **Code ref brut** : create-checkout-session ligne 430 envoie `ref.trim()` sans résoudre une affiliée active et sans `affiliate_id`. La résolution serveur (ligne 516+) ne s'applique qu'au parcours abonnement.
3. **Durée** : `presenceUntil = now + 365 jours`, pas 12 mois calendaires (écart d'un jour lors des années bissextiles). Le droit réel est lu par `contractor_plan_code()` depuis le registre et l'événement LIVE signé, et non depuis `contractor_entitlements`. Les valeurs NULL observées dans `contractor_entitlements` sont donc cohérentes avec cette conception, mais aucun écran ne doit lire cette table pour la Présence IA.
4. L'événement du 12 oct. (livemode=false) est **historique** et ne donne aucun droit, ce qui est correct.

## Correctif proposé le 21 octobre (historique; ne pas réappliquer aveuglément)
- create-checkout-session : pour `isEntryActivation`, réutiliser la résolution d'affiliée active (lignes 516-530) et écrire `ref` normalisé et `affiliate_id` dans les metadata.
- stripe-webhook, dans `if (decision === "activate" && !concurrentDup)` : si `event.livemode === true`, appeler `record_affiliate_payment_conversion` avec `p_amount_pretax_cents: session.amount_subtotal` (35000 → 7000 en direct ; le 5 % parent est appliqué par trigger), `p_stripe_session_id: session.id` (idempotent), `p_affiliate_id` et `p_referral_code` venant des metadata. Échec sans blocage. Jamais pour un événement TEST.
- `presenceUntil` : ajouter 12 mois calendaires (setUTCMonth + 12, borné à la fin du mois).

## Vérifié lors de l'audit du 21 octobre
- 60/60 tests existants (montant 40241, mode payment, rejet gratuit/sous-payé, idempotence, TEST ≠ droit, ref conservé).
- Porte LIVE `ENTRY350_LIVE_CHECKOUT_RELEASED` : fermée par défaut, non modifiée.

## Non vérifié lors de l'audit du 21 octobre
Checkout Stripe TEST réel, webhook signé réel, commission, remboursement/litige, QA navigateur avec deux comptes.

## Suivi lecture seule — 16 novembre 2026 (aucun test de paiement)

**Source réinspectée :** `lovable-sync` au SHA `c2e206c452f1db427b9c03bad86e133be000ab86`. **Données :** Stripe `unpro.ca` en LIVE, filtré sur `created >= 2026-10-27 00:00 America/Toronto` ; résultats bornés au moment de la consultation du 16 novembre. Ne pas extrapoler ces résultats aux autres comptes Stripe ni aux recettes historiques.

- **PaymentIntents Stripe LIVE :** 0 objet créé depuis le 27 octobre dans ce compte (liste `has_more=false`). Aucune preuve de vente admissible à 350 $ sur cette période.
- **Sessions Checkout Stripe LIVE :** exactement 3 créées depuis le 27 octobre (liste `has_more=false`), toutes le **8 novembre** et toutes **`expired / unpaid`** : deux sessions d'activation à **40 241 cents CA** chacune (mode `payment`), une session d'abonnement à **57 488 cents CA** (mode `subscription`). Aucune nouvelle session entre le 8 et le contrôle du 16 novembre. Cela n'établit **pas** la cause : absence de trafic/CTA, interruption auth, échec serveur avant Stripe, ou autre facteur restent indiscernables sans données de première partie.
- **Chemin source du CTA :** `PageActivation350.tsx` envoie vers la même page avec `activate=1`, puis affiche `Entry350FastCheckout`. Le composant exige un nom déclaré, transfère vers l'authentification si la session manque, puis appelle `create-checkout-session` avec `entryActivation: true` **sans `quoteId`**. La branche serveur `isEntryActivation` peut créer une session Stripe après contrôles d'identité/réservation. Ne pas diagnostiquer ce parcours comme brisé sur la base de la seule branche `quoteId` d'abonnement.
- **Diagnostic P0, ordre et unités à préserver :** distinguer les entreprises/visiteurs uniques réels, `activation_page_viewed`, `activation_cta_clicked`, `auth_started` (handoff), les refus `entry_350_checkout_failed` avec `step`, l'événement backend `entry_350_checkout_attempted` (avant appel Stripe) puis `stripe_checkout_started` et les sessions effectivement créées chez Stripe. Séparer événements, utilisateurs, sessions et entreprises ; supprimer tests/admin et éviter la double attribution. Les journaux sont des indices, **pas** des reçus de paiement ou une preuve d'exhaustivité si l'écriture échoue.
- **Accès requis :** le projet Supabase canonique `clmaqdnphbndvmmqvpff` refuse toujours l'autorisation de lecture au connecteur. Sans lecture contrôlée des événements, journaux Edge et registres, pas de diagnostic causal vérifiable, de ventilation par canal ni de certification webhook signé → droit de 12 mois. Aucune requête ni mutation en production n'est proposée ici.
- **Code en attente :** [PR #233](https://github.com/Ndeavr/sequential-prompt-path/pull/233) en brouillon, CI passée sur `6a825b08`, mais deux commits derrière le HEAD réinspecté. Un test vert sur cette branche n'est ni une validation intégrée du dernier HEAD, ni un déploiement. [Issue P0 #86](https://github.com/Ndeavr/sequential-prompt-path/issues/86) reste ouverte pour l'E2E Auth → Stripe TEST signé → registre → 12 mois en environnement isolé, sans écritures production.

**Décision d'exécution :** aucun paiement, flag, webhook, cron, migration, sollicitation ni déploiement lancé pendant ce suivi. Ne pas envoyer des offres supplémentaires pour compenser une étape Checkout non réconciliée.
