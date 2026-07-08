// outreach-diagnose-failure — returns human-readable root cause + recommended action for a log row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const ACTIONS: Record<string, string> = {
  "21211": "Normalize the recipient number to E.164 (+1XXXXXXXXXX) and retry manually, or drop the prospect.",
  "21610": "Recipient sent STOP. Add to suppression list. Do not retry.",
  "21614": "Number is a landline. Route to email/manual outreach instead.",
  "21408": "Region not enabled in Twilio. Enable Canada region in Twilio Console → Messaging → Geo Permissions.",
  "20003": "Auth failure. Verify TWILIO_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_FROM_NUMBER secrets and Messaging Service SID.",
  "21606": "TWILIO_FROM_NUMBER is not a valid outbound number. Provision one or use a Messaging Service SID.",
  "20429": "Twilio rate limit. Backoff 30s and retry.",
  "30001": "Twilio queue overflow. Backoff 5m and retry.",
  "30003": "Handset unreachable. Do not retry.",
  "30004": "Blocked by carrier. Do not retry.",
  "30006": "Landline / unreachable carrier. Do not retry.",
  network: "Network/transport error. Safe to retry.",
  http_408: "Request timeout. Retry.",
  http_429: "Rate limited. Backoff then retry.",
  http_500: "Provider internal error. Retry.",
  http_502: "Bad gateway. Retry.",
  http_503: "Service unavailable. Retry.",
  http_504: "Gateway timeout. Retry.",
  http_401: "Auth error. Rotate/verify TWILIO_API_KEY.",
  http_403: "Forbidden. Verify permissions on Twilio API key.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { log_id } = await req.json().catch(() => ({}));
    if (!log_id) return json({ error: "log_id required" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: log, error } = await sb
      .from("outreach_delivery_logs")
      .select("*")
      .eq("id", log_id)
      .maybeSingle();
    if (error) throw error;
    if (!log) return json({ error: "log not found" }, 404);

    let prospect: Record<string, unknown> | null = null;
    if (log.queue_id) {
      const { data: q } = await sb
        .from("contractor_outreach_queue")
        .select("company_name, city, category, phone, attempts, status")
        .eq("id", log.queue_id)
        .maybeSingle();
      prospect = q ?? null;
    }

    const code = log.error_code ?? "";
    const action = ACTIONS[code] ?? (log.retryable ? "Transient issue — safe to retry." : "Inspect raw provider response before retrying.");

    return json({
      log_id,
      prospect,
      phone: log.recipient_raw,
      phone_normalized: log.recipient_normalized,
      provider: log.provider,
      status: log.status,
      error_code: log.error_code,
      error_message: log.error_message,
      retryable: log.retryable,
      recommended_action: action,
      raw_response: log.raw_response,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
