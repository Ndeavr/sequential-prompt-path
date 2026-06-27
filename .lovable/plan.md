## Problem

`unpro.ca/pro/dashboard` shows "Lien expiré". Root cause: the route `/pro/:slug` (PageProLandingNuclearClose) is declared **before** `/pro` (ProDashboard) and captures `dashboard` as a prospect slug. Since no prospect named "dashboard" exists, it falls through to the not-found state ("Lien expiré").

Three places in the app navigate to the wrong path `/pro/dashboard` instead of the canonical `/pro`:
- `src/components/home-unicorn/BottomDockGlass.tsx:36` — "Tableau" dock link
- `src/pages/checkout/PageCheckoutSuccess.tsx:274`
- `src/pages/checkout/PageActivationStart.tsx:209`

The selftest / outreach links land on `/pro/{slug}` which is correct — the bug is only triggered by internal navigations writing `/pro/dashboard`.

## Fix

1. **Repoint internal navigations** from `/pro/dashboard` → `/pro` in the three files above (canonical dashboard route per `ROUTES.PRO_DASHBOARD = "/pro"`).
2. **Add a reserved-slug guard** in `PageProLandingNuclearClose.tsx`: when `slug` matches a reserved word (`dashboard`, `profile`, `leads`, `appointments`, `reviews`, `billing`, `territories`, `documents`, `account`, `aipp-score`, `domain-intelligence`), `<Navigate to="/pro" replace />` before attempting prospect lookup. This protects against any future accidental link.
3. **No router order change** — the `/pro/:slug` route stays where it is; the guard handles the collision deterministically without breaking real prospect slugs.

## Verification

- Click "Tableau" in the bottom dock → lands on `/pro` ProDashboard, not "Lien expiré".
- Visiting `/pro/dashboard` directly → redirects to `/pro`.
- Visiting a real prospect URL like `/pro/toitures-lb-laval?t=xxx` → still renders the personalized landing.
