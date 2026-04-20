

# Plan: TEST/LIVE Mode Toggle for UNPRO Admin

Add a global environment switch that controls whether the outbound system runs in safe TEST mode (dry-run, mocked sends) or LIVE PRODUCTION mode (real inboxes, real prospects, real sends), with a kill switch and live KPI banner visible across all admin pages.

## What gets built

### 1. Database (1 new table + extends existing settings)
- New table `system_environment_state` (single row): `mode` (`test`|`live`), `activated_at`, `activated_by`, `kill_switch_active` (bool), `paused_at`, `paused_by`, `live_requires_approval` (bool, default true), `notes`.
- Extend `outbound_global_settings` read path so existing safety controls (bounce thresholds, dedupe windows) are surfaced in the LIVE banner.
- RLS: only `admin` role can SELECT/UPDATE; audit row inserted into `system_events` on every mode change.

### 2. Edge functions (2 new + guards on existing)
- `fn-toggle-system-mode`: validates admin, flips `mode`, writes audit event, returns new state. Refuses to flip to LIVE if domain health is `critical` or no active mailbox exists.
- `fn-kill-switch-pause`: instantly sets `kill_switch_active=true`, marks all `automation_schedules` to `paused`, cancels queued `automation_jobs` (status `running|queued` → `paused`), logs to `system_events`.
- Guard injected into existing send/queue functions (`process-outbound-queue`, `fn-send-outbound-email`, scraping triggers): early-return with `{skipped:true, reason:"test_mode"}` when `mode=test` OR `kill_switch_active=true`. No refactor — single helper `assertLiveMode()` added at top of each.

### 3. UI components (new)
- `BannerSystemEnvironmentStatus` — sticky top banner across `AdminLayout`. Red gradient + pulse when LIVE, green muted when TEST. Shows: mode pill, send volume today / daily cap, domain reputation badge, bounce rate %, failures (24h), kill-switch state.
- `ButtonGoLiveNow` — large primary CTA in banner when in TEST mode.
- `ModalConfirmGoLive` — pre-flight checklist (domain health ✓, mailboxes warm ✓, approval queue empty or acknowledged ✓, safety thresholds set ✓), typed confirmation "ACTIVER LIVE", then calls `fn-toggle-system-mode`.
- `ButtonKillSwitch` — always visible in banner; red, requires single confirm, calls `fn-kill-switch-pause`.
- `PanelLiveKPIs` — expandable drawer from banner showing: emails sent today, scheduled next 24h, bounces, complaints, replies, queue depth, last successful send timestamp, active mailboxes status.

### 4. Admin page
- `/admin/system-mode` — full control center: current state card, history of mode changes (from `system_events`), pre-flight checklist with live status, GO LIVE / RETURN TO TEST buttons, kill switch with reactivation control, approval-required toggle.

### 5. Approval gate enforcement
- When `live_requires_approval=true` AND `mode=live`, every outbound send batch checks `outbound_prospects.approval_status='approved'` before dispatch (re-uses existing approval gate from `mem://marketing/outbound-prospect-approval-gate`).

## Files

**New**
- `supabase/migrations/<ts>_system_environment_state.sql`
- `supabase/functions/fn-toggle-system-mode/index.ts`
- `supabase/functions/fn-kill-switch-pause/index.ts`
- `src/hooks/useSystemEnvironment.ts`
- `src/components/admin/system/BannerSystemEnvironmentStatus.tsx`
- `src/components/admin/system/ModalConfirmGoLive.tsx`
- `src/components/admin/system/ButtonKillSwitch.tsx`
- `src/components/admin/system/PanelLiveKPIs.tsx`
- `src/pages/admin/system/PageSystemModeControlCenter.tsx`

**Edited (minimal — guard injection only, no refactor)**
- `src/layouts/AdminLayout.tsx` — mount `BannerSystemEnvironmentStatus` at top.
- `src/config/routeRegistry.ts` — register `/admin/system-mode` (admin only).
- `supabase/functions/process-outbound-queue/index.ts` — call `assertLiveMode()` first.
- `supabase/functions/fn-send-outbound-email/index.ts` — call `assertLiveMode()` first.
- Existing scraping/automation triggers — same one-line guard.

## Visual states

```text
┌──────────────────────────────────────────────────────────────┐
│ 🟢 TEST MODE  •  0 envois réels  •  Sécurisé    [GO LIVE NOW]│   ← green muted
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 🔴 LIVE  •  47/500 envoyés  •  Rep: 98  •  Bounce 0.8%       │   ← red, pulsing
│        •  ▼ KPIs    [PAUSE TOUT — KILL SWITCH]               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ ⏸ PAUSED (Kill Switch)  •  Activé il y a 3min   [REPRENDRE]  │   ← amber
└──────────────────────────────────────────────────────────────┘
```

## Revenue impact
Unblocks real outbound from the 10 Laval sniper pages → first paid conversions same day. Kill switch + approval gate protect domain reputation so volume can scale without burning `mail.unpro.ca`.

## Out of scope (next ship)
- Per-campaign mode override (everything is global for now).
- Auto-rollback to TEST on bounce-rate spike (next iteration).

