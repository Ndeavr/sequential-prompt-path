// test-sms-direct — admin-only: send one SMS directly via Twilio (canonical sendSms helper).
// POST { phone: "+15142499522", body: "...", validate_only?: boolean }
// validate_only=true → checks auth + input, sends nothing.
import { sendSms } from "../_shared/twilioSend.ts";
import { requireAdminCaller, maskPhone } from "../_shared/requireAdminCaller.ts";
import { reportOutcome } from "../_shared/reliability.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b, null, 2), { status, headers: { ...cors, "content-type": "application/json" } });

const E164 = /^\+1[2-9]\d{2}[2-9]\d{6}$/; // NANP only (Canada/US)
const MAX_BODY = 320;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const caller = await requireAdminCaller(req, cors);
  if (!caller.ok) {
    await reportOutcome({
      operation: "sms.test_direct", outcome: "blocked", service: "twilio",
      block_reason: caller.response.status === 403 ? "forbidden" : "unauthorized",
      payload: { http_status: caller.response.status },
    } as any);
    return caller.response;
  }

  let input: any;
  try { input = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const phone = typeof input?.phone === "string" ? input.phone.replace(/[\s().-]/g, "") : "";
  const body = typeof input?.body === "string" ? input.body.trim() : "";
  const validateOnly = input?.validate_only === true;
  const errors: string[] = [];
  if (!E164.test(phone)) errors.push("phone must be E.164 NANP (+1XXXXXXXXXX)");
  if (!body) errors.push("body required");
  if (body.length > MAX_BODY) errors.push(`body max ${MAX_BODY} chars`);
  if (errors.length) return json({ ok: false, error: "invalid_input", details: errors }, 400);

  const audit = { user_id: caller.userId, caller_kind: caller.kind, to_masked: maskPhone(phone), body_length: body.length };

  if (validateOnly) {
    await reportOutcome({ operation: "sms.test_direct", outcome: "pending", service: "twilio",
      intent: "validate_only", payload: audit } as any);
    return json({ ok: true, validated: true, sent: false, ...audit });
  }

  try {
    const res = await sendSms({
      to: phone, body, message_type: "test", strict_admin_override: true,
      metadata: { source: "admin_test_sms_direct", requested_by: caller.userId },
    });
    const ok = !res.error_code;
    await reportOutcome({
      operation: "sms.test_direct", outcome: ok ? "achieved" : "failed", service: "twilio",
      failure_code: ok ? null : String(res.error_code), affected_record: res.event_id ?? null,
      payload: { ...audit, provider_status: res.status, twilio_sid: res.twilio_sid ?? null, error_message: res.error_message ?? null },
    } as any);
    return json({ ok, ...res });
  } catch (e) {
    await reportOutcome({ operation: "sms.test_direct", outcome: "failed", service: "twilio",
      failure_code: "EXCEPTION", payload: { ...audit, error: String((e as Error).message) } } as any);
    return json({ ok: false, error: "send_failed" }, 500);
  }
});
