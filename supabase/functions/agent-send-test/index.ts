/**
 * agent-send-test — admin-only test send. Returns raw provider response.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhoneQc(raw: string): string | null {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

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
      const normalized = normalizePhoneQc(phone);
      if (!normalized) return new Response(JSON.stringify({ ok: false, error: "invalid_phone", phone_raw: phone }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const sid = Deno.env.get("TWILIO_ACCOUNT_SID"); const tok = Deno.env.get("TWILIO_AUTH_TOKEN");
      const msgSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID"); const from = Deno.env.get("TWILIO_PHONE_NUMBER");
      if (!sid || !tok || (!msgSid && !from)) {
        return new Response(JSON.stringify({ ok: false, error: "missing_secret", details: { sid: !!sid, token: !!tok, msgSid: !!msgSid, from: !!from } }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const params = new URLSearchParams({ To: normalized, Body: message });
      if (msgSid) params.set("MessagingServiceSid", msgSid); else params.set("From", from!);
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${btoa(`${sid}:${tok}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      const data = await r.json().catch(() => ({}));
      return new Response(JSON.stringify({ ok: r.ok, status: r.status, recipient: normalized, provider_response: data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (channel === "email") {
      const lov = Deno.env.get("LOVABLE_API_KEY"); const res = Deno.env.get("RESEND_API_KEY");
      if (!lov || !res) return new Response(JSON.stringify({ ok: false, error: "missing_secret" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${lov}`, "X-Connection-Api-Key": res },
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
