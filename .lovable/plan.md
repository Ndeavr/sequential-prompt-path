# UNPRO — Security Lockdown + Affiliate OS + Ops Dashboards

Three priorities executed in order. Each is shippable independently; nothing after P1 touches the internet until P1 lands.

---

## Priority 1 — Security Remediation Pass

### Scope
Every table in the acquisition → affiliate → activation → payment chain gets RLS with zero anon access, admin bypass via `has_role(auth.uid(),'admin')`, affiliate scope via `assigned_affiliate_id = auth.uid()`, contractor scope via `owner_user_id = auth.uid()`.

### Tables locked down (single migration)
- `contractors_prospects`, `contractor_leads`
- `verified_prospect_tokens`
- `contractor_recruitment_offers`, `contractor_recruitment_checkout_sessions`
- `affiliate_assignments`, `affiliate_activities`, `affiliate_proposals`, `affiliate_activation_links`, `affiliate_commissions`
- `outreach_logs` and any `sms_*` tables tied to prospects

### Per-table changes
1. `ENABLE ROW LEVEL SECURITY` (idempotent).
2. `REVOKE ALL ... FROM anon;` — no anon access anywhere in this set.
3. `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated;` `GRANT ALL ... TO service_role;`
4. Drop every legacy `USING (true)` / `magic_token IS NOT NULL` / slug-based public read policy.
5. Rebuild policies:
   - **Admin:** `has_role(auth.uid(),'admin')` — full CRUD.
   - **Affiliate:** SELECT/UPDATE where the row (or a join through `affiliate_assignments`) resolves to `auth.uid()`.
   - **Contractor:** SELECT own row where `owner_user_id = auth.uid()`.

### Token & link hardening
- Add `token_hash text` (sha256), `expires_at timestamptz`, `used_at timestamptz`, `single_use boolean default true` on `verified_prospect_tokens`, `affiliate_activation_links`, `affiliate_proposals`.
- Backfill hashes from existing plaintext tokens, then drop the plaintext columns.
- New `SECURITY DEFINER` RPCs — all validate hash + expiry + single-use, mark `used_at` atomically:
  - `resolve_prospect_token(_token text)`
  - `get_recruitment_offer_by_token(_token text)` (already partially shipped — extend for expiry/single-use)
  - `redeem_activation_link(_token text)`
  - `resolve_proposal_link(_token text)`
- All public landings call these RPCs; no client-side reads on the base tables.

### Stripe data
- `contractor_recruitment_checkout_sessions`: SELECT admin-only, writes service_role only.
- Client never queries directly — new edge function `get-checkout-status` returns `{status, plan, amount}` keyed by a hashed session lookup token.
- `stripe-activation-webhook` remains the only writer (service_role).

### Signed proposal URLs
- Proposals shared as `/p/:hashedToken` — RPC resolves + returns payload only if `now() < expires_at` and `used_at IS NULL`. Default TTL 7 days, configurable per proposal.

### Verification & audit report
After migration deploys:
1. `supabase--linter` → confirm 4 critical findings clear.
2. Anon curl matrix against every locked table → `permission denied`.
3. Anon curl against each RPC with bogus token → null; valid token → minimal payload.
4. Generate `docs/security/2026-07-16-lockdown-report.md` listing: tables secured, policies added (per role), RPCs introduced, columns dropped, remaining risks (MCP public server warning — tracked separately; dependency CVEs — tracked separately).
5. Mark scanner findings fixed via `security--manage_security_finding` with explanations; update `@security-memory`.

---

## Priority 2 — Affiliate OS

Not a dashboard. An operating system that turns scraped leads into paid contractors. Ships behind affiliate auth (role `affiliate` in `user_roles`).

### Data model additions
- `affiliate_profiles` (user_id PK → auth.users, display_name, phone, timezone, active).
- `affiliate_assignments` (affiliate_id, prospect_id, assigned_at, priority, status: `to_call | in_progress | proposal_sent | awaiting_payment | won | lost`).
- Extend `outreach_logs` with `channel`, `template_id`, `body_snapshot`, `clicked_at`, `converted_at`.

