# Admin Navigation Simplification v1

Today `src/layouts/AdminLayout.tsx` exposes ~60 admin links across 6 groups (Dashboard, Entrepreneurs, Alex, Acquisition, Revenus, Laboratoire). We'll restructure to the 6-section spec, default-collapse everything, hide engineering/experimental routes behind `System` and `Labs`, and add page-visit analytics that auto-recommend hiding low-traffic pages.

## 1. New top-level structure (6 sections, all collapsed by default)

Replace `navGroups` in `src/layouts/AdminLayout.tsx`:

1. **Business** — `Dashboard` (`/admin`), `Revenue` (`/admin/pricing`), `Appointments` (`/admin/appointments`)
2. **Contractors** — `Prospects` (`/admin/users`), `Qualification` (`/admin/verification`), `Activation` (`/admin/validation`), `Active Members` (`/admin/verified-contractors`), `All` (`/admin/contractors`)
3. **Growth** — `Campaigns` (`/admin/outbound`), `Emails` (`/admin/outbound/sequences`), `SMS` (`/admin/outbound/sms-fallback`), `Pipeline` (`/admin/outbound/ops`)
4. **Alex** — `AI Agents` (`/admin/agents`), `Knowledge Base` (`/admin/answer`)
5. **System** — `Alerts` (`/admin/alerts`), `Health` (`/admin/operations`), `Logs` (`/admin/outbound/logs`), `Settings` (`/admin/outbound/settings`), `Kill Switch` (`/admin/automation` — toggle to pause automations)
6. **Labs** (hidden, opt-in toggle) — every remaining `/admin/*` route, auto-collected from `routesConfig.ts` so nothing is lost

Verifies success criteria: revenue, activation, system status each reachable in ≤2 taps (section → item).

## 2. Default-collapsed + persistent state

- `NavGroupItem` already supports `open` state; change initial value to `false` for every group except the one matching the current `pathname`.
- Persist last-opened group in `localStorage("admin.nav.openGroup")` so power users keep their preferred section.
- Keep the existing search box — it filters across all sections including Labs.

## 3. Labs visibility toggle

- Add a small `Show Labs` switch at the bottom of the nav, stored in `localStorage("admin.nav.showLabs")`, default `false`.
- When off, the Labs group is completely hidden from the sidebar (still routable by direct URL).

## 4. Mobile-first layout

- Sidebar already collapses into a sheet on `<md`. Tighten so the 6 collapsed headers fit one screen: reduce row height to `h-9`, remove descriptions, ensure scroll only kicks in when a group is expanded.
- Bottom safe-area padding for iOS notch.

## 5. Page-visit analytics

**New table** (migration):
```
public.admin_page_visits(
  id uuid pk default gen_random_uuid(),
  admin_user_id uuid not null,
  path text not null,
  visited_at timestamptz default now()
)
```
- GRANT INSERT to `authenticated`, SELECT to `service_role`; RLS: admins only (`has_role(auth.uid(),'admin')`).
- Index on `(path, visited_at desc)`.

**Tracking hook** `src/hooks/useAdminPageTracking.ts`: mounted once in `AdminLayout`, fires an insert on every `pathname` change (debounced, only when path starts with `/admin`).

**New page** `/admin/nav-analytics` (added to System group):
- Read-only RPC `get_admin_page_stats(days int)` returning `path, visits_30d, last_visited`.
- Cards: **Top 10 most-used pages**, **Pages with <5 visits (recommend hiding)** with a one-click "Move to Labs" action that stores the override in `localStorage("admin.nav.hidden")` (client-side overlay, not a destructive change).

## 6. Files touched

- Edit `src/layouts/AdminLayout.tsx` — new `navGroups`, collapsed defaults, Labs toggle, mobile tightening.
- New `src/config/adminNav.ts` — exports the 6-section structure + auto-derived Labs list from `routesConfig.ts` to keep nav and routes in sync.
- New `src/hooks/useAdminPageTracking.ts`.
- New `src/pages/admin/AdminNavAnalytics.tsx` + route registration in `src/app/router.tsx` and `routesConfig.ts`.
- New migration `supabase/migrations/<ts>_admin_page_visits.sql`.

## 7. Out of scope

- No backend changes to existing admin pages.
- No deletion of routes — Labs preserves every existing path.
- No role/permission changes.

## Success check
- Visible top-level items reduced from ~60 to 6 collapsed headers (≥90% reduction).
- Activation, Revenue, Health all reachable in 2 taps.
- Mobile sheet shows all 6 sections without scrolling on a 384×720 viewport.
