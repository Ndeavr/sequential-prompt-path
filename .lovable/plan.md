## Problem

The site crashes globally to the `AppErrorBoundary` ("Une erreur est survenue") on every route, including mobile.

Root cause: `PersistentContractorCallPopup` uses `useLocation()` from `react-router-dom`, but in `src/app/App.tsx` it is rendered as a sibling of `<AppRouter />` — i.e. **outside** the `<BrowserRouter>` defined inside `AppRouter`. Calling `useLocation()` without a Router context throws synchronously, the error bubbles to `AppErrorBoundary`, and the entire app shows the error fallback.

## Fix

Move `<PersistentContractorCallPopup />` **inside** the Router so `useLocation()` has a valid context.

### Step 1 — `src/app/App.tsx`
Remove the popup from `App.tsx` (keep only `<AppRouter />` and debug HUDs that don't depend on Router, or also move them in).

```tsx
const App = () => (
  <AppErrorBoundary>
    <Providers>
      <AppRouter />
    </Providers>
  </AppErrorBoundary>
);
```

### Step 2 — `src/app/router.tsx`
Inside `AppRouter`, render the popup as a child of `<BrowserRouter>` (alongside `ScrollRestoration`, `BannerContinueFlow`, etc.), so it sits in Router context but outside `<Routes>`:

```tsx
<BrowserRouter>
  <ScrollRestoration />
  <PersistentContractorCallPopup />
  <Routes>...</Routes>
</BrowserRouter>
```

Also move `AlexRouterDebugHUD` and `AuthDebugHud` inside `BrowserRouter` if they use router hooks (verify quickly; if they don't, leave them where they are).

## Verification

- Reload `/` on mobile → homepage renders, no error boundary.
- Navigate between routes → popup still appears after 2.5s on non-blocked routes.
- No console error from `AppErrorBoundary`.
