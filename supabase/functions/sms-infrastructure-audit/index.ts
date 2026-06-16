// Admin-only SMS infrastructure autodiagnostic. Returns checklist + 0-100 score.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await supabase.auth.getClaims(token);
    const uid = claims?.claims?.sub as string | undefined;
    if (!uid) return json({ error: "unauthorized" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "forbidden" }, 403);

    const sid = !!Deno.env.get("TWILIO_ACCOUNT_SID");
    const tok = !!Deno.env.get("TWILIO_AUTH_TOKEN");
    const msvc = !!Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
    const from = !!Deno.env.get("TWILIO_FROM_NUMBER");
    const supaUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const callbackUrl = `${supaUrl.replace("supabase.co", "functions.supabase.co")}/functions/v1/twilio-status-v2`;

    // Reachability probe
    let callbackReachable = false;
    try {
      const r = await fetch(callbackUrl, { method: "POST", body: "ping=1" });
      callbackReachable = r.status < 500;
      await r.text();
    } catch { /* offline */ }

    const { data: score } = await admin.rpc("sms_infrastructure_score");
    const s = (score ?? {}) as Record<string, unknown>;

    const checks = [
      { id: "twilio_sid", label: "Twilio Account SID", ok: sid },
      { id: "twilio_token", label: "Twilio Auth Token", ok: tok },
      { id: "messaging_service", label: "Messaging Service SID", ok: msvc || from },
      { id: "callback_url", label: "Callback URL configurée", ok: !!callbackUrl },
      { id: "callback_reachable", label: "Edge function twilio-status-v2 accessible", ok: callbackReachable },
      { id: "callback_received", label: "Dernier callback < 24h", ok: !!s.last_callback_at && (Date.now() - new Date(s.last_callback_at as string).getTime()) < 86400000 },
      { id: "test_recent", label: "Test E2E réussi < 24h", ok: !!s.last_test_success_at && (Date.now() - new Date(s.last_test_success_at as string).getTime()) < 86400000 },
      { id: "delivery_rate", label: "Taux de livraison 24h > 90%", ok: s.delivery_rate_24h === null || (s.delivery_rate_24h as number) >= 90 },
    ];

    return json({
      score: s.score ?? 0,
      status: s.status ?? "ERROR",
      callback_url: callbackUrl,
      checks,
      kpis: s,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