### Core screens
1. **`/affiliate` — Daily War Room**
   - "25 Contractors To Call" (assigned, `to_call`, sorted by score × recency).
   - "5 Clicked SMS" (assignments with `outreach_logs.clicked_at` in last 72h).
   - "3 Waiting Proposal" (`proposal_sent` > 24h no click).
   - "2 Waiting Payment" (`awaiting_payment`).
   - Potential Commission tile (uses existing `aggregatePipeline` from `revenueMath.ts`).

2. **`/affiliate/company/:id` — Contractor Workspace** (the money screen)
   - Header: business_name, category, city, UNPRO score, review count/rating, RBQ badge.
   - Left column: full contact (phone tap-to-call, email), address, website.
   - Center: **SMS history timeline** — each sent message with body snapshot, sent_at, clicked_at, device. Lorraine reads exactly what the contractor received before dialing.
   - Right column (sticky): existing `AffiliateRevenueIntelligencePanel` — recommended plan, monthly/annual/lifetime commission, close-today motivation, objection helper.
   - Action bar: `Log call`, `Send proposal` (generates signed URL), `Mark won`, `Mark lost` (reason picker).

3. **`/affiliate/proposals` — Proposal tracker**
   - Sent / Opened / Signed / Paid columns, one-click resend, expiry countdown.

### Edge functions
- `affiliate-daily-list` — recomputes each affiliate's queue nightly + on demand.
- `affiliate-send-proposal` — creates hashed `affiliate_proposals` row, returns signed URL, logs `outreach_logs`.
- `affiliate-log-call` — writes call disposition to `affiliate_activities`.

### Guards & routing
- `/affiliate/*` behind `RoleGuard` requiring `affiliate` or `admin`.
- No admin nav pollution — affiliates get their own layout.

---

## Priority 3 — Replace Acquisition Pipeline Dashboards

Kill vanity metrics ("Found / Enriched / Validated"). Replace with outcome KPIs.

### `/admin/acquisition` (replaces current pipeline page)
Single row of tiles, all today-scoped with 7d sparklines:
- New Contractors Today
- SMS Sent
- SMS Clicked (+ click rate %)
- Calls Made
- Proposals Sent
- Trials Started
- Paid (count + $)
- MRR (live)

Below: two tables — "Hot leads today" (clicked, no call yet) and "At risk" (proposal >48h no action).

### `/affiliate` (mirrors above, personalized)
Same layout, filtered to the affiliate's assignments. Potential Commission tile pinned top-right.

### Wiring
- All tiles fed by a single edge function `ops-kpis` returning `{admin: {...}, affiliate: {...}}` keyed by role and user_id.
- Old `PageAdminAcquisitionPipeline` retained under `/admin/acquisition/legacy` for one release then deleted.

---

## Delivery order
1. **P1 migration + RPCs + client swaps + audit report** (one PR, one migration).
2. **P2 affiliate auth + war room + company workspace** (once P1 is green in linter).
3. **P3 new dashboards** (reuses P2 data model, no new tables).

## Out of scope for this pass
- MCP public-server warning (separate follow-up: gate MCP with OAuth).
- Dependency CVEs from the scanner (`vite`, `react-router-dom`, `recharts`, `@supabase/supabase-js`, `@google/genai`, `@lovable.dev/mcp-js`) — handled in a dedicated bump PR.
- Cloud instance disk-IO upgrade — deferred until first paying contractors.
- Commission payout engine — P2 tracks earned commission; payout automation comes after first $ closed.

## Success criteria
- Scanner: 0 critical findings on prospect/token/offer/checkout tables.
- Anon curl on any locked table → permission denied.
- An affiliate logs in and within 10 seconds sees: who to call, what SMS they got, who clicked, who's waiting on a proposal, who's waiting on payment, potential commission.
- `/affiliate/company/:id` shows every field required to close a lead on a single scroll.
