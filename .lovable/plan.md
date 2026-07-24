## Scope

Wire the existing `funnel-audit-report` canary preview into `/admin/funnel-audit`. No new page, no new endpoint, no writes, no outreach.

## Files

**`src/hooks/useFunnelAudit.ts`** — extend the existing hook to optionally request the canary preview.
- Accept a second arg `{ canary?: boolean; canaryLimit?: number }`.
- When `canary` is true, append `&canary_preview=1&canary_limit=<n>` to the existing URL.
- Extend `FunnelAuditReport` type with an optional `canary_preview` field mirroring the edge function's response (`mode`, `limit`, `would_send_count`, `would_send[]`, `disclaimer`, optional `error`).
- Query key includes `canary` + `canaryLimit` so preview data caches separately from the default audit. `refetchInterval` stays 60s for the default; disable auto-refetch when canary is on.

**`src/pages/admin/AdminFunnelAudit.tsx`** — mobile-first button + inline result panel. No layout redesign.
- Add local state `previewOn` (default false).
- Add a full-width button "Aperçu 3 prospects réels" in the existing toolbar row (stacks above the day chips on mobile via `flex-wrap`). Click sets `previewOn = true` and triggers a second `useFunnelAudit(days, { canary: true, canaryLimit: 3 })` call. A "Masquer l'aperçu" button hides it.
- Render a new `<Card>` below the existing dropoff alert (only when `previewOn` and preview data exists) titled "Aperçu canary (lecture seule)" showing:
  - The disclaimer badge: **"NO SMS was sent"** (styled as amber pill).
  - `would_send_count` counter.
  - A vertical stack of lead cards (single column on mobile, 3 cols ≥md) rendering, per lead: business, city, category, phone, CASL evidence (source_url + retrieved_at + verification_method), prior contact status (from `last_sms_at`/`lead_status`), exclusion reason (if `error` present or lead is missing evidence), landing URL (`unpro.ca/r/<token>` when available, otherwise "—").
  - Empty state: "Aucun prospect éligible" if `would_send_count === 0`.
- No mutation, no side effect. Data pulled entirely from the existing edge function response.

## Backend

`supabase/functions/funnel-audit-report/index.ts` — read-only field additions inside `previewCanaryBatch` only, to expose `city`, `category`, `prior_contact_status`, `exclusion_reason`, `landing_url` from data already fetched by `v_commercial_send_eligibility` + one existing lookup. No new tables, no writes, no new routes. If any field is unavailable in the view, return `null`; the UI shows "—". Skip this change if all requested fields can be derived client-side from the current payload — decide during implementation after re-reading the view columns.

## Verification

1. `/admin/funnel-audit` loads unchanged when button not pressed (default audit table + KPIs intact, 60s auto-refresh preserved).
2. Tapping the button at 390px viewport reveals the preview card without horizontal scroll; three lead cards stack vertically; disclaimer is visible above the list.
3. Response payload confirms `disclaimer === "NO SMS was sent…"` and `would_send.length ≤ 3`.
4. No network calls to Twilio, Stripe, or write endpoints (verified via network panel).
5. Hiding the preview returns the page to its original state.

## Out of scope

Any change to outreach workers, cron jobs, other admin pages, styling tokens, or the funnel table logic.
