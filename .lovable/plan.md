## Constat (état réel du backend)

- 4 mailboxes existent dont 3 `active` (`alex@go.unpro.ca`, `partenariats@go.unpro.ca`, `alex@mail.unpro.ca`) + 1 en `warmup` (`yan@go.unpro.ca`). Provider présent (`smtp` / `lovable_email`).
- `email_domain_health` n'a **pas** de colonne MX, et le KPI "Domaine email configuré" se base seulement sur `!!domainHealth` (présence de la ligne) → faux positif.
- `PanelLiveKPIs` lit `sending.activeMailboxes` (correct) mais affiche `Provider · —` quand le hook ne trouve pas de mailbox active dans son select courant, et `Statut domaine` lit `domain.status` qui est `pending` par défaut → tout reste rouge.
- Aucune validation réelle (SMTP auth, OAuth, test send). `mailbox_status` est purement déclaratif.
- Aucun moteur de health check planifié pour l'outbound.

Le problème n'est donc pas "0 mailbox" en base — c'est qu'on ne **vérifie** ni n'**affiche** la vérité opérationnelle.

## Plan

### 1. Migration BDD

Ajouter à `outbound_mailboxes` :
- `connection_type` text (`smtp` | `oauth_google` | `oauth_microsoft` | `api_resend` | `api_lovable`)
- `auth_status` text (`pending` | `connected` | `failed`) default `pending`
- `last_auth_check_at`, `last_test_send_at`, `last_test_latency_ms`, `last_test_error` text
- `verified_at` timestamptz
- Élargir `mailbox_status` à : `pending | dns_only | smtp_connected | verified | active | suspended | failed`

Ajouter à `email_domain_health` :
- `mx_status` text default `unknown`, `mx_records` jsonb, `blacklist_status` text default `unknown`, `bounce_ratio_24h` numeric default 0

Nouvelle table `outbound_health_checks` :
- `id, mailbox_id (nullable), check_type (smtp_auth|oauth|test_send|dns|blacklist|bounce), status (passed|failed|warning), latency_ms, response_payload jsonb, error_message, created_at`
- RLS admin only.

Nouvelle table `outbound_test_sends` :
- `id, mailbox_id, recipient, subject, status, latency_ms, provider_response jsonb, error_message, created_at`
- RLS admin only.

### 2. Edge function `check-outbound-health`

- Itère sur chaque mailbox active.
- Selon `connection_type` :
  - `smtp` : tente connexion + `AUTH LOGIN` (lib SMTP Deno).
  - `oauth_google` / `oauth_microsoft` : appel `userinfo` avec token stocké.
  - `api_resend` : `GET /domains` via clé API.
  - `api_lovable` : ping `send-transactional-email` en mode dry-run.
- Vérif DNS (SPF/DKIM/DMARC/MX) via `Deno.resolveDns`.
- Calcule `bounce_ratio_24h` depuis `outbound_sent_messages`.
- Met à jour `outbound_mailboxes.auth_status`, `mailbox_status`, `last_auth_check_at` et `email_domain_health.mx_status` + `overall_score`.
- Insère lignes dans `outbound_health_checks`.
- Retourne :
  ```json
  { "domainConfigured", "spfValid", "dkimValid", "mxValid", "dmarcValid",
    "mailboxes":[{id,email,provider,status,authStatus,lastTestAt,latencyMs}],
    "mailboxActive", "provider", "lastSync", "sendingHealthy" }
  ```

### 3. Edge function `send-outbound-test-email`

- Body : `{ mailboxId, recipient }`. Envoie un mail réel via le provider de la mailbox, mesure latence, stocke dans `outbound_test_sends`, met à jour `last_test_*` + bascule `mailbox_status` → `verified` si succès.

### 4. Cron pg_cron toutes les 5 min

- `select net.http_post(... /functions/v1/check-outbound-health ...)`
- Job `outbound-health-check-5min` créé via `supabase--insert` (jamais migration, contient l'anon key).

### 5. Hooks et UI

- Nouveau hook `useOutboundHealth()` qui appelle `check-outbound-health` (refresh 60 s) et expose `{ domainConfigured, spfValid, dkimValid, mxValid, mailboxes, activeCount, provider, lastSync, sendingHealthy }`.
- Refonte `PanelLiveKPIs` :
  - "Domaine email configuré" = vrai **uniquement** si `spfValid && dkimValid && mxValid`.
  - "Mailbox active" = vrai uniquement si au moins 1 mailbox `auth_status='connected'` ET `last_test_send_at` < 24 h avec succès.
  - Affiche provider auto-détecté lisible (Gmail / Google Workspace / Outlook / Resend / SMTP).
- Nouvelle carte `CardOutboundHealth` (3 états) :
  - 🟢 Vert : domaine OK + ≥ 1 mailbox `verified` + dernier test < 1 h.
  - 🟡 Jaune : mailbox connectée mais jamais testée OU bounce_ratio > 5 %.
  - 🔴 Rouge : aucune mailbox connectée OU DNS invalide.
- Bouton "Tester l'envoi" → modal pour saisir destinataire, appelle `send-outbound-test-email`, affiche latence + réponse provider + met à jour `last_sync_at` UI.

### 6. Pre-flight checklist

Refactor `ModalConfirmGoLive` pour utiliser `useOutboundHealth()` :
- Domaine configuré ← `spfValid && dkimValid && mxValid`
- Mailbox active ← `mailboxActive === true` (vrai test send réussi récemment)
- Plus aucun `!!domainHealth` mock.

### Détails techniques

- Aucune fausse donnée : si `check-outbound-health` n'a jamais tourné → tous les KPI restent en attente (`pending`) avec CTA "Lancer la vérification".
- Auto-détection provider : règle simple sur `domain` + `connection_type` (`gmail.com` → Gmail, `outlook.com`/`hotmail.com` → Outlook, sinon Workspace/Custom selon MX).
- Toutes les fonctions edge utilisent `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'` et `verify_jwt = false` avec validation admin via `service_role`.
- RLS strict admin sur toutes les nouvelles tables.

### Hors scope

- Refonte du dashboard outbound complet (uniquement les KPI/checklist + nouvelle carte santé + bouton test).
- Nouvelle UI de configuration OAuth (les credentials existants sont supposés en place).
