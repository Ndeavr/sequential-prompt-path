# Global Input Normalization

## Objective
Stop rejecting users for harmless formatting. Silently clean every input (email, phone, URL, postal, RBQ/NEQ, names, addresses) before validation, save the canonical value, and only reject if truly invalid after normalization.

## Current state
We already have piecemeal utilities — `cleanInput`, `cleanTextField`, `formatEmail`, `formatPhoneDisplay/Final/E164`, `formatWebsiteDisplay/Storage`, plus typed inputs (`EmailInput`, `PhoneInput`, `WebsiteInput`). They are inconsistent and not all forms use them. There is no central `normalizeInput(value, type)` and no postal/RBQ/NEQ normalizer.

## Deliverables

### 1. Central utility — `src/utils/normalizeInput.ts`
Single entry point used everywhere.

```ts
export type NormalizableType =
  | "email" | "phone" | "url" | "name" | "company"
  | "address" | "postal_code" | "rbq" | "neq"
  | "text" | "textarea";

export interface NormalizeResult {
  value: string;        // canonical normalized value (what we save)
  display?: string;     // optional pretty value to show back
  valid: boolean;       // after-normalization validity
  changed: boolean;     // true if we cleaned something
  reason?: string;      // why invalid (i18n key or FR copy)
}

export function normalizeInput(raw: string, type: NormalizableType, opts?: { maxLength?: number }): NormalizeResult;
```

Rules per type:
- **base** (all): strip zero-width/invisible unicode, normalize NBSP→space, smart quotes/dashes, collapse repeated spaces, trim.
- **email**: base + lowercase. Valid = RFC-lite regex. Truncate to 254.
- **phone**: strip everything non-digit, drop leading `1` if 11 digits, validate 10 digits → canonical `+1XXXXXXXXXX` (E.164). Display = `(XXX) XXX-XXXX`.
- **url**: base + lowercase host; repair `https //`, `http //`, `https:/`, `http:/`, `https:\\`, missing scheme. Strip trailing slash, strip `www.` for display but keep canonical `https://domain.tld[/path]`. Domain regex check.
- **name / company**: base + collapse double spaces + smart-case-safe (do not force case). Truncate 120.
- **address**: base, collapse spaces, keep commas. Truncate 200.
- **postal_code**: uppercase, strip all spaces/dashes, validate Canadian `A1A1A1`, output `A1A 1A1`.
- **rbq**: strip spaces/dashes, validate `\d{4}-?\d{4}-?\d{2}` (10 digits), output `XXXX-XXXX-XX`.
- **neq**: strip spaces/dashes, validate 10 digits, output as 10 digits.
- **text / textarea**: base only; textarea preserves single `\n` but collapses runs of blank lines to 2. Default truncate 5000.

`maxLength` override truncates safely (never on email/postal/rbq/neq/phone — those have hard formats).

### 2. Refactor existing utilities to delegate
`formatEmail`, `formatPhoneFinal`, `formatWebsiteStorage`, `formatPhoneDisplay` keep their public API but internally call `normalizeInput`. No breaking changes.

### 3. Add missing helpers
- `src/utils/formatPostal.ts` — `normalizePostal`, `isValidPostal`, `formatPostalDisplay`.
- `src/utils/formatRbqNeq.ts` — `normalizeRbq`, `normalizeNeq`, `isValidRbq`, `isValidNeq`.

### 4. Typed input components
- New: `PostalInput`, `RbqInput`, `NeqInput` (mirror `PhoneInput` pattern: format on change, finalize + validate on blur, error only after blur).
- Existing `EmailInput` / `PhoneInput` / `WebsiteInput`: ensure they all use `normalizeInput` and never reject during typing.

### 5. Form submission layer
`src/lib/forms/submitForm.ts`:
- Add `normalizeRow(payload)` that runs `normalizeInput` on known fields (`email`, `phone`, `website`, `postal_code`, `rbq_number`, `neq`, `first_name`, `last_name`, `company`, `city`, `address`, plus anything in `payload` matched by key heuristic).
- Save the normalized value. Keep raw only in `payload.__raw` if normalization changed something (audit), gated by a flag (off by default to keep payload clean).
- Validation runs **after** normalization.

### 6. Hook
`src/hooks/useNormalizedInput.ts` — generic replacement for ad-hoc state in forms:

```ts
const email = useNormalizedInput("", "email");
// { value, display, valid, onChange, onBlur, error }
```

### 7. Adoption sweep (no logic changes, just wiring)
Replace raw `<Input>` + manual validation in the following surfaces with the typed inputs / hook:
- Homeowner intake forms (`PageDecrireMonProjet`, quote/invoice upload metadata).
- Contractor onboarding (`src/pages/contractor/*`, `contractor-landing/*`, `entrepreneur/*`, profile completion drawer).
- Admin forms (activation flow, manual lead entry, sniper imports).
- Lead forms (lead-pipe, founder offer, instant audit funnel).
- Alex captured-fields drawer (`profileCompletionGate`).
- Contact forms (`PageWhyUnpro` contact, partner forms).
- Profile forms (homeowner & contractor profile edit).

For each: keep markup, swap input + onChange/onBlur to use the hook / typed component. No behavioral change beyond cleaner values.

### 8. Tests
`src/utils/__tests__/normalizeInput.test.ts` covering every success-criteria case:
- `unpro.ca` → `https://unpro.ca` ✓
- `https // unpro.ca` → `https://unpro.ca` ✓
- `http // unpro.ca`, `https:/unpro.ca`, `WWW.UNPRO.CA` → `https://unpro.ca`
- `(514) 555 - 1212` → `+15145551212` (display `(514) 555-1212`)
- `+1 514 555-1212`, `1.514.555.1212` → same
- `h1h1h1`, ` H1H 1H1 ` → `H1H 1H1`
- `Jean   Tremblay` → `Jean Tremblay`
- `  jean@FOO.COM ` → `jean@foo.com`
- RBQ `1234 5678 90`, `1234-5678-90` → `1234-5678-90`
- NEQ `1234 567 890` → `1234567890`
- Truncation: 10k-char `text` clipped to 5000, no rejection.

## Out of scope
- No DB migration (we already store free text in these columns).
- No edge-function changes (edge functions receive already-normalized values; we add a defensive `normalizeInput` call in `process-form-submission` only if needed — flagged as small follow-up).
- No copy/UX redesign — only silent cleaning + showing the cleaned display value on blur where the typed components already do it.

## Files

**New**
- `src/utils/normalizeInput.ts`
- `src/utils/formatPostal.ts`
- `src/utils/formatRbqNeq.ts`
- `src/components/ui/postal-input.tsx`
- `src/components/ui/rbq-input.tsx`
- `src/components/ui/neq-input.tsx`
- `src/hooks/useNormalizedInput.ts`
- `src/utils/__tests__/normalizeInput.test.ts`

**Edited**
- `src/utils/cleanInput.ts`, `formatEmail.ts`, `formatPhone.ts`, `formatWebsite.ts` (delegate to `normalizeInput`)
- `src/components/ui/email-input.tsx`, `phone-input.tsx`, `website-input.tsx` (route through normalizer)
- `src/lib/forms/submitForm.ts` (normalize payload before insert)
- Form pages listed in §7 — input swap only

## Success criteria (verbatim from request)
All examples in §8 pass tests; onboarding/contact/lead forms no longer reject for formatting; saved DB values are canonical (`https://…`, `+1…`, `H1H 1H1`, single-spaced names).
