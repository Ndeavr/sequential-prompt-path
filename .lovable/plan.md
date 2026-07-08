
# Database Resource Audit — Read-Only Findings

Snapshot: **DB size 6.13 GB / 8 GB disk (85% used, 1.20 GB free)**, memory 60%, connections 20/60, WAL 272 MB, 0 restarts. One dominant offender explains ~90% of storage pressure.

## 1. Executive Summary

| Metric | Value |
|---|---|
| Total DB size | **6.13 GB** |
| Disk used | 85% (Tiny 8 GB tier) |
| Single biggest table | `cron.job_run_details` = **5.41 GB** (88% of DB) |
| Immediate reclaimable | **~5.4 GB** (drops disk to ~12%) |
| Cleanup effort | 1 SQL statement (truncate cron history) |

**Verdict**: You do NOT need a disk upgrade. One truncate frees 5.4 GB.

## 2. Top 20 Largest Tables

| # | Schema.Table | Total Size | Indexes | Est. Rows | Notes |
|---|---|---|---|---|---|
| 1 | `cron.job_run_details` | **5,408 MB** | 47 MB | huge | pg_cron history — never purged |
| 2 | `public.platform_operation_outcomes` | 223 MB | 78 MB | 396k | Reliability log, high insert (433k inserts) |
| 3 | `public.launch_pipeline_events` | 101 MB | 14 MB | 135k | Launch orchestrator events |
| 4 | `public.outreach_delivery_logs` | 25 MB | 4.8 MB | 32k | |
| 5 | `public.outbound_health_checks` | 18 MB | 9.1 MB | 77k | Health-check spam, 0 index scans |
| 6 | `public.agent_outreach_messages` | 16 MB | 4.4 MB | 32k | |
| 7 | `public.renovation_projects` | 10 MB | 32 kB | — | Toast/JSON heavy |
| 8 | `public.automation_runs` | 9.7 MB | 2.5 MB | 44k | |
| 9 | `public.agent_runs` | 7.5 MB | 2.1 MB | 13k | |
| 10 | `public.aeo_extraction_blocks` | 4.9 MB | 920 kB | 5k | |
| 11 | `public.seo_pages` | 3.4 MB | 208 kB | 368 | Toast/JSON |
| 12 | `public.launch_funnel_alerts` | 3.1 MB | 648 kB | 7.8k | |
| 13 | `public.outreach_health_checks` | 3.1 MB | 1.4 MB | 11k | |
| 14 | `public.renovation_concepts` | 2.0 MB | 16 kB | — | Toast/JSON |
| 15 | `public.omega_loop_runs` | 1.6 MB | 336 kB | 2.8k | |
| 16 | `public.prospection_results_raw` | 1.5 MB | 40 kB | 450 | Scraped raw JSON |
| 17 | `public.automation_alerts` | 1.4 MB | 120 kB | 1.9k | |
| 18 | `public.timeline_events` | 1.2 MB | 120 kB | 917 | |
| 19 | `public.aeo_intent_vectors` | 1.2 MB | 152 kB | 722 | Embeddings |
| 20 | `public.contractor_prospects` | 1.0 MB | 376 kB | 242 | |

Everything below #4 is negligible (<25 MB). Storage is **hyper-concentrated in #1**.

## 3. Growth Rate Estimates

Cumulative inserts since last vacuum stat reset (roughly project lifetime):

| Table | Inserts | Est. monthly growth |
|---|---|---|
| `platform_operation_outcomes` | 433k | **~60–100 MB/mo** (fastest structural grower) |
| `launch_pipeline_events` | 142k | ~25 MB/mo |
| `outbound_health_checks` | 81k | ~10 MB/mo, **0 idx_scan** (write-only noise) |
| `outreach_delivery_logs` | 33k | ~5 MB/mo |
| `agent_outreach_messages` | 33k | ~4 MB/mo |
| `cron.job_run_details` | massive | pg_cron runs every minute → **~500 MB–1 GB/mo unbounded** |

## 4. Unused / Wasted Indexes (idx_scan = 0)

Total wasted index bytes: **~78 MB**. Highest offenders:

| Index | Table | Size | Scans |
|---|---|---|---|
| `idx_poo_operation_created` | platform_operation_outcomes | **37 MB** | 0 |
| `platform_operation_outcomes_pkey` | " | 17 MB | 0 |
| `idx_outbound_health_checks_mailbox` | outbound_health_checks | 5.8 MB | 0 |
| `launch_pipeline_events_pkey` | launch_pipeline_events | 5.3 MB | 0 |
| `outbound_health_checks_pkey` | outbound_health_checks | 3.3 MB | 0 |
| `idx_aom_lead` | agent_outreach_messages | 2.2 MB | 0 |
| `idx_launch_events_lead` | launch_pipeline_events | 1.5 MB | 0 |
| `idx_agent_runs_agent_started` | agent_runs | 1.4 MB | 0 |
| + 9 more small ones | | ~4 MB | 0 |

Note: many are PKs — the "0 scan" reflects an insert-only workload, not real waste. Genuine drop candidates: `idx_poo_operation_created`, `idx_outbound_health_checks_mailbox`, `idx_aom_lead`, `idx_launch_events_lead`, `idx_agent_runs_agent_started`. **~47 MB reclaimable.**

