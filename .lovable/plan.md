

## Goal
Fix two regressions:
1. After login/signup the user lands on home (or a generic dashboard) instead of returning to the exact route they came from — including `/pricing/entrepreneurs`, `/checkout/native/:planCode`, calculator screens, etc.
2. Remove every stale plan reference (old Founder $1 997 lifetime price, hidden `pro` / `premium` / `elite` / `starter` legacy codes still listed in `plan_catalog`) so nothing in the UI ever shows pricing that doesn't match the live grid.

---

## Part 1 — Reliable auth return-to-route

### Root causes
- `OAuthButtons` calls `lovable.auth.signInWithOAuth` with `redirect_uri: window.location.origin`, so users always come back to `/` instead of `/auth/callback`. Nothing on `/` consumes `unpro_auth_intent`, so they sit at home.
- `LoginMagicLinkForm` redirects to `/auth/callback` (correct) but `AuthOverlayPremium` only persists `returnPath` when an overlay is opened with a `pendingAction`. If the user opens `/login` directly, intent is never saved.
- Home / dashboard never look at `consumeAuthIntent` on auth-state change.
- Magic links / OTP arriving in a fresh tab lose `sessionStorage` (it's per-tab); intent must also be persisted in `localStorage` as a short-lived fallback.

### Fixes
1. **`services/auth/authIntentService.ts`** — write intent to BOTH `sessionStorage` and `localStorage` (15 min TTL on the localStorage copy). `consumeAuthIntent` reads/clears from both. Add `captureCurrentRouteAsIntent(action?)` helper that snapshots `pathname + search + hash`.

2. **`hooks/useAuthOverlay.ts` → `openAuthOverlay`** — if no `returnPath` provided, default to current `location.pathname + search + hash` so we never lose context, and save intent eagerly (don't wait for the overlay's `useEffect`).

3. **`components/auth/OAuthButtons.tsx`** — before calling `lovable.auth.signInWithOAuth`, save intent (current path or pending overlay path) and change `redirect_uri` to `${window.location.origin}/auth/callback` so the dedicated callback handler resolves the redirect.

4. **`pages/AuthCallbackPage.tsx`** — already consumes intent; harden by reading the intent first (before any awaits) so it survives storage races; keep role-based fallback only when no intent.

5. **`hooks/useAuth.ts`** — on `SIGNED_IN` event, if the user is currently on `/`, `/login`, `/signup`, `/role`, `/start`, or `/auth/callback`, run `consumeAuthIntent()` and `navigate(intent.returnPath)` (using a tiny `authReturnNavigator` singleton wired in `App.tsx` so the hook can dispatch a navigation event picked up by a small `<AuthReturnRouter />` component mounted next to `<AuthOverlayPremium />`). This guarantees return-to-route works for OAuth, magic link, OTP, and whatever ends with `SIGNED_IN`.

6. **`components/auth/AuthOverlayPremium.tsx`** — on `SIGNED_IN` while open, close overlay and let the central handler navigate (no more reliance on each consumer page's `useEffect`).

7. **Verify pages already calling `consumeAuthIntent`** (`Login`, `Signup`, `StartPage`, `DashboardRedirectHandler`, `LoginPageUnpro`) keep working: the new central handler navigates first, but these pages' guards remain harmless (intent already consumed).

### Result
Whatever surface initiates auth — pricing card, checkout button, calculator, AIPP scan, Alex chat — the user always lands back on the exact URL they came from with original query string and hash preserved.

---

## Part 2 — Pricing audit & stale plan cleanup

### Database (migration)
Hard-delete obsolete plans from `plan_catalog` so nothing can resurface them by toggling `active = true`:
- `pro` (legacy, replaced by `pro_acq`)
- `premium` (legacy, replaced by `premium_acq`)
- `elite` (legacy, replaced by `elite_acq`)
- `starter` (legacy)
- `founder_lifetime` ($1 997 one-time, no longer public)

Final live catalog after migration:

```text
recrue       $149/mo   rank 0  hidden behind starter accordion
pro_acq      $349/mo   rank 1
premium_acq  $599/mo   rank 2  featured
elite_acq    $999/mo   rank 3
signature    $1799/mo  rank 4  contact / apply flow
```

### Code cleanup
- **`src/components/founder/FounderContent.tsx`** — remove the hard-coded "1 997 $" pricing block (lines 62-79). Replace with a private "Apply for Founder access" CTA pointing to `/contact?subject=founder`. Keep PIN-locked `/fondateur` route as invite-only.
- **`src/pages/LandingPageFounderPlansUNPRO.tsx` and `src/components/founder-plans/*`** — these read from `useFounderPlans()` (a separate Founder catalog, not `plan_catalog`). Audit: if any of those plans show $1 997 / lifetime references, remove that block too. Keep Élite/Signature Fondateur if still active in the founder funnel, otherwise remove the route from `router.tsx`.
- **`src/pages/entrepreneur/PageEntrepreneurPricing.tsx`** — no founder reference; OK.
- **`src/pages/pricing/ContractorPlans.tsx`** — update header comment (line 3) which still mentions "+ bloc Founder one-time scarcity"; remove the stale comment.
- **`PricingFaq.tsx` / `PricingCta.tsx`** — already cleaned in previous step; re-verify no Founder mention.
- **Alex pricing copy** — `src/services/alexResponsePolicyEngine.ts` and any `alex/*` files referencing plan names: ensure they only mention Recrue / Pro / Premium / Élite / Signature. No "Fondateur" in public Alex responses.

### Navigation safety
- Confirm `/checkout/native/pro_acq`, `/premium_acq`, `/elite_acq`, `/recrue` resolve via the existing checkout route and `create-subscription-intent` edge function.
- `/contact?subject=signature` and `/contact?subject=founder` route to existing contact form (already handled).

---

## Files to touch

```text
Auth return flow
  src/services/auth/authIntentService.ts          (extend storage + helper)
  src/hooks/useAuthOverlay.ts                     (eager save + default returnPath)
  src/hooks/useAuth.ts                            (central post-SIGNED_IN navigation)
  src/components/auth/OAuthButtons.tsx            (save intent + /auth/callback)
  src/components/auth/AuthOverlayPremium.tsx      (close on SIGNED_IN, no own nav)
  src/app/App.tsx                                 (mount <AuthReturnRouter />)
  src/components/auth/AuthReturnRouter.tsx        (NEW — listens & navigates)
  src/pages/AuthCallbackPage.tsx                  (read intent first)

Pricing cleanup
  supabase migration                              (delete 5 stale plan rows)
  src/components/founder/FounderContent.tsx       (remove $1997 block)
  src/pages/pricing/ContractorPlans.tsx           (header comment)
  src/services/alexResponsePolicyEngine.ts        (verify plan copy)
  src/pages/LandingPageFounderPlansUNPRO.tsx +
    src/components/founder-plans/*                (audit & strip stale prices)
```

---

## Out of scope
- No new auth provider, no Stripe price changes, no new routes added.
- Founder funnel stays invite-only; not deleted unless it surfaces stale prices.

