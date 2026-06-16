## Objectif

Créer une politique unique et obligatoire `send_window_policy` (heure de Montréal) que **tout** agent outbound (SMS, email, futurs canaux) doit consulter avant envoi. Hors fenêtre → `status = QUEUED` + `next_send_at = prochain créneau valide`. Founder Mode bypass.

## Règles (canoniques)

- **SMS** : Lun–Ven 9h–17h, Sam 10h–13h, Dim bloqué.
- **Email** : Lun–Ven 7h–18h, Sam 9h–12h, Dim bloqué.
- **Timezone** : `America/Montreal` (toujours, peu importe l'heure serveur).
- **Exceptions transactionnelles** (toujours envoyer, jamais bloquées) :
  - OTP / login
  - Reset password
  - Confirmation paiement
  - Confirmation rendez-vous
  - Réponse directe à un user ayant initié la conversation (inbound reply)
  - Alertes système
- **Founder bypass** : `founderMode.isActive()` → ignore la fenêtre.

## Architecture

### 1. Module partagé `supabase/functions/_shared/sendWindow.ts`

```ts
export type Channel = "sms" | "email" | "call" | "push";
export type MessageClass = "prospection" | "followup" | "transactional" | "reply" | "system_alert";

export function isTransactional(cls: MessageClass): boolean
export function isWithinSendWindow(channel: Channel, at?: Date): boolean
export function nextAllowedSendAt(channel: Channel, from?: Date): Date
export async function assertSendAllowed(opts: {
  channel: Channel;
  messageClass: MessageClass;
  founderBypass?: boolean;
}): Promise<{ ok: true } | { ok: false; reason: "OUT_OF_WINDOW"; next_send_at: string }>
```

Logique pure, testable, calcule via `Intl.DateTimeFormat("en-CA", { timeZone: "America/Montreal", … })` pour extraire jour/heure Montréal sans dépendre de l'heure serveur.

### 2. Miroir frontend `src/lib/communications/sendWindow.ts`

Mêmes fonctions, mêmes constantes, exportées pour l'UI (badge "Hors fenêtre — programmé pour demain 9h").

### 3. Table de config centrale

Migration : créer `outbound_send_window_policy` (singleton row) avec colonnes `channel`, `weekday` (0=dim..6=sam), `start_minute`, `end_minute`, `enabled`. Seed avec les règles ci-dessus. Permet édition admin sans redeploy.

Vue helper SQL `v_send_window_now(channel)` retournant `(within_window bool, next_allowed_at timestamptz)` pour usage dans triggers/cron.

### 4. Intégration dans chaque agent outbound

Avant tout `twilio.messages.create` / `resend.emails.send`, appeler `assertSendAllowed({channel, messageClass, founderBypass})` :

- `agent-send-outreach`
- `launch-agent-outreach`
- `acquisition-autopilot`
- `growth-outreach-agent`
- `dispatch-outreach-batch`
- `process-outbound-queue`
- `campaign-agent-loop`
- `evaluate-followup-rules`
- `outbound-sms-fallback`
- tout futur `*-outreach` / `*-agent` (lint check ajouté en bonus)

Si bloqué → écrire/mettre à jour la ligne en queue avec `status='queued'`, `next_send_at=<résultat>`, log `system_events` + `platform_operation_outcomes` avec `BlockReason.OUT_OF_WINDOW` (nouveau code ajouté à l'enum reliability).

### 5. Cron de re-dispatch

`*/10 * * * *` → fonction `process-send-window-queue` qui sélectionne les messages où `next_send_at <= now()` et re-soumet à l'agent d'origine. Idempotent.

### 6. UI Admin

- `/admin/outbound/send-windows` : table éditable des fenêtres par canal × jour, toggle enabled, preview "Prochain envoi autorisé : …".
- Composant `SendWindowBadge` réutilisé dans `/admin/sms-health`, `/admin/dispatch-center`, `/admin/launch-war-room` : pastille verte "Fenêtre ouverte" / orange "Fenêtre fermée — reprise dans 2h14min".
- Ajout d'une carte KPI : "Messages en attente fenêtre" + "Messages envoyés hors fenêtre (must be 0)".

### 7. Reliability

Ajouter dans `src/lib/reliability/types.ts` + `_shared/reliability.ts` :
- `BlockReason.OUT_OF_WINDOW`
- `BlockReason.QUIET_HOURS_DAILY_CAP`
Mettre à jour `<OperationHealthCard>` pour reconnaître ces codes (non considérés comme failure, juste "deferred").

## Sortie attendue

- Aucun SMS envoyé à 22h.
- Aucun email envoyé à 3h du matin.
- Aucun outbound le dimanche (sauf transactionnel).
- Tout message hors fenêtre est `queued` avec `next_send_at` précis.
- Founder peut forcer un envoi immédiat via toggle Founder Mode.
- Admin voit en temps réel l'état des fenêtres et la file d'attente.

## Fichiers touchés (résumé)

**Nouveaux**
- `supabase/migrations/<ts>_send_window_policy.sql`
- `supabase/functions/_shared/sendWindow.ts`
- `supabase/functions/process-send-window-queue/index.ts`
- `src/lib/communications/sendWindow.ts`
- `src/components/admin/SendWindowBadge.tsx`
- `src/pages/admin/PageSendWindowPolicy.tsx`

**Modifiés**
- 9 edge functions outbound listées ci-dessus
- `supabase/functions/_shared/reliability.ts` + `src/lib/reliability/types.ts` (nouveaux BlockReason)
- `supabase/config.toml` (nouvelle function + cron)
- `src/app/App.tsx` (route admin)
- `src/pages/admin/PageSmsHealth.tsx` (badge)

## Validation

1. Test unit `sendWindow.test.ts` : 24 cas (chaque heure de chaque jour × 2 canaux) + transitions DST.
2. Test E2E : forcer `now = dimanche 14h` → tentative envoi SMS → vérifier `status=queued`, `next_send_at = lundi 09:00 America/Montreal`.
3. Test Founder bypass : même scénario avec `founderMode ON` → envoi immédiat.
4. Vérifier `platform_operation_outcomes` ne marque PAS ces blocs comme failure.
