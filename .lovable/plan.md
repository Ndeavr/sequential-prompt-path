# Outreach Email CTA + Tracking — Hard Fix

## Root cause (from 30-day audit)
Emails contain a URL but it points **directly** to `https://unpro.ca/pro/onboarding/{token}` — bypassing the `/r/{tracking_id}` tracker. Result: zero `clicked` events possible, no attribution, funnel CTR = 0.

Tracker infrastructure (`acquisition_tracking_links` + `r-redirect` edge function) already exists from the previous turn. It's just not wired into the email generators.

## Fix

### 1. Shared CTA helper
New `supabase/functions/_shared/ctaTracker.ts`:
- `createTrackedLink({ destination_url, prospect_id, contractor_id, campaign, channel })` → inserts a row in `acquisition_tracking_links` with a short id (e.g. 10-char nanoid), returns `https://unpro.ca/r/{id}`.
- `wrapAllUrls(body, ctx)` → regex-replaces every `https?://(unpro\.ca|app\.unpro\.ca)/...` URL in the body with a tracked equivalent. External URLs (stripe, etc.) skipped.
- `extractUrls(body)` → returns array of URLs found.

### 2. Plug into every email sender
Touch every place that builds an email body before send:
- `_shared/outreachDispatch.ts` (the email branch)
- `acq-send-invite`, `acq-send-outreach`, `acq-generate-outreach`, `acq-followup-send`, `agent-send-outreach`, `dispatch-outreach-batch`, `acquisition-autopilot`, `war-prospecting-engine`, `challenge-signup-orchestrator`
- For each: after the body is rendered → call `wrapAllUrls()` → then `extractUrls()`.

### 3. Pre-flight CTA validation (block-send)
In `outreachDispatch.sendEmail()`:
```text
urls = extractUrls(body)
if urls.length === 0:
   log acquisition_events.failed reason=missing_cta
   return { ok:false, error:"Email has no CTA link." }
if !urls.some(u => u.includes("unpro.ca/r/")):
   log warning, wrap inline
```
Same gate before invoking Resend.

### 4. Persist rendered output
Migration on `contractor_outreach_logs`:
- `raw_template text` (template key + variables JSON)
- `rendered_html text`
- `rendered_text text`
- `cta_urls text[]`
- `has_tracked_cta boolean`

Write all four on every send (success or block).

### 5. Admin audit page
New `/admin/email-cta-audit` (`PageAdminEmailCtaAudit.tsx`) with cards:
- Emails sent (30d) · with CTA · missing CTA · tracked CTA · click-through rate · top 5 campaigns by CTR
- Table of last 100 emails: subject, recipient, `has_tracked_cta` badge, click count (join `acquisition_tracking_links.click_count`), `view rendered` drawer showing stored html/text.

Backed by new DB view `v_email_cta_health`.

### 6. Admin preview before send
Add `acq-preview-email` edge function that runs the same render + wrap + validate pipeline and returns `{ subject, html, text, cta_urls, has_tracked_cta, blocked_reason? }`. Wire a "Prévisualiser" button on the Acquisition Tests page that shows the rendered HTML in an iframe with CTA badges highlighted.

### 7. One-shot 30-day backfill report
Edge function `acq-cta-audit-30d`:
- Scan last 30d `contractor_outreach_logs` where `channel='email'`.
- Per row: extract URLs from `message_body`, classify (none / direct-onboarding / tracked).
- Insert one row per finding into new table `email_cta_audit_findings` (template_key, count_no_url, count_direct, count_tracked).
- Triggered once from the audit dashboard button "Lancer audit 30 jours".

Result currently expected: ~100% of recent emails = `direct-onboarding`, 0% tracked → confirms the root cause and seeds the dashboard.

## Files
- **Created**: `supabase/functions/_shared/ctaTracker.ts`, `supabase/functions/acq-preview-email/index.ts`, `supabase/functions/acq-cta-audit-30d/index.ts`, `src/pages/admin/PageAdminEmailCtaAudit.tsx`, migration (columns + view + findings table).
- **Modified**: `_shared/outreachDispatch.ts`, `acq-send-invite`, `acq-send-outreach`, `acq-generate-outreach`, `acq-followup-send`, `agent-send-outreach`, `dispatch-outreach-batch`, `acquisition-autopilot`, `war-prospecting-engine`, `challenge-signup-orchestrator`, `PageAdminAcquisitionTests.tsx`, `src/app/router.tsx`.

## Success
- Every new outbound email body contains ≥1 `https://unpro.ca/r/{id}` URL or the send is blocked with `missing_cta`.
- `/r/{id}` hits write `acquisition_events.clicked` (already wired).
- Funnel `clicked` count > 0 within minutes of next campaign.
- Admin audit page shows CTR by campaign and flags any sender still producing 0-URL emails.

## Out of scope
SMS link tracking (separate concern), MJML/React-Email template rewrite (kept text body, only wrapping URLs), retroactive rewriting of already-sent emails.