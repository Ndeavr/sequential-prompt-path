## UNPRO — Phone Validation + Manual Contact Verification

Two connected modules: (1) global SMS→Email fallback driven by line-type validation, (2) admin queue to manually verify and contact ambiguous leads.

---

### Module 1 — Global Phone Validation + SMS/Email Fallback

**Goal:** Zero SMS attempts on landlines. Every outbound contact attempt picks the right channel automatically.

**1.1 Twilio Lookup connector**
Use the existing Twilio connection (Lookup v2 endpoint `/Lookup/v2/PhoneNumbers/{e164}?Fields=line_type_intelligence`). Returns `mobile | landline | voip | fixedVoip | nonFixedVoip`.

**1.2 New edge function `phone-validate`**
- Input: `phone` (raw or E.164), optional `contact_id`
- Steps: `normalizePhone()` → if invalid → return `invalid`; else cache lookup in `phone_carrier_cache` (already exists, extend); call Twilio Lookup; persist `phone_type`, `carrier`, `validated_at`
- Output: `{ phone_e164, phone_type, channel_preference, valid }`
- Cache TTL: 90 days (line type rarely changes)

**1.3 Shared decision helper `_shared/contactChannel.ts`**
```
pickChannel({phone_type, email, sms_consent, email_consent}) →
  mobile + sms_consent → "sms"
  landline → "email"
  voip → "sms_then_email"
  invalid/none + email → "email"
  none → "invalid"
```

**1.4 Wire into `contact-router` (existing `src/lib/communications/router.ts`)**
Before any send: call `phone-validate` if `phone_type` missing on the contact, then apply `pickChannel`. `channel_override` still wins. Log channel decision + reason to `communication_logs`.

**1.5 Auto-fallback on failure**
- VOIP SMS failure (Twilio error codes 30003/30004/30005/30006) → automatically enqueue email send with same `template_key`
- Add `fallback_chain` JSON column to `communication_logs` to record the cascade

**1.6 Apply everywhere**
Audit and route through `sendViaRouter`:
- Onboarding contractor invites
- Secondary OTP (when primary email fails)
- Outbound prospecting (`outbound_messages`, `growth_outbound_messages`, `agent_outreach_messages`)
- Reminders (`contractor_followup_queue`, `acquisition_followup_queue`, `launch_followup_schedule`)
- Autonomous agents (`launch-commander`, `outbound-autopilot-*`)

**1.7 Sequence rules (new `outbound_send_window_policy` entries)**
- `mobile`: SMS T0 → Email T+1d
- `landline`: Email T0 → Email T+3d → Contact form T+5d
- `voip`: SMS T0 → on fail Email T+0 → Email T+3d

**1.8 Dashboard `/admin/outreach` cards (extend existing analytics page)**
SMS Sent · SMS Failed · Landlines Detected · Emails Sent · Email Fallback Success · Missed SMS-on-Landline Prevented

---

### Module 2 — `/admin/contact-verification`

**2.1 Tables**

`contact_verification_queue` — fields per spec (business_name, contact_person_name, role, email, phone, phone_type, website, google_business_url, rbq_number, rbq_business_name, rbq_status, neq_number, neq_business_name, neq_status, match_confidence, match_reasons jsonb, verification_status, best_contact_method, manual_contact_priority_score, last_contacted_at, next_followup_at, notes, assigned_to, source_lead_id, source_table, created_at, updated_at).

`contact_verification_notes` — id, contact_verification_id, admin_id, note, created_at.

GRANTs to `authenticated` + `service_role`; RLS: admin-only via `has_role(auth.uid(),'admin')`.

**2.2 Enrichment trigger**
New edge function `contact-verification-enqueue` invoked when a lead is enriched (called from existing enrichment functions and from a backfill batch). Logic:
- Compare `business_name` vs `rbq_business_name`, `neq_business_name`, website domain, GBP name (Jaro-Winkler ≥ 0.92 = match)
- Compare `contact_person_name` vs RBQ officer / NEQ admin / website contact / email username
- Compute `match_confidence` (high/medium/low/conflict) per the rules in the spec
- Call `phone-validate` to set `phone_type`
- Compute `best_contact_method` via `pickChannel`
- Compute `manual_contact_priority_score`: +30 verified RBQ, +20 verified NEQ, +20 email present, +15 landline-with-email, +10 strong Google reviews (≥4.3 & ≥20), +15 priority trade (roofing/insulation/plumbing/electrical/HVAC/mold/foundation/windows/landscaping/reno), +10 priority region (Mtl/Laval/Rive-Nord/Rive-Sud/Lanaudière/Laurentides), -50 duplicate exists

**2.3 Admin page `src/pages/admin/AdminContactVerification.tsx`**
- Route `/admin/contact-verification` (add to `routesConfig.ts` + router)
- Top cards: Total · Needs Review · Verified · Contacted · Replied · Landline+Email · No Email · Conflicts · High-Priority
- Filter pills: All / New / Needs Review / Verified / Contacted / Replied / Landline Only / Email Available / No Email / Conflict / High / Medium / Low
- Table: Company · Contact · Email · Phone (badge=type) · RBQ · NEQ · Confidence badge · Recommended channel · Status · Last contacted · Next follow-up
- Click row → side `Sheet` with Identity, Verification, Actions (Mark Verified/Conflict/Wrong Contact/Replied/Reject; Send Email via router; Call manually [hidden if `phone_type=landline` → "Call landline"]; Open Website/GBP/RBQ/NEQ links; Add Note; Schedule Follow-Up)
- Note thread chronological

**2.4 Status automation**
Send Email → `verification_status='contacted'`, `last_contacted_at=now()`, `next_followup_at=now()+3d`. Other actions per spec. Never auto-delete uncertain contacts — always route conflicts to manual review.

**2.5 Channel guards in UI**
- `phone_type=landline` → hide SMS button, show "Call manually", prioritize Email CTA
- `phone_type=mobile` → SMS + Email enabled
- No email → show "Contact form" / "Phone call" only

---

### Files

**Created**
- `supabase/functions/phone-validate/index.ts`
- `supabase/functions/contact-verification-enqueue/index.ts`
- `supabase/functions/_shared/contactChannel.ts`
- `supabase/migrations/<ts>_phone_validation_and_contact_verification.sql` (extend `phone_carrier_cache`, extend `communication_logs.fallback_chain`, create the 2 verification tables + GRANTs + RLS + trigger for `updated_at`, seed `outbound_send_window_policy` sequences)
- `src/pages/admin/AdminContactVerification.tsx`
- `src/components/admin/contactVerification/{QueueTable,RowDetailSheet,NotesThread,PriorityCards,FilterPills}.tsx`
- `src/hooks/useContactVerificationQueue.ts`

**Edited**
- `src/lib/communications/router.ts` — auto-validate, apply `pickChannel`, log fallback chain
- `supabase/functions/contact-router/index.ts` — same on server side; VOIP-fail → email fallback
- `src/config/routesConfig.ts` + `src/app/router.tsx` — register `/admin/contact-verification`
- `src/pages/admin/AdminOutreachAnalytics.tsx` — add 6 new cards
- Enrichment functions (`outbound-*-enrich*`, `aipp-import-*`) — call `contact-verification-enqueue` after writing leads
- Memory: new `mem://features/phone-validation-channel-routing.md` + index entry

### Out of scope
- Building a new contact-form auto-submit (T+5 step logs as task only)
- LinkedIn scraping (use existing data if already enriched)
- Re-validating numbers older than 90 days (handled by cache TTL expiry naturally)

### Secrets
Twilio is already connected — no new secret required.
