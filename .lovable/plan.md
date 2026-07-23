## Diagnostic Matrix — Configured Ref `cl…` (verified)

Run four independent read-only probes against the ref actually wired into the app, plus a Lovable Cloud lifecycle check. No mutations, no password reset, no code changes. All secrets stay sanitized (ref masked to `cl…pff`, passwords never printed).

### Step 1 — Baseline
- `supabase--cloud_status` → capture lifecycle state (ACTIVE_HEALTHY vs COMING_UP/UNHEALTHY/etc.). Distinguishes "Supavisor incident" from "project restarting/paused".

### Step 2 — Four independent probes
Executed in parallel where possible; each records `path`, `ref`, `result`, `SQLSTATE or HTTP`, `latency_ms`, `conclusion`.

1. **Authenticated PostgREST** — `GET /rest/v1/platform_operation_outcomes?select=id&limit=1` with `apikey` + `Authorization: Bearer <anon>`. Overrides the earlier "unauthenticated 401 ≠ healthy" assumption.
2. **Transaction pooler `:6543`** — `psql "…pooler.supabase.com:6543/postgres?sslmode=require" -c "select 1"` with `connect_timeout=8`, `statement_timeout=5s`. User `postgres.clmaqdnphbndvmmqvpff` (verified against configured ref).
3. **Session pooler `:5432`** — same host, port 5432, same short timeouts, `select 1`.
4. **Direct DB `:5432` (IPv6)** — `db.clmaqdnphbndvmmqvpff.supabase.co:5432` only if `getent ahostsv6` returns an address; otherwise record `skipped: no_ipv6`.

Each probe captures the full sanitized error, SQLSTATE when Postgres answers, and HTTP status when PostgREST answers.

### Step 3 — Branching, per rules 7–10
- **Auth'd PostgREST OK** → pull real production counts via Data API even if SQL pooler stays down:
  `contractor_prospects`, `contractor_leads`, `casl_consent_evidence`, `outreach_delivery_events`, `launch_leads`, `platform_operation_outcomes` (last 24 h). Report counts in the final matrix.
- **Session pooler OK** → note that the queued CASL bridge migration is safe to apply via `:5432` (session mode supports DDL). Do NOT apply it in this turn — surface it as the next approved action.
- **Transaction pooler OK, session down** → note DDL must wait for session mode; DML is fine.
- **All three fail with correct ref** → classify as project-specific Supavisor/DB incident and request `supabase--restart` approval. Do NOT touch the DB password unless a probe returns SQLSTATE `28P01`.

### Step 4 — Edge Function independence
List any queued edge-function deployments that don't touch the DB at cold-start (pure webhook validators, static responders). None will be deployed this turn — just enumerated, since the user asked they may proceed independently and I want approval before any deploy.

### Step 5 — Final report (compact matrix)
Single table:

```text
path                          | ref     | result | code    | latency | conclusion
authenticated PostgREST       | cl…pff  | …      | HTTP …  | … ms    | …
transaction pooler :6543      | cl…pff  | …      | SQLST … | … ms    | …
session pooler :5432          | cl…pff  | …      | SQLST … | … ms    | …
direct db :5432 (IPv6)        | cl…pff  | …      | SQLST … | … ms    | …
```
Plus: Cloud lifecycle state, production counts (if Data API works), correct-ref confirmation, and a single-line verdict (`project-specific incident` / `Supavisor DDL only` / `fully healthy` / `paused-INACTIVE` / other).

### Explicit non-goals this turn
- No migration apply, no backfill, no scrape, no SMS, no Stripe session, no global unpause.
- No password reset, no rotation, no destructive recovery.
- No code edits — pure diagnostics.
- No `c1…` probes (ruled out by hex-verified `.env`).
