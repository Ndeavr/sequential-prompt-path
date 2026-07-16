
# Correction fuseaux horaires UNPRO — America/Toronto partout

## Problème
SMS "test système" affiche `15 h 23` (UTC) alors que le téléphone au Québec affiche `11:23`. Aucun formatage n'est ancré sur `America/Toronto`, donc les horodatages fuient en UTC/local serveur selon l'endroit d'exécution (edge Deno, Postgres, navigateur).

## Standard officiel
- Constante unique : `America/Toronto` (couvre tout le Québec, DST auto).
- Stockage : **UTC uniquement** (`timestamptz`) — jamais de conversion en DB.
- Conversion : **uniquement à l'affichage** (UI + contenu des SMS/emails).

## Livrables

### 1. Source de vérité partagée
- **Frontend** — `src/lib/time/timezone.ts`
  - `export const UNPRO_TIMEZONE = "America/Toronto"`
  - `formatQcTime(date)`, `formatQcDate(date)`, `formatQcDateTime(date)` via `Intl.DateTimeFormat("fr-CA", { timeZone: UNPRO_TIMEZONE, ... })`
  - `nowInQc()` retourne parts (année/mois/jour/heure/min) pour la logique métier (fenêtres d'envoi).
- **Backend Deno** — `supabase/functions/_shared/timezone.ts`
  - `export const APP_TIMEZONE = "America/Toronto"`
  - Mêmes helpers `formatQcTime` / `formatQcDateTime` / `qcParts(date)`.
- **Postgres** — vue helper `public.qc_now()` retournant `now() AT TIME ZONE 'America/Toronto'` (lecture seule, pour dashboards SQL uniquement — pas de stockage).

### 2. Audit + remplacement systématique
Scan et refactor de tous les usages qui produisent du texte utilisateur :
- `toLocaleString`, `toLocaleTimeString`, `toLocaleDateString` sans `timeZone`
- `new Intl.DateTimeFormat(...)` sans `timeZone`
- Templates de SMS/email qui interpolent `new Date().toISOString()` ou `Date().toString()`
- Cron / workers Deno formatant l'heure dans le corps de message

Cibles principales identifiées :
- `supabase/functions/sms-admin-test` (source du bug "15 h 23")
- Toute fonction sous `supabase/functions/**` qui compose du texte utilisateur
- `src/lib/communications/sendWindow.ts` (déjà correct — sert de référence)
- Composants admin qui affichent des horodatages (`RecentEventsFeed`, dashboards SMS/email health, launch war room)
- Emails outbound (personnalisation, journal, follow-ups)

Règle appliquée : tout formatage d'heure destiné à un humain passe par le helper partagé. Les timestamps techniques (logs JSON, IDs) restent en ISO UTC.

### 3. SMS de monitoring → admin only
Nouveau garde-fou :
- Constante partagée `ADMIN_ONLY_SMS_TAGS = ["test système", "heartbeat", "monitoring", "debug", "worker check", "cron test"]`
- Helper `assertAdminOnlySms(body, recipient, adminPhones)` dans `_shared/sms.ts`
  - Si le corps matche un tag → destinataire doit appartenir à `admin_sms_recipients` (nouvelle table simple : `phone TEXT PRIMARY KEY, label TEXT, created_at`)
  - Sinon → refus + log dans `platform_operation_outcomes` avec `FailureCode.BLOCKED_POLICY`
- Toutes les fonctions Twilio (`sms-admin-test`, cron heartbeats, `sms-send-*`) importent ce garde avant `messages.create`.

### 4. Health check "timezone-health-check"
- Edge function `timezone-health-check` (cron horaire via `pg_cron` + `pg_net`)
- Compare :
  - `Date.now()` (edge runtime)
  - `select now()` (Postgres UTC)
  - `select now() at time zone 'America/Toronto'`
  - dérive attendue (UTC ↔ Toronto = 4 h ou 5 h selon DST)
- Écrit dans nouvelle table `timezone_health_checks(id, checked_at, edge_utc, db_utc, db_qc, drift_ms, status, notes)`
- Si `drift_ms > 5000` ou décalage DST anormal → log erreur + `reportOutcome` (`FailureCode.TIME_DRIFT`) + insertion dans `admin_alerts`.
- Pas de "correction automatique" magique côté horloge (impossible) — l'alerte suffit ; le système tombe en mode dégradé (affichage `⚠️` sur les widgets d'heure).

### 5. Cockpit admin — `/admin/system-time`
Nouvelle page (accessible depuis Système dans `adminNav.ts`) :
- Carte **System Time Health**
  - `UTC Server` : `2026-07-16 15:23:55`
  - `Toronto Time` : `2026-07-16 11:23:55`
  - `DB UTC`, `DB Toronto`
  - `Status` : ✓ Synced / ⚠️ Drift `NNN ms`
- Historique 24h des health checks (mini graphique de dérive)
- Liste des destinataires `admin_sms_recipients` (add/remove)
- Bouton "Envoyer heartbeat de test" → appelle `sms-admin-test` (déjà protégé par la garde admin-only).

### 6. Fix du SMS constaté
Après refactor, `sms-admin-test` compose son corps via `formatQcDateTime(new Date())` :
> `UNPRO · test système 2026-07-16 11:23:55`
Résultat aligné sur l'heure du téléphone.

## Critères de succès
1. SMS reçu au Québec à 11:23 → corps affiche `11 h 23 …`.
2. `/admin/system-time` affiche UTC + Toronto identiques à l'horloge Québec.
3. Aucun `toLocaleString` / `Intl.DateTimeFormat` sans `timeZone` dans `src/**` ni `supabase/functions/**` (vérifié par script d'audit ajouté à `scripts/`).
4. SMS "test système / heartbeat / monitoring / debug / worker check / cron test" refusés si destinataire ∉ `admin_sms_recipients`.
5. `timezone-health-check` tourne toutes les heures, journalise, alerte au-delà de 5 s de dérive.
6. Stockage : `timestamptz` UTC partout — aucune migration ne change ce contrat.

## Détails techniques
- Nouvelles tables : `admin_sms_recipients`, `timezone_health_checks` (RLS admin only, GRANT authenticated/service_role).
- Nouveau cron : `select cron.schedule('timezone-health-check', '0 * * * *', ...)`.
- Réutilise `platform_operation_outcomes` + `FailureCode` (ajout `TIME_DRIFT`, `BLOCKED_POLICY` si absents) — cadre Production Reliability existant.
- Aucune modification des schémas `auth`, `storage`, `realtime`.
- Pas de changement de logique métier — uniquement présentation + policy SMS admin.
