A — PROMPT LOVABLE FINAL

1. CONTEXT
Build only the acquisition repair system required to reach the first paid 1$ contractor activation.

Confirmed current state from backend data:
- `acquisition_pipeline_events` = 0 total.
- `verified_contractor_prospects` = 1 total.
- `acquisition_queue.ready_sms` = 1, but `send-verified-batch` returns 0 eligible because the only prospect is already marked `outreach_status = sent`.
- Google Business / RBQ / Website / Facebook show 0 because the dashboard reads event counts, and no source events exist.
- The current worker does not scrape. It only enqueues existing verified prospects and triggers SMS when ready exists.
- No source health state exists, so a dead scraper appears as `0` instead of `SCRAPER DOWN`.

2. OBJECTIVE
Implement a self-healing acquisition engine that detects dead sources, diagnoses funnel blockers, repairs/retries automatically, imports contractors fast, and tracks progress to:

```text
Found Leads > 0
SMS Sent > 0
Clicks > 0
Paid Contractors > 0
First appointment generated
```

3. USERS
- Admin only.
- Acquisition operator.
- Founder / revenue owner.

4. DELIVERABLES

Backend/database:
- Create `acquisition_source_health`.
- Create `acquisition_dead_queue_alerts`.
- Create `acquisition_daily_audits`.
- Create `acquisition_manual_import_batches`.
- Create `acquisition_manual_import_rows`.
- Create views:
  - `v_acquisition_source_health`
  - `v_acquisition_diagnostics_funnel`
  - `v_first_dollar_tracker`
  - `v_acquisition_dead_queue`

Functions:
- Refactor `acquisition-queue-worker` into source-aware acquisition loop.
- Create `daily-acquisition-audit`.
- Create `import-contractors`.
- Add/extend fallback acquisition inside worker using validated query packs when a source returns 0 for 24h.
- Add `EdgeRuntime.waitUntil` for background repair/retry work.

Admin UI:
- Replace current source cards on `/admin/acquisition-pipeline` with source health cards.
- Create `/admin/acquisition-diagnostics`.
- Create `/admin/import-contractors`.
- Add `First Dollar Tracker` widget.

5. LOGIC

Acquisition Source Health:
- Track each source: `google_business`, `rbq`, `facebook`, `website`, `manual`.
- Store:
  - `status`: `healthy | degraded | scraper_down | fallback_running`
  - `last_run_at`
  - `last_success_at`
  - `found_last_run`
  - `found_24h`
  - `consecutive_zero_runs`
  - `last_error_code`
  - `last_error_message`
- UI rule:
  - If source has no recent run or failed run, show `SCRAPER DOWN`.
  - Never display a silent `0` for a dead source.

Funnel Diagnostics:
- Build the canonical funnel:

```text
Found → Enriched → Validated → SMS Ready → Contacted → Clicked → Activated → Paid
```

- Display counts and conversion percentage between every step.
- Read from real tables only:
  - found/enriched/validated from acquisition events + verified prospects.
  - SMS ready from acquisition queue + eligibility fields.
  - contacted from SMS logs/outreach status.
  - clicked from click tracking tables.
  - activated from activation/account events.
  - paid from 1$ payment/activation tables.

Dead Queue Detector:
- Every worker run scans validated leads/prospects where:
  - verified/validated = true
  - SMS/email not sent
  - age > 30 minutes
- Create `OUTREACH_BLOCKED` alert with root cause:
  - `missing_phone`
  - `missing_email`
  - `missing_website`
  - `eligibility_mismatch`
  - `queue_state_mismatch`
  - `send_function_error`
  - `missing_message_token`
  - `provider_blocked`

Auto Recovery:
- If a source returns 0 for 24h, set source to `fallback_running` and run fallback query packs:
  - categories: isolation, roofing, electrician, plumber, hvac, painting, landscaping
  - cities: Laval, Montreal, Longueuil, Terrebonne, Repentigny, Mirabel, Blainville, Mascouche
- Populate the acquisition queue automatically.
- Emit `scraped`, `enriching`, `enriched`, `verified`, `ready_sms`, `rejected`, `worker_cycle` events.
- Keep running even if one source fails.

Manual Import Acceleration:
- `/admin/import-contractors` accepts CSV, Excel, copy/paste.
- Required columns:
  - Company
  - Contact
  - Phone
  - Email
  - Website
  - City
  - Category
- On import:
  - normalize phone/email/website/city/category
  - upsert into verified prospects or contractor lead table
  - enrich from website when available
  - compute eligibility
  - queue for outreach
  - trigger send automatically if eligible
