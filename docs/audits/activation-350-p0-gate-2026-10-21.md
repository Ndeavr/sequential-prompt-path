# Activation 350 $ — porte QA P0 (21 oct. 2026)

Statut : **NEEDS VERIFICATION — publication interdite.** HEAD inspecté : 1721e7160edb21b0bb9db8b11cd55f6b5926eabf.

## Bloqueur
Une seule instance backend sert l'aperçu et le site publié. Toute modification d'une fonction serveur est déployée sur la production. Aucune base QA isolée n'existe, donc aucun événement Stripe TEST signé ne peut être rejoué sans écrire dans le registre réel. Les correctifs serveur ci-dessous sont **préparés et non appliqués**.

## Défauts confirmés dans le code (stripe-webhook, branche entry_activation_350, lignes 394-527)
1. **Commission affiliée absente** : contrairement à entry_pack_350 (ligne 1221), la branche n'appelle pas `record_affiliate_payment_conversion`. Une vente LIVE via `?ref=LORRAINE-UNPRO` ne génère aucune commission.
2. **Code ref brut** : create-checkout-session ligne 430 envoie `ref.trim()` sans résoudre une affiliée active et sans `affiliate_id`. La résolution serveur (ligne 516+) ne s'applique qu'au parcours abonnement.
3. **Durée** : `presenceUntil = now + 365 jours`, pas 12 mois calendaires (écart d'un jour lors des années bissextiles). Le droit réel est lu par `contractor_plan_code()` depuis le registre et l'événement LIVE signé, et non depuis `contractor_entitlements`. Les valeurs NULL observées dans `contractor_entitlements` sont donc cohérentes avec cette conception, mais aucun écran ne doit lire cette table pour la Présence IA.
4. L'événement du 12 oct. (livemode=false) est **historique** et ne donne aucun droit, ce qui est correct.

## Correctif préparé (à appliquer seulement avec une base isolée)
- create-checkout-session : pour `isEntryActivation`, réutiliser la résolution d'affiliée active (lignes 516-530) et écrire `ref` normalisé et `affiliate_id` dans les metadata.
- stripe-webhook, dans `if (decision === "activate" && !concurrentDup)` : si `event.livemode === true`, appeler `record_affiliate_payment_conversion` avec `p_amount_pretax_cents: session.amount_subtotal` (35000 → 7000 en direct ; le 5 % parent est appliqué par trigger), `p_stripe_session_id: session.id` (idempotent), `p_affiliate_id` et `p_referral_code` venant des metadata. Échec sans blocage. Jamais pour un événement TEST.
- `presenceUntil` : ajouter 12 mois calendaires (setUTCMonth + 12, borné à la fin du mois).

## Vérifié dans cette passe
- 60/60 tests existants (montant 40241, mode payment, rejet gratuit/sous-payé, idempotence, TEST ≠ droit, ref conservé).
- Porte LIVE `ENTRY350_LIVE_CHECKOUT_RELEASED` : fermée par défaut, non modifiée.

## Non vérifié
Checkout Stripe TEST réel, webhook signé réel, commission, remboursement/litige, QA navigateur avec deux comptes.
