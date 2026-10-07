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
- First contractor agreement is snapped server-side in `compute-pricing-quote` to the entry ladder (`ENTRY_TIERS`), with no appointment guarantee on a tier; the full computed price is logged only in `pricing_audit_log`. Why: low first-purchase friction without exposing the recipe.
