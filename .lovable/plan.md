## Diagnostic

I tested the pipeline directly and confirmed:

1. **Edge function `run-live-acquisition` works** — direct `curl` returned HTTP 200 with a valid `run_id` (`e4b60308…`), prospect resolved, SMS body drafted.
2. **Row exists in the DB** — `live_acquisition_runs` has the new run with `status=running`.
3. **Edge function logs show only my test boot** — your browser click **never reached the function**. The UI button is stuck on "Starting…" without ever dispatching the call (likely the `supabase.functions.invoke` is failing silently, swallowed by the try/catch, or the page hasn't loaded the latest deploy).
4. **RLS on `live_acquisition_runs` / `acquisition_run_steps` requires `admin` role** — so even when the run is created, the page reads zero rows unless you're signed in as admin. Your account `yturcotte@gmail.com` is admin, but the page has **no auth guard**, so if your preview session is anonymous the SELECT returns nothing and you see "No runs yet."

Net effect: the button looks stuck, no run shows up, and you have no idea why.

## Fix Plan

### 1. Harden `PageAdminLiveRuns.tsx`
- Wrap the page in `AuthGuard` + admin check (redirect non-admins).
- Show the **current signed-in user + role** in the header so you immediately see if you're not admin.
- Replace silent `try/catch` with a visible error panel (status + raw error text) under the "Start ISR Live Run" button.
- Add a hard 30s timeout on `invoke` so the button never gets stuck on "Starting…".
- After a successful run, **optimistically push the returned `run_id`** into local state (don't rely on `refresh()` alone — realtime + RLS combo is fragile).
- Add a manual "Refresh" button next to "Start".

### 2. Add a service-role read fallback
Create a tiny edge function `list-live-runs` (service role) that returns runs + steps as JSON, gated by checking the caller's JWT and verifying admin via `has_role(auth.uid(), 'admin')`. The page calls this instead of querying tables directly — eliminates the RLS visibility issue and gives one consistent admin-auth check.

### 3. Idempotency + visibility for re-clicks
The orchestrator already reuses an existing run for the same `(prospect_id, campaign)`. Surface this in the UI: if the returned `run_id` already existed, toast "Run resumed" instead of "Run created".

### 4. Better startup feedback
- Log the `run_id` and step statuses in a console group on success.
- If `invoke` throws, show: HTTP status, function name, message, and a "Copy error" button.

## Files Touched

- **edit** `src/pages/admin/PageAdminLiveRuns.tsx` — auth guard, error panel, timeout, optimistic state, refresh button, switch reads to `list-live-runs`.
- **new** `supabase/functions/list-live-runs/index.ts` — service-role JSON endpoint with admin check.
- **no DB changes** — RLS stays strict; reads go through the service-role function.

## Success Criteria

- Clicking "Start ISR Live Run" while signed in as admin returns a `run_id` within 5s and the run card appears immediately.
- Clicking it while signed out (or as non-admin) shows a clear "Admin only" message instead of silently doing nothing.
- Any failure surfaces an explicit error with HTTP status and message.
- The button never stays stuck on "Starting…" longer than 30s.
- Run resume vs new-create is distinguishable in the toast.

## Non-Goals

- No changes to the orchestration logic, SMS approval flow, Stripe checkout, or the 12-step pipeline itself.
- No relaxation of RLS on `live_acquisition_runs` / `acquisition_run_steps`.
- No changes to `/pro/isolation-solution-royal` landing page.
