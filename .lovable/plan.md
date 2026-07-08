## Contractor Solicitation Engine — Launch Today

Goal: generate the first paid $1 activation today via targeted SMS outreach. Prospect → Click → Register → $1 Activation.

---

### Phase 1 — Solicitation Queue (DB)

New table `contractor_outreach_queue`:
- `id`, `contractor_id` (nullable, links to `contractors` when known)
- `company_name`, `city`, `category`, `phone`, `email`, `website`, `reviews_count`, `score`
- `status` enum: `queued | sms_sent | delivered | clicked | registered | payment_started | activated | failed | opted_out`
- `message_variant` (A–E), `tracking_slug` (unique, short)
- `sent_at`, `delivered_at`, `clicked_at`, `registered_at`, `activated_at`, `last_error`
- `attempts`, `next_retry_at`
- RLS: service_role full; admin read via `has_role('admin')`
- Indexes on `status`, `next_retry_at`, `tracking_slug`

Uses existing Twilio connector for SMS.

---

### Phase 2 — Prioritization Job

Edge function `solicitation-build-queue` (cron nightly + manual trigger from admin):
- Source: `contractors` + `outbound_leads` / `contractor_prospects` where mobile phone valid (via `normalizePhone`), not already in queue, not opted-out, not a directory/aggregator (exclusion list).
- Score = weights: mobile (required), reviews>20 (+2), website OR facebook (+1), RBQ (+2), category priority (insulation=5, roofing=4, foundation=3, mold=2, hvac=1).
- Select top 25–50/day.

---

### Phase 3 — Multi-Variant SMS

Store 5 variants (A/B/C/D/E) in a `solicitation_message_variants` table (name, template, active, weight).
Edge function `solicitation-send-sms`:
- Round-robin variants across each batch for even A/B/C/D/E split.
- Replace `{{company}} {{city}} {{category}} {{link}}` (link = `https://unpro.ca/activation?t=<tracking_slug>`).
- Sends via Twilio gateway (existing connector).
- Updates `status=sms_sent`, `sent_at`, logs to `outreach_sms_events`.

---

### Phase 4 — Landing `/activation`

New minimal page (route `src/pages/Activation.tsx`):
- Reads `?t=slug` → calls `solicitation-track` edge to mark `clicked` + hydrate company/city/category context.
- Headline "Recevez des rendez-vous exclusifs. Pas des leads partagés."
- Subheadline "Essai de 7 jours pour 1$. Activation immédiate."
- One CTA "Activer mon profil" → existing `create-activation-checkout` flow (reuse `ActivationOffer1Dollar` logic) with slug metadata.
- No score, no meter, no long form. Cinematic dark theme, mobile-first.

Registration + payment reuse existing activation edge functions; on webhook `checkout.session.completed`, update queue row to `activated`.

---

### Phase 5 — Abandon Recovery

Edge function `solicitation-recovery` (cron every 30 min):
- Clicked & not registered > 2h → SMS recovery variant 1.
- Registered & not paid > 1h → SMS recovery variant 2.
- Max 1 recovery per stage. Respect send window (9h–20h local, existing `sendWindow` helper).

---

### Phase 6 — Admin Dashboard `/admin/solicitation`

New page with live funnel:
- Counts: Prospects, Sent, Delivered, Clicked, Registered, Payment Started, Activated, Revenue ($).
- Per-variant CTR + activation rate table.
- Recent activity stream (realtime subscribe).
- Buttons: "Build Today's Queue", "Send Next Batch (25)", "Pause".

---

### Phase 7 — Nightly Learning

Edge function `solicitation-learn` (cron 03:00):
- Aggregate last 7d per (variant, category, city): CTR, register%, activation%, revenue/SMS.
- Update `solicitation_message_variants.weight` (winners ↑, losers ↓, floor 5%).
- Persist snapshot in `solicitation_daily_stats` for dashboard trends.

---

### Phase 8 — Daily Cap

- Config row: `daily_target=25`, `daily_max=50`, hard stop when reached.
- Never mass-blast; enforced in `solicitation-send-sms`.

---

### Success Tracking (first paid activation)

On first `activated`, insert `solicitation_first_wins` row with category, city, company, variant, time_to_click, time_to_register, time_to_pay → seeds the replication pattern for the learning engine.

---

### Technical Details

- Tables: `contractor_outreach_queue`, `solicitation_message_variants`, `solicitation_daily_stats`, `solicitation_first_wins`. All with GRANTs + RLS admin-only.
- Edge functions: `solicitation-build-queue`, `solicitation-send-sms`, `solicitation-track`, `solicitation-recovery`, `solicitation-learn`. Reuse `create-activation-checkout` + existing Stripe webhook (add queue update).
- SMS via existing Twilio connector (`TWILIO_API_KEY` env). If not connected, will prompt user to link before sending.
- Frontend: `/activation` public route + `/admin/solicitation` (admin-guarded).
- Cron: pg_cron for build-queue (daily 08:00), recovery (every 30 min), learn (03:00).

---

### Out of Scope (this pass)

- Email fallback (SMS only for launch).
- Multi-language variants (FR only).
- Deep contractor onboarding wizard changes.
