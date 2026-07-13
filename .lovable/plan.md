# First Dollar — Repair pipeline, expose eligibility, exécuter le premier vrai batch

Le blocage est maintenant réel visible (« Outbound bloqué. Aucun test SMS valide dans les dernières 24 h. ») et le bouton « Exécuter un test SMS » existe déjà (livré au tour précédent). Ce plan **complète** le tour précédent au lieu de recréer un système parallèle.

## Phase 1 — Diagnostic canonique (confirmé)

Infrastructure canonique existante à **réutiliser**, aucun clone à créer :

| Rôle | Objet canonique |
|---|---|
| Test SMS admin | `supabase/functions/sms-admin-test/index.ts` |
| Table de tests | `public.sms_test_runs` (colonnes `success`, `callback_received`, `delivered_at`, etc.) |
| Journal de messages | `public.sms_events_v2` |
| Callback Twilio | `supabase/functions/twilio-status-v2/index.ts` (met `success=true` seulement sur `delivered`) |
| Vue santé | `public.v_sms_infrastructure_status` (`HEALTHY|WARNING|ERROR`) |
| Garde envoi | `supabase/functions/_shared/smsHealth.ts` (`assertSmsHealthy`) |
| Gate déjà appelé | `first-dollar-send-batch` (ligne 45) |

**Cause du 0 partout dans /admin/first-dollar** : le hook `useFirstDollarFunnel` filtre `launch_leads.created_at >= today` — les leads déjà scrappés hier ne comptent pas. Séparer *funnel event-based* (Today = événements du jour) de *stock leads*.

## Phase 2 — Canonical DB function `get_sms_outbound_health()`

Migration : créer `public.get_sms_outbound_health()` en wrapper de `v_sms_infrastructure_status` retournant :

```
is_operational  bool     -- status = 'HEALTHY'
status          text     -- HEALTHY|WARNING|ERROR
last_test_at    timestamptz
delivered_at    timestamptz  -- last_test_success_at
valid_until     timestamptz  -- delivered_at + 24h
error_code      text
error_message   text
provider_message_id text
reason          text     -- humanized block cause
```

- Front (`useSmsHealth`) et backend (`assertSmsHealthy`) migrent tous deux vers cet unique appel RPC. Suppression de la duplication `computeBlockReason` côté client.

## Phase 3 — Panneau Twilio Outbound Status (enrichir)

Le `SmsHealthPanel` déjà en place gagne :

- Ligne "Numéro destination test (masqué)" (dernier `sms_test_runs.phone` masqué `+1•••••1234`)
- Ligne "SID Twilio (masqué)" pour `message_sid`
- Ligne "Statut Twilio" (dernier `sms_events_v2.status` pour ce SID)
- `valid_until` calculé (delivered_at + 24h)
- Rate-limit visuel : « Prochain test disponible dans Xs » (bloque bouton si dernier test < 5 min)

## Phase 4 — Validation callback Twilio (durcir)

Ajouter validation `X-Twilio-Signature` optionnelle dans `twilio-status-v2` :

- Nouveau secret `TWILIO_AUTH_TOKEN` déjà présent → valider signature HMAC-SHA1 du body + URL
- Feature flag `TWILIO_STATUS_STRICT_VALIDATION=true` pour activer le rejet (sinon log-only pendant rollout)
- Aucune régression : la fonction continue de tourner en log-only par défaut

## Phase 5 — Panneau Recipients Eligibility

Nouveau composant `EligibilityPanel` au-dessus du bouton « Envoyer 25 SMS », affichant les compteurs calculés côté edge function `first-dollar-eligibility` :

```
Total prospects            X
├─ Numéro manquant         X
├─ Ligne fixe (non SMS)    X
├─ Déjà contactés          X
├─ Opt-out                 X
├─ Doublons (phone)        X
├─ Bloqués (suppression)   X
└─ Éligibles pour ce batch X
```

Requête basée sur `launch_leads` + `sms_events_v2` + suppression list. Si Éligibles = 0, affiche l'action « Lancer normalisation téléphone » qui invoque `launch-agent-enrich` existant.

## Phase 6 — Renforcer `first-dollar-send-batch`

- Remplacer `assertSmsHealthy()` par appel RPC `get_sms_outbound_health()` (canonical).
- Ajouter verrou atomique : `UPDATE launch_leads SET sms_batch_id = :batch WHERE id IN (...) AND sms_batch_id IS NULL RETURNING id` — deux clics simultanés ne peuvent réclamer les mêmes leads.
- Cap dur `size <= 25` (même si `body.size` > 25).
- Générer un lien tracké unique par prospect : nouvelle colonne `launch_leads.tracked_link_slug` (uuid), inséré dans `[LINK]`. Redirection via edge `t/:slug` (existante ? sinon nouvelle `first-dollar-track`) qui log `contractor_funnel_events(event_type='sms_clicked')` puis 302 vers `/analyse/:slug`.
- Batch statuses étendus : `validating|blocked|preparing|sending|completed|partial_failure|awaiting_review`.

## Phase 7 — Modèle batch (réutiliser `sms_batches`)

