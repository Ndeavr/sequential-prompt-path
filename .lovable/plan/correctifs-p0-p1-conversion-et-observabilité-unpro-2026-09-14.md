# Paiement → activation : fermer la chaîne et rendre tout échec visible

## Correction importante avant de commencer

L'évidence fournie ne se vérifie pas telle quelle. Les deux identifiants d'entreprise portés par les paiements existent bel et bien dans `contractors` :

- `5bb574a5…` = Pros Rénovation (yturcotte@gmail.com), `activation_status: not_ready`
- `72bc8179…` = compte de test E2E de juillet, `account_status: canceled`

Ce que montrent réellement les données en production (lecture seule) :

- Le dernier `checkout.session.completed` reçu date du **13 juillet 2026** (parcours SMS). Aucun depuis.
- Les 4 tentatives des 13–14 septembre pour Pros Rénovation se terminent toutes en `incomplete_expired` : **le paiement n'a jamais abouti**. Il n'y a donc pas de paiement réussi non réconcilié en septembre — il y a un parcours de paiement qui n'aboutit pas, et un système qui ne le dit nulle part.
- 106 lignes `checkout_sessions` sont restées `pending`, aucune n'a jamais été clôturée.
- `unpro_payment_activation_audit` : **0 ligne**. La branche « forfait entrepreneur » du webhook n'écrit jamais d'audit.

La première étape du travail est donc de prouver ou d'infirmer ce diagnostic sur les événements historiques, en lecture seule, avant toute écriture.

## Défauts confirmés par lecture du code

1. **Sortie silencieuse.** Dans `stripe-webhook`, la branche forfait fait `if (!contractorId || !planId) break;` — métadonnée manquante ou introuvable = rien. Pas d'audit, pas de file, pas d'alerte.
2. **Aucune vérification de paiement.** Cette même branche active l'entreprise sans vérifier `payment_status === "paid"`, contrairement à la branche pack d'entrée qui, elle, le fait.
3. **Aucune trace durable.** Ni `unpro_payment_activation_audit` ni `contractor_activation_ledger` ne sont écrits dans la branche forfait.
4. **Session locale fragile.** `checkout_sessions` est inséré *après* la création de la session Stripe (si l'insertion échoue, le paiement part sans trace locale), sans type de sujet, sans clé de corrélation, et la colonne `contractor_profile_id` contient en réalité un `contractors.id` (0 des 106 lignes correspond à un `contractor_profiles.id`).
5. **Écritures mortes.** Le chemin « total zéro » met à jour `contractors.status` et `contractors.subscription_plan` : ces colonnes n'existent pas, l'erreur est ignorée, l'activation gratuite n'active donc rien.
6. **Code de forfait non normalisé.** Les métadonnées récentes portent `plan_id: "pro"` alors que le catalogue canonique attend `pro_v2`.

## Ce qui va être construit

### 1. Un seul résolveur de sujet d'activation

Nouveau module partagé `supabase/functions/_shared/activationSubject.ts`, utilisé par la création de paiement **et** par le webhook. Il accepte les entrées d'identité déjà supportées (contractor_id, user_id, quote_id, prospect_id, jeton d'activation, courriel client Stripe), résout **une seule** fiche réelle, valide propriété et éligibilité, et renvoie soit `{ subject_id, subject_type }`, soit une erreur typée (`subject_not_found`, `subject_ambiguous`, `not_owner`, `ineligible`). Aucune devinette : plusieurs candidats = erreur, jamais un choix arbitraire.

`create-checkout-session` appelle ce résolveur **avant** de créer quoi que ce soit chez Stripe et refuse en 409 avec un message actionnable si la résolution échoue.

### 2. Session locale durable, écrite avant la redirection

`checkout_sessions` gagne : `subject_id`, `subject_type`, `billing_interval`, `correlation_key`, `stripe_price_id`. La ligne est créée **avant** l'appel Stripe avec `checkout_status: "initiated"`, puis complétée avec l'identifiant de session Stripe. Si cette écriture échoue, aucun paiement n'est créé.

### 3. Webhook idempotent et fermé sur le paiement

