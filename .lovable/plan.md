## Decision

Keep `HeaderFloatingGlass` (white sticky glass, on `/` and `/index`) as the single visible header there. Hide `SmartHeader` only on those two routes. Everywhere else `SmartHeader` stays (those pages have no floating glass — removing it globally would leave them headerless).

Then port every real behavior from `SmartHeader` into `HeaderFloatingGlass` so nothing regresses.

## Files touched

1. **`src/layouts/MainLayout.tsx`** — conditionally skip `<SmartHeader />` when `pathname === "/"` or `"/index"`. All other routes unchanged.

2. **`src/pages/PageHomeUnicorn.tsx`** — rebuild the `HeaderFloatingGlass` component (lines 49–170) to be functional, not decorative:

   | Current (fake) | New (wired) |
   |---|---|
   | Static `FR` pill | `SwitchLanguagePillAnimated` (mobile) / `LanguageToggle` (≥sm) bound to `useLanguage()` — active side gets solid blue bg, inactive stays readable, 44×44 tap target |
   | Bell → `/memory` with hard-coded blue dot | `useNavigationContext()` → navigate `/dashboard/notifications`, dot only when `ctx.system.notificationsCount > 0`, `aria-label="Notifications"` |
   | Static `P` avatar dropdown with hard-coded routes | `<ProfileMenu />` when authed, `Connexion` CTA (`/role`) when guest — same logic as SmartHeader |
   | `QrCode` → `navigate("/qr")` | Opens `<QRShareSheet />` (same share sheet SmartHeader uses) |
   | Logo → no link | `<Link to={getLogoDestination(activeRole)}>` (dashboard / pro / admin / `/`) |
   | Hamburger with hand-written link list | Opens `<DrawerNavigationMobileIntent />` — same drawer as SmartHeader, role-aware, no duplicated bottom-nav items |

   Also: keep the glass panel styling (`uc-glass-strong`, sticky, `z-30`), keep the current 64 px height, keep the light-blue theme. Only the internals get real.

3. No changes to `SmartHeader`, `BottomDockGlass`, `ProfileMenu`, `LanguageToggle`, `QRShareSheet`, or any other consumer — they're reused as-is.

## Behavior after fix

- `/` and `/index`: only the white floating glass header, now fully functional (FR/EN, QR share sheet, real bell with unread dot, real profile menu / auth CTA, role-aware drawer).
- Any other route (dashboard, `/pro`, `/alex`, admin, etc.): unchanged — `SmartHeader` still renders.
- No double header anywhere. No CSS-only hiding. No dead spacing (removing `SmartHeader` on home actually frees ~48 px above the hero — the floating glass is already offset by its own `pt-4`).
- Bottom dock untouched.

## Verification

- Load `/index` on 384 px viewport → one header, white glass, all icons tappable.
- Toggle FR/EN → active side turns solid blue, page copy switches.
- Tap bell → routes to `/dashboard/notifications`; dot only appears if unread count > 0.
- Tap QR → `QRShareSheet` opens (same sheet as SmartHeader).
- Tap avatar while signed in → `ProfileMenu` opens with real routes; while guest → shows `Connexion` CTA to `/role`.
- Load `/dashboard` → `SmartHeader` still visible, no floating glass, no regression.
- `rg "SmartHeader"` still returns exactly its definition + one gated usage in `MainLayout`.

## Out of scope

- No new `GlobalHeader` file — reusing the existing `HeaderFloatingGlass` avoids a route-wide refactor and keeps blast radius to two files.
- No visual redesign of the glass panel — user asked to keep it as-is.