- No extra admin click after import submit.

Revenue Mode:
- First Dollar Tracker displays timestamps for:
  - First SMS Sent
  - First Click
  - First Activation
  - First 1$ Payment
  - First Appointment
- If any milestone is missing, show the exact blocking step and next automatic repair.

Daily Self Audit:
- `daily-acquisition-audit` runs every morning.
- Checks:
  - source health
  - enrichment health
  - validation health
  - SMS health
  - click tracking
  - payment activation
- Produces score:
  - `98/100 Healthy`
  - `42/100 Critical Failure`
- Stores root causes and recovery actions.

6. DATA

Create migration with explicit grants and admin-only RLS for:
- `acquisition_source_health`
- `acquisition_dead_queue_alerts`
- `acquisition_daily_audits`
- `acquisition_manual_import_batches`
- `acquisition_manual_import_rows`

Update views:
- Fix `v_acquisition_coverage.ready_count` to include `acquisition_queue.state IN ('ready_sms','ready_email')`, not only prospect `outreach_status`.
- Add source health view so UI separates `0 found` from `source not running`.
- Add diagnostics funnel view with step-to-step conversion.

7. UI/UX

Keep dark admin theme.
No redesign beyond required diagnosis.
No animations.
No decorative dashboard work.

Replace source cards with:

```text
Source | Status | Last Run | Found | Error
```

Status labels:
- `HEALTHY`
- `DEGRADED`
- `SCRAPER DOWN`
- `FALLBACK RUNNING`

Create `/admin/acquisition-diagnostics`:
- Funnel table with counts and conversion %.
- Root-cause panel.
- Dead queue alerts.
- First Dollar Tracker.

Create `/admin/import-contractors`:
- Paste area + file upload.
- Column mapping preview.
- Import progress.
- Auto-validate/enrich/queue/send result.

8. COMPONENTS

Build or refactor:
- `AcquisitionSourceHealthTable`
- `AcquisitionDiagnosticsFunnel`
- `DeadQueueAlertsPanel`
- `FirstDollarTracker`
- `DailyAuditScoreCard`
- `ImportContractorsPanel`
- `ImportPreviewTable`
- `ImportRunProgress`

9. ACTIONS

Implement functions/actions:
- `scan_source_health`
- `mark_scraper_down`
- `run_fallback_acquisition`
- `detect_dead_queue`
- `repair_queue_state`
- `compute_acquisition_funnel`
- `import_contractors`
- `auto_validate_imported_contractor`
- `auto_queue_imported_contractor`
- `auto_send_imported_contractor`
- `run_daily_acquisition_audit`

10. CONSTRAINTS

- No unrelated acquisition feature.
- No dashboard redesign beyond diagnostic replacement.
- No animations.
- No fake counts.
- No silent zeros.
- No manual “test this” workflow.
- No stopping because one source or SMS provider returns unknown.
- Keep using existing acquisition tables and functions where possible.
- Use backend migrations for schema changes.
- Add grants and RLS to every new table.
- Use protected backend functions for service-level writes.
- Do not expose secret keys in client code.

11. SUCCESS

Done when backend and UI prove:
- At least one source reports real health or `SCRAPER DOWN` with root cause.
- `/admin/acquisition-diagnostics` shows conversion between every funnel step.
- Dead validated prospects older than 30 minutes create `OUTREACH_BLOCKED` alerts.
- A manual import can validate, enrich, queue, and attempt send without extra clicks.
- Daily audit stores a health score and root causes.
- First Dollar Tracker shows exact missing milestone.
- The system no longer displays silent `0` when acquisition is actually broken.

12. TASKS

1. Create backend migration for source health, dead queue alerts, audits, import batches/rows, and diagnostic views.
2. Refactor `acquisition-queue-worker` so it runs source health checks, dead queue detection, fallback acquisition, queue repair, and event logging.
3. Create `daily-acquisition-audit` function with health score and root-cause output.
4. Create `import-contractors` function for CSV/Excel/copy-paste ingestion, validation, enrichment, queuing, and send trigger.
5. Replace `/admin/acquisition-pipeline` source cards with the source health table and First Dollar Tracker.
6. Create `/admin/acquisition-diagnostics` with funnel conversion, blocker panel, audit score, and dead queue alerts.
7. Create `/admin/import-contractors` with upload/paste import and automated processing.
8. Deploy functions and validate through backend function calls and database reads.
9. Confirm the next live state clearly shows either active lead discovery or the exact scraper/source failure blocking revenue.