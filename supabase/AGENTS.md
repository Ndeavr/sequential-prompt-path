# Backend rules (Supabase, edge functions, data)

## Remote data and migration safety

Treat every Supabase project as live infrastructure.

- Diagnostic requests are read-only unless the user explicitly asks for a change.
- Before any remote database write, verify the exact project identity, environment, connection host, target emptiness/expected state, authorization, rollback path, and backup integrity.
- Never restore into, modify, or test writes against the legacy/source project.
- Never bypass or weaken a target guard merely to make a migration proceed.
- Stop on the first unexpected SQL or access error. A failed guard means no write.
- Keep outbound email, SMS, calls, webhooks, cron jobs, queues, and other automations disabled during restoration and validation.
- Do not print, commit, or preserve plaintext secrets, signed access tokens, API keys, credentials, or personal data in logs.
- Do not read or display `.env` values unless the specific task requires one named value and the user authorized that access.
- A sanitized restoration copy may preserve Auth password hashes when explicitly approved, but must remove plaintext credentials and other operational secrets.
- After a migration milestone, update the local `.codex-private/MIGRATION_STATUS.md` with sanitized evidence, counts, checks, and the next safe action. Keep the public migration document generic and never include secrets.
- Prospect import (`import-contractors`) never overwrites an existing prospect: dedupe by google_place_id → E.164 → email → domain → name+city, admin/service only, `auto_send` defaults to false. Why: re-imports were resetting contacted prospects and could trigger sends.
- Every commercial SMS reserves a slot via `public.reserve_outreach_sms_slot` inside `_shared/twilioSend.ts` (hard ≤25/day America/Toronto, one per number per day). Why: per-dispatcher limits let 38 SMS leave when 11 were expected.
- QA accounts (e2e+…@unpro.ca or metadata e2e_test) always use the Stripe test key in `create-checkout-session` and fail closed without it. Why: a forgotten `?stripe_test=1` could create a live session.
- Every commercial SMS also requires a valid, unexpired `casl_consent_evidence` row (phone_sms, source_url + retrieved_at, no refusal) for the exact number, checked in `_shared/twilioSend.ts` before provider send, fail-closed. Why: CASL lawful basis must be auditable per send.
- First contractor agreement is snapped server-side in `compute-pricing-quote` to the entry ladder (`ENTRY_TIERS`); each tier's included monthly appointments come only from `resolveTierCommitment` (canonical budget solver: price chain, market ceiling, capacity, margin), and `create-checkout-session` refuses any paid quote with 0 included (`appointmentPlanPayable`), forwarding the same volume to Stripe metadata. The 350 activation never inherits a plan's volume. Why: a paid monthly appointment plan with 0 included appointments must never be sold.
- Commercial SMS CASL evidence must also carry a human `reviewer_id`; auto-captured rows (`auto_captured`, `is_valid`) are never a legal review. Why: 827 auto rows were dispatchable without any human decision.

- Stripe TEST events (livemode=false) may activate only QA-marked accounts (e2e_test / e2e+…@unpro.ca) and never feed contractor_leads; a second paid 350 $ session for an activated contractor is flagged as a duplicate, never re-activated. Why: QA payments must never create real commercial activations or double charges.
- Every SMS body passes `_shared/smsGreeting.ts` (`buildSmsGreeting` A prénom fiable / B équipe / C générique, `validateSmsBody` fail-closed inside `sendSms`) and the DB trigger `guard_agent_outreach_message` (invalid body never dispatchable, one open row per lead). Why: 36k pending drafts began with "Bonjour ," and the generator looped.
- CASL approval of `casl_consent_evidence` is signed only by an admin as themselves, with a ≥30-char reason and HTTPS source; `implicit_public_conspicuous` is approvable only for `company_website` sources (trigger `casl_evidence_human_review_guard`; client mirror `src/lib/casl/reviewRules.ts`). Why: 788 Google Places captures must never become a lawful basis by a click.
- `acquisition-discovery-cycle` requires service/admin auth for every call and is fail-closed on `recruitment_controls` (global_enabled AND autonomous_enqueue_enabled) via `_shared/recruitmentLocks.ts`, before any external call, run insert or import; trigger_source is derived from auth (`resolveTriggerSource`), never from the client body alone. Why: the 6h cron spent Google Places calls and queued prospects while recruitment locks were off, and runs were misrecorded as 'manual'.
- `twilio-status-v2` accepts only form-encoded callbacks with a valid X-Twilio-Signature over the public URL (SUPABASE_URL/functions/v1/twilio-status-v2 + query) plus the callback token; updates only pre-existing SIDs monotonically, unknown SIDs are ignored without writes. Why: the query token alone could forge delivered receipts if the URL leaked.
- Supplier/manufacturer B2B requests (/partenariats-fournisseurs) are written only by edge `submit-supplier-partnership` into `supplier_partnership_requests` (admin-read RLS, no client grants for insert, honeypot + IP-hash rate limit, no outbound email). Why: public form must not expose a writable table or trigger unapproved outreach.

Contractor publication, funnel and entitlement rules live in `supabase/functions/AGENTS.md`.
- Security-scan fixes tighten only: an open `true` policy is replaced by admin-read only when the table is proven empty and unused by client code, edge functions, views and SQL functions (row guard inside the migration); catalog/public or in-use tables wait for an explicit owner decision. Why: never break live flows or hide findings to unblock publication.
