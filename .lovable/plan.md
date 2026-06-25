## Goal
Make every phone and website input across the app auto-format, accept any common variant, and stop rejecting users for harmless formatting (no leading https://, parentheses, dashes, +1, invisible characters, etc.).

## Current state
- `src/utils/normalizeInput.ts` already implements robust phone + URL normalization (strips +1, invisibles, NBSP, repairs scheme, lowercases host).
- `src/utils/formatPhone.ts` and `src/utils/formatWebsite.ts` wrap it.
- `src/components/ui/phone-input.tsx` and `src/components/ui/website-input.tsx` are drop-in replacements for `<Input type="tel|url" />`.
- Problem: many forms still use raw `<Input type="tel">` / `<Input type="url">` or call `new URL()` / regex directly, so the polished behavior never reaches the user.

## Changes

### 1. Tighten the shared utilities (small fixes to match the exact spec)
`src/utils/formatPhone.ts` → `formatPhoneDisplay`:
- Drop the lone `(` while typing 1–3 digits (return raw digits per user's `formatPhone` snippet).
- Keep `(###) ###-####` once ≥4 digits.

`src/utils/normalizeInput.ts` → `normUrl`:
- Accept bare hosts that include a path/query (`isroyal.ca/services?x=1`) — current regex already does, verify.
- When invalid, set `reason` to `"Adresse web invalide."` only if there is no dot in the host; never surface a "missing https://" message.
- Always store `https://host[/path]` (canonical) and expose `display` without scheme.

### 2. Migrate all phone call sites to `<PhoneInput>`
Replace raw `<Input type="tel" />` usages in:
- `src/components/alex-conversation/PanelAlexEntrepreneurOnboarding.tsx`
- `src/components/auth/PhoneOtpForm.tsx` (keep OTP digits-only second field)
- `src/components/entrepreneur-landing/v2/SectionFormV2.tsx`
- `src/components/go-live/FormGoogleBusinessLookup.tsx`
- `src/components/intent-funnel/ModalProfileCompletionGate.tsx`
- `src/pages/ContractorQuestionnairePage.tsx`
- `src/pages/PagePartenairesCertifies.tsx`
- `src/pages/entrepreneur/PageContractorPublicProfileISR.tsx`
- `src/pages/entrepreneur/PageEntrepreneurDiagnosticLanding.tsx`
- `src/pages/pricing/SignaturePlan.tsx`
- `src/pages/partner/PartnerLogin.tsx`, `PartnerNouveauEntrepreneur.tsx`

For each: keep state, swap the JSX, and on submit run `phoneToE164(value)` before persisting so the DB always gets `+15145551234` (E.164) while the UI shows `(514) 123-4567`.

### 3. Migrate all website call sites to `<WebsiteInput>`
Replace raw inputs / custom validators in:
- `src/components/verify/HeroBusinessVerifySearch.tsx`
- `src/pages/partner/PartnerNouveauEntrepreneur.tsx`
- `src/components/PanelContractorAdvisorAlex.tsx`
- `src/components/onboarding/StepImportSources.tsx`
- `src/pages/VerifyContractorPage.tsx`
- `src/components/admin/activation/StepEntrepriseSearch.tsx`
- `src/pages/pro/ProDomainIntelligence.tsx`
- `src/pages/pricing/SignaturePlan.tsx`
- `src/pages/AuditLandingPage.tsx` (the "Please enter a URL" / "isroyal.ca rejected" case — replace the manual validator with `formatWebsiteStorage(value)` and submit that to the audit edge function).

For each: store `formatWebsiteStorage(value)` (always `https://…`) before validation, edge calls, or DB writes; show `formatWebsiteDisplay(value)` in the UI.

### 4. Centralized cleaning before every submit
In each migrated form's submit handler, run `normalizeInput(value, "phone" | "url")` and block submit only if `!result.valid && result.value !== ""`. Never block solely on missing `https://`, parentheses, dashes, spaces, or `+1`.

### 5. Tests
Extend `src/utils/__tests__/normalizeInput.test.ts` with the exact examples from the request:
- Phones: `5141234567`, `514 123 4567`, `514-123-4567`, `(514)1234567`, `+1 514 123 4567`, `1-514-123-4567` → all yield `+15145551234` and display `(514) 123-4567`.
- URLs: `isroyal.ca`, `www.isroyal.ca`, `https://isroyal.ca`, `http://isroyal.ca/`, `isroyal.ca/services?x=1` → all yield `https://isroyal.ca[...]` and `valid === true`.

## Acceptance
- Typing any of the listed phone variants in any phone field auto-formats live to `(514) 123-4567`; DB receives `+15145551234`.
- Typing `isroyal.ca` (or any variant) anywhere submits successfully; no "Please enter a URL" error.
- Invisible characters, NBSP, smart quotes, leading/trailing spaces never cause a validation failure.
- All listed files compile and pass the new tests.
