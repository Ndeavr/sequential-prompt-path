# Lock Contractor Search to Admin — Remove Public Links

The screenshot shows `/search` (`src/pages/Search.tsx` — "Trouver un entrepreneur" with name/city/specialty filters). Per the new rule: searches happen via Alex voice/chat only. The page must be admin-only and every public link removed.

## Changes

### 1. Gate the route (admin only)
`src/app/router.tsx` line 708:
```tsx
<Route path="/search" element={
  <ProtectedRoute requiredRole="admin"><Search /></ProtectedRoute>
} />
```

### 2. Remove every `/search` link from public surfaces

**Navigation config** — `src/config/navigationConfig.ts` lines 25, 68–69, 204, 239, 293, 325, 361, 413, 440: delete these entries (they appear in homeowner, contractor, manager, public menus). Where removal would empty a section, drop the section.

**SEO / public pages** — replace `<Link to="/search">…</Link>` and CTAs with the Alex orb trigger (button that opens Alex voice/chat) or simply remove:
- `src/pages/CommentCaMarchePage.tsx` line 129 — drop the breadcrumb/CTA item
- `src/pages/CityServicePage.tsx` lines 85, 137 — replace card link & breadcrumb with Alex CTA
- `src/pages/EntretienPreventifPage.tsx` line 82 — change `primaryCta` to "Parler à Alex" → opens Alex
- `src/pages/EnergyPage.tsx` lines 232, 386 — replace CTA buttons with Alex trigger
- `src/pages/HomeownersPage.tsx` line 420 — replace with Alex CTA
- `src/pages/PreventiveMaintenancePage.tsx` line 505 — replace with Alex CTA
- `src/pages/seo/VillePage.tsx` line 223 — switch `SeoCta` to Alex (drop `searchUrl` prop)
- `src/pages/seo/SolutionPage.tsx` line 150 — replace
- `src/pages/seo/RefusalSeoPage.tsx` line 151 — drop `searchUrl`
- `src/pages/seo/PropertyTypeProblemPage.tsx` line 120 — replace
- `src/pages/TransformationDetailPage.tsx` line 210 — replace

**Contractor profile internals** (`src/pages/ContractorProfile.tsx` lines 217, 332, 1177, 1186): these are back-links inside an already-admin-relevant flow — change "Retour à la recherche" to "Retour" → `navigate(-1)`; remove "Comparer" link; the auth-redirect link (1186) becomes a plain "Voir le profil" without `/search`.

**QR / config** — `src/config/qrIntents.ts` line 95: change destination to `/` (Alex orb on home).

### 3. Keep registry entry but mark admin
`src/config/routeRegistry.ts` line 25: change `allowedRoles: "public"` → `allowedRoles: ["admin"]`, `requiresAuth: true`.

### 4. Admin entry point
Add `/search` to admin sidebar (`src/config/navigationConfig.ts` admin section) labeled "Recherche entrepreneurs (admin)" so admins can still reach it.

### 5. Pages preserved
No edits to: `Search.tsx` itself, admin pages (`AdminLocalSeo`, `AdminTerritories`, `AdminContractors`, etc. — those use their own "Toutes les villes" filters internally, unrelated).

## Success
- Visiting `/search` while non-admin → redirects to home (per `ProtectedRoute`).
- No "Trouver un entrepreneur" / "Voir les entrepreneurs" link visible anywhere on public, homeowner, or contractor surfaces.
- All previous CTAs that pointed to `/search` now open Alex (voice or chat).
- Admins still have a sidebar shortcut to `/search`.