Ajouter via migration (ALTER TABLE) :
- `requested_count int`, `selected_count int`, `failed_count int`, `blocked_reason text`, `started_at timestamptz`, `completed_at timestamptz`

Pas de nouvelle table `outreach_batches` (le nom canonique du projet est `sms_batches` et `sms_events_v2` sert de messages).

## Phase 8 — Funnel events canoniques

Corriger `useFirstDollarFunnel` :

- Onglet **Today** : lit `contractor_funnel_events.created_at >= today` par `event_type` — plus jamais basé sur `launch_leads.created_at`.
- `sms_sent` ← count `sms_events_v2.status IN ('sent','delivered')` sur période
- `sms_delivered` ← count `sms_events_v2.status='delivered'`
- `payment_success` ← `billing_webhook_events.event_type='checkout.session.completed'` (webhook only)
- `activated` ← `launch_leads.lead_status='ACTIVATED'`

Insère `contractor_funnel_events` idempotent (`idempotency_key = twilio_sid | tracked_slug | event_type + lead_id`).

## Phase 9 — Détails batch (drawer)

Bouton « Voir détails » sur chaque ligne d'historique → drawer avec :
- Table des messages du batch (join `sms_batches.lead_ids` × `sms_events_v2`)
- Colonnes : contractor name, phone masqué, template A/B/C, statut Twilio, `sent_at`, `delivered_at`, `clicked_at`, `error_code`, `error_message`
- Bouton « Réessayer les échecs admissibles » : appelle `first-dollar-send-batch` avec `retry_batch_id`, filtre `sms_events_v2.status IN ('failed','undelivered')` avec `error_code` récupérable.

## Phase 10 — Messages d'erreur actionnables

Remplacer les toasts génériques par bandeaux persistants sur `/admin/first-dollar/batches` :

| État | Message | Action |
|---|---|---|
| Pas de test <24h | « No test Twilio livré dans les dernières 24h. » | « Tester maintenant » |
| Test en cours | « Test envoyé, en attente confirmation Twilio. » | refetch auto 5s |
| Test échec | « Erreur Twilio {code} — {message} » | Retry après cooldown |
| 0 éligibles | « Aucun prospect mobile admissible. » | « Normaliser numéros » |
| Batch partiel | « X envoyés, Y livrés, Z échecs. » | « Réessayer admissibles » |

## Phase 11 — Sécurité & sûreté (already partly true, formalize)

- Rate-limit test SMS : max 1 / 5 min (colonne calculée depuis `sms_test_runs.created_at`, appliquée UI + edge fn).
- Cap dur `MAX 25 recipients` in `first-dollar-send-batch`.
- Pause obligatoire après batch (déjà en place via `sms_batches.reviewed_at`).
- STOP/opt-out : `sms_events_v2.status='opted_out'` exclut automatiquement (à ajouter dans requête eligibility).
- Aucune donnée mock, aucun bypass de la règle 24h.

## Phase 12 — Exécution & rapport

Après merge :
1. Ouvrir `/admin/first-dollar/batches`, cliquer « Exécuter un test SMS » — un SMS réel part au `ADMIN_TEST_PHONE`.
2. Attendre callback Twilio (≤ 30s en général). Le panneau vire **Opérationnel** avec `valid_until` peuplé.
3. Vérifier onglet Eligibility : si > 0 mobiles éligibles, cliquer « Envoyer 25 SMS ».
4. Vérifier historique, SIDs Twilio, transitions `queued→sent→delivered`.
5. Rapport final structuré : root cause, files, tables réutilisées, test SID masqué, éligibles, batch id, sent/delivered/failed, blocker résiduel.

## Fichiers touchés

**Migrations :**
- `create function public.get_sms_outbound_health()` + GRANT
- `ALTER TABLE sms_batches` : nouvelles colonnes
- `ALTER TABLE launch_leads` : `tracked_link_slug uuid unique`

**Edge functions (nouvelles) :**
- `first-dollar-eligibility` — compteurs éligibilité
- `first-dollar-track` — redirect + log clic

**Edge functions (modifiées) :**
- `first-dollar-send-batch` — RPC health, cap 25, atomic claim, tracked links
- `twilio-status-v2` — validation signature optionnelle
- `sms-admin-test` — rate-limit 5 min

**Front :**
- `src/hooks/useSmsHealth.ts` — bascule sur RPC canonique
- `src/components/admin/SmsHealthPanel.tsx` — enrichir (numéro masqué, SID, valid_until, cooldown)
- `src/components/admin/EligibilityPanel.tsx` (nouveau)
- `src/components/admin/BatchDetailsDrawer.tsx` (nouveau)
- `src/hooks/useFirstDollarFunnel.ts` — Today = event_time, tous stades event-based
- `src/pages/admin/PageAdminFirstDollarBatches.tsx` — intégration panneaux + drawer

## Critères de succès (identiques à la demande)

Test SMS réel envoyé → callback delivered persisté → panneau Opérationnel → batch button actif → batch réel sans doublon → historique peuplé → statuts Twilio remontent → funnel event-driven → payment webhook only → aucune donnée fabriquée.
