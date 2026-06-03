## UNPRO Concierge Activation Engine — First 5 Manual Closes

Goal: a focused cockpit to personally orchestrate 20 high-quality contractors → 5 paid activations. Reuses existing `contractor_prospects` + outbound infra. No automation-first build, no generic SaaS onboarding.

---

### What we reuse (no rebuild)

- `contractor_prospects` table (already has business, RBQ, reviews, AIPP, status fields)
- Existing edge functions for scraping/enrichment/AIPP scoring
- Existing Stripe checkout + dynamic pricing engine
- Existing contractor activation pipeline (`/admin/contractor-activation-flow`)

### What we add (concierge layer)

**1. New cockpit page — `/admin/concierge`**

Single-screen war room, mobile-first, dark glassmorphism. Sections:

- **Today's 5** — the 5 prospects to actively work today (Kanban-lite, drag between stages)
- **Hot pipeline** — sortable list filtered to *closable* prospects only (see filter below)
- **Next Best Action** card per prospect (computed): "Send opener", "Send demo link", "Send close message", "Call now", "Send payment link"
- **Live activity feed** — replies, opens, payments
- **Today's metric strip** — Conversations / Demos / Activations vs target (5/2/1)

**2. Precision targeting filter (Discovery view)**

New view in cockpit + DB view `v_concierge_targets`:
- Trade ∈ {attic_insulation, french_drains, roofing, heat_pumps, kitchen_bath_GC}
- Google rating ≥ 4.4 AND review_count ≥ 25
- AIPP score < 60 (weak AI visibility)
- Has website + active phone
- `do_not_contact = false`, `payment_status = 'not_started'`
- Ranked by: review_count × (100 − aipp_score) × trade_weight

**3. Prospect drawer (right-side, slide-in)**

Per-prospect command surface:
- Header: company, trade, city, rating, reviews, AIPP score visualized
- **Weakness card**: AI visibility gaps (no schema, generic copy, no GEO/AEO, no semantic authority) — bullet list from AIPP subscores
- **Personalized message generator**: 3 pre-loaded templates (Opener / Reply2 / Close) auto-filled with {FirstName}, {CompanyName}, {City}, {Trade}, {ReviewCount}, {WeaknessSummary}. Edit-in-place, copy-to-clipboard, or "Open in SMS/Email" deep link.
- **Concierge timeline**: every touch (sent, opened, replied, called, demo'd, offer sent, paid) — manual log + auto from existing channels
- **Reserve My Territory**: generates a personalized landing link `/pro/:slug?t=:token` (existing nuclear-close infra)
- **Custom activation offer**: pick plan, override price, generate Stripe checkout link
- **Stage updater**: discovered → contacted → replied → interested → demo_sent → offer_sent → payment_pending → activated

**4. Schema additions to `contractor_prospects`**

Migration adds (only what's missing):
- `concierge_owner_id uuid` — who's working it
- `concierge_priority smallint` — manual 1-5 star
- `next_action text` — computed/cached
- `next_action_due_at timestamptz`
- `concierge_notes text`
- `custom_offer jsonb` (plan, price_override, expires_at, stripe_session_id)

New table `concierge_touches`:
- prospect_id, channel (sms|email|call|voicemail|inperson), direction (out|in), body, occurred_at, created_by

**5. Activation trigger on payment**

When `payment_status` flips to `paid` (via existing Stripe webhook), edge function `concierge-activate-prospect`:
- Creates/links `contractors` row from prospect data
- Triggers existing AI page generation, semantic structure, territory pages, appointment routing, trust profile (all already-built systems — just chain the calls)
- Sets `activation_status = 'activated'`, emits `system_event`

**6. Positioning copy (UI strings)**

All concierge UI labels enforce the new wedge:
- "Become one of the contractors AI recommends first"
- "Exclusive guaranteed appointments. Not shared leads."
- "UNPRO structures your company so AI systems understand and recommend it."

No "subscription", no "marketing", no "leads".

---

### Out of scope (explicitly NOT building this round)

- Mass scraping pipeline (use what's already in `/admin/outbound`)
- Automated multi-step sequences (concierge = human-sent)
- New payment system (reuse dynamic-pricing + Stripe)
- New contractor onboarding flow (reuse activation funnel)
- Analytics dashboards beyond Today's metric strip

---

### Technical layout

```
src/pages/admin/concierge/
  PageConciergeCockpit.tsx          (main war room)
  PageConciergeDiscovery.tsx        (precision targeting list)
src/components/admin/concierge/
  TodayFiveBoard.tsx
  ProspectDrawer.tsx
  WeaknessCard.tsx
  MessageComposer.tsx                (3 templates + variable injection)
  CustomOfferBuilder.tsx
  ConciergeTimeline.tsx
  NextActionChip.tsx
  MetricStrip.tsx
src/hooks/
  useConciergeTargets.ts
  useConciergeProspect.ts
  useConciergeTouches.ts
supabase/functions/
  concierge-activate-prospect/      (chain existing activation calls)
  concierge-generate-message/       (Lovable AI Gateway — personalize 3 templates)
supabase/migrations/
  <ts>_concierge_layer.sql           (cols on contractor_prospects + concierge_touches + v_concierge_targets view)
```

Route registered at `/admin/concierge` (admin-only via existing `RoleGuard`).

---

### Success criteria

- 20 targeted contractors loaded in cockpit on day 1
- Operator can: see Next Best Action, generate personalized message, log touch, send custom Stripe offer, mark paid → contractor page auto-goes live
- 5 paid activations close end-to-end through the cockpit
- Every touch + objection captured in `concierge_touches` (the moat dataset)
