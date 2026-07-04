# Acquisition Pipeline → Revenue Intelligence Refactor

Transform `contractor_prospects` scraping firehose into a **Contractor Activation Engine**. Stop spending SMS / email / AI credits on unreachable or low-probability prospects. Every outreach worker must consult a single eligibility contract before firing.

---

## Phase 1 — Schema (single migration)

Add columns to `public.contractor_prospects` (existing `priority_score numeric` is kept; new integer `acquisition_priority_score` mirrors the 0–100 scale used by scoring):

```
acquisition_priority_score  integer  default 0
phone_type                  text                       -- mobile | landline | voip_business | unknown | invalid
has_mobile                  boolean  default false
has_landline                boolean  default false
email_quality               text                       -- valid | invalid | disposable | role | aggregator
aggregator_email            boolean  default false
has_website                 boolean  default false
website_quality_score       integer  default 0        -- -10 .. +20
review_count already exists (integer)
review_rating already exists (numeric)
photo_count                 integer  default 0
service_area_count          integer  default 0
outreach_channel            text                       -- sms_email | sms | email | none
outreach_eligible           boolean  default false
suppression_reason          text                       -- aggregator_email | unreachable | do_not_contact | low_score
priority_recomputed_at      timestamptz
```

Indexes: `(outreach_eligible, acquisition_priority_score desc)`, `(phone_type)`, `(aggregator_email)`, `(suppression_reason)`.

RLS/grants unchanged (table is admin/edge-function scoped; keep existing policies).

---

## Phase 2 — Aggregator Suppression

**New file `supabase/functions/_shared/aggregator.ts`**

```ts
export const AGGREGATOR_DOMAINS = new Set([
  "renoassistance.ca","soumissionrenovation.com","soumissionsmaison.com",
  "bark.com","bark.co.uk","homestars.com","trustedpros.ca",
  "renovationfind.com","renovationquotes.com",
]);
export function isAggregatorEmail(email: string | null): boolean { … }
```

When matched → `aggregator_email = true`, `outreach_eligible = false`, `suppression_reason = 'aggregator_email'`, `acquisition_priority_score = 0`. Never enrich, personalize, or contact.

Also seed a small DB table `acquisition_suppression_domains` (id, domain, kind, active) so admins can add domains without a redeploy. Aggregator helper reads the union of the hardcoded set and this table (cached 5 min).

---

## Phase 3 — Phone Intelligence

**New file `supabase/functions/_shared/phone.ts`**

- Normalize to E.164 via `libphonenumber-js` (already available on npm specifier).
- Classify with a lightweight rules layer first (Canadian mobile NPA/NXX ranges) and, when available, delegate to Twilio Lookup v2 (`Type=carrier`) — feature-flagged by `TWILIO_LOOKUP_ENABLED`.
- Persist `phone_type`, `has_mobile`, `has_landline`, cache result in `phone_carrier_cache` (already exists).

**Channel selection** (helper `selectOutreachChannel(prospect)`):
| mobile | validEmail (non-aggregator) | channel |
|---|---|---|
| ✓ | ✓ | `sms_email` |
| ✓ | ✗ | `sms` |
| ✗ | ✓ | `email` |
| ✗ | ✗ | `none` → `outreach_eligible=false`, `suppression_reason='unreachable'` |

---

## Phase 4–6 — Scoring Signals

**New file `supabase/functions/_shared/prospectScoring.ts`**

- **Website** (`website_quality_score`): none → +20, weak (raw HTML, no HTTPS, no meta) → +10, strong (SEO + HTTPS + responsive) → 0, agency-grade (heavy JS bundle, tracking pixels, blog) → −10. Uses existing `contractor_domain_checks` when present; otherwise a cheap HEAD + tiny HTML sniff.
- **Reviews**: 0 → −50, 5–24 → +15, 25–99 → +25, 100+ → +35; rating ≥ 4.7 → +10 bonus.
- **GBP completeness**: photos + hours + categories + description + services → complete +15, partial +5, poor 0. Reads from `contractor_gmb_profiles` where available.
- **Mobile score**: mobile +10, else 0. **Email score**: valid non-aggregator +5, else 0. **Service area**: ≥3 cities +5.

Compose:

```
score = clamp(0, 100, 50 + review + website + mobile + gbp + email + serviceArea)
```

Stored in `acquisition_priority_score` (integer) with source breakdown JSON in `raw_data.scoring`.

---

## Phase 7 — Queue Classification

Derived (no new column needed) via `acquisition_priority_score`:

- **A / Ready to activate** — 90–100
- **B / High potential** — 75–89
- **C / Medium** — 50–74
- **D / Ignore** — < 50

Expose via SQL view `v_acquisition_queues`:

```sql
CREATE VIEW public.v_acquisition_queues AS
SELECT *, CASE
  WHEN acquisition_priority_score >= 90 THEN 'A_ready'
  WHEN acquisition_priority_score >= 75 THEN 'B_high'
  WHEN acquisition_priority_score >= 50 THEN 'C_medium'
  ELSE 'D_ignore' END AS queue_tier
FROM public.contractor_prospects
WHERE outreach_eligible = true;
```

`SECURITY INVOKER`, grants match table.

---

