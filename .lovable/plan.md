## Root cause confirmed

`RESEND_API_KEY` contains a Lovable **connector** key (`lovc_…`), not a Resend **provider** key (`re_…`). Resend's API rejects it with HTTP 400 "API key is invalid" because the Bearer is syntactically valid but does not exist in Resend's registry. Every module reads the same env var (`Deno.env.get("RESEND_API_KEY")`), so the codebase is fine — only the secret value is wrong.

The `lovc_` prefix indicates this value came from the Lovable Resend **connector** (gateway-based). That key works only through `https://connector-gateway.lovable.dev/resend/...` with `Authorization: Bearer ${LOVABLE_API_KEY}` + `X-Connection-Api-Key: ${RESEND_API_KEY}`. Our edge functions call `https://api.resend.com` directly with the connector key as Bearer — that's the mismatch.

Two valid paths forward — please pick one before I implement.

---

## Path A — Replace with a real Resend API key (recommended, smallest blast radius)

Keep the direct `api.resend.com` calls everywhere; just store a real Resend key.

Steps:
1. Open the secure update form for `RESEND_API_KEY`. User pastes a real key from resend.com/api-keys (starts with `re_`, "Sending access" scope on the verified domain).
2. Auto-deployed functions reload the new secret.
3. Hardening (small code changes):
   - `outreach-health-agent.probeResend`: reject any key not starting with `re_` immediately as `RESEND_WRONG_KEY_TYPE` (avoids the 400 round-trip and gives an honest red).
   - `resend-key-diagnose`: add the same prefix gate to its report.
   - Honest scoring already in place: messaging stays ≤60 until a real send succeeds <24h.
4. Verification sequence (run from `/admin/outreach-health` once new key is saved):
   - `resend-key-diagnose` → expect `prefix=re_`, `/domains` 200, account id present.
   - "Tester envoi réel Resend" → real send to founder, `email_send_log` row with provider `id`.
   - Re-run `acq-e2e-real` (14 steps).
5. Green criteria (unchanged, just enforced):
   - `probe /domains` 200 + key prefix `re_`
   - Successful `email_send_log.sent` <24h with Resend message id
   - E2E PASS <24h

## Path B — Switch to the Lovable Resend connector (gateway)

Keep the `lovc_` key, refactor every sender to go through the gateway.

Steps:
1. Confirm `LOVABLE_API_KEY` is present (it already is).
2. Refactor 6 senders to use the gateway URL + dual-header pattern:
   - `outreach-resend-send`
   - `outreach-health-agent` (probe)
   - `resend-key-diagnose`
   - `acq-send-outreach`
   - `acq-send-invite`
   - `send-outbound-test-email` (+ any other call sites found in a final `rg RESEND_API_KEY` sweep)
3. Replace `from` domain handling so `SENDER_DOMAIN` matches the domain verified inside the connector.
4. Same verification sequence (diagnose → real send → E2E).

Path B is more invasive (6+ functions edited) and ties us to the connector's verified domain. Path A is one paste + 2 small guards.

---

## Files touched (Path A)

- `supabase/functions/outreach-health-agent/index.ts` — add `re_` prefix gate, map non-`re_` to `RESEND_WRONG_KEY_TYPE`, surface in `outreach_health_state.resend_last_error`.
- `supabase/functions/resend-key-diagnose/index.ts` — return `key_type: "lovable_connector" | "resend_provider" | "unknown"` plus a clear remediation string.
- `src/pages/admin/PageAdminOutreachHealth.tsx` — show the diagnosed key type with the remediation line (e.g. "Wrong key type — paste a re_… key").
- No migration needed (`resend_key_prefix`, `resend_key_length`, `resend_account_id` already exist).

No DB schema changes. No new edge functions. No changes to senders.

---

## Question for you

Pick **A** (paste a real `re_…` Resend key) or **B** (rewrite senders to use the Lovable connector gateway). I'll proceed the moment you answer.