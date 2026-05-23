// send-outbound-test-email — real test send through the chosen mailbox
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let mailboxId = "";
  let recipient = "";
  try {
    const body = await req.json();
    mailboxId = String(body.mailboxId ?? "");
    recipient = String(body.recipient ?? "").trim();
    if (!mailboxId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return new Response(JSON.stringify({ error: "mailboxId et recipient (email valide) requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: mailbox, error: mbErr } = await supabase
    .from("outbound_mailboxes")
    .select("*")
    .eq("id", mailboxId)
    .maybeSingle();

  if (mbErr || !mailbox) {
    return new Response(JSON.stringify({ error: "Mailbox introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const start = Date.now();
  const subject = "UNPRO — Test d'envoi outbound";
  const text = `Test d'envoi depuis ${mailbox.sender_email} à ${new Date().toISOString()}.`;
  let ok = false;
  let providerResponse: any = null;
  let errMsg: string | null = null;

  try {
    const ct = mailbox.connection_type || mailbox.provider || "smtp";
    if (ct === "api_lovable" || mailbox.provider === "lovable_email") {
      const r = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-confirmation",
          recipientEmail: recipient,
          idempotencyKey: `outbound-test-${mailbox.id}-${Date.now()}`,
          templateData: { name: "Test outbound" },
        },
      });
      providerResponse = r.data ?? r.error ?? null;
      ok = !r.error;
      if (r.error) errMsg = r.error.message;
    } else if (ct === "api_resend") {
      const key = Deno.env.get("RESEND_API_KEY");
      if (!key) throw new Error("RESEND_API_KEY missing");
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: `${mailbox.sender_name} <${mailbox.sender_email}>`, to: [recipient], subject, text }),
      });
      providerResponse = await res.json().catch(() => null);
      ok = res.ok;
      if (!ok) errMsg = `Resend ${res.status}`;
    } else {
      // SMTP custom — sans credentials stockés on ne peut pas envoyer
      throw new Error("SMTP custom: credentials non configurés pour test send");
    }
  } catch (e: any) {
    ok = false;
    errMsg = e?.message ?? String(e);
  }

  const latency = Date.now() - start;

  await supabase.from("outbound_test_sends").insert({
    mailbox_id: mailbox.id,
    recipient,
    subject,
    status: ok ? "sent" : "failed",
    latency_ms: latency,
    provider_response: providerResponse,
    error_message: errMsg,
  });

  if (ok) {
    await supabase.from("outbound_mailboxes").update({
      last_test_send_at: new Date().toISOString(),
      last_test_latency_ms: latency,
      last_test_error: null,
      verified_at: new Date().toISOString(),
      mailbox_status: "verified",
      auth_status: "connected",
    }).eq("id", mailbox.id);
  } else {
    await supabase.from("outbound_mailboxes").update({
      last_test_send_at: new Date().toISOString(),
      last_test_latency_ms: latency,
      last_test_error: errMsg,
    }).eq("id", mailbox.id);
  }

  return new Response(JSON.stringify({ ok, latency, error: errMsg, providerResponse }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
