/**
 * agent-send-test — admin-only test send. Returns raw provider response.
 * Routes SMS through the unified twilioSend pipeline (sms_events_v2 audit).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendSms } from "../_shared/twilioSend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { channel, phone, email, body, subject } = await req.json();
    const message = body || "Test UNPRO — si vous recevez ceci, l'envoi fonctionne.";

    if (channel === "sms") {
      const res = await sendSms({
        to: phone,
        body: message,
        message_type: "test",
        template_key: "agent_send_test",
        metadata: { source: "agent-send-test", admin_user_id: userData.user.id },
      });
      const ok = res.status === "sending" || res.status === "sent" || res.status === "delivered";
      return new Response(JSON.stringify({ ok, status: res.status, event_id: res.event_id, twilio_sid: res.twilio_sid, error: res.error_message }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (channel === "email") {
      const lov = Deno.env.get("LOVABLE_API_KEY"); const rk = Deno.env.get("RESEND_API_KEY");
      if (!lov || !rk) return new Response(JSON.stringify({ ok: false, error: "missing_secret" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${lov}`, "X-Connection-Api-Key": rk },
        body: JSON.stringify({ from: "Alex d'UNPRO <alex@mail.unpro.ca>", to: [email], subject: subject || "Test UNPRO", html: `<p>${message}</p>` }),
      });
      const data = await r.json().catch(() => ({}));
      return new Response(JSON.stringify({ ok: r.ok, status: r.status, recipient: email, provider_response: data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "channel must be sms or email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