Sur `checkout.session.completed` / `async_payment_succeeded`, dans l'ordre :

```text
vérifier signature + non déjà traité
  -> exiger payment_status = paid
  -> retrouver la session locale par identifiant Stripe
  -> résoudre le sujet canonique (résolveur unique)
  -> contractor_subscriptions (upsert)
  -> contractor_activation_ledger
  -> unpro_payment_activation_audit (result = success)
  -> activation de l'entreprise réelle
```

Chaque étape est rejouable sans effet double (clé unique sur événement + action). Toute rupture s'arrête avant l'activation et bascule en file.

### 4. File de réconciliation visible

Pas de nouvelle table : `unpro_payment_activation_audit` sert déjà de journal et possède `result`, `error_code`, `error_message`. Une migration y ajoute `resolution_status`, `resolved_by`, `resolved_at`, `resolution_note` et une contrainte d'unicité `(stripe_event_id, action)`.

Un paiement non résoluble est écrit avec `result: "reconciliation_required"`, la raison exacte et tous les identifiants (session, client, abonnement, courriel, métadonnées). **Aucune entreprise n'est devinée ni activée.**

Ces lignes s'affichent sur la page admin existante `/admin/unpro-stripe-health` (section « Paiements à réconcilier »), avec un rattachement manuel : un admin choisit l'entreprise réelle, l'action est journalisée avec auteur, horodatage et motif.

### 5. Commande de rattrapage historique

Extension de la fonction existante `stripe-unpro-reconcile` (déjà réservée aux admins, déjà en mode simulation par défaut) : elle rejoue les événements historiques à travers le même résolveur, refuse d'écrire sans `confirm: true` explicite, et n'écrit jamais une entitlement ou une activation déjà présente.

### 6. Journaux structurés

Chaque transition et chaque échec produisent une ligne d'audit typée (`subject_resolved`, `subscription_written`, `activation_completed`, `reconciliation_required`) plus l'entrée `integration_audit_logs` déjà utilisée.

## Ce qui ne change pas

Mode réel Stripe, produits et tarifs existants, vérification de signature, protection anti-doublon d'événements. Aucun secret touché, aucune charge créée, aucun webhook rejoué, aucune publication.

## Tests

`src/test/payment-activation-reconciliation.test.ts` : entreprise valide, profil valide, conversion d'un prospect, UUID inconnu → file avec raison, webhook livré deux fois → une seule activation, rattachement manuel refusé sans rôle admin. Plus `npm test`, typecheck et build.

## Détails techniques

- Fichiers : `supabase/functions/_shared/activationSubject.ts` (nouveau), `supabase/functions/create-checkout-session/index.ts`, `supabase/functions/stripe-webhook/index.ts`, `supabase/functions/stripe-unpro-reconcile/index.ts`, `src/pages/admin/PageAdminUnproStripeHealth.tsx`, tests.
- Migration : colonnes de résolution + index unique sur `unpro_payment_activation_audit` ; colonnes de sujet/corrélation sur `checkout_sessions` ; correction des écritures mortes du chemin gratuit. Aucune suppression, aucune donnée historique modifiée.
- RLS : inchangée. Lecture admin déjà en place sur les deux tables ; écritures en service-role uniquement.
- Déploiement séquentiel, une fonction à la fois : `create-checkout-session`, `stripe-webhook`, `stripe-unpro-reconcile`.

## Protocole du paiement réel de contrôle (après livraison)

1. Vérifier la file vide et l'horodatage du dernier événement reçu.
2. Créer un code promotionnel à usage unique ramenant le montant au minimum autorisé, sur un forfait mensuel, pour un compte de contrôle identifié.
3. Payer une fois, noter l'identifiant de session.
4. Vérifier dans l'ordre : session locale clôturée, abonnement écrit, ledger, audit `success`, entreprise activée — une seule fois chacun.
5. Rejouer le même événement depuis le tableau de bord Stripe et confirmer qu'aucune ligne n'est dupliquée.
6. Annuler l'abonnement et rembourser la charge ; conserver les identifiants dans le rapport.
