# Smart Contact Routing — Plan

Centralized routing layer that picks the right channel (SMS/email) per contact, falls back automatically, and logs everything. Reusable across contractor onboarding, homeowner matching, reminders, Alex follow-ups, outbound prospecting.

## What exists already
- `outbound_contacts` (prospect-scoped, no phone_type / consent / preference)
- Twilio secrets present (`TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`)
- Send functions exist but siloed: `send-sms-prospect`, `acq-sms-send`, `send-transactional-email`, `send-outbound-test`, `send-outreach-direct`, etc. No router, no Twilio Lookup, no fallback engine.

## Scope — what we build

### 1. Database (migration)
- `contacts` — universal identity record (first/last, email, phone, `phone_e164`, `phone_type ∈ mobile|landline|voip|unknown`, `phone_verified`, `sms_consent`, `email_consent`, `preferred_channel`, `last_channel_used`, `lookup_cached_at`)
- `outbound_contact_rules` — priority-ordered rules (`condition_type`, `primary_channel`, `fallback_channel`, `delay_before_fallback_minutes`, `is_active`)
- `communication_logs` — every send attempt (`contact_id`, `channel`, `template_key`, `delivery_status`, `provider`, `provider_message_id`, `error_message`, `fallback_triggered`, `parent_log_id`, timestamps)
- `communication_fallback_queue` — scheduled fallbacks (run by cron when SMS not delivered after N minutes)
- RLS: service-role write only; admins can read; users read their own contact rows
- Indexes on `phone_e164`, `email`, `(delivery_status, created_at)`, `(scheduled_for) WHERE processed=false`
- Seed default rules (mobile→sms, landline→email, unknown→email)

### 2. Edge functions
- **`contact-router`** (main entry) — `{ contact_id | contact_payload, template_key, channel_override?, idempotency_key }` → resolves contact → runs rules → calls sender → logs → schedules fallback
- **`twilio-lookup-phone`** — `POST { phone }` → Twilio Lookup v2 (`line_type_intelligence`) → upserts `phone_type` + `phone_verified` + caches 90d
- **`contact-router-fallback-cron`** — runs every 5 min, scans `communication_fallback_queue` for due undelivered SMS, triggers email version
- **`twilio-status-webhook`** — receives Twilio delivery callbacks, updates `communication_logs.delivery_status` + `delivered_at`, triggers fallback if `failed/undelivered`
- Reuses existing `send-transactional-email` and a thin SMS sender (wrapping Twilio Messaging Service) — no duplicate provider code

### 3. Routing logic (deterministic, in `contact-router`)
```
1. Resolve contact (DB lookup or inline payload)
2. If phone present AND lookup_cached_at > 90d ago → call twilio-lookup-phone synchronously
3. Match highest-priority active rule whose condition matches contact
4. primary = rule.primary_channel ; fallback = rule.fallback_channel
5. Hard override: missing email → force sms (if eligible); missing/no consent sms → force email
6. Send via primary; log row with status=queued; on provider 2xx → status=sent
7. If primary=sms AND fallback=email → insert fallback_queue row scheduled_for=now()+delay
8. Webhook flips status=delivered → cancels queued fallback ; status=failed → fires fallback immediately
```

### 4. Client SDK
- `src/lib/communications/router.ts` exposes `sendViaRouter({ contactId, templateKey, data })` — single import used by:
  - contractor onboarding abandoned-step trigger
  - quote follow-up
  - appointment reminders (T-24h, T-2h)
  - Alex post-conversation follow-up
  - outbound prospect first-touch
- Existing direct senders stay but are deprecated (router-first)

### 5. Admin UI — `/admin/communications`
- Header KPIs: 24h SMS sent/delivered %, email delivered %, fallback-trigger rate, replies, bookings-by-channel
- **Routing Rules** table — drag-reorder priority, toggle active, edit fallback delay
- **Live Activity Feed** — realtime via `supabase.channel('communication_logs')`, glass cards with status pills (queued/sent/delivered/failed/fallback), provider badge (Twilio/Resend)
- **Contacts inspector** — search by phone/email, shows phone_type, consent, last channel, history
- **AI Insights placeholder** — best send hour, best channel per trade/city (Phase 2, stubbed UI)
- Style: existing UNPRO Cinematic Dark (`#050816`, glass `rgba(255,255,255,0.04)` blur 24px, radii 28/18/999, easing `cubic-bezier(.22,1,.36,1)`)
- Mobile-first

### 6. Security & safety
- All sending server-side only (service role)
- RLS as above
- Per-contact dedupe key `(contact_id, template_key, idempotency_key)` unique → prevents duplicate sends
- Per-contact rate limit (max 1 SMS / 4h, max 3 emails / 24h) enforced in `contact-router`
- Twilio Lookup cache to control cost
- Strict consent gates (`sms_consent`, `email_consent`) — non-bypassable
- Suppressed emails already blocked by existing `send-transactional-email`

### 7. Out of scope (Phase 2)
- AI best-time / best-channel optimizer
- WhatsApp / RCS channels
- Reply parsing / auto-responder
- Per-tenant rule overrides

## Success criteria
- `contact-router` called from any feature picks the right channel deterministically
- Mobile + consent → SMS first, email fallback after delay if undelivered
- Landline/no-mobile → email first
- 100% of attempts visible in `/admin/communications` live feed
- No duplicate sends under retry
- Existing pipelines (outbound, Alex, quotes) routed through one entry point

## Files

### Migration
- `supabase/migrations/<ts>_smart_contact_router.sql`

### Edge functions (new)
- `supabase/functions/contact-router/index.ts`
- `supabase/functions/twilio-lookup-phone/index.ts`
- `supabase/functions/contact-router-fallback-cron/index.ts`
- `supabase/functions/twilio-status-webhook/index.ts`

### Frontend
- `src/lib/communications/router.ts` (SDK)
- `src/lib/communications/types.ts`
- `src/pages/admin/PageAdminCommunications.tsx`
- `src/components/admin/communications/CardRoutingRule.tsx`
- `src/components/admin/communications/PanelLiveActivityFeed.tsx`
- `src/components/admin/communications/PanelChannelMetrics.tsx`
- `src/components/admin/communications/DrawerContactInspector.tsx`
- Route entry in `src/app/router.tsx` + admin nav link

### Wiring (light touch — replace direct send calls with router)
- Contractor abandoned onboarding follow-up
- Quote follow-up sender
- Alex post-chat follow-up

## Confirmation needed before build
1. Use existing `send-transactional-email` for email leg (recommended) vs spin a new sender — I'll use existing.
2. Twilio Lookup cost (~$0.005/lookup) — cache 90 days OK?
3. Default fallback delay = 60 min as in your spec — confirmed?

Reply **go** to start Phase 1 (migration + `contact-router` + `twilio-lookup-phone` + `/admin/communications` shell). Wiring of existing pipelines comes in Phase 2 once the router is proven.