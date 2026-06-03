# Phase 2 — Activation & Automatisation

## 1. Route admin
- Ajouter `/admin/autonomous-engine` dans `src/app/router.tsx` (lazy + Suspense + `LazyFallback`, guard admin)
- Ajouter constante `ADMIN_AUTONOMOUS_ENGINE` dans `src/config/routesConfig.ts`

## 2. Config Edge Functions
Ajouter dans `supabase/config.toml` (`verify_jwt = false`) pour:
- agent-scout-leads
- agent-enrich-leads
- agent-ai-visibility
- agent-generate-message
- agent-send-outreach
- agent-activation-dispatch

## 3. Crons (pg_cron + pg_net) via `supabase--insert`
| Agent | Fréquence |
|---|---|
| scout-leads | */15 min |
| enrich-leads | 0 * * * * (1h) |
| ai-visibility | 0 * * * * (1h) |
| generate-message | */30 min |
| send-outreach | */15 min |
| activation-dispatch | */15 min |

Chaque cron appelle l'edge function via `net.http_post` avec apikey anon + body `{"trigger":"cron"}`.

## 4. Agents complémentaires (Phase 2.5 — optionnel ce tour)
- `agent-followup` (J1/J3/J5/J7) — relances auto
- `agent-territory-monitor` (30 min) — lock auto >90% saturation
- `agent-optimizer` (daily 4am) — A/B variants, pricing

## 5. Sécurité auto-pause
Edge wrapper `_shared/safety.ts` qui lit `agent_safety_events` des 60 dernières min et bloque l'exécution si:
- bounce > 8%
- SMS fail > 15%
- Stripe error > 5%
- quota dépassé

## 6. Test E2E manuel
- Trigger manuel scout → vérifier `agent_runs` + `contractor_leads` insérés
- Trigger enrich → ai-visibility → generate-message → check `agent_outreach_messages`
- Trigger send-outreach (dry_run=true) → check pas d'envoi réel mais log OK

## Hors scope
- Heatmap territoires (Phase 3)
- Page publique `/rapport-ia/:contractorId` (Phase 3)
- MRR dashboard (Phase 3)
- Refonte UI cockpit (déjà créée Phase 1)

## Question
Veux-tu que j'inclue les 3 agents complémentaires (followup, territory-monitor, optimizer) dans ce tour, ou on garde ça pour Phase 3 et on valide d'abord le pipeline core?