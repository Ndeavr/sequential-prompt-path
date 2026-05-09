## Problem

On `/admin/*`, users with the `admin` role (confirmed in DB for `yturcotte@gmail.com`) hit `AdminAccessDenied` with `detail: "timeout"`.

## Root cause

`src/guards/UniversalRouteGuard.tsx` runs its **own** `supabase.from("user_roles").select(...)` in addition to the one already running inside `useAuth` (TanStack Query). Two issues compound:

1. **Race**: the guard fires before `useAuth.roleQuery` resolves. `knownAdmin` is `false` initially, so the guard kicks off a parallel query.
2. **Tight timeout**: the guard force-denies after **3.5 s** (`setAdminCheck → load_error/timeout`), while `useAuth` itself only marks `roleTimedOut` at 4 s. On a slow network or cold Supabase connection, the guard denies before either query returns, even though the user *is* admin.

There is no need for a second query — `useAuth` already exposes `isAdmin`, `roles`, `hasResolvedRole`, `roleError`, `roleTimedOut`.

## Fix (single file: `src/guards/UniversalRouteGuard.tsx`)

Replace the admin-gate block with logic that consumes `useAuth` only:

- Drop the local `adminCheck` state, the duplicate `supabase.from("user_roles")` effect, and the 3.5 s timer.
- For `isAdminGate`:
  - If not authenticated → save intent and `Navigate` to `/login` (unchanged).
  - If `isAdmin` → render children.
  - If `!hasResolvedRole` (still loading and not timed out) → `RouteTransitionLoader`.
  - If resolved and not admin → `AdminAccessDenied` with `reason: "no_role"`.
  - If `roleError` or `roleTimedOut` and not admin → `AdminAccessDenied` with `reason: "load_error"` and `detail` from error message or `"timeout"`.
- Add a manual "Réessayer" path: `AdminAccessDenied`'s retry button currently reloads — keep that behavior; additionally invalidate `["user-role"]` so a fresh fetch happens without full reload (optional polish).
- Optionally bump `useAuth`'s role timeout from 4 s → 8 s to reduce false negatives on cold starts.

## Anti-regression

- Do not touch `useAuth`'s role query shape.
- Do not change non-admin branches of the guard.
- Keep `AdminAccessDenied` props/contract identical (`reason`, `detail`).
- Keep auth-intent + return-path saving for unauthenticated users.

## Verify

1. Hard reload `/admin` while signed in as `yturcotte@gmail.com` → should land on the admin dashboard, not the denied screen.
2. Sign in as a non-admin → should see `AdminAccessDenied` with `reason=no_role` (not `load_error`).
3. Sign out and visit `/admin` → redirects to `/login`, then back to `/admin` after login.
