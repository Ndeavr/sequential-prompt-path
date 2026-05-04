# Twilio SMS OTP Login — UNPRO

## 0. Connector & Secrets

Twilio is available as a Lovable connector. Two paths:

- **Recommended**: Use the Twilio connector (gateway-based). Calls go through `https://connector-gateway.lovable.dev/twilio/Messages.json`. No raw SID/keys handled by the app; the gateway injects auth. We get `LOVABLE_API_KEY` + `TWILIO_API_KEY` automatically.
- **Manual secrets** (your spec): if you prefer raw Twilio SDK style, add 4 secrets: `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_MESSAGING_SERVICE_SID`. We'll then call Twilio REST API directly with HTTP Basic auth.

I'll implement using **the connector path** (cleaner, no secret rotation), and just store `TWILIO_MESSAGING_SERVICE_SID` as a single secret since the gateway needs the messaging service SID in the body. If you'd rather use raw secrets, say so before approving.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected in edge functions.

## 1. Database (migrations)

```sql
-- otp_codes
create table public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  ip text,
  created_at timestamptz not null default now()
);
create index on public.otp_codes (phone);
create index on public.otp_codes (expires_at);
alter table public.otp_codes enable row level security;
-- No policies → only service role (edge functions) can read/write.

-- sms_messages
create table public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  message_sid text unique,
  phone text,
  direction text check (direction in ('inbound','outbound')),
  body text,
  status text,
  intent text,
  provider text not null default 'twilio',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.sms_messages (phone);
create index on public.sms_messages (status);
alter table public.sms_messages enable row level security;
-- Admin-only read policy via has_role(auth.uid(),'admin').
```

`profiles` likely already exists — migration will `ADD COLUMN IF NOT EXISTS` for `phone` (unique), `onboarding_status`, and ensure `id` references `auth.users`. No destructive changes.

Rate limit table:
```sql
create table public.otp_rate_limits (
  key text primary key,           -- phone or ip
  window_start timestamptz not null default now(),
  count int not null default 0
);
```

## 2. Edge Functions

All in `supabase/functions/<name>/index.ts`, using `https://esm.sh/@supabase/supabase-js@2.49.1`, CORS headers, Zod validation, `verify_jwt = false`.

### `send-otp`
- Body: `{ phone }`. Normalize to E.164 (+1XXXXXXXXXX) using existing `phoneToE164` logic ported to Deno.
- Rate limit: max 3 sends / phone / 10min, max 10 / IP / hour.
- Generate 6-digit code, hash with SHA-256 + per-row salt (or bcrypt via `https://deno.land/x/bcrypt`).
- Invalidate previous unconsumed codes (`update ... set consumed_at = now() where phone = $1 and consumed_at is null`).
- Insert new row with `expires_at = now() + interval '5 minutes'`.
- Send SMS via Twilio gateway:
  ```
  POST https://connector-gateway.lovable.dev/twilio/Messages.json
  Authorization: Bearer ${LOVABLE_API_KEY}
  X-Connection-Api-Key: ${TWILIO_API_KEY}
  body: To=+1...&MessagingServiceSid=...&Body=...
  ```
- Body: `UNPRO 🔵\nVotre code sécurisé : 123456\n\nValide 5 minutes.\nNe partagez jamais ce code.`
- Insert outbound row in `sms_messages`.
- Return `{ ok: true }` (generic).

### `verify-otp`
- Body: `{ phone, code }`. Normalize phone.
- Fetch latest `otp_codes` row for phone where `consumed_at is null and expires_at > now()`.
- If `attempts >= 5` → return `too_many_attempts`.
- Increment attempts. Compare hash. On mismatch → `invalid_code`.
- On match → `consumed_at = now()`.
- Find user by phone in `auth.users` (admin API: `listUsers`/lookup) or in `profiles.phone`.
  - If exists → generate magic link / session via `supabase.auth.admin.generateLink({ type: 'magiclink' })` and return the action link, OR use `signInWithOtp` server-side flow to mint a session. Cleanest: use `admin.generateLink({ type: 'magiclink', email: synthetic_or_existing })`.
  - **Better**: create user with `admin.createUser({ phone, phone_confirm: true })` if not exists, then return a session via `admin.generateLink({ type: 'magiclink' })`. Note: Supabase doesn't expose direct session minting from edge; we'll return a short-lived **action link** the client redirects to (`verifyOtp` with hashed token), which establishes the session.
