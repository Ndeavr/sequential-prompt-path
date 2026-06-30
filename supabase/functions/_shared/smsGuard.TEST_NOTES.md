# smsGuard — Admin Allowlist Override

## Contract
- Env `ADMIN_SMS_ALLOWLIST` = comma-separated E.164 (e.g. `+15142499522,+15141111111`).
- Bypass is **only** triggered when the caller passes `strict_admin_override: true` to `validateBeforeSend()`.
- On override: returns `ok: true`, `phone_type = "mobile_override"`, `sms_guard_reason = "admin_allowlist_override"`.
- Opt-out check (`sms_opt_outs`) and blocked-pattern check still run **before** the override returns.
- Production prospect outreach paths (`acq-send-outreach`, autopilot, followup-engine, etc.) **never** pass `strict_admin_override` and therefore never trigger this bypass.

## Test note
- `+15142499522` MUST pass `smsGuard` only when `strict_admin_override = true` AND `ADMIN_SMS_ALLOWLIST` contains `+15142499522`.
- Without the flag, behavior is unchanged: Twilio Lookup runs and `phone_type=unknown` continues to block as `not_mobile`.
- Without the env entry, the flag alone does not bypass.

## Reference snippets

```ts
// Admin test surface (allowed):
await validateBeforeSend({ supabase, phone: "+15142499522", strict_admin_override: true });
// -> { ok: true, phone_type: "mobile_override", sms_guard_reason: "admin_allowlist_override", ... }

// Production prospect path (must remain unchanged):
await validateBeforeSend({ supabase, phone: prospect.phone, lead_id: prospect.id });
// -> normal Lookup-based mobile enforcement
```

## Audit log
Every override emits a single-line JSON `console.log` with `scope: "smsGuard"`, `sms_guard_reason: "admin_allowlist_override"`, `phone`, and `phone_type: "mobile_override"`, captured by Edge Function logs.
