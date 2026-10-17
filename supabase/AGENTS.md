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
- Commercial SMS CASL evidence must also carry a human `reviewer_id`; auto-captured rows (`auto_captured`, `is_valid`) are never a legal review. Why: 827 auto rows were dispatchable without any human decision.

- Stripe TEST events (livemode=false) may activate only QA-marked accounts (e2e_test / e2e+…@unpro.ca) and never feed contractor_leads; a second paid 350 $ session for an activated contractor is flagged as a duplicate, never re-activated. Why: QA payments must never create real commercial activations or double charges.
- Every SMS body passes `_shared/smsGreeting.ts` (`buildSmsGreeting` A prénom fiable / B équipe / C générique, `validateSmsBody` fail-closed inside `sendSms`) and the DB trigger `guard_agent_outreach_message` (invalid body never dispatchable, one open row per lead). Why: 36k pending drafts began with "Bonjour ," and the generator looped.
- CASL approval of `casl_consent_evidence` is signed only by an admin as themselves, with a ≥30-char reason and HTTPS source; `implicit_public_conspicuous` is approvable only for `company_website` sources (trigger `casl_evidence_human_review_guard`; client mirror `src/lib/casl/reviewRules.ts`). Why: 788 Google Places captures must never become a lawful basis by a click.

## Contractor publication, funnel and entitlements

- Both paid 350 entry circuits reject free, unpaid, non-payment and underpaid sessions before paid telemetry or provisioning, using each existing creation contract's taxes. Why: a discounted Checkout can complete without collecting money.

- Contractor public state = generated column `contractors.public_status` (unpublished / published_pending_verification / verified_active = verified + admin_verified); Clara recommendations require verified_active; publishing auto-syncs `contractor_public_pages` via trigger. Why: publish right after payment without implying verification.
- Parcours entrepreneur = 3 étapes + confirmation : /entrepreneur/devis-personnalise (1 entreprise confirmée, 2 objectif annuel + RDV du mois prochain) → /entrepreneur/plan-personnalise/:id (3 entente de départ = plus petit plan couvrant la capacité du mois prochain, prix serveur) → confirmation webhook pricing_status=paid → /pro. Why: première entente rapide, pas forfait maximal.
- The CA$350 entry's 12-month Présence IA is resolved only by `contractor_plan_code()`: earliest `entry_activation_350_paid` ledger row cross-checked against a LIVE signed `stripe_webhook_events` payload (paid, 35000 CAD subtotal), voided by a `deactivated` stripe_webhook row (refund/dispute); subscriptions take precedence. Why: one entitlement source, no TEST/forged/replay extension.
