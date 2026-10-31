# Affiliate proposals — original staging report

Superseded for delivery status by `20261031_affiliate_proposal_delivery_report.md`. Original candidate was not applied: an additive replacement was reviewed, tested and applied instead.

## Verified locally
- Existing proposal/assignment identity distinction respected; assignment checks tested in isolated PostgreSQL.
- 35 tests pass: draft save/reload, attribution, anonymous and other-affiliate rejection, invalid/expired links, payment fields ignored, commissions and existing offer rules.
- Browser at 390px, all backend requests intercepted: assigned company → personalized draft → save → refresh → same inputs → client link → confirmed editable intake. No page errors. Client confirmation label overflow observed and corrected.
- Automatic preview build reports `build OK`; no separate manual build/typecheck.

## Changes
`AffiliateOffersPanel.tsx`, `proposalService.ts`, `ProposalContext.tsx`, company workspace, pricing intake/service, `Entry350FastCheckout.tsx`, `activation350Links.ts`, offer helpers/tests, AGENTS and roadmap.
Candidate SQL: `20261030_affiliate_proposal_drafts.sql`; server proposal/checkout patch: `20261030_affiliate_proposal_server.patch`.

## Blocking hosted completion
No SQL applied and no Edge patch deployed. Current hosted backend does not expose the new proposal RPCs, so the frontend fails explicitly rather than claiming a successful save. This is not publication-ready end-to-end.
Production backup integrity/preflight is not verified. Auth-session mint for the requesting account failed because no matching auth account exists; authenticated hosted checks were not substituted with a different account.
The candidate also sanitizes the legacy resolver: owner-only reloadable bearer is never returned in public payload. The isolated test verifies this exclusion. Hosted RLS, concurrency, claim/payment linkage and signed webhook attribution remain unverified and require release checks.
The staged Edge patch is not executed or certified; no paid state is set by draft saves. Tax/price/webhook policy unchanged.

No email, SMS, live checkout, payment, publication, historical data mutation or production migration performed.