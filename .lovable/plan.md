

# UNPRO — Mode Lancement Autonome

Activer le **Launch Commander** : un cron qui s'exécute chaque minute, orchestre 9 agents (Scout → Activation) et ne s'arrête qu'au premier contractor payant. Aligné sur le Production Reliability Framework existant (`reportOutcome`, `FailureCode`, `withRetry`, state machines).

## Objectif unique

`first_paying_contractor_acquired = true` — toute autre métrique est secondaire.

## Architecture

```text
┌─────────────────────────────────────────────────┐
│ launch-commander (pg_cron, every 1 min)         │
│  ├─ check launch_mode_state                     │
│  ├─ enforce founder_mode (bypass quotas)        │
│  └─ dispatch → agents selon lead_status         │
└─────────────────────────────────────────────────┘
              │
   ┌──────────┴───────────────────────────┐
   ▼                                       ▼
agent-scout      agent-enrich   agent-ai-visibility
agent-outreach   agent-delivery-monitor
agent-reply-detector  agent-sales-closer
agent-payment-monitor agent-activation
              │
              ▼
   platform_operation_outcomes (Rule 10)
   launch_pipeline_events (timeline)
```

## Pipeline d'état (state machine canonique)

Réutilise `LeadPipelineStates` existant + nouveau wrapper `LaunchPipelineState`:

```text
DISCOVERED → ENRICHED → SCORED → MESSAGED → DELIVERED
  → REPLIED(INTERESTED|CURIOUS|NOT_NOW|REMOVE|BOOK_CALL)
  → CHECKOUT_SENT → PAID → ACTIVATED ✅
                          └→ FAILED / BLOCKED (avec retry)
```

Transitions interdites silencieusement (throw via `createStateMachine`).

## Tables (migration)

1. `launch_mode_state` (singleton row)
   - `mode` enum (`idle` | `launching` | `first_customer_acquired`)
   - `founder_mode_enabled boolean default true`
   - `started_at`, `first_customer_acquired_at`, `first_customer_contractor_id`
   - `first_customer_source`, `first_customer_message_template`, `first_customer_plan`
2. `launch_leads` (vue ou nouvelle table légère agrégeant le funnel : `contractor_id`, `lead_status`, `last_event_at`, `attempts`, `failure_code`, `block_reason`, `next_retry_at`, `revenue_impact_cents`)
3. `launch_pipeline_events` (timeline append-only par contractor : `event`, `agent`, `from_state`, `to_state`, `payload jsonb`, `created_at`)
4. `launch_followup_schedule` (`contractor_id`, `attempt_number 1..3`, `due_at`, `sent_at`)

Toutes avec `GRANT` aux rôles requis + RLS (admin-only read, service_role write).

## Edge functions (créer)

| Function | Rôle |
|---|---|
| `launch-commander` | Orchestrateur cron, dispatch par état, `reportOutcome` à chaque sortie |
| `launch-agent-scout` | Découvre contractors (réutilise `acq-scrape-google-places` + `agent-scout-leads`), cible 50/jour, industries + villes prioritaires |
| `launch-agent-enrich` | Wrap `acq-enrich-contractor` |
| `launch-agent-visibility` | Wrap `agent-ai-visibility` + `acq-generate-score` |
| `launch-agent-outreach` | Wrap `agent-generate-message` + `agent-send-outreach` avec template SMS personnalisé spécifié |
| `launch-agent-delivery-monitor` | Vérifie statuts Twilio/Resend, transitions SENT → DELIVERED/FAILED/BLOCKED |
| `launch-agent-reply-detector` | Scanne `outbound_replies` + `twilio-inbound`, classifie via Lovable AI (`INTERESTED/CURIOUS/NOT_NOW/REMOVE/BOOK_CALL`) |
| `launch-agent-sales-closer` | Sur INTERESTED/BOOK_CALL : recommande plan (Recrue/Pro/Premium/Élite/Signature selon scoring) + génère Stripe checkout |
| `launch-agent-payment-monitor` | Réagit aux webhooks Stripe `checkout.session.completed` (réutilise webhook existant) |
| `launch-agent-activation` | Wrap `activate-contractor-plan` + déclenche audit AIPP + débloque territoire + marque `first_customer_acquired` |
| `launch-followup-engine` | Planifie J+2, J+5, J+10 si pas de réponse, stop à 3 tentatives |

