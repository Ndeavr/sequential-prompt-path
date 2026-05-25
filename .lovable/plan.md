
# UNPRO Outbound Autopilot Control System

## Contexte
Le dashboard `/admin/autopilot-mvp` affiche aujourd'hui des runs `done` avec `scraped_count = 0`. C'est un état interdit : un run ne peut pas être "terminé" sans résultat. Cette refonte transforme le module en vrai pipeline autonome avec étapes vérifiées, statuts stricts, alertes admin et UI de contrôle.

## Objectif
Pipeline déterministe en 11 étapes avec statuts explicites, retry automatique, blocage clair en cas d'échec, et UI cockpit permettant de diagnostiquer/réparer chaque run.

---

## 1. Données (1 migration)

### Tables nouvelles
- **`outbound_runs`** (remplace l'usage actuel) — colonnes : `trade`, `cities text[]`, `mode` (dry_run|live), `status` (enum strict), `target_count`, `scraped_count`, `deduplicated_count`, `enriched_count`, `scored_count`, `personalized_count`, `sent_count`, `opened_count`, `clicked_count`, `checkout_started_count`, `paid_count`, `activated_count`, `pending_count`, `failed_count`, `error_message`, `block_reason`, `last_step`, `next_action`, `alert_admin bool`, `created_by`, timestamps.
- **`outbound_prospects`** — tracking par entreprise avec `scrape_status`, `enrichment_status`, `aipp_score`, `weaknesses jsonb`, `personalization_status`, `email_subject/body`, `sms_body`, `landing_url`, `approval_status`, `send/open/click/payment_status`, `contractor_id`.
- **`outbound_run_logs`** — log par étape (`step`, `status`, `message`, `payload jsonb`).
- **`outbound_admin_alerts`** — `severity`, `title`, `message`, `missing_component`, `suggested_fix`, `resolved`.

### Enum statuts (strict, "done" interdit)
`queued | validating | scraping | deduplicating | enriching | scoring | personalizing | waiting_approval | dry_run_completed | sending | tracking | payment_pending | paid | activated | completed | blocked | failed`

### Migration de l'existant
Mapper les anciens runs `done` :
- `scraped_count = 0` + `mode = dry_run` → `dry_run_completed`
- `scraped_count = 0` + `mode = live` → `blocked` avec `block_reason = "legacy_zero_scrape"`
- `scraped_count > 0` → `completed`

### RLS
Admin-only sur les 4 tables (via `has_role(auth.uid(), 'admin')`).

---

## 2. Edge Functions (7)

1. **`run-outbound-autopilot`** — orchestrateur principal. Exécute séquentiellement les 11 étapes, écrit dans `outbound_run_logs` après chaque étape, met à jour `last_step` + `next_action` + counts, déclenche alertes.
2. **`verify-outbound-step`** — vérifie une étape isolée (sources, RLS, API keys, edge fn disponible).
3. **`retry-outbound-run`** — reprend depuis `last_step` (pas depuis zéro).
4. **`approve-outbound-run`** — passe `waiting_approval` ou `dry_run_completed` → `sending`.
5. **`send-outbound-test`** — envoi unique à l'admin pour valider template.
6. **`track-outbound-conversion`** — webhook landing/Stripe (visit, plan_selected, checkout_started, payment_success, profile_activated).
7. **`alert-admin-outbound-issue`** — crée entrée dans `outbound_admin_alerts` + flag `alert_admin = true` sur le run.

### Pipeline détaillé (dans `run-outbound-autopilot`)
```text
1. create_run         → status=queued
2. validate_sources   → check API keys (Firecrawl, Google Places), RLS, tables
                        si manque → status=blocked, alert_admin
3. scrape_targets     → Google Places > Firecrawl > existing_database fallback
                        retry 2x, si 0 → blocked OU dry_run_completed_simulation
4. deduplicate        → par name/phone/website/email/city
5. enrich_prospects   → website, email, RBQ, reviews, weaknesses, AI gaps
6. score_aipp         → score 0-100 + dimensions
7. personalize_outreach → email subject/body + SMS + landing URL + AIPP preview
8. approval_gate      → si dry_run → waiting_approval/dry_run_completed STOP
9. live_send          → envoi email/SMS, log sent/failed/bounced
10. landing_conversion_tracking → suivi via webhook
11. payment_activation → création contractor + plan + AIPP profile
```

### Logique d'alerte
Déclenche `alert-admin-outbound-issue` si :
- étape échoue 2x
- `scraped_count = 0` après scrape (mode live)
- `enriched_count = 0` après enrichissement
- `personalized_count = 0`
- Stripe checkout fail
- payment success mais profil non activé
- RLS bloque write / API key manquante / edge fn timeout
- run bloqué > 5 min sur même étape

---

## 3. UI — `/admin/autopilot-mvp` (refonte cards "Derniers runs")

Chaque card affiche :
- **Badge statut** coloré (vert=completed/paid, ambre=waiting_approval/dry_run_completed, rouge=blocked/failed, bleu=running)
- **Progress bar** par étape (11 segments)
- **Grille de counts** : target / scraped / enriched / scored / personalized / sent / clicked / paid
- **`last_step`** + **`next_action`** en clair
- **`block_reason`** si bloqué (bandeau rouge avec cause exacte)
- **Badge admin alert** si `alert_admin = true`
- **Boutons contextuels** :
  - Voir logs (drawer)
  - Vérifier étapes (lance verify)
  - Relancer (retry depuis last_step)
  - Continuer autopilot
  - Send test
  - Approuver live (si waiting_approval)
  - Voir prospects (drawer)
  - Voir paiements

### Bandeau rouge si `scraped_count = 0`
> "Aucune entreprise scrapée. Ce run n'est pas terminé."
> Cause : `{block_reason}` — Fix suggéré : `{suggested_fix}`

### Nouvelle vue `/admin/outbound/run/:id`
Détail complet : timeline logs, table prospects, alertes liées, paiements, boutons d'action.

---

## 4. Hooks frontend
- `useOutboundRuns()` — liste avec realtime
- `useOutboundRun(id)` — détail
- `useOutboundProspects(runId)`
- `useOutboundLogs(runId)`
- `useOutboundAlerts()`
- Mutations : `useRetryRun`, `useApproveRun`, `useSendTest`, `useVerifyStep`

---

## 5. Non inclus (risques/exclusions)
- Pas de refonte des tables `outbound_*` existantes (sequences, mailboxes) — coexistence
- Migration legacy des anciens `outbound_leads` non touchée (Phase B reste indépendante)
- Pas de remplacement de l'edge function `autopilot-mvp` existante — sera désactivée au profit de `run-outbound-autopilot`

## 6. Succès
- Aucun run ne peut afficher `status = done` ou `status = completed` avec `scraped_count = 0`
- Chaque run bloqué affiche cause + fix + bouton de réparation
- Admin reçoit alerte automatique sur tout problème pipeline
- Retry reprend exactement à `last_step` sans rejouer les étapes réussies
- Dry-run clair (`dry_run_completed`), jamais confondu avec succès live

## 7. Plan d'exécution
1. Migration SQL (4 tables + enum + RLS + migration legacy)
2. Edge function `run-outbound-autopilot` (orchestrateur)
3. Edge functions auxiliaires (verify, retry, approve, send-test, track, alert)
4. Refonte UI cards + nouvelle page détail
5. Hooks + realtime
6. Tests sur 2 runs Toiture/Isolation actuels (devraient passer `blocked`)