## 5. Sequential-Scan Hotspots (missing indexes)

| Table | seq_scan | rows read | Live rows | Diagnosis |
|---|---|---|---|---|
| `user_roles` | **2.1M** | 7.0M | 6 | Tiny table scanned repeatedly — fine (Postgres won't use index on 6 rows), but suggests `has_role()` call volume. Consider caching in app. |
| `outbound_companies` | 50k | 6.1M | 924 | Needs index on the filter column (likely `status`/`city`). |
| `sms_events_v2` | 6.9k | 3.0M | 458 | Small table but wide reads. |
| `outbound_mailboxes` | 181k | 835k | 5 | Trivial size — ignore. |
| `contractor_leads` | 3.5k | 694k | 238 | Add index on filter column. |
| `outreach_health_checks` | 1.7k | 691k | 11.9k | Missing index on health lookup column. |
| `automation_agents` | 17k | 620k | 36 | Tiny — ignore. |
| `challenge_agent_state` | 60k | 242k | 4 | Ignore. |
| `email_domain_health` | 47k | 220k | 5 | Ignore. |
| `launch_mode_state` | 145k | 145k | 1 | Ignore (singleton). |

**Real index candidates**: `outbound_companies`, `contractor_leads`, `outreach_health_checks`. Impact is small (all tables <20 MB).

## 6. Duplicate Indexes

None material found in this pass (need `pg_stat_user_indexes` cross-check with `pg_index.indkey` for definitive answer — deferred).

## 7. Log / Scraped Data Older Than 30 Days

| Table | Kind | Cleanup potential |
|---|---|---|
| `cron.job_run_details` | System log | **~5.4 GB** if truncated (retain 7d = ~200 MB) |
| `platform_operation_outcomes` | App reliability log | ~150 MB if pruned to 30d |
| `launch_pipeline_events` | Orchestrator log | ~70 MB if pruned to 30d |
| `outbound_health_checks` | Health-check log | ~15 MB if pruned to 7d |
| `outreach_delivery_logs` | Delivery log | ~15 MB if pruned to 30d |
| `outreach_health_checks` | Health-check log | ~2 MB if pruned to 7d |
| `omega_loop_runs` | Agent log | ~1 MB if pruned to 30d |
| `automation_runs` | Job log | ~5 MB if pruned to 30d |
| `agent_runs` | Job log | ~4 MB if pruned to 30d |
| `broken_link_events` | Scan log | ~0.5 MB if pruned to 30d |
| `prospection_results_raw` | Scraped raw JSON | ~1 MB if pruned to 30d |

## 8. Orphan Records / JSON Bloat

- `renovation_projects` + `renovation_concepts` = 12 MB but 0 live rows reported — pure TOAST + dead tuples. Candidates for `VACUUM FULL`.
- `platform_operation_outcomes.payload` (jsonb) and `launch_pipeline_events.payload` are the two dominant JSON columns driving growth.
- Full orphan sweep (FK-based) not run to avoid heavy scans on saturated disk — recommend after cleanup.

## 9. Immediate Cleanup Opportunities (ranked by ROI)

| # | Action | Reclaims | Effort | Risk |
|---|---|---|---|---|
| 1 | Truncate `cron.job_run_details` (keep 7 days) | **~5.2 GB** | 1 SQL | None (log only) |
| 2 | Enable pg_cron retention setting (retain 7d automatically) | prevents regrowth | 1 setting | None |
| 3 | Prune `platform_operation_outcomes` >30 days | ~150 MB | 1 DELETE + partial idx | Low |
| 4 | Prune `launch_pipeline_events` >30 days | ~70 MB | 1 DELETE | Low |
| 5 | Prune `outbound_health_checks` >7 days | ~15 MB | 1 DELETE | None (write-only, 0 reads) |
| 6 | Prune `outreach_delivery_logs` >30 days | ~15 MB | 1 DELETE | Low |
| 7 | Drop 5 confirmed unused indexes | ~47 MB | 5 DROP INDEX | None |
| 8 | Add pg_cron retention job (nightly) | prevents #1 recurring | trigger | None |
| 9 | Add scheduled prune for log tables (#3–6) | prevents recurrence | pg_cron | Low |
| 10 | `VACUUM FULL` on renovation_projects/concepts | ~12 MB | 2 statements | Locks table briefly |

## 10. Estimated Impact After Cleanup

| Metric | Before | After (steps 1–7) |
|---|---|---|
| DB size | 6.13 GB | **~0.75 GB** |
| Disk usage | 85% | **~12%** |
| WAL churn from cron | high | minimal |
| IO from log inserts | high | ~40% lower (no idx maintenance on dropped indexes + fewer TOAST reads) |
| Monthly growth | ~1 GB/mo | ~200 MB/mo (with retention) |

## Recommendation

You do **not** need to upgrade the disk. Approve a follow-up build turn where I ship:
1. A retention migration (`cron.job_run_details`, `platform_operation_outcomes`, `launch_pipeline_events`, `outbound_health_checks`, `outreach_delivery_logs`).
2. Nightly pg_cron pruning jobs to keep it that way.
3. Dropping the 5 confirmed unused indexes.
4. `VACUUM FULL` on the two dead-tuple TOAST tables.

Nothing has been modified. Approve this plan and I'll implement in a single migration + one code-free follow-up.
