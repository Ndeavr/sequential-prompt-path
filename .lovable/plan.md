# SMS Infrastructure — Observable, Verifiable, Self-Diagnosed

## Goal
No "migration complete" claim until a real SMS traverses the full chain: queued → sent → delivered → callback → timeline → dashboard. The system must be observable, auto-diagnosed, and gate outbound agents on health.

## 7 phases

### Phase 1 — Global status (block false positives)
Add `SMS Infrastructure Status` resolver (DB view + edge function) returning `HEALTHY | WARNING | ERROR` with reasons:
- HEALTHY: callback URL set + test SMS <24h + callback received + delivery received
- WARNING: callback set but no real test in 24h
- ERROR: no callback ever / missing URL / delivery rate below threshold

Surface as banner at top of admin dashboard (`AdminDashboard` shell).

### Phase 2 — `/admin/sms-health` upgrades
Already exists — extend with cards:
- Twilio Messaging Service SID (from env probe)
- Active callback URL (env-derived)
- Last callback received / delivered / failed (`sms_events_v2`)
- Avg delivery time, 24h delivery rate, reply rate
- Callback Status traffic light (green <1h, orange <24h, red none)

### Phase 3 — E2E automatic test
`sms-admin-test` already exists. Add:
- `sms_test_runs` table (id, phone, message_sid, queued_at, sent_at, delivered_at, callback_received, success, error)
- Update edge function to insert/update this row at each stage
- UI button "Tester l'infrastructure SMS" with live status streaming via realtime / polling
- Persist last successful test for status calculation

### Phase 4 — Unified timeline
- New `timeline_events` table (entity_type, entity_id, kind, payload, occurred_at) — generic
- Trigger on `sms_events_v2` status changes → insert into `timeline_events` with kinds: `sms_queued|sms_sent|sms_delivered|sms_failed|sms_replied`
- `ContractorCommsTimeline` already mounted — extend the RPC `get_contractor_comms_timeline` to merge `timeline_events`

### Phase 5 — Autodiagnostic
Edge function `sms-infrastructure-audit`:
- Twilio SID present, Auth Token present, Messaging Service present
- Callback URL configured (probe Twilio service)
- `twilio-status-v2` edge fn reachable (HEAD)
- `sms_events_v2` insert smoke test
- Last callback <24h, 24h delivery rate >90%
Returns `score 0–100` + checklist. Display on `/admin/sms-health`.

### Phase 6 — Gate autonomous outbound agents
Shared helper `assertSmsHealthy()` in `_shared/smsHealth.ts`. Inject at entry of:
- `agent-send-outreach`
- `acquisition-autopilot`
- `growth-outreach-agent`
- `launch-agent-outreach`
If status ≠ HEALTHY → abort with structured response: `"Outbound bloqué. Aucun test SMS valide dans les dernières 24 heures."` + log to `platform_operation_outcomes`.

### Phase 7 — Real KPIs
Today + 7-day chart on `/admin/sms-health`:
- Sent, delivered, failed, replies, reply rate
- Twilio cost (price from `sms_events_v2.price` if present, else estimate $0.0079/SMS)
- Cost per reply, cost per activated contractor (join `contractor_activation_events`)
Use Recharts line chart.

## Production-ready badge
Computed status component `<SmsProductionReadyBadge />`:
- Renders ✅ "SMS Infrastructure Production Ready — validé le {timestamp}" only when all 7 conditions pass (callback configured, last test success, queued/sent/delivered timestamps recorded, timeline event exists, dashboard refreshed within 5m).
- Otherwise renders the failing checklist.

## Files

### Migration (single)
- `sms_test_runs` table + grants + RLS (admin only) + service_role insert
- `timeline_events` table + grants + RLS + indexes (entity_type, entity_id, occurred_at)
- Trigger `sms_events_v2_to_timeline` on insert/update
- View `v_sms_infrastructure_status` returning `status, reason, last_test_at, last_callback_at, delivery_rate_24h, reply_rate_24h`
- View `v_sms_kpi_today`, `v_sms_kpi_7d`
- Function `sms_infrastructure_score()` returning jsonb checklist + score

### Edge functions
- `sms-admin-test/index.ts` — extend to write `sms_test_runs`
- `sms-infrastructure-audit/index.ts` — new
- `_shared/smsHealth.ts` — new (`assertSmsHealthy`, `getSmsStatus`)
- 4 agents above — inject gate

### Frontend
- `src/pages/admin/PageSmsHealth.tsx` — add cards, audit, KPI charts, test runner with live progression
- `src/components/admin/SmsInfrastructureBanner.tsx` — new, mount in admin layout
- `src/components/admin/SmsProductionReadyBadge.tsx` — new
- `src/components/admin/SmsAuditChecklist.tsx` — new
- Extend `ContractorCommsTimeline` source to merge `timeline_events`

## Constraints
- No "migration complete" until live test passes all 7 steps; badge gates the claim.
- All new DB objects get GRANTs + RLS in the same migration.
- Edge functions go through `_shared/twilioSend.ts` only.
- Charts: shadcn + recharts.

## Open question
The plan is large (1 migration + 1 new edge fn + 4 agent edits + ~6 UI files). I'll execute it as one batch (migration first, then code). Confirm and I ship.
