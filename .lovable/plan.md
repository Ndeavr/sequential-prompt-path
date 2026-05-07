
# Fix — AIPP Demo Flow Stuck / Infinite Loading

## Root cause (verified)

The instant audit flow (`/audit`, `PageInstantAuditFunnel`) deadlocks at the "Recherche du profil…" step. Three concrete failure points:

1. **`useAuditIntakeFunnel.startAudit`** — invokes the `aipp-run-audit` edge function with `await supabase.functions.invoke(...)`. No timeout, no try/catch, no retry. If the function errors, throws, or returns no `audit_id`, `vm.auditId` stays `null` and polling never starts.
2. **`pollAuditStatus`** — only transitions to `reveal` when `analysis_status === "complete" | "partial"`. If the audit row is never written, never updated, or stuck in `pending/running`, the UI polls forever.
3. **`PageInstantAuditFunnel` poll loop** — `setInterval(..., 3000)` with no max-attempts cap and no overall deadline. `AuditProgressScreen` shows steps based on hard-coded `setTimeout` delays, decoupled from real backend progress, so users see the bar fill and then hang silently.

There is also no UI escape: no Cancel, no Retry, no "Continue anyway", no return-home.

## Fix strategy

Wrap every async step with timeouts + retries, force a guaranteed transition after a hard deadline, and surface escape hatches in the progress UI. Partial data must always be acceptable.

### 1. New utility — `src/lib/safeAsync.ts`

```text
safeAsyncOperation<T>(fn, { timeoutMs, retries, fallback, label })
  → { ok, data, error, durationMs, timedOut, attempts }
```

- Races the promise against `timeoutMs` (AbortController + setTimeout).
- Up to `retries` attempts with linear backoff.
- Returns `fallback` on final failure instead of throwing.
- Emits structured logs via `logBoot` (`SAFE_ASYNC:<label>:start|timeout|retry|ok|fallback`).

### 2. Hardened `useAuditIntakeFunnel`

- `startAudit`: wrap each Supabase call in `safeAsyncOperation`. Budgets:
  - contractor insert: 4s, 1 retry
  - session insert: 3s, 1 retry
  - `aipp-run-audit` invoke: 8s, 1 retry
- If `aipp-run-audit` fails or returns no `audit_id`, **still transition to `running`** with `auditId=null` and a new `vm.degraded=true` flag, then immediately schedule fallback reveal (see point 4).
- New `cancelAudit()` and `retryAudit()` actions exposed by the hook.
- `pollAuditStatus`: also transition to `reveal` when `analysis_status === "failed"` (with `degraded=true`), and increment a poll counter. After **5 attempts (~15s)** without resolution, mark `degraded=true` and force `reveal` with whatever score we have (fallback range 30–55).

### 3. Global watchdog

In `PageInstantAuditFunnel`, add a one-shot **10s hard deadline** timer the moment `step === "running"` starts:

- If still on `running` at 10s → call new `funnel.forceReveal()` which sets `step=reveal`, `degraded=true`, and a heuristic `auditScore` (computed locally from website presence, phone presence, business name length — deterministic, not invented).
- Clear the deadline on any successful step transition.

### 4. Partial-data reveal

`AuditRevealScreen` accepts a new `degraded` prop:

- When `degraded`, show "Analyse partielle" badge, an estimated AIPP **range** (e.g., `35–55`), the bullets we could compute from public input (website ✓/✗, phone ✓/✗, city ✓), and a "Relancer l'analyse complète" button that calls `retryAudit()`.
- Continue button still works → user always reaches the recommendation step.

### 5. Real progress UI in `AuditProgressScreen`

Replace the decoupled `setTimeout` choreography with a live state derived from the funnel:

```text
Steps:
  ✔ Profil créé          (when contractorId set)
  ✔ Audit lancé          (when auditId set OR degraded)
  ⏳ Analyse en cours     (while polling, with attempt counter)
  ✔ Score calculé         (on reveal)
```

Add three always-visible controls below the steps:

- **Continuer quand même** (visible after 4s) → `forceReveal()`
- **Recommencer** → `retryAudit()`
- **Retour à l'accueil** → `navigate('/')`

If `degraded=true` mid-run, show inline `⚠ Certaines données sont indisponibles — on continue.`

### 6. Edge function safety net (`aipp-run-audit`)

Audit `supabase/functions/aipp-run-audit/index.ts` (650 lines) and:

- Wrap each external call (Firecrawl, Google, scoring) in `Promise.race` with per-step budgets (web 8s, scoring 5s, screenshot 3s, max 2 retries).
- On any step timeout, mark the audit row `analysis_status='partial'` immediately with whatever data exists, so the client poll resolves.
- Always write an initial `pending → running` row at the very top so `pollAuditStatus` never queries a missing row.
- On total failure, set `analysis_status='failed'` with `overall_score=null` so the client falls back gracefully.

### 7. Structured logging

Add `logBoot` events at every transition: `AUDIT_START`, `AUDIT_INVOKE_OK|TIMEOUT|FAIL`, `AUDIT_POLL_TICK`, `AUDIT_FORCE_REVEAL`, `AUDIT_DEGRADED`, `AUDIT_RETRY`, `AUDIT_CANCEL`. Searchable in console for future debugging.

## Files touched

- **New**: `src/lib/safeAsync.ts`
- **Edit**: `src/hooks/useAuditIntakeFunnel.ts` (timeouts, retries, `forceReveal`, `retryAudit`, `cancelAudit`, `degraded` flag, `pollAttempts` cap)
- **Edit**: `src/pages/PageInstantAuditFunnel.tsx` (10s watchdog, pass new props)
- **Edit**: `src/components/audit-funnel/AuditProgressScreen.tsx` (live steps, escape buttons, degraded banner)
- **Edit**: `src/components/audit-funnel/AuditRevealScreen.tsx` (degraded mode, range score, retry button)
- **Edit**: `src/types/outreachFunnel.ts` (add `degraded`, `pollAttempts` to `FunnelViewModel`)
- **Edit**: `supabase/functions/aipp-run-audit/index.ts` (per-step timeouts, immediate `running` row, partial/failed status writes)

## Success conditions

- No path through the flow can exceed **10 seconds** of "loading" without reaching `reveal`.
- Every async step has timeout + retry + fallback.
- User always sees Continue / Retry / Home buttons after 4 seconds.
- Partial data renders a real (estimated) score; never a perpetual spinner.
- Console logs trace exactly which step caused any degradation.
