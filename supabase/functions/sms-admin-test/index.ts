// Admin-only end-to-end SMS test. Sends a templated message to ADMIN_TEST_PHONE
// via the canonical _shared/twilioSend.ts pipeline and returns the event_id so
// the UI can poll sms_events_v2 for queued → sent → delivered.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendSms } from "../_shared/twilioSend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "unauthorized" }, 401);

    const userId = claims.claims.sub as string;
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    let body: { to?: string } = {};
    try { body = await req.json(); } catch { /* empty */ }
    const to = body.to || Deno.env.get("ADMIN_TEST_PHONE") || "";
    if (!to) return json({ error: "missing_admin_test_phone" }, 400);

    const stamp = new Date().toLocaleTimeString("fr-CA");
    const result = await sendSms({
      to,
      body: `UNPRO · test de livraison SMS ${stamp}. Si vous lisez ceci, le pipeline fonctionne.`,
      message_type: "test",
      template_key: "sms_admin_test",
      metadata: { triggered_by: userId, source: "sms-admin-test" },
    });

    return json({
      ok: result.status !== "failed" && result.status !== "blocked" && result.status !== "invalid_phone",
      event_id: result.event_id,
      twilio_sid: result.twilio_sid,
      status: result.status,
      error_code: result.error_code ?? null,
      error_message: result.error_message ?? null,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
