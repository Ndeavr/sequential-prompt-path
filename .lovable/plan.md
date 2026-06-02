
# Founder Verification Command Center — Phase 1

Objectif: une seule page admin qui rend visible, testable et réparable toute la pipeline d'acquisition contractor avant de scaler vers les 5 premières ventes. **Aucun nouveau moteur métier** — on agrège ce qui existe déjà (`acq-*`, `aipp-*`, `outbound-*`, `edge-check-email-health`, `alex-voice-health`, Stripe, Supabase) dans un cockpit unifié.

## Route et accès

- Nouvelle route `/admin/founder-verification` (super-admin uniquement, via `has_role` existant).
- Ajout au sidebar admin sous "Operations".
- Pas de modification des pages admin existantes.

## Architecture

```text
/admin/founder-verification (page)
 ├── Header + Recovery Mode selector (Observe / Safe / Aggressive)
 ├── KPI bar live (10 cartes, sparklines via system_events)
 ├── Section 1 — API Health (OpenAI/Lovable AI, Supabase, Stripe, Twilio, Google Maps, Resend, ElevenLabs)
 ├── Section 2 — Scraping & Extraction (+ Run Live Test: ville/trade → acq-cascade-scrape dry)
 ├── Section 3 — AIPP Engine (+ Run Live Test: NEQ/URL → aipp-v2-analyze)
 ├── Section 4 — Outreach Deliverability (SMS via acq-sms-send dry + Email via edge-check-email-health)
 ├── Section 5 — Landing & Conversion (funnel sniper/founder via system_events)
 ├── Section 6 — Stripe Verification (sandbox flow: checkout → webhook → activation)
 ├── Section 7 — Onboarding & Activation
 ├── Section 8 — Pipeline Timeline (scrape → enrich → AIPP → outreach → landing → checkout → webhook → activation)
 ├── Section 9 — Failed Jobs + Retry Queue + Root Cause panel
 └── Section 10 — Auto-Fix Policies + Execution Logs
```

## Données (migrations)

Trois nouvelles tables, RLS admin-only, GRANT explicites.

1. **`founder_health_checks`** — `id`, `module` (api|scraping|aipp|sms|email|stripe|onboarding|supabase|dns), `target`, `status` (green|yellow|red), `latency_ms`, `quota_remaining`, `error_code`, `error_message`, `probable_cause`, `proposed_fix`, `auto_fixable bool`, `metadata jsonb`, `checked_at`.
2. **`auto_fix_policies`** — `id`, `system`, `action`, `severity` (safe|warning|critical), `auto_allowed bool`, `requires_confirmation bool`, `cooldown_seconds int`, `max_retries int`, `enabled bool`, `created_at`. Seed avec 10–15 policies de base (retry queue=safe, restart scraper=warning, rotate domain=critical, etc.).
3. **`auto_fix_logs`** — `id`, `policy_id`, `issue_type`, `action_taken`, `automatic bool`, `success bool`, `before_state jsonb`, `after_state jsonb`, `execution_time_ms`, `triggered_by uuid`, `created_at`.

Réutilise les tables existantes: `system_events`, `outbound_*`, `aipp_*`, `acq_*`, `email_send_log`.

## Edge functions

**Nouvelles (4)** — minces orchestrateurs qui appellent les fonctions existantes:

1. `founder-health-snapshot` — Boucle parallèle (Promise.allSettled) qui ping chaque dépendance: 
   - Supabase: `select 1`
   - Stripe: `balance.retrieve()` 
   - Twilio: `Accounts.fetch()` via gateway
   - Google Maps: places ping
   - Lovable AI: `chat.completions` micro-call
   - Resend/email: `edge-check-email-health`
   - ElevenLabs: `alex-voice-health`
   - Insère 1 row par module dans `founder_health_checks`. Retourne le snapshot complet.
2. `founder-run-live-test` — `{ kind: 'scrape'|'aipp'|'sms'|'email'|'stripe', input }` → délègue à `acq-cascade-scrape` (dry), `aipp-v2-analyze`, `acq-sms-send` (dry to test number), `send-transactional-email` (test recipient), `acq-create-checkout` (mode test). Stocke le résultat brut + verdict.
3. `founder-stripe-test-flow` — Joue séquentiellement: create checkout test → simule webhook `checkout.session.completed` → vérifie activation profile → loggue chaque étape dans `system_events` avec `stage` traçable.
4. `founder-execute-fix` — `{ policy_id, target }`, applique le fix si `auto_allowed` ou si admin confirme; enregistre avant/après dans `auto_fix_logs`; respecte cooldown et `max_retries` (exponential backoff).

