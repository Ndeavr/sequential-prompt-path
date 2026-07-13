// Admin-only end-to-end SMS test. Sends a templated message to ADMIN_TEST_PHONE
// via canonical _shared/twilioSend.ts and tracks the full run in sms_test_runs.

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
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const userId = userData?.user?.id;
    if (!userId) return json({ error: "unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "forbidden" }, 403);

    // Rate limit: max 1 test SMS every 5 minutes across the whole system
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recent } = await admin
      .from("sms_test_runs")
      .select("id,created_at")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1);
    if (recent && recent.length > 0) {
      const ageSec = Math.floor((Date.now() - new Date(recent[0].created_at).getTime()) / 1000);
      const waitSec = Math.max(1, 300 - ageSec);
      return json({
        ok: false,
        error_code: "RATE_LIMITED",
        error_message: `Rate limit: attendez ${waitSec}s avant le prochain test.`,
      }, 429);
    }

    let body: { to?: string } = {};
    try { body = await req.json(); } catch { /* empty */ }
    const to = body.to || Deno.env.get("ADMIN_TEST_PHONE") || "";
    if (!to) return json({ error: "missing_admin_test_phone" }, 400);

    // Create test run row up-front
    const { data: run } = await admin.from("sms_test_runs").insert({
      triggered_by: userId, phone: to, queued_at: new Date().toISOString(),
    }).select("id").single();

    const stamp = new Date().toLocaleTimeString("fr-CA");
    const result = await sendSms({
      to,
      body: `UNPRO · test de livraison SMS ${stamp}. Si vous lisez ceci, le pipeline fonctionne.`,
      message_type: "test",
      template_key: "sms_admin_test",
      metadata: { triggered_by: userId, source: "sms-admin-test", test_run_id: run?.id },
    });

    const isOk = result.status === "sent" || result.status === "queued" || result.status === "delivered";
    await admin.from("sms_test_runs").update({
      event_id: result.event_id,
      message_sid: result.twilio_sid,
      sent_at: isOk ? new Date().toISOString() : null,
      failed_at: !isOk ? new Date().toISOString() : null,
      error: result.error_message ?? null,
      updated_at: new Date().toISOString(),
    }).eq("id", run!.id);

    return json({
      ok: isOk, test_run_id: run?.id, event_id: result.event_id,
      twilio_sid: result.twilio_sid, status: result.status,
      error_code: result.error_code ?? null, error_message: result.error_message ?? null,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
