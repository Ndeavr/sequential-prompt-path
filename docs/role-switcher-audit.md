# Role-switcher & navigation audit

Session date: 2026-07-22

Scope: files explicitly listed in the hotfix request + affiliate header +
mobile menus + role-based redirects.

## Method

Grepped every `to="/…"` and `navigate("/…")` literal in the target files
and cross-checked each destination against `<Route path="/…">` definitions
in `src/app/router.tsx` (single source of truth) and the constants in
`src/config/routeRegistry.ts` / `src/config/routesConfig.ts`.

## Files inspected

| File | Status | Notes |
|---|---|---|
| `src/components/navigation/MenuRoleSwitcherUniversal.tsx` | OK | Uses in-app `setActiveRole()`; no navigation targets. Not modified. |
| `src/components/condo/CondoRoleSwitcher.tsx` | OK | Uses in-app `setCondoRole()`; no navigation targets. Not modified. |
| `src/components/navigation/DrawerNavigationMobileIntent.tsx` | OK | `/settings` (→ Navigate to /account), `/role`, `/proprietaires/passeport-maison` — all defined. |
| `src/components/navigation/MobileDrawer.tsx` | OK | `/login`, `/signup` — defined. |
| `src/components/navigation/MobileMenu.tsx` | OK | No absolute nav targets. |
| `src/components/navigation/MobileBottomNav.tsx` | OK | No dead targets. |
| `src/components/navigation/BottomBarMobileUniversal.tsx` | OK | No dead targets. |
| `src/components/navigation/SmartHeader.tsx` | OK | `/`, `/dashboard/notifications`, `/role` — defined. |
| `src/components/navigation/ProfileMenu.tsx` | OK | `/admin` — defined. |
| `src/features/affiliate/components/AffiliateHeaderMenu.tsx` | **REPAIRED** | Two dead targets fixed (see below). |

## Repairs applied

### AffiliateHeaderMenu.tsx

- `contractor` role destination `/pro/dashboard` → `/pro`
  Reason: `router.tsx` line 1398 defines `<Route path="/pro" …>`; there is no
  `/pro/dashboard` route. Clicking "Espace entrepreneur" from the affiliate
  war room dropdown previously landed on the SPA fallback.
- `partner` role destination `/partner/dashboard` → `/partners`
  Reason: only `<Route path="/partners" element={<PartnersPage />}>` exists
  (router.tsx line 1101); no `/partner/*` route hierarchy exists.

Both fixes are UI-only, no business logic touched.

## Not modified (verified, no dead links)

`MenuRoleSwitcherUniversal.tsx` and `CondoRoleSwitcher.tsx` were left
untouched per instructions — they operate on in-memory role context via
`useNavigationContext()` / `useCondoRole()` and never issue a Router
navigation, so no dead-link surface exists.
