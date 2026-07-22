## Autonomous Recovery + CASL Bridge Plan

Executes all Postgres-independent work now, queues Postgres-dependent steps behind a retry-safe preflight, and applies them the moment the pooler recovers.

### 1. Pooler preflight utility (new)
- `supabase/functions/_shared/poolerPreflight.ts` — reusable check:
  - Probes Data API (`/rest/v1/`) with anon key → tag `data_api_ok`.
  - Probes Postgres via a lightweight RPC (`select 1`) → tag `postgres_ok`.
  - Max 5 retries, exponential backoff (500ms → 8s), structured logs (`preflight.attempt`, `preflight.result`).
  - Returns `{ dataApi, postgres, attempts, lastError }`. Never throws; callers decide.
- `src/lib/reliability/poolerPreflight.ts` — browser/edge-agnostic wrapper used by admin ops screens and the auto-recovery loop.
- All destructive steps (migration apply, backfill, scrape write) guard on `postgres === true`.

### 2. Role-switcher / navigation audit (code-only, no DB)
Scope strictly to files the user listed + registry:
- Read `DrawerNavigationMobileIntent.tsx`, affiliate header nav, mobile menu components, `routesConfig.ts`, `routeRegistry.ts`, `resolveDestinationForRole`.
- Cross-check every `to=`/`navigate(` target against `SHIPPED_NAV_ROUTES` + actual `<Route>` definitions in `App.tsx`.
- Repair only confirmed dead links (missing route, wrong role destination, legacy slug not in `LEGACY_REDIRECTS`).
- Do NOT touch `MenuRoleSwitcherUniversal.tsx` or `CondoRoleSwitcher.tsx` unless a concrete dead target is proven.
- Deliverable: `docs/role-switcher-audit.md` listing every switcher target, status (OK / repaired / N/A), and the diff applied.

### 3. Static verification (no DB required)
- `tsgo --noEmit` (TypeScript).
- `bunx vitest run` (unit tests including `normalizeInput`, `prepareAlexSpeechText`, existing route tests).
- Custom dead-link scan script: walks `src/**/*.tsx` for `to="/..."` / `navigate("/...")` literals, resolves against router config, writes `docs/broken-links-audit.md` (already exists; will be regenerated).
- Skip Supabase linter (needs pooler) — queued.

### 4. CASL bridge migration (prepared, NOT applied blindly)
File: `supabase/migrations/<ts>_casl_prospect_lead_bridge.sql`
Idempotent structure:
```sql
BEGIN;
-- 1. Introspect: add columns only IF NOT EXISTS
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS source_prospect_id uuid,
  ADD COLUMN IF NOT EXISTS source_company_id uuid;

-- 2. FK only if missing (checked via pg_constraint)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contractor_leads_source_prospect_fk') THEN
    ALTER TABLE public.contractor_leads
      ADD CONSTRAINT contractor_leads_source_prospect_fk
      FOREIGN KEY (source_prospect_id) REFERENCES public.contractor_prospects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Unique partial index to prevent duplicate bridges
CREATE UNIQUE INDEX IF NOT EXISTS ux_leads_prospect_bridge
  ON public.contractor_leads(source_prospect_id) WHERE source_prospect_id IS NOT NULL;

-- 4. Backfill by normalized phone / place_id / domain — INSERTs skipped when a lead already exists
WITH matched AS (
  SELECT l.id AS lead_id, p.id AS prospect_id
  FROM public.contractor_leads l
  JOIN public.contractor_prospects p
    ON regexp_replace(l.phone,'\D','','g') = regexp_replace(p.phone,'\D','','g')
   AND l.source_prospect_id IS NULL
   AND p.phone IS NOT NULL
)
UPDATE public.contractor_leads l
SET source_prospect_id = m.prospect_id
FROM matched m WHERE l.id = m.lead_id;
-- Repeat for place_id, domain matches

-- 5. Log counts to platform_operation_outcomes
INSERT INTO public.platform_operation_outcomes(operation, outcome, meta)
VALUES ('casl_bridge_backfill','ok', jsonb_build_object('phone_matched', (SELECT count(*) FROM …)));
COMMIT;
```
Companion `rollback_<ts>.sql`: drops the two columns, constraint, index — no data destroyed elsewhere.

### 5. Auto-recovery queue
- `scripts/recovery-queue.ts` (node script, runs in sandbox): loops preflight every 60s up to 30 min. On `postgres_ok`:
  1. Apply migration (`supabase--migration`).
  2. Run backfill (already in migration; log affected counts).
  3. Invoke `commercial-send-gate` against a synthetic candidate to verify wiring — NO SMS.
  4. Trigger `acq-scrape-google-places` for Laval polygons (existing edge function).
  5. Redeploy `launch-agent-outreach`, `run-curiosity-sms-worker`, `commercial-send-gate` if code changed.
  6. Query `v_commercial_send_eligibility` for Laval count.
- Writes progress to `/mnt/documents/recovery-run.log` and to `platform_operation_outcomes`.

### 6. NO-SEND enforcement
- Keep `launch_mode_state.paused = true`.
- Recovery script hard-refuses any Twilio send path (asserts `DRY_RUN=1`, uses internal test numbers only for gate verification).

### 7. Final consolidated report
Written to `/mnt/documents/hotfix-report.md` and echoed in chat:
- Files changed (diffs summarized).
- Role-switcher findings + repairs.
- TS/tests/link-scan status.
- Migration status: `prepared` or `applied` (with row counts).
- Backfill counts by match key.
- `commercial-send-gate` dry-run result.
- Laval scrape result (new prospects, evidence rows).
- Edge functions redeployed.
- Actual E2E outcome (or explicit `pending_pooler` with attempt log).
- Remaining external blocker with last preflight timestamp.

### Explicit non-goals this turn
- No outbound SMS to real recipients.
- No Stripe session creation.
- No global unpause.
- No changes to `MenuRoleSwitcherUniversal.tsx` / `CondoRoleSwitcher.tsx` unless a dead target is proven.
- No blind migration apply while `postgres_ok = false`.
