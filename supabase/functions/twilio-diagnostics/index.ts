// UNPRO — Twilio diagnostics + smoke test for /admin/revenue-intelligence.
// GET  → returns sender config, Twilio number health, last 25 SMS events.
// POST → sends a smoke-test SMS to the requested admin phone via canonical sender.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendSms } from "../_shared/twilioSend.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const CANONICAL_FROM = "+14503286776";
const BLOCKED_FROM = "+15745405938";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const TWILIO_FROM_NUMBER = (Deno.env.get("TWILIO_FROM_NUMBER") ?? "").trim();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function twilioGet(path: string): Promise<any | null> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}${path}`;
  try {
    const r = await fetch(url, {
      headers: { Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}` },
    });
    return await r.json();
  } catch (e) {
    return { error: String(e) };
  }
}

async function loadNumberInfo() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return { available: false, reason: "twilio_creds_missing" };
  }
  const list = await twilioGet(`/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(CANONICAL_FROM)}`);
  const match = list?.incoming_phone_numbers?.[0];
  if (!match) return { available: false, reason: "number_not_found_in_account" };
  return {
    available: true,
    phone_number: match.phone_number,
    friendly_name: match.friendly_name,
    country: match.iso_country ?? null,
    sms_enabled: !!match.capabilities?.sms,
    mms_enabled: !!match.capabilities?.mms,
    voice_enabled: !!match.capabilities?.voice,
    sms_url: match.sms_url,
    status_callback: match.status_callback,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(SUPABASE_URL, SRK, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const to = String(body.to || "").trim();
      if (!to) return json({ ok: false, error: "missing_to" }, 400);
      const result = await sendSms({
        to,
        body: body.message || `UNPRO smoke test — ${new Date().toLocaleString("fr-CA")}. Répondez OUI pour confirmer la réception.`,
        message_type: "test",
        template_key: "admin_smoke_test",
        metadata: { source: "twilio-diagnostics", smoke: true },
      });
      return json({ ok: result.status !== "failed", result });
    }

    // GET → diagnostics snapshot
    const fromEnv = TWILIO_FROM_NUMBER || "(unset)";
    const senderOk = TWILIO_FROM_NUMBER === CANONICAL_FROM;
    const numberInfo = await loadNumberInfo();

    const { data: recent } = await sb
      .from("sms_events_v2")
      .select("id,twilio_sid,status,from_number,raw_phone,normalized_phone,template_key,campaign_id,contractor_id,message_preview,error_code,error_message,sent_at,delivered_at,failed_at,clicked_at,created_at,metadata")
      .order("created_at", { ascending: false })
      .limit(25);

    const counts: Record<string, number> = {};
    (recent || []).forEach((r: any) => { counts[r.status] = (counts[r.status] || 0) + 1; });

    return json({
      ok: true,
      sender: {
        env_value: fromEnv,
        canonical: CANONICAL_FROM,
        blocked_us_number: BLOCKED_FROM,
        env_matches_canonical: senderOk,
        status_callback_url: `${SUPABASE_URL.replace("supabase.co", "functions.supabase.co")}/functions/v1/twilio-status-v2`,
        inbound_webhook_url: `${SUPABASE_URL.replace("supabase.co", "functions.supabase.co")}/functions/v1/twilio-inbound`,
      },
      twilio_number: numberInfo,
      recent_count: recent?.length ?? 0,
      status_breakdown: counts,
      recent_messages: recent ?? [],
    });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 200);
  }
});
