

# Module36hRevenueStrikeEngine — Plan

## Overview

War room dashboard for a 36-hour revenue sprint. Admin launches a strike session, the system tracks extraction, email sends, engagement, Alex conversions, and payments in real-time with a countdown timer and live feed.

## Phase 1 — Database Migration (5 tables)

```sql
strike_sessions    — id, start_time, end_time, target_conversions, actual_conversions, status (pending/active/critical/success/closed)
strike_targets     — id, session_id FK, contractor_id, priority_score, engagement_level, status (new/contacted/hot/converted/lost)
strike_events      — id, session_id FK, type (email_sent/opened/clicked/replied/alex_triggered/converted), contractor_id, metadata jsonb, created_at
strike_adjustments — id, session_id FK, type, previous_value, new_value, impact_score, created_at
strike_results     — id, session_id FK, total_emails_sent, total_opened, total_clicked, total_replied, total_converted, revenue_generated, created_at
```

RLS: admin-only via `has_role(auth.uid(), 'admin')`. Enable realtime on `strike_events`.

## Phase 2 — Edge Functions (2)

**`start-strike-session`** — Creates session row with 36h window, seeds `strike_targets` from top-scored `contractor_prospects`, returns session_id.

**`update-strike-metrics`** — Aggregates `strike_events` into `strike_results`, detects hot leads (opened+clicked), inserts auto-adjustments if metrics are below threshold.

No new extraction/email functions — reuses existing outbound pipeline functions.

## Phase 3 — Hook

**`src/hooks/useStrikeDashboard.ts`** — Queries all 5 tables filtered by active session. Subscribes to realtime on `strike_events`. Provides `startStrike`, `closeStrike`, `triggerAdjustment` mutations.

## Phase 4 — Components (9)

All in `src/components/strike/`:

| Component | Purpose |
|-----------|---------|
| `Countdown36hTimer` | Animated countdown with color transitions (green→orange→red) |
| `Dashboard36hStrikeKPI` | 6 KPI cards (sent, opened, clicked, replied, converted, revenue) |
| `FeedLiveRecruitmentEvents` | Real-time scrolling event feed (trading desk style) |
| `CardHotProspect` | Glowing card for high-engagement prospects with "INTERVENIR" CTA |
| `PanelConversionOpportunities` | Sorted list of hot leads ready for Alex push |
| `WidgetEmailPerformanceLive` | Open/click/reply rates with mini progress bars |
| `PanelAlexConversionControl` | Trigger Alex intervention on specific prospects |
| `AlertCriticalBlocker` | Red alert banner for blockers (low open rate, SMTP issue) |
| `HeroSection36hStrike` | Launch/status hero with big CTA button |

## Phase 5 — Pages (3)

| Route | Page | Content |
|-------|------|---------|
| `/admin/36h-strike-dashboard` | Main war room | Hero + Countdown + KPIs + Hot prospects + Email perf |
| `/admin/strike-live-feed` | Live feed | Full-screen event stream + conversion opportunities |
| `/admin/strike-adjustments` | Adjustment log | Table of all adjustments made + impact scores |

All wrapped in `AdminLayout`.

## Phase 6 — Routing

Add 3 routes to `router.tsx` under admin lazy imports.

## File Changes

| Action | File |
|--------|------|
| Create | Migration SQL (5 tables + realtime) |
| Create | `supabase/functions/start-strike-session/index.ts` |
| Create | `supabase/functions/update-strike-metrics/index.ts` |
| Create | `src/hooks/useStrikeDashboard.ts` |
| Create | 9 components in `src/components/strike/` |
| Create | `src/pages/admin/PageAdmin36hStrikeDashboard.tsx` |
| Create | `src/pages/admin/PageAdminStrikeLiveFeed.tsx` |
| Create | `src/pages/admin/PageAdminStrikeAdjustments.tsx` |
| Modify | `src/app/router.tsx` |

## Constraints

- Reuses existing outbound pipeline (no duplication of email/extraction logic)
- Admin-only RLS
- Realtime subscriptions for live feed
- Dark premium theme, mobile-first
- Does not modify existing modules

