# Autonomous Contractor Activation Engine

## Principe directeur

Tu as déjà 80% de l'infra: `contractor_prospects`, `outbound_*` (45+ tables), `sniper-*`, `acq-*`, `war-prospecting-engine`, AIPP scoring, Stripe checkout, concierge cockpit. **On n'en reconstruit rien.** On bâtit la **couche d'orchestration multi-agents** qui les fait fonctionner ensemble sans clic humain, plus l'UI cockpit pour observer le système.

## Architecture — 8 agents autonomes

Chaque agent = edge function idempotente + entrée cron + état dans `agent_runs`. Orchestrateur central (`agent-orchestrator` existe) déclenche selon priorité.

```text
Scout ─► Enrichment ─► AI Visibility ─► Messaging ─► Activation
   ▲                                          │           │
   └── Territory Saturation ◄─────────────────┘           ▼
                                              Follow-up ◄─┘
                                              ▲
                                   Performance Optimizer
```

| Agent | Edge function | Réutilise | Ajout |
|---|---|---|---|
| Scout | `agent-scout-leads` (nouveau) | `acq-scrape-google-places`, `acq-scrape-contractors` | boucle multi-cités/trades, dédup, écrit `contractor_leads` |
| Enrichment | `agent-enrich-leads` (nouveau) | `acq-enrich-prospect`, `aipp-real-scan` | fan-out batch + retry |
| AI Visibility | `agent-ai-visibility` (nouveau) | AIPP real scoring engine | génère `ai_visibility_reports` + insight FR |
| Messaging | `agent-generate-message` (nouveau) | `concierge-generate-message`, `outbound_ai_personalizations` | choisit variant gagnant via Optimizer |
| Activation | `agent-activation-dispatch` (nouveau) | `concierge-create-offer`, `activation-create-checkout`, dynamic pricing engine | sélectionne plan auto selon territoire, génère lien, log `outreach_messages.activation_clicked` |
| Follow-up | `agent-followup` (nouveau) | `process-outbound-queue`, `send-sms-prospect` | séquence J1/J3/J5/J7, stop conditions |
| Territory Saturation | `agent-territory-monitor` (nouveau) | `acq_territory_slots` (existant) | recalcule, lock auto >90% |
| Performance Optimizer | `agent-optimizer` (nouveau, daily) | `outbound_ai_scores`, `outreach_messages` | A/B variants, send times, plan pricing |

## Base de données (migration unique)

Nouvelles tables (les autres réutilisées telles quelles):

- **`agent_runs`** — id, agent_name, started_at, finished_at, status (running/ok/error/paused), input jsonb, output jsonb, error text. Source de vérité du monitoring.
- **`outreach_messages`** — extension/vue sur `campaign_send_log` + `outbound_contacts` pour exposer le schéma demandé (contractor_id, channel, variant, opened_at, replied_at, activation_clicked, activation_completed). Si schéma actuel diverge, créer table dédiée et migrer les nouveaux envois ici.
- **`ai_visibility_reports`** — contractor_id, visibility_score, competitors jsonb, missing_entities jsonb, ai_summary text, generated_at. Une ligne par scan.
- **`activation_quotas`** — global/trade/city/phone, period (day), limit, used. Atomique via UPSERT + CHECK trigger.
- **`agent_safety_events`** — bounce_rate, sms_fail, stripe_error, complaint → pause campagne automatique.

Étendre `acq_territory_slots`: ajouter `saturation_percent` (generated), `lock_status` (auto/manual/open), `auto_locked_at`.

`contractor_leads` existe déjà — on aligne les statuts (`discovered → enriched → scored → contacted → opened → replied → interested → activation_sent → activated → paused → rejected`) via une enum dédiée et migration des valeurs existantes.

GRANT + RLS sur toutes les nouvelles tables (admin only via `has_role('admin')`).

## Edge functions à créer

1. `agent-scout-leads` — cron 15 min, respecte quotas, écrit leads bruts.
2. `agent-enrich-leads` — cron 1h, prend `status=discovered`, écrit `enriched`.
3. `agent-ai-visibility` — cron 1h, écrit `ai_visibility_reports` + `ai_visibility_score` sur lead.
4. `agent-generate-message` — déclenché par scoring, écrit `outreach_messages` (status=pending).
5. `agent-send-outreach` — cron 2h, drain pending → SMS/email via `send-sms-prospect`/email existant, respecte `activation_quotas`.
6. `agent-followup` — cron 6h, détecte non-réponses, génère J3/J5/J7 avec ton escaladé.
7. `agent-activation-dispatch` — déclenché sur `status=interested` ou clic, sélectionne plan dynamique, génère lien via `activation-create-checkout`, envoie.
8. `agent-territory-monitor` — cron 30 min, recompute saturation, lock >90%, déclenche `agent-safety-pause`.
9. `agent-optimizer` — cron daily, recalcule meilleur variant/heure/prix.
10. `agent-safety-pause` — déclenché par seuils, pause campagne, écrit `agent_safety_events`.