Chaque fonction utilise `withRetry`, `FailureCode`, `BlockReason`, `reportOutcome` du framework existant. **Aucun "OK" silencieux**.

## Cron (pg_cron via supabase--insert)

```sql
select cron.schedule('launch-commander-1m', '* * * * *',
  $$ select net.http_post(url:='.../launch-commander', ...) $$);
select cron.schedule('launch-followup-engine-15m', '*/15 * * * *', ...);
```

## Founder Mode (bypass quotas)

`launch_mode_state.founder_mode_enabled = true` →
- `outreach_quota_status` retourne `unlimited`
- toutes les guards de send vérifient `isFounderModeActive()` avant `BlockReason.SMS_QUOTA_REACHED / EMAIL_QUOTA_REACHED`
- expose toutes les erreurs (jamais d'absorption)
Désactivé automatiquement après `first_customer_acquired`.

## UI — Revenue War Room

Nouvelle page **`/admin/launch-war-room`** (Cinematic Dark, premium):

- Bandeau d'état : `IDLE` / `🚀 LAUNCHING` / `🎉 FIRST CUSTOMER ACQUIRED`
- KPI strip (réutilise `KpiStrip` pattern) : Revenue Today/Week/Month, Discovered, Contacted, Replies, Checkouts Sent, Payments, Activations, Conversion Rate
- Funnel pipeline vertical : compte par état + clic = liste contractors bloqués
- Timeline live `launch_pipeline_events` (50 derniers, auto-refresh 5s)
- Agent health grid : 9 cartes `<OperationHealthCard>` (réutilise composant existant) — montre succès réels, blockers, retries planifiés
- Bouton **START LAUNCH** / **PAUSE** / **RESET**
- Modal de célébration plein écran au moment de `first_customer_acquired`

## Suivi de conformité Production Reliability

- Chaque agent : `reportOutcome({ operation, outcome, failure_code, block_reason, revenue_impact_cents })`
- State machine throw si transition invalide
- `withRetry` (backoff 5/30/120/720 min) sur tous les appels Stripe/Twilio/Resend/scraping
- `OperationHealthCard` lit `platform_operation_outcomes` pour santé réelle
- Pas de `success: true` si l'objectif business n'est pas atteint

## Hors périmètre (intentionnel)

- Pas de redesign UI publique
- Pas de refonte voix Alex
- Pas de modification du flow homeowner/condo
- Pas de nouveau provider d'email/SMS — réutilise infra existante

## Détails techniques

**Fichiers à créer**
- `supabase/migrations/<ts>_launch_mode.sql` (4 tables + GRANT + RLS + cron schedule via `supabase--insert` séparé)
- 11 edge functions sous `supabase/functions/launch-*/index.ts`
- `src/lib/launch/stateMachine.ts` (extends `LeadPipelineStates`)
- `src/lib/launch/founderMode.ts` (helper `isFounderModeActive`)
- `src/hooks/useLaunchWarRoom.ts`
- `src/pages/admin/AdminLaunchWarRoom.tsx`
- `src/components/launch/{PipelineFunnel,AgentHealthGrid,LaunchKpiStrip,FirstCustomerModal}.tsx`
- Route dans `src/config/routesConfig.ts` (admin-only)

**Fichiers à éditer**
- `src/lib/reliability/types.ts` — ajouter `FailureCode.SCOUT_NO_RESULTS`, `BlockReason.LAUNCH_PAUSED`
- `supabase/functions/_shared/reliability.ts` — idem côté Deno
- Sidebar admin pour pointer vers `/admin/launch-war-room`

**Garde-fous**
- Mode `idle` par défaut — démarrage explicite via bouton UI
- RLS : tables `launch_*` lisibles seulement par `has_role('admin')`
- Webhook Stripe existant déclenche `launch-agent-payment-monitor` (pas de duplication)
- Idempotence : tout `launch-*` accepte `contractor_id` + `attempt`, dédupe sur `platform_operation_outcomes`

## Définition de succès

1. `START LAUNCH` cliqué → cron actif, Scout produit ≥ 50 contractors/jour
2. Pipeline visible en temps réel sans intervention manuelle
3. Échec d'un agent ⇒ retry auto + visible dans war room (jamais silencieux)
4. Premier `checkout.session.completed` ⇒ activation auto < 60s ⇒ modal 🎉 ⇒ snapshot `first_customer_*` enregistré ⇒ Founder Mode désactivé

