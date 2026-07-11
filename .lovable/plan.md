# Kijiji Home Services Acquisition Pipeline

Add Kijiji Services as a priority scraping source feeding the existing UNPRO outreach database, with strict exclusions (massage/adult/beauty/customer-requests), Quebec-first geography, mobile-priority routing, and full admin visibility.

## Scope
- **Extend** existing tables (`contractor_prospects`, `contractor_outreach_logs`, `outreach_suppressions`) — do NOT create a parallel outreach DB.
- **New tables**: `scraping_sources`, `scrape_runs`, `prospect_source_listings`.
- **New columns on `contractor_prospects`**: `source_key`, `source_priority`, `acquisition_score`, `classification_confidence`, `listing_intent`, `priority_reason[]`, `phone_type`, `phone_sms_capable`, `first_seen_at`, `last_seen_at`, `outreach_eligibility`, `rejection_reason`.
- **New edge functions**: `scrape-kijiji-services`, `process-kijiji-listing`, `validate-kijiji-contact`, `queue-kijiji-outreach`, `kijiji-daily-orchestrator`.
- **Admin panel**: `/admin/acquisition/sources/kijiji` inside existing admin cockpit (dark-mode `.admin-theme` + `.text-readable*`).
- **Cron**: 06:00 America/Montreal daily; 7-day refresh for active listings.

## Build order

### 1. Database migration (single file)
- `scraping_sources` — source registry (seed row: `kijiji_services`, Quebec cities list).
- `scrape_runs` — per-run telemetry (pages, discovered, qualified, rejected, duplicates, errors jsonb).
- `prospect_source_listings` — N:1 with `contractor_prospects`; unique(source_key, source_listing_id); tracks each ad separately from canonical prospect.
- ALTER `contractor_prospects` add columns above (nullable, safe for existing rows).
- GRANT to authenticated + service_role; RLS admin-only via `has_role`.
- Indexes: `(source_key, acquisition_score DESC)`, `(normalized_phone_e164)`, `(outreach_eligibility)`.

### 2. Shared classification library (`supabase/functions/_shared/kijijiClassifier.ts`)
- `HOME_SERVICE_CATEGORIES` (EN+FR synonyms → canonical trade).
- `EXCLUSION_KEYWORDS` (massage variants, adult, beauty, finance, tutoring, auto, pet, childcare, job-seeker, product-only, real-estate).
- `PROVIDER_INTENT` / `CUSTOMER_REQUEST` phrase lists (FR+EN).
- `classifyListing({title, description, category}) → { intent, primary_category, secondary[], confidence, rejection_reason }`.
- `scoreAcquisition(prospect) → 0–100` with breakdown (contactability 25 / fit 20 / geo 15 / quality 15 / intent 15 / opportunity 10 / risk penalty).
- Reuse `normalizePhone` (already exists) for E.164 + `phone_type` heuristic (NANP area-code + carrier lookup deferred until validation step).

### 3. Edge functions
- **`scrape-kijiji-services`** — reads `scraping_sources.kijiji_services`, fetches listing pages per QC city, respects `robots.txt` + rate_limit, extracts listing URLs, creates `scrape_runs` row, enqueues `process-kijiji-listing`. On 403/CAPTCHA → set `scrape_status = "blocked_by_source"`, `requires_manual_import = true`, stop cleanly.
- **`process-kijiji-listing`** — extracts visible fields, classifies (intent + category + confidence), applies exclusion filters, dedupes (phone → email → domain → RBQ → name+city → fuzzy), upserts canonical prospect + inserts `prospect_source_listings` row, computes score.
- **`validate-kijiji-contact`** — normalizes phone, sets `phone_type` + `phone_sms_capable`, chooses route (SMS/email/manual/enrichment/suppressed).
- **`queue-kijiji-outreach`** — eligibility gate (intent=provider, confidence≥0.80, no rejection, score≥50, not duplicate/suppressed, quiet hours, consent), assigns variant A/B/C/D, inserts into existing `contractor_outreach_logs`/queue with `source_key=kijiji_services`, `source_priority=90`.
- **`kijiji-daily-orchestrator`** — 06:00 chain: scrape → process → dedupe → validate → capacity check → queue P0/P1 → report.

### 4. Cost + capacity guards
- Config table row for `max_pages_per_run`, `max_listings_per_city`, `max_phone_validations_per_day`, `max_ocr_requests_per_day`, `max_sms_queue_per_day`, `minimum_acquisition_score`.
- Pre-queue check joins `contractor_recruitment_targets` + demand/supply views (already exist) to pause saturated city×category pairs.
- OCR gated behind `classification_confidence ≥ 0.85 AND no visible contact AND score_without_contact ≥ 60`.
- 90-day phone-validation cache to skip re-validation.

### 5. Outreach experiments
- Seed 4 rows in `outreach_templates` scoped `source=kijiji`: Variant A (AI recommendation), B (Active local), C (Exclusive appointments), D (No-website, conditional). All FR-CA, all include tracked link + `{{prospect_id}}` + unsubscribe. Reuse existing `refresh-template-winner` rollup.

### 6. Admin panel — `/admin/acquisition/sources/kijiji`
- New page component under existing admin cockpit; dark-mode wrapped (`.admin-theme`).
- Sections: source status card, run history table, funnel (discovered → qualified → validated → queued → sent → clicked → registered → paid), rejection breakdown, priority queue (P0/P1/P2/P3/REVIEW), cost per validated mobile, revenue attributed.
- Filters: city, category, score, contact type, listing date, language, sponsored/organic, outreach state, rejection reason, duplicate status.
- Actions: Run QC scrape, Run selected city, Reprocess rejected, Validate contacts, Approve review, Queue P0, Pause source, Export CSV, View Kijiji ad, Merge duplicate, Suppress contact.
- Link from existing `/admin/outreach-command-center`.

### 7. Tests (Deno test files under `supabase/functions/_shared/__tests__/`)
20 classification+scoring cases from the spec (massage reject, hot-tub accept, homeowner-looking reject, painter mobile → P0/P1, landline no-SMS, duplicate merge, multi-ad attach, no-website bonus, non-QC reject, unsubscribe suppression, blocked-page stop, malformed phone, shortage priority boost, etc.).

## Compliance guardrails
- Honor `robots.txt`; obey rate limits; no CAPTCHA/auth bypass; no residential proxies; no fake accounts; no auto-messaging via Kijiji itself; only publicly visible ad content stored.

## Out of scope (phase 1)
- Canada-wide scraping (QC only).
- Auto-messaging inside Kijiji.
- OCR beyond existing infrastructure gating.
- Actual first outreach send — pipeline deploys enabled, but human presses "Queue P0 outreach" first run to confirm classification quality.

## Technical notes
- Migration adds columns nullable to avoid breaking existing prospect flows.
- Reuses `contractor_outreach_logs`, `outreach_templates`, `outreach_template_metrics`, `outreach_suppressions`, `refresh-template-winner`, `activation-recovery-worker` — no parallel systems.
- All new edge functions log to `platform_operation_outcomes` per the Production Reliability Framework (canonical `FailureCode`/`BlockReason`).
- Kijiji access may be blocked at any time — every function has a `blocked_by_source` exit path that surfaces to admin without retries.
