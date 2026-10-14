// Reveal the active Twilio Messaging Service: SID, friendly name,
// currently configured inbound webhook URL, status callback, and attached phone numbers.
// Compares with expected URLs and links to the exact Twilio Console page.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
  const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
  const MG = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") || "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

  const expected_inbound_url = `${SUPABASE_URL}/functions/v1/twilio-inbound`;
  const expected_status_callback = `${SUPABASE_URL}/functions/v1/twilio-status-v2`;

  const missing: string[] = [];
  if (!SID) missing.push("TWILIO_ACCOUNT_SID");
  if (!TOKEN) missing.push("TWILIO_AUTH_TOKEN");
  if (!MG) missing.push("TWILIO_MESSAGING_SERVICE_SID");
  if (missing.length) {
    return new Response(JSON.stringify({ ok: false, error: `Missing secrets: ${missing.join(", ")}`, expected_inbound_url, expected_status_callback }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const auth = "Basic " + btoa(`${SID}:${TOKEN}`);
  const base = `https://messaging.twilio.com/v1/Services/${MG}`;

  async function get(path: string) {
    const t0 = Date.now();
    const r = await fetch(path, { headers: { Authorization: auth } });
    const text = await r.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* */ }
    return { ok: r.ok, status: r.status, latency_ms: Date.now() - t0, body: json ?? text };
  }

  const service = await get(base);
  const phones = await get(`${base}/PhoneNumbers?PageSize=50`);

  const svc = service.body && typeof service.body === "object" ? service.body : {};
  const inbound_request_url = svc.inbound_request_url || null;
  const inbound_method = svc.inbound_method || null;
  const status_callback = svc.status_callback || null;
  const friendly_name = svc.friendly_name || null;

  const phone_list = Array.isArray(phones.body?.phone_numbers)
    ? phones.body.phone_numbers.map((p: any) => ({
        sid: p.sid,
        phone_number: p.phone_number,
        country_code: p.country_code,
        capabilities: p.capabilities,
      }))
    : [];

  const canonical_from = "+14503286776";
  const canonical_attached = phone_list.some((p) => p.phone_number === canonical_from);

  return new Response(
    JSON.stringify({
      ok: service.ok,
      messaging_service_sid: MG,
      friendly_name,
      inbound_request_url,
      inbound_method,
      status_callback,
      expected_inbound_url,
      expected_status_callback,
      matches_expected_inbound: inbound_request_url === expected_inbound_url,
      matches_expected_status_callback: status_callback === expected_status_callback,
      phone_numbers: phone_list,
      canonical_from,
      canonical_attached,
      twilio_console_url: `https://console.twilio.com/us1/develop/sms/services/${MG}/integration`,
      twilio_console_senders_url: `https://console.twilio.com/us1/develop/sms/services/${MG}/senders`,
      raw: { service, phones },
    }, null, 2),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
});