## Phase 8 — Eligibility Contract in Every Worker

**New file `supabase/functions/_shared/outreachEligibility.ts`** — single guard used by every sending worker:

```ts
export function assertCanSendSMS(p) {
  if (!p.outreach_eligible) throw new SkipError('not_eligible');
  if (p.phone_type !== 'mobile') throw new SkipError('not_mobile');
}
export function assertCanSendEmail(p) {
  if (!p.outreach_eligible) throw new SkipError('not_eligible');
  if (p.aggregator_email) throw new SkipError('aggregator');
}
export function assertCanPersonalize(p) {
  if ((p.acquisition_priority_score ?? 0) < 50) throw new SkipError('low_score');
}
```

Wire into every existing outreach edge function that sends SMS or email (`outbound-*`, `acq-*`, `send-*`). Each guard records a `platform_operation_outcomes` row so admins see *why* nothing was sent (uses the Production Reliability framework already in place).

---

## Phase 9 — Reprocessing Edge Function

**New `supabase/functions/acquisition-recalculate-priority/index.ts`**

- Paginated (default 500/batch, `?batch=` + `?cursor=`) to avoid function timeouts.
- For each prospect: aggregator check → phone classify → website check → recompute score → set eligibility + channel → upsert row.
- Emits `platform_operation_outcomes` with counts (recomputed, suppressed_aggregator, suppressed_unreachable, promoted_to_A).
- Idempotent; safe to re-run.

A one-shot cron (`pg_cron`) row triggers it hourly for prospects where `priority_recomputed_at IS NULL OR older than 7 days`. Admin can also trigger from the new dashboard.

---

## Phase 10 — `/admin/revenue-intelligence`

**New file `src/pages/admin/PageAdminRevenueIntelligence.tsx`** (registered in admin router + `adminToolsRegistry`).

Wrapped in `PageShell variant="admin"`, uses `CardGlass`/`SectionBlock`, follows readability tokens.

**KPI cards** (single RPC `rpc_acquisition_intelligence_summary`): Total prospects, Eligible, Suppressed, Aggregator emails, Mobile numbers, Landlines, No website, 25+ reviews, Ready to activate (queue A).

**Table** (paginated, server-side sort, from `v_acquisition_queues`): Company · Category · City · Reviews · Rating · Website · Phone Type · Email · Priority · Status · Recommended Channel.

**Filters**: Only Mobile · Only No Website · 25+ Reviews · No Website + Reviews · Eligible Only · Suppressed Only · Queue tier (A/B/C/D).

**Actions**: Recompute selected · Recompute all (fires the edge function with confirmation).

---

## Phase 11 — Rollout Order

1. Migration (Phase 1 + Phase 7 view + suppression domain table).
2. Shared helpers (aggregator, phone, scoring, eligibility).
3. Edge function `acquisition-recalculate-priority` + summary RPC.
4. Wire eligibility guards into every existing outreach function (grep for `send-sms`, `send-email`, `outbound-*`, `acq-*`).
5. Admin page `/admin/revenue-intelligence`.
6. Trigger one-shot recompute of the entire table.
7. Enable hourly cron.

---

## Files & Artefacts

**New**
- `supabase/migrations/*_acquisition_intelligence.sql`
- `supabase/functions/_shared/aggregator.ts`
- `supabase/functions/_shared/phone.ts`
- `supabase/functions/_shared/prospectScoring.ts`
- `supabase/functions/_shared/outreachEligibility.ts`
- `supabase/functions/acquisition-recalculate-priority/index.ts`
- `src/pages/admin/PageAdminRevenueIntelligence.tsx`
- `src/components/admin/revenue-intelligence/KPICards.tsx`
- `src/components/admin/revenue-intelligence/ProspectTable.tsx`

**Edited**
- All outreach edge functions that call SMS/email — add `assertCanSendSMS`/`assertCanSendEmail` at top of the handler (batch grep).
- `src/admin/adminToolsRegistry.ts` — register new page.
- `src/app/router.tsx` — add `/admin/revenue-intelligence` route.

---

## Success Metrics (recorded in `platform_operation_outcomes`)

- `sms_blocked_not_mobile` count monotonically ≥ pre-refactor SMS attempts on landline numbers (proves the guard fires).
- `email_blocked_aggregator` > 0 within first hour.
- 0 SMS to `phone_type != 'mobile'` after cutover.
- 0 emails to `aggregator_email = true`.
- Queue A size trends up as scoring improves data.

---

## Out of Scope

- No changes to Alex, checkout, or Stripe.
- No new user-visible marketing pages.
- No SMS/email provider swap — only guard rails.
- Legacy `priority_score` (numeric) stays for backwards compatibility; UIs read `acquisition_priority_score` going forward.

## Confirm Before Building

1. **Twilio Lookup** — enable live carrier lookup ($0.005/lookup) or rely purely on NPA/NXX heuristics? Recommendation: rules-first, Twilio behind a feature flag for uncertain cases only.
2. **Legacy `priority_score`** — leave as-is or backfill from `acquisition_priority_score`?
3. **Immediate cutover** — after reprocessing, should I hard-pause every existing outbound sequence so nothing sends until the eligibility guards are in place, then resume? Recommended.
