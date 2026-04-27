## Auth Debug HUD (dev-only)

Goal: surface the exact failing step of any auth attempt without polluting prod, and without changing auth behavior.

### What you'll see (dev only)

A small chip bottom-right (next to the existing Alex V7 chip), expandable into a panel:

```text
🔐 AUTH DEBUG
auth_step       : oauth_callback / exchange_code
auth_method     : google
session_found   : ✅  user 7f3a…c401
redirect_target : /join/profile
last_error      : —
provider        : google
prelogin_role   : contractor
roles           : [contractor]
intent_path     : null
elapsed         : 2.3s
[Copy JSON] [Reset]
```

Updates live as the flow progresses: `idle → method_selected → submitting → otp_sent → callback_processing → exchange_code → session_resolved → role_resolved → redirecting → done` (or `error`).

### Files to create

1. `src/services/auth/authDebugBus.ts` — tiny pub/sub store (no extra deps) holding the current debug state. Exposes:
   - `authDebug.set(partial)` to merge fields
   - `authDebug.error(err, where)` to record `last_error` + step
   - `authDebug.reset()`
   - `useAuthDebug()` React hook (subscribes via `useSyncExternalStore`)
   - All writes are **no-ops in production** (`if (!import.meta.env.DEV) return`)
   - State shape: `{ auth_step, auth_method, session_found, user_id, redirect_target, last_error, provider, prelogin_role, roles, intent_path, started_at, updated_at, history: [{step, ts}] }`

2. `src/components/auth/AuthDebugHud.tsx` — floating chip + expandable panel, mirrors style of `AlexDebugPanel` (bottom-right instead of left, z-[200]). Renders `null` outside `import.meta.env.DEV`. Includes Copy JSON button.

### Files to instrument (small, surgical edits)

All edits gated on `import.meta.env.DEV` via the bus itself — production code path is unchanged.

- `src/components/auth/OAuthButtons.tsx` — on click: `set({ auth_step: 'oauth_initiating', auth_method: 'google' })`; on error: `error(e, 'oauth_initiating')`.
- `src/components/auth/GoogleSignInButton.tsx` — same instrumentation.
- `src/components/auth/LoginMagicLinkForm.tsx` — `submitting` → `magic_link_sent` or `error`.
- `src/components/auth/PhoneOtpForm.tsx` — `sms_sending` → `sms_sent` → `otp_verifying` → `otp_verified` / `error`.
- `src/pages/AuthCallbackPage.tsx` — set step at each phase: `callback_processing`, `exchange_code`, `session_resolved` (with `session_found` + `user_id`), `creating_profile`, `applying_prelogin_role`, `redirecting` (with `redirect_target`), and `error` on the catch block (records `last_error`).
- `src/components/auth/AuthReturnRouter.tsx` — on `SIGNED_IN`: `set({ auth_step:'signed_in', session_found:true, user_id, provider, prelogin_role, intent_path })`, then `roles_resolved` with the array, then `redirecting` with the computed target.
- `src/pages/join/PageContractorJoinProfileGate.tsx` — `gate_checking` → `gate_role_ensured` → `redirecting` / `error`.

### Mount the HUD

Add `<AuthDebugHud />` once in `src/app/App.tsx` (alongside existing dev panels). It self-hides in production.

### Constraints

- Zero changes to auth behavior, redirects, or timeouts.
- Zero deps added.
- Zero output in production builds (component returns null, bus setters bail early).
- No PII beyond user UUID and email domain (mask email local part as `a***@gmail.com`).

### Success criteria

- Trigger any failed login (bad OTP, OAuth cancel, missing role) → HUD shows the exact step + `last_error` + last redirect target.
- Production bundle: HUD tree-shaken / no-op (verified by `if (!import.meta.env.DEV) return null`).
- No console noise added beyond what `[AUTH_TRACK]` already emits.
