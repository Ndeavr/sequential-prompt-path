

# Plan: Outbound Admin Navigation + Missing Connections

## Problem
All 22 outbound admin pages exist and are routed, but **none are accessible from the admin sidebar**. The `AdminLayout.tsx` nav has no "Outbound" group — users can only reach these pages by typing URLs directly.

## What to Build

### 1. Add Outbound Navigation Group to AdminLayout
Add a collapsible "Outbound" section in `src/layouts/AdminLayout.tsx` with organized sub-items:

**Core Operations**
- `/admin/outbound` — Dashboard
- `/admin/outbound/leads` — Prospects
- `/admin/outbound/campaigns` — Campagnes

**Pipeline & Ops**
- `/admin/outbound/ops` — Centre Ops
- `/admin/outbound/verification` — Vérification
- `/admin/outbound/tests` — Tests manuels
- `/admin/outbound/automations` — Automatisations
- `/admin/outbound/logs` — Logs

**Email Engine**
- `/admin/outbound/sequences` — Séquences
- `/admin/outbound/sequences-elite` — Séquences AIPP
- `/admin/outbound/mailboxes` — Boîtes d'envoi
- `/admin/outbound/sending-architecture` — Architecture
- `/admin/outbound/email-health` — Santé Email
- `/admin/outbound/deliverability` — Délivrabilité

**Intelligence**
- `/admin/outbound/ai-rewrite` — Personnalisation IA
- `/admin/outbound/revenue` — Revenue Loss
- `/admin/outbound/sms-fallback` — SMS Fallback
- `/admin/outbound/analytics` — Analytics
- `/admin/outbound/suppressions` — Suppressions
- `/admin/outbound/settings-lite` — Settings

### 2. Collapsible Nav Group Component
Create a reusable `NavGroup` component with expand/collapse so the sidebar stays manageable. The outbound section will be collapsed by default and expand on click. Auto-expand when user is on an `/admin/outbound/*` route.

### 3. Wrap Outbound Pages in AdminLayout
Several outbound pages (e.g., `PageOutboundSequencesElite`, `PageOutboundSendingArchitecture`, `PageOutboundAIRewrite`) render standalone without `AdminLayout`. Wrap them so the sidebar is always visible.

## Files to Change
- `src/layouts/AdminLayout.tsx` — Add collapsible Outbound nav group with sub-items
- ~6 outbound pages — Wrap in `<AdminLayout>` if not already wrapped

## Technical Details
- Use `ChevronDown`/`ChevronRight` icons for collapse state
- Use `useLocation()` to auto-expand when on `/admin/outbound/*`
- Keep existing nav items unchanged — only add the new group below them
- Mobile: sub-items render inline in the mobile menu drawer

