## Problem

`AuthReturnRouter` listens to `SIGNED_IN` and treats `/` and `/index` as "auth surfaces" eligible for automatic role-based redirect. When an admin's session is restored on page load (Supabase emits `SIGNED_IN`), the router immediately navigates to `/admin`, making the home page unreachable for any logged-in admin.

This explains the screenshots: user lands on `/index` (home) → instantly bounced to `/admin`.

## Fix (single file)

**`src/components/auth/AuthReturnRouter.tsx`**

1. Remove `/` and `/index` from `isAuthSurface()`. The home is a real destination, not a transient auth page.
   - Drop the two early `return true` branches (lines 20-21).
   - Keep redirect only for `/login`, `/signup`, `/role`, `/start`, `/auth/callback`.

2. Belt-and-suspenders: in the `SIGNED_IN` handler, ignore the event when there is no explicit `intent.returnPath` AND the current path is not an auth surface. This prevents any future regression where a refresh event lands the user somewhere they intentionally navigated to.

3. Keep the existing logic for:
   - Explicit `intent.returnPath` (still honored from anywhere — that's the post-login flow).
   - Approved partner safety net (still routes from auth surfaces only after the change).
   - `/auth/callback` early return.

## Why not touch guards or router

`UniversalRouteGuard` is not on `/`, and no other code force-navigates home → admin. The bug is fully contained in `AuthReturnRouter`'s overly-broad auth-surface definition.

## Verification

- Reload `/` while logged in as admin → stays on home.
- Login flow from `/login` as admin → still routes to `/admin`.
- Login with a `returnPath` intent → still honored.
- Logout / login as homeowner from `/login` → still routes to `/dashboard`.
