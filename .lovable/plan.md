ns issues found

Concrete bottlenecks observed in this codebase (not theory):

1. **`useProfile` is timing out at 5s on every cold load** — console shows repeated `PROFILE_FETCH_TIMEOUT`. The DB query itself runs in ~1ms (verified with `EXPLAIN ANALYZE`), so the request is hanging client-side. Root cause: `withTimeout` wraps `supabase.from(...).maybeSingle()` (a `PostgrestBuilder` thenable). Any guard that awaits `useProfile` blocks render for 5s. `OnboardingGuard` does exactly that — `profileLoading` keeps the whole app on the "Chargement…" screen.

2. **Global `Providers` mounts 3 heavy Alex/voice panels on every route** (`OverlayAlexVoiceFullScreen` = 843 lines, `AlexChatFallbackPanel`, `AlexVoiceDebugPanel`). They are imported eagerly so every page — including the homepage — pays for them in the initial JS bundle.

3. **`PageHomeSimple` wraps the homepage in `AlexProvider`** which boots the full Alex chat/voice machinery before any pixel is shown. The homepage hero/orb does not need Alex initialized to render.

4. **Sequential auth waterfall in `useAuth`**: profile auto-create runs an extra `select` then `insert` on every session change. The `user-role` query waits for session, then guards wait for both session+role+profile in series.

5. **Guards render full-screen "Chargement…" placeholders** instead of letting the layout/header paint. `AuthGuard`, `OnboardingGuard`, `RoleGuard`, `UniversalRouteGuard`, `LazyFallback` all return a centered spinner that replaces the entire viewport — this is what makes navigation feel frozen.

6. **`router.tsx` is 1421 lines of lazy imports** (good) but the eager imports at top (`HomeWithFeatureFlag`, `Home`, `ProtectedRoute`, `UniversalRouteGuard`, `BannerContinueFlow`, `AuthReturnRouter`, `AuthOverlayPremium`) pull in their transitive deps synchronously.

## Fix plan (in priority order)

### P0 — Unblock the render (biggest win)

- **`src/hooks/useProfile.ts`**: drop the `withTimeout` wrapper that's currently failing. Use plain `await supabase.from('profiles').select(...).maybeSingle()`, set `staleTime: 5 * 60_000`, `gcTime: 30 * 60_000`. Keep error path returning `null` so guards never block on it.
- **`src/guards/OnboardingGuard.tsx`**: stop blocking on `profileLoading`. Only block on `authLoading`. If profile is still loading, render children optimistically (the page's own data hooks will skeleton appropriately). Only redirect to `/onboarding` once profile has actually resolved AND `onboarding_completed === false`.
- **`src/hooks/useAuth.ts`**: move the "ensure profile exists" insert into a fire-and-forget background effect (already async, but currently runs a `select` first that races with `useProfile`). Switch to a single `upsert` with `onConflict: 'user_id', ignoreDuplicates: true` so it never blocks and never double-fetches.
- **All guard fallbacks** (`AuthGuard`, `OnboardingGuard`, `RoleGuard`, `UniversalRouteGuard`, `LazyFallback`): replace the full-screen "Chargement…" with a transparent skeleton that keeps `MainLayout` header visible. New shared component `src/components/loaders/RouteSkeleton.tsx` rendering header bar + content skeleton blocks.

### P1 — Cut the initial bundle

- **`src/app/providers.tsx`**: lazy-import `OverlayAlexVoiceFullScreen`, `AlexChatFallbackPanel`, `AlexVoiceDebugPanel` and wrap them in `<Suspense fallback={null}>`. They only need to mount after first paint — wrap in a `requestIdleCallback` mount gate so they don't compete with LCP.
- **`src/pages/PageHomeSimple.tsx`**: defer `AlexProvider` mount. Render `HeroAlexCentered` + `IntentChipsGrid` + `TrustPromiseCards` immediately; lazy-mount `AlexEmbeddedChat` (and its `AlexProvider`) after first paint via `requestIdleCallback` or `useEffect` + `Suspense`.
- **`src/app/router.tsx`**: convert remaining eager page imports (`Home`, `HomeWithFeatureFlag`, `FallbackRoutePage`) to lazy. Keep only `MainLayout` eager.

### P2 — Skeletons instead of spinners

- Reuse the existing `SkeletonArticleCard` pattern. Add:
  - `src/components/loaders/SkeletonList.tsx` (cards/lists)
  - `src/components/loaders/SkeletonDashboard.tsx` (KPI tiles)
  - `src/components/loaders/RouteSkeleton.tsx` (header + body)
- Replace `<div className="animate-pulse">Chargement…</div>` in: `AuthGuard`, `OnboardingGuard`, `RoleGuard`, `UniversalRouteGuard`, `LazyFallback`, and the partner pages.

### P3 — Parallelize data fetching

- Audit hooks that chain `await` on supabase queries inside `queryFn`. Convert to `Promise.all([...])`. Top offenders to inspect: `usePartnerCrm`, `useContractorDashboardData`, `useLeads`, `useProfile`+`useAuth` interaction.
- For paired queries (e.g. profile + role), use `useQueries` so they fire in parallel instead of one-after-the-other.

### P4 — Image/asset hygiene

- Add `loading="lazy"` and `decoding="async"` to `<img>` tags missing it (run `rg "<img " src` and patch).
- Verify hero images use `fetchpriority="high"` only on LCP image.

## Files to create/edit

Create:
- `src/components/loaders/RouteSkeleton.tsx`
- `src/components/loaders/SkeletonList.tsx`
- `src/components/loaders/SkeletonDashboard.tsx`

Edit:
- `src/hooks/useProfile.ts` (remove withTimeout, raise staleTime)
- `src/hooks/useAuth.ts` (upsert profile, no pre-select)
- `src/guards/OnboardingGuard.tsx` (don't block on profile)
- `src/guards/AuthGuard.tsx`, `src/guards/RoleGuard.tsx`, `src/guards/UniversalRouteGuard.tsx` (skeleton instead of spinner)
- `src/app/router.tsx` (lazy Home, skeleton fallback)
- `src/app/providers.tsx` (lazy + idle-mount Alex panels)
- `src/pages/PageHomeSimple.tsx` (defer AlexProvider/embedded chat)

## Success criteria

- Homepage paints header + hero in <200ms after JS executes (no waiting on auth).
- No more `PROFILE_FETCH_TIMEOUT` in console.
- Navigation between routes shows the layout instantly with a body skeleton, never a blank/spinner page.
- Initial JS bundle drops by removing eager Alex voice panels.
- Auth resolves in background; protected pages render skeleton during resolution rather than freezing.

Approve and I'll implement P0+P1+P2 in the next pass (highest-impact, ~7 files), then P3/P4 as a follow-up.
