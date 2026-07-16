---
name: Timezone Standard
description: America/Toronto is the single official UNPRO timezone; storage stays UTC; user-facing time formatting must route through shared helpers
type: constraint
---

**Fuseau officiel UNPRO** : `America/Toronto` (couvre tout le QC, DST auto).

**Règles absolues** :
- Stockage : `timestamptz` en UTC. Jamais convertir en DB.
- Affichage : uniquement via helpers partagés — `src/lib/time/timezone.ts` (frontend) et `supabase/functions/_shared/timezone.ts` (Deno).
- Interdits pour texte utilisateur : `toLocaleString`, `toLocaleTimeString`, `Intl.DateTimeFormat(...)` sans `timeZone: "America/Toronto"`.
- SMS de monitoring (tags `test système`, `heartbeat`, `monitoring`, `debug`, `worker check`, `cron test`) → passent par `assertAdminOnlySms` et ne peuvent atteindre que les numéros de `admin_sms_recipients` (ou `SMS_TEST_DESTINATION_NUMBER`).
- Health check horaire : edge `timezone-health-check` + table `timezone_health_checks` + cockpit `/admin/system-time`.

**Why** : bug SMS "15 h 23" (UTC) vs "11:23" au Québec provenait de `new Date().toLocaleTimeString("fr-CA")` en runtime Deno (UTC par défaut).