- Upsert `profiles` row: `phone`, `onboarding_status='phone_verified'`, default `role='homeowner'` only if missing.
- Return `{ ok: true, action_link, is_new_user }`.

### `twilio-inbound`
- Public webhook (`verify_jwt=false`). Parses `application/x-www-form-urlencoded`.
- Extract `From`, `Body`, `MessageSid`. Insert into `sms_messages` (direction='inbound').
- Classify intent: regex match on `STOP|HELP|AIDE|ARRÊT`, `entrepreneur|pro`, `proprio|maison`, `rdv|rendez-vous`. Save `intent`.
- Respond with TwiML when needed (e.g. STOP → empty, HELP → French help text).
- (Alex routing left as TODO hook; emits `system_events` row for now.)

### `twilio-status`
- Public webhook. Parses `MessageSid`, `MessageStatus`. Updates `sms_messages.status` and `updated_at`.

### `supabase/config.toml` additions
```toml
[functions.twilio-inbound]
verify_jwt = false
[functions.twilio-status]
verify_jwt = false
[functions.send-otp]
verify_jwt = false
[functions.verify-otp]
verify_jwt = false
```

## 3. Frontend

Reuse existing `LoginPageUnpro.tsx` structure — it already has a `phone` mode wired to `PhoneOtpForm`. We'll rewrite `src/components/auth/PhoneOtpForm.tsx` to:

- Step 1: Phone input with `(514) 555-1234` formatting (existing `useFormattedPhoneInput`).
  - CTA `Recevoir mon code` → invokes `send-otp`.
  - States: `idle | sending | sent | error`.
- Step 2: 6-digit OTP input (6 cells, auto-advance, paste support).
  - CTA `Confirmer` → invokes `verify-otp`.
  - States: `verifying | success | invalid | expired | rate_limited`.
  - Resend link with 30s cooldown.
- On success: read `action_link` → call `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })` to establish session, then redirect using existing `consumeAuthIntent` / `getResumePath(role)` logic already present in `LoginPageUnpro`.
- All copy in fr-CA. Microcopy: `Connexion sécurisée. Aucun mot de passe requis.`
- Mobile-first, dark cinematic theme (already applied via `AuthCardUnpro`).
- Accessibility: `inputMode="numeric"`, `autoComplete="one-time-code"`.

## 4. Admin Debug Panel

New route `/admin/sms-debug` (guarded by `RoleGuard` admin):
- Recent outbound OTP sends (last 50, masked phone).
- Failed Twilio sends (`status in ('failed','undelivered')`).
- Inbound replies with intent.
- Delivery status timeline per message.
- Phone normalization tester (input → normalized E.164).
- "Resend test" button (calls `send-otp` for an admin-entered phone, dry-run flag honored).
- No secrets ever displayed.

Hook: `useSmsDebug` querying `sms_messages` + `otp_codes` (RLS allows admins via `has_role`).

## 5. Twilio console setup (manual, by user)

After deploy, user must:
1. In Twilio Console → Messaging Service → **Integration** → Set inbound webhook to `https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/twilio-inbound`.
2. In each phone number's **Messaging** config → Status callback → `https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/twilio-status`.
3. Enable **SMS Pumping Protection** + tighten **Geo Permissions** to Canada/US only.

## 6. Files to create / edit

Create:
- `supabase/functions/send-otp/index.ts`
- `supabase/functions/verify-otp/index.ts`
- `supabase/functions/twilio-inbound/index.ts`
- `supabase/functions/twilio-status/index.ts`
- `src/pages/admin/SmsDebugPage.tsx`
- `src/hooks/useSmsDebug.ts`
- Migration: `otp_codes`, `sms_messages`, `otp_rate_limits`, profile column patches.

Edit:
- `src/components/auth/PhoneOtpForm.tsx` (rewrite for new edge flow).
- `supabase/config.toml` (function blocks).
- `src/config/routesConfig.ts` (add `/admin/sms-debug`).

## 7. Success criteria checklist

User enters phone → SMS arrives → enters 6-digit → session created → profile upserted → redirected via `consumeAuthIntent` → inbound replies stored with intent → delivery status tracked → admin panel shows everything → no secrets client-side → fr-CA → mobile-first.

---

**Before I build:** confirm you want the **Twilio connector** path (no manual SID/keys), or you prefer to add the 4 raw `TWILIO_*` secrets manually. Default if you just approve: **connector path**.