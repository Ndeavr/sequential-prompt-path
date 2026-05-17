A — PROMPT LOVABLE FINAL

1. CONTEXT
Build a hard fix for `/admin/live-runs`. Current UI shows `Timeout 15000ms invoking list-live-runs`, disables `Start ISR Live Run`, and prevents the ISR funnel from starting. The backend is healthy. The failure path is the admin page relying on `list-live-runs` during initial render; when that function call times out or is not deployed/reachable from the browser, the cockpit locks itself before the operator can start the run.

2. OBJECTIVE
Make the ISR live acquisition cockpit operational now:
- Start ISR run must work even if list refresh is delayed.
- Existing runs must display via a reliable fallback.
- Admin state must resolve from the existing admin guard/cache plus direct role check.
- Errors must be visible and actionable.
- No SMS sends without explicit admin action.

3. USERS
- Admin operator running ISR acquisition.
- Founder reviewing funnel status on mobile.

4. DELIVERABLES
Implement a targeted repair in:
- `src/pages/admin/PageAdminLiveRuns.tsx`
- `supabase/functions/list-live-runs/index.ts` if needed
- `supabase/functions/run-live-acquisition/index.ts` if needed

5. LOGIC
Create a resilient frontend sequence:
- Load current session first.
- Validate admin using `validateAdmin(user.id, email)` from `src/lib/adminGuard.ts`.
- Do not disable `Start ISR Live Run` because `list-live-runs` timed out.
- Start run directly through `run-live-acquisition` when admin validation passes.
- After run creation, insert returned run data into UI immediately.
- Refresh list in the background.
- If `list-live-runs` fails, fall back to direct table reads for `live_acquisition_runs` and `acquisition_run_steps` under existing RLS.
- Show a compact error panel only for the failed refresh, not as a full cockpit blocker.

6. DATA
Use existing tables only:
- `live_acquisition_runs`
- `acquisition_run_steps`
- `war_prospects`
- `user_roles`

No schema migration unless a direct check proves a missing unique constraint or policy blocks the flow.

7. UI/UX
Refactor cockpit copy and states:
- Title in French-first UNPRO style: `Runs d’acquisition live`
- Replace blocking red timeout with non-blocking status: `Synchronisation ralentie — actions disponibles.`
- Add clear state chips: `Connecté`, `Admin validé`, `Sync ralentie`, `Run prêt`.
- Keep Start button enabled for validated admin even when refresh fails.
- Add `Réessayer la sync` instead of a generic blocking `Refresh`.
- Preserve SMS dry-run and real-send controls.

8. COMPONENTS
Update existing page only:
- Add `loadAuthState()` helper.
- Add `refreshViaFunction()` helper.
- Add `refreshViaTablesFallback()` helper.
- Add `safeRefresh()` orchestrator.
- Add `functionError` and `syncMode` UI state.

9. ACTIONS
Implement:
- Admin validation using existing `validateAdmin`.
- Fallback reads from tables when `list-live-runs` times out.
- Immediate UI update after `run-live-acquisition` success.
- Better timeout handling with AbortController-style guard or Promise timeout cleanup.
- Direct function deploy/test for `list-live-runs` and `run-live-acquisition` after code changes.

10. CONSTRAINTS
- Do not edit generated Supabase client/types files.
- Do not send the real SMS automatically.
- Do not expose service-role secrets client-side.
- Do not weaken RLS.
- Do not rebuild the broader acquisition system.
- Keep the fix scoped to making this cockpit operational.

11. SUCCESS
Complete when:
- `/admin/live-runs` no longer blocks on `Timeout 15000ms invoking list-live-runs`.
- Admin sees validated state.
- `Start ISR Live Run` is clickable.
- Clicking it creates/resumes the ISR run.
- Run appears in the UI without requiring a successful list function refresh.
- SMS preview remains visible.
- Dry-run SMS and real-send controls remain admin-gated.
- `$1 Checkout` button remains available after run creation.

12. TASKS
- Refactor `PageAdminLiveRuns.tsx` admin/session bootstrap.
- Add non-blocking sync fallback to direct table reads.
- Make `startIsrRun` independent from list refresh.
- Harden error display and button disabled rules.
- Deploy/test affected edge functions.
- Verify in browser network/tools that the run path reaches the backend and renders a run card.