# CRM activation messages — targeted code-only repair

## Confirmed defect and change

The existing `crm-recovery-action/index.ts` contained invented demand and up-to-five guaranteed appointment copy in two templates and three subjects. Its four email branches now reuse `emailHtml`, `emailText` and `emailSubject` from the existing server offer mirror, rather than introducing another sender or template engine.

- Actions: `send_email`, `onboarding_email`, `payment_email`, email variant of `send_activation_link`.
- Base offer: CAD350 once, profile plus 12 months of UNPRO Présence IA, zero appointments by default; conditional Quebec GST CAD17.50 and QST CAD34.91, total CAD402.41. Separate appointment agreements are explicitly distinct; no unchecked client quote fields are used to promise a volume.
- Same exact prospect-linked `/unpro/activate/:token` URL retained. Lookup errors, malformed, expired and revoked tokens block without silently replacing the stored token.
- Stored delivered prospects are skipped before commercial messaging gates and token writes.
- HTML identity and link interpolation escaped; explicit plain-text equivalent supplied; email shell fits the mobile viewport.
- `purpose=commercial_outreach` and stable `campaign=crm_activation_350` reuse the existing atomic recipient/campaign sender reservation across CRM recovery actions. Sender's service-role, gate, suppression, human-review, domain, postal-address, unsubscribe and provider-id checks are unchanged.
- No migration, Stripe changes, customer writes, sender deployment, publication or external-provider call.

## Files

- `supabase/functions/crm-recovery-action/index.ts`
- `supabase/functions/_shared/offerCopy.ts`
- `src/test/crm-recovery-message.test.ts`
- `AGENTS.md`, `roadmap.md`, this audit

`src/lib/copy/offer350.ts` already has the correct public base offer and was compared, not rewritten. Other offers and SMS dispatch paths remain unchanged.

## Verification

- Source verifier passed against the active integration source; no manual Git fetch/commit or branch changes.
- First run: 46/46 passed. After adding inactive-token protection: **49/49 passed, 3 suites, zero failures** (`crm-recovery-message`: 19; existing sender guard: 23; activation links: 7).
- Tests execute the actual CRM handler reconstructed in a VM with synthetic database/auth/provider adapters. Cover every email branch, preserved exact link, inactive/malformed token, failed lookup, anonymous 401, contact-permission refusal, delivered skip, duplicate action and read-only dry-run. Existing sender tests cover suppressed/missing-reviewed-CASL/gate-OFF refusals, simultaneous claim and bounded retry. These are not hosted DB/RLS/provider proof.
- Playwright 390×844: synthetic generated HTML, all requests intercepted; literal injected markup never creates an image; exact CTA preserved; no horizontal overflow. Screenshot `/tmp/browser/crm-message/mobile.png` inspected. This is email rendering, not authenticated full-stack activation QA or inbox delivery.
- Automatic harness log: build OK at 23:19:42 UTC; diff whitespace check passed. Standalone frontend typecheck was not run: harness manages compilation/type verification; no separate typecheck result claimed.

## Production read-only observations after tests

Master switch and global/autonomous recruitment controls remain false; autopilot remains gated at 30 with `no_recent_e2e_pass,operational_score_below_95`. Sicard is already recorded delivered and must not be re-invited. Maple Wood's evidence remains without human review. Sent email log count since task start is zero. No provider delivery or deployment inferred from these records.

Remaining release blockers: genuine human CASL approval, active licence/source revalidation where required, genuine isolated hosted QA of CTA/auth/consent/unsubscribe and subsequent explicit release authorization. Owner-provided domain proof is already saved; no additional owner confirmation requested. Local passing mocks never open the gate.