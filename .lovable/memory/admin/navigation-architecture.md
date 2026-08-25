---
name: Admin Navigation Architecture
description: Operator-first admin nav — 5 primary destinations, Affiliés secondary, Operations/Avancé collapsed; router-level AdminProtectedRoute shell
type: feature
---
Admin nav is operator-first, NOT architecture-first. Five primary destinations only: Dashboard (/admin), Acquisition (/admin/acquisition), Entrepreneurs (/admin/contractors), Rendez-vous (/admin/appointments), Revenus (/admin/pricing). Prospecting/recruitment tools (Launch Control, War Room, First Dollar, Sniper, Prospects) live under Acquisition as tabs — never as primary items. Prospects stay under Acquisition, never under Entrepreneurs. Affiliés is a separated secondary group. All diagnostic/technical pages live in collapsed "Operations / Avancé" (6 groups: Alex & IA, Outbound avancé, Pipeline acquisition, Croissance & SEO, Contenu & dossiers, Système & diagnostics).

Implementation: `src/config/adminNav.ts` (adminSections with tabs+match patterns, adminSecondaryGroup, adminAdvancedGroups). Shell is applied at router level via `AdminProtectedRoute` (all 283 admin routes); AdminLayout is idempotent via AdminLayoutDepth context so self-wrapping legacy pages don't double-render. Sub-destinations render as `AdminSectionTabs` under the header; mobile uses `AdminBottomNav` dock (5 items) + drawer for secondary/advanced/search. Do not add new primary menu items — add tabs to an existing section or an advanced group.