**Réutilisées sans modification**: `acq-preflight`, `acq-health-check`, `acq-full-test`, `edge-check-email-health`, `fn-check-email-domain-health`, `alex-voice-health`, `aipp-pipeline-run`.

## Composants UI (dark glassmorphism, design system existant)

- `FounderHeader` — titre + sous-titre "Visibility before scale." + `RecoveryModeSelector` (Observe Only / Safe Recovery / Aggressive locked).
- `KpiCard` — réutilisable, sparkline (recharts), status dot animé, last updated relative.
- `ModuleHealthCard` — status, latence, quota, last success/fail, bouton "Retry" / "Run Test".
- `LiveTestPanel` — formulaire (ville + trade pour scrape; NEQ/URL pour AIPP; numéro pour SMS), résultat brut + verdict.
- `PipelineTimeline` — 8 stages horizontaux, success rate + latency + retry par étape, depuis `system_events` (filtré 24h).
- `FailedJobsTable` — `issue_type`, classification (TRANSIENT / CONFIG / LOGIC / EXTERNAL / USER_FLOW), root cause, fréquence, "Execute Fix" tagué SAFE/WARNING/CRITICAL.
- `RootCausePanel` (drawer par failure) — stage, impacted users, first occurrence, recurrence, related recent deployments (read-only).
- `AutoFixPoliciesTable` — toggle enabled, edit cooldown/retries, severity badge.
- `AutoFixLogsTable` — historique exécutions avec before/after diff.

Tout en `bg-card/40 backdrop-blur-xl border border-white/5`, accents `text-primary` (blue glow), pulse animé pour statuses live.

## Logique côté client

- `useFounderHealth()` hook — appelle `founder-health-snapshot` au mount + auto-refresh 30s. Sub realtime sur `founder_health_checks` + `system_events`.
- `useAutoFix()` — exécute `founder-execute-fix` avec confirm modal pour WARNING/CRITICAL, exécution directe pour SAFE si Recovery Mode = Safe.
- Garde-fous: 
  - Recovery Mode `Observe Only` (default) → tous les boutons fix demandent confirmation explicite, aucune action automatique.
  - `Safe Recovery` → policies `auto_allowed=true` + `severity=safe` peuvent s'exécuter via cron (non implémenté Phase 1, juste préparé).
  - `Aggressive` → désactivé/locked en UI tant que stabilité <95%.

## Classification & cooldowns

- Classification automatique dans `founder-execute-fix` selon `error_code` patterns (timeout/429/5xx → TRANSIENT; 401/403/missing_env → CONFIGURATION; etc.).
- Cooldown: row dans `auto_fix_logs` filtrée par `policy_id + target` dans la fenêtre `cooldown_seconds`; bloque la ré-exécution.
- Throttling: `max_retries` par policy + backoff exponentiel `min(cooldown * 2^attempt, 1h)`.

## Sécurité

- RLS: `founder_*` et `auto_fix_*` lisibles + écrits uniquement par `has_role(auth.uid(), 'admin')`.
- GRANTs explicites: `service_role` ALL, `authenticated` SELECT/INSERT/UPDATE (filtré par RLS), pas d'`anon`.
- Aucun secret exposé client. Tous les ping API passent par les edge functions.

## Critères de succès Phase 1

- Page chargée en <1.5s, snapshot complet en <3s.
- Les 10 KPIs réflètent l'état réel (vérifiable en coupant un secret → carte passe red avec cause + fix).
- "Run Live Test" exécute un vrai scrape/AIPP/SMS/email/Stripe sans casser la prod.
- Stripe Test Flow loggue les 6 étapes (visit → plan → coupon → payment → activation → dashboard).
- Tout failure remonte avec error exact + cause probable + fix proposé.
- Aucun fix critique ne s'exécute sans confirmation admin.
- Aucune modif sur les pages admin existantes.

## Hors scope (Phase 2+)

- Autonomous healing agressif (déverrouillé seulement après 95% stabilité prouvée).
- Auto-rotation domaines/mailboxes.
- Optimisation copy/pricing dynamique.
- Page `/founder` landing publique + funnel de vente.
- Génération réelle des 5 ventes (Phase 3 après cockpit stable + outreach vérifié).

## Tâches d'implémentation

1. Migration: `founder_health_checks` + `auto_fix_policies` + `auto_fix_logs` + RLS + GRANTs + seed policies.
2. Edge functions: `founder-health-snapshot`, `founder-run-live-test`, `founder-stripe-test-flow`, `founder-execute-fix`.
3. Composants UI (10 composants listés).
4. Page `PageFounderVerification.tsx` qui compose tout.
5. Route + lien sidebar admin.
6. Smoke test manuel: ping chaque module, simuler 1 failure par catégorie, vérifier auto-fix safe sur retry queue.
