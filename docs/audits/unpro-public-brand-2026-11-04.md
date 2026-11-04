# UNPRO public branding — targeted pass

## Applied in preview
- `src/pages/recruitment/PageCareers.tsx`: canonical `https://unpro.ca/carrieres`.
- `src/pages/recruitment/PageRecruitmentCloser.tsx`: canonical `https://unpro.ca/carrieres/representant`.
- `src/pages/recruitment/PageRecruitmentProgrammer.tsx`: canonical `https://unpro.ca/carrieres/programmeur`.
- Approved homepage metadata at c5c65d522 preserved. No UI, SDK, authentication or payment changes.

## Prepared, not applied or deployed
`docs/audits/unpro-public-brand-server-links-2026-11-04.patch` addresses three active server handlers without editing them:
- Design and booking checkout: reuse existing `resolveInvitedCheckoutOrigin`; LIVE always returns to `https://unpro.ca`, TEST retains vetted preview/local origins. This corrects the unsafe arbitrary request-Origin redirect rather than only replacing the fallback.
- Prospection link generation: fixed public base `https://unpro.ca`, never the request Origin. No stored links updated or campaign launched.
Active Edge edits deploy automatically, so applying this patch would violate the no-deployment instruction. Production server fallbacks therefore remain unchanged pending separately authorized release. Existing allowlists remain intact.

## Read-only Google OAuth findings
- Hosted Site URL verified: `https://unpro.ca`.
- Redirect allowlist includes `https://unpro.ca/**` and `https://www.unpro.ca/**`, plus required internal preview domains. No configuration changed.
- Existing Google button says “Continuer avec Google”, invokes the existing Lovable helper, and supplies `redirect_uri: window.location.origin`. Generated integration and `createLovableAuth` unchanged.
- The read-only tool does not expose Google enabled state, managed/BYOC mode, public client ID or actual Google consent branding. These remain unverified; the MCP OAuth server fields do not establish Google provider mode. No real or synthetic account was signed in, and no consent was submitted.
- Available Google parameters (`hd`, `prompt`, `login_hint`) do not rename the OAuth client. App code cannot remove the provider-owned consent identity.
- Founder action: More → Users → Auth settings → Sign In Methods → Google; inspect “Your own credentials”. To use UNPRO branding, configure an owned Google OAuth web client and its Google consent branding. Use `unpro.ca` as the owned authorized domain and the exact callback URL displayed in the Google provider settings (not an invented callback). Enter ID/secret privately in those settings; never paste secrets into chat. Complete Google verification when required, then validate with a synthetic QA account before switching a working connection. No credentials changed during this pass.

## Other classified occurrences
- Auth email hook: actual `SITE_URL` already `https://unpro.ca`; the unused legacy `SAMPLE_PROJECT_URL` is preview scaffolding, not a delivered link.
- Gateway URLs, webhook signature headers, provider identifiers and generated preview storage are technical integrations, retained.
- Contractor public asset helper recognizes a GitHub repository URL as an input pattern; this is not public copy and remains unchanged.
- `router-smoke-test` email contains “Provider : Lovable Email”; diagnostic template only, not changed or sent. No claim that every historical email or stored public URL has been corrected.
- Admin-only domain references retained. No hosted template/data inventory or campaign mutation performed.

## Checks actually performed
- Source verifier passes at c5c65d522; initial working tree clean.
- Existing `src/test/checkout-guards.test.ts`: 29/29 pass.
- 16 synthetic cases execute the proposed redirect expressions from the staged patch: LIVE canonical, TEST vetted local, unsafe TEST rejected. No provider request or transaction.
- Playwright: all three career routes expose one self-referencing canonical on unpro.ca; body text contains no Lovable; no JavaScript page exceptions. FR homepage exact approved title still present.
- Automatic harness reports build OK; no manual build/typecheck or full suite.
- Diff whitespace check passes. No publishing, deployment, emails/SMS, payments, sensitive configuration, or third-party campaign spending.

## Remaining blockers
Server patch release requires deployment authorization. Google custom branding requires founder-owned configuration and synthetic QA. No claim of complete removal from production or successful OAuth migration.