Toutes utilisent `import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"` (kernel memory).

## Pricing dynamique (Activation Agent)

```text
base_price = match(trade_demand, territory_saturation)
  saturation < 30% AND competitors < 3  → 149 (Recrue)
  saturation 30–70%                     → 349 (Pro)
  saturation > 70% OR top_3_city        → 599 (Premium)
```

Respecte `CONTRACTOR_PLANS` (`src/config/contractorPlans.ts`) — interdit toute valeur hors catalogue.

## UI — Cockpit Autonome (admin)

Route: `/admin/autonomous-engine` (rajoutée à `src/app/router.tsx`, admin-only).

Pages/composants (premium dark, glass, blue glow — pas de redesign):

- `PageAutonomousEngine.tsx` — header KPI live (leads/j, sent/j, replies, activations, MRR added), grid 8 agents.
- `AgentCard.tsx` — par agent: status pill, dernière exécution, throughput, bouton pause/resume, erreurs récentes.
- `QuotaStrip.tsx` — barres SMS/email/activations vs daily caps, codes couleur.
- `TerritoryHeatmap.tsx` — table trade×ville avec saturation %, lock status, places restantes.
- `LeadTimelineDrawer.tsx` — clic sur lead → timeline complète (scraped → analyzed → message → sent → opened → clicked → replied → activated) avec UI sniper-style existante.
- `AIVisibilityReportView.tsx` — page publique `/rapport-ia/:contractorId` (le lead reçoit ce lien dans le SMS), CTA "Activer ma visibilité IA" qui dispatch l'Activation Agent.
- `SafetyAlertsPanel.tsx` — événements pause auto, bounce, Stripe errors.

L'écran de la capture (ProspectDrawer du concierge) reste — il devient **lecture seule + override admin** ("Forcer l'envoi"), tout le reste est piloté par les agents.

## Cron Supabase (via supabase--insert SQL avec pg_cron)

```text
*/15 * * * *  → agent-scout-leads
0 * * * *     → agent-enrich-leads, agent-ai-visibility
0 */2 * * *   → agent-send-outreach
0 */6 * * *   → agent-followup
*/30 * * * *  → agent-territory-monitor
0 4 * * *     → agent-optimizer
```

## Safety systems (obligatoires)

Pause auto si: bounce_rate > 8%, SMS fail > 15%, Stripe error rate > 5%, saturation atteinte, quota global dépassé, API key épuisée. Écrit `agent_safety_events`, notifie via `outbound_admin_alerts`.

## Hors scope (intentionnel)

- Pas de refonte du concierge cockpit, AIPP, Stripe, ou contractor activation flow.
- Pas de nouveaux fournisseurs SMS/email — réutilise l'existant.
- Pas de scraping de nouvelles sources (RBQ/Facebook au-delà de ce qui est déjà branché dans `acq-scrape-*` et `facebook_extraction_campaigns`).
- Pas de changement aux pricing catalogues.

## Livraison en 3 phases

**Phase 1 — Foundation (cette session)**
- Migration: `agent_runs`, `ai_visibility_reports`, `activation_quotas`, `agent_safety_events`, enum statuts, extension `acq_territory_slots`.
- Edge functions: `agent-scout-leads`, `agent-enrich-leads`, `agent-ai-visibility`, `agent-generate-message`, `agent-send-outreach`, `agent-activation-dispatch`.
- Cron entries via supabase--insert.
- Route admin `/admin/autonomous-engine` + `PageAutonomousEngine` + `AgentCard` + `QuotaStrip`.

**Phase 2** — `agent-followup`, `agent-territory-monitor`, `agent-optimizer`, `agent-safety-pause`, `TerritoryHeatmap`, `SafetyAlertsPanel`.

**Phase 3** — Page publique `/rapport-ia/:slug`, A/B variants automatiques, dashboard MRR added.

## Critère de succès

À la fin de la Phase 1, depuis `/admin/autonomous-engine`: bouton **"Démarrer le moteur"** → 24h plus tard, sans intervention, on observe leads scrapés, scorés, messages envoyés, premiers liens d'activation cliqués, et les quotas respectés. Aucun bouton "Générer le lien" cliqué manuellement.

---

**Confirme et je lance la Phase 1.**
