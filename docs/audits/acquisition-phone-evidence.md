# Bounded acquisition phone-evidence correction

Source inspected: `b6f7889f4d050f24958194d49cc328e57ef8195a`, verified by `verify:source`.

## Delivered locally

`acquisition-phone-evidence.patch` proposes changes only to existing files:

- `enrich-official-website/caslFirstParty.ts`: exact visibly published phone observations using existing pinned HTTPS transport, robots rules, refusal checks, hash/excerpt and bounded crawl. Explicit capture uses an existing canonical prospect, destination uniqueness, suppression and limited maintenance-service fit. Capture goes through `captureCaslEvidence`, never sets reviewer identity or changes legal eligibility, contact records, gates or line classification. Construction and missing category fail closed.
- `enrich-official-website/index.ts`: explicit admin-session-only action `capture_phone_casl`; UUID and strict input validation; default dry run. Service credentials cannot initiate this action. Existing recheck/auth remains intact.
- `send-verified-batch/index.ts`: fix demonstrated dry-run writes to rejected explicit candidates and pipeline logs; separate candidate count from provider readiness. Tier C never means ready. Closed gate returns zero; open gate remains `not_verified` until the complete canonical sender checks are proven. No sender/Stripe/claim/CRM/cron logic changes.

## Deployment boundary

No active Edge files changed. Managed Edge edits automatically deploy; green local tests do not prove hosted transport/provider safety. The patch stays outside auto-deployed directories. No database migration is needed for the supported canonical anchors. Applying/releasing this patch requires a separate deployment decision after independent review and isolated hosted QA.

## Evidence and legal boundaries

Read-only database metadata confirmed admin RLS and service policies on existing consent evidence. The human-review trigger requires the actual signed-in admin as reviewer, a substantive reason, HTTPS and first-party source for public-conspicuous approval. Existing signatures and historical sources remain unchanged.

The existing panel already renders phone consent evidence, source and blockers. No new CRM, form, table, RPC or pipeline is introduced. Capture is not consent; existing sender checks remain authoritative. First-party observation supports only publication, never mobile classification or licence validation.

The report must not imply that a 25-record evidence-ready batch exists. Current canonical anchors, service scope, source publication, suppression and destination capability each remain separate requirements. Operational snapshot is supplied separately without raw phones or personal information.

## Validation

- Four focused suites: **62/62 passed** (19 staged phone/preview, 33 existing first-party, 4 existing authenticated handler, 6 prefix).
- Staged source is reconstructed against actual files; stale patch contexts fail the tests.
- Gate OFF: zero provider calls; unknown/landline/mobile never counted ready. Explicit missing candidates: zero dry-run updates/logs. Capture: pending-only, exact publication, duplicates/opt-out/invalid/no construction licence/refusal/third-party negatives.
- `git diff --check`: passed.
- Latest automatic preview build: **build OK**, 2026-10-26 11:34:48 UTC. No manual build or standalone full typecheck run.
- Hosted capture, mobile authenticated capture/review and provider-confirmed delivery: **not run**. No outbound, paid lookup, checkout, approval, migration, flag/cron/queue write or publication.

## Residual limitations

Canonical phones must already be unambiguous and normalized; missing or shared anchors refuse capture. Only narrowly scoped maintenance categories are supported by this bounded proposal. A complete provider-ready preview has not been implemented: open-gate results remain explicitly unverified rather than optimistically counted. Read-only preview does not reserve quota; the existing atomic sender remains the final authority. Current first-party recheck on hosted code remains email-only until separate release.

## Founder action

Use the existing `/admin/commercial-eligibility` review surface. Do not sign third-party evidence or infer mobile capability from an area code. After approved release and real pending capture, review each source once there; retain outbound switches OFF until separate delivery QA and a bounded sending authorization.