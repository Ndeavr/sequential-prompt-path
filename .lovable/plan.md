## Root cause

The home page is blank (logo included) because `AppErrorBoundary` catches a fatal React error and unmounts the tree. The error originates in `src/pages/admin/AdminDashboard.tsx`:

```
Rendered more hooks than during the previous render.
  at useMemo (AdminDashboard.tsx:126)
```

The component returns early on loading **before** calling `useMemo`:

```tsx
if (sL) return <AdminLayout><LoadingState /></AdminLayout>;  // line 55
...
const greeting = useMemo(...);                                // line 58 — skipped on first render
```

First render (`sL = true`) → 4 hooks. Next render (`sL = false`) → 5 hooks → crash → boundary swallows the whole app.

The logged-in user has the `admin` role (visible in console), so `AdminDashboard` is being mounted (lazy prefetch / background route), which is enough to trigger the boundary.

The logo asset itself is fine: `src/assets/unpro-wordmark-chrome.png` is a valid 1536×1024 PNG, correctly imported in `SmartHeader.tsx`. It will render again once the app stops crashing.

## Fix (single file)

`src/pages/admin/AdminDashboard.tsx` — move every hook above the early return:

```tsx
const AdminDashboard = () => {
  const { user } = useAuth();
  const { data: stats, isLoading: sL } = useAdminStats();
  const { data: recent } = useAdminRecentActivity();
  const { data: blockers = [] } = useBlockers("open");
  const { data: actions = [] } = useActionLogs();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
  }, []);

  if (sL) return <AdminLayout><LoadingState /></AdminLayout>;

  const critical = blockers.filter(b => b.severity_level === "critical");
  // ... rest of the component unchanged
};
```

No other file changes. No logic, styling, or data changes.

## Verification

1. Reload `/index` — header logo (chrome wordmark) renders.
2. Navigate to `/admin` — dashboard loads without the "Rendered more hooks" runtime error.
3. Console no longer shows `AppErrorBoundary` catching the hooks error.

## Out of scope

- PNG optimisation (the 2.1 MB wordmark could be re-exported as ~80 KB WebP later for mobile LCP, but it is not the cause of the blank screen).
- Any other admin/header refactor.
