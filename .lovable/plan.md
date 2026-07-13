## Contexte

Le tunnel `/admin/tunnel-reality` mélange aujourd'hui des événements incompatibles :

- **Stage 7 « Checkout Stripe ouvert »** compte **toutes** les lignes de `checkout_sessions` (96 lignes, plans `signature`/`pro`/`premium`/`recrue`). Aucune n'est un checkout SMS 1 $. Les « 5 » de l'écran = checkouts plan pro/premium créés en dehors du tunnel SMS.
- La table `checkout_sessions` n'a **ni** `source`, `metadata`, `prospect_id`, `mode`. On ne peut donc pas filtrer par attribution SMS au niveau de la ligne.
- La table `acq_sms_logs` n'a **ni** `is_simulation`, `campaign_id`, `prospect_id`, `outreach_message_id`. Le mode Dry-run est visuel uniquement, rien ne marque les envois simulés en base.
- Le bandeau affiche « BLOCAGE #1 : SMS ENVOYÉS » alors que Dry-run est actif — c'est une simulation, pas une panne.
- Le premier objectif est **de mesurer honnêtement** avant de relancer, pas d'envoyer des vrais SMS maintenant.

## Plan

### 1. Attribution stricte des checkouts SMS (fix des « 5 checkouts fantômes »)

Réécrire l'étape 7 de `tunnel-reality-report` pour compter **uniquement** les prospects ayant à la fois `stripe_session_id IS NOT NULL` **et** `funnel_status IN ('checkout_started','paid_1_dollar','activated','recommendable')` **et** `campaign_id IS NOT NULL` — puis joindre `checkout_sessions` sur `external_checkout_id = prospects.stripe_session_id` pour vérifier `checkout_status IN ('pending','paid')` et `selected_plan_code IN ('activation_1','sms_outreach')` (aucun plan pro/premium ne peut entrer).

Idem pour l'étape 8 « Paiement 1 $ réussi » : garder le filtre `prospects.activation_paid_at IS NOT NULL AND stripe_session_id IS NOT NULL AND campaign_id IS NOT NULL`.

Idem pour l'étape 9 « Paiement échoué » : filtrer par `prospects.stripe_session_id` (jointure), pas par `checkout_sessions` seule.

### 2. Compteur « Checkouts non attribués »

Ajouter dans la même edge function un bloc `unattributed_checkouts` retournant, sur 24h/7j/30j :
- total de `checkout_sessions` dans la fenêtre
- ventilation par `selected_plan_code`
- combien ont un `prospects.stripe_session_id` correspondant (= attribué SMS)
- reste = non attribués (plans pro/premium/signature, tests, ouvertures directes).

Sur `/admin/tunnel-reality`, ajouter une carte d'anomalie sous le bandeau blocage :
- « X checkouts détectés hors tunnel SMS »
- Bouton « Voir les sessions non attribuées » → drawer/table listant : id (masqué), `selected_plan_code`, `external_checkout_id` masqué, `checkout_status`, `created_at`, « attribué : oui/non ».

### 3. Séparer SIMULATION et RÉEL en base

Migration :
- `acq_sms_logs` : ajouter `is_simulation boolean not null default false`, `prospect_id uuid`, `campaign_id uuid`, `outreach_message_id uuid`, `invitation_token text`, index sur `(is_simulation, status, created_at)`.
- Backfill : marquer les lignes existantes `is_simulation = false` (elles sont réelles ou anciennes ; aucune vraie simulation avant aujourd'hui).

Modifier `outreach-relance-cron` :
- Mode SIMULATION : écrire `acq_sms_logs` avec `status='simulated'`, `is_simulation=true`, sans appel Twilio.
- Mode RÉEL : appeler Twilio, écrire `provider_message_id` (SID), attendre callback pour livraison.

Toutes les requêtes du rapport ajoutent `is_simulation = false` — les simulations ne rentrent **jamais** dans les compteurs réels.

### 4. Corriger le bandeau et l'UX Dry-run

Dans `PageTunnelReality.tsx` :
- Lire l'état `dry_run` (checkbox actuelle) et le remonter à l'edge function.
- Quand Dry-run actif → bandeau vert/bleu **« MODE SIMULATION ACTIF · Aucun SMS réel »** + CTA « Préparer un envoi réel ». Ne **pas** afficher « BLOCAGE #1 : SMS ENVOYÉS ».
- Quand Dry-run inactif ET Twilio en panne → bandeau rouge **« BLOCAGE : ENVOI SMS »** + cause exacte (lu depuis `get_sms_outbound_health` RPC déjà présent).
- Le switch bascule entre deux libellés : « Simuler les relances » vs « Envoyer les relances RÉELLES ».
- Confirmation obligatoire avant passage RÉEL : modal listant nb prospects, coût estimé (0.02 $/SMS), campagne, exclusions (fixes, doublons, désabonnés). Bouton principal désactivé tant que non coché « Je confirme envoyer de vrais SMS ».

### 5. Vue mobile en cartes empilées

Sous `md`, remplacer la table 14 lignes par cartes verticales : étape, total, conversion, statut couleur, source, badge anomalie éventuelle. Garder la table sur desktop uniquement.

### 6. Ne pas toucher (préserver ce qui marche)

- Le webhook Stripe et le flow de création `contractor` restent tels quels (corrigés dans le tour précédent).
- Les pages `/invitation/*` et `verify-contractor-activation` restent identiques.
- Aucune modification aux autres tunnels de paiement.
- Aucun envoi réel de SMS déclenché automatiquement — le Dry-run reste ON par défaut.

## Livrables techniques

- **Migration** : colonnes `is_simulation`, `prospect_id`, `campaign_id`, `outreach_message_id`, `invitation_token` sur `acq_sms_logs` + index.
- **Edge function** `tunnel-reality-report` : requêtes réécrites avec attribution stricte + bloc `unattributed_checkouts`.
- **Edge function** `outreach-relance-cron` : distinction stricte SIMULATION/RÉEL avec `is_simulation`.
- **Frontend** `src/pages/admin/PageTunnelReality.tsx` :
  - Bandeau conditionnel (simulation / blocage réel).
  - Carte « Checkouts non attribués » + drawer table.
  - Modal de confirmation avant envoi réel.
  - Vue cartes empilées mobile.

## Critère de succès

Après le fix, avec Dry-run activé, le cockpit doit afficher :

```
Bandeau : MODE SIMULATION ACTIF
Étape 1  SMS envoyés (réels)         0
Étape 4  Clics                       0
Étape 5  Landing ouverte             0
Étape 6  Compte créé                 0
Étape 7  Checkout Stripe SMS         0   ← plus « 5 »
Étape 8  Paiement 1 $ réussi         0

Anomalie : 5 checkouts détectés hors tunnel SMS
[Voir les sessions non attribuées]
   → toutes plan pro/premium/signature, aucune attribution SMS.
```

Aucune relance réelle ne part avant validation admin explicite dans un modal de confirmation.
