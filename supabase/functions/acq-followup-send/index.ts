// Sends a follow-up email using a sequence template via Resend (if configured) or just logs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { contractor_id, sequence_code } = await req.json();
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: contractor } = await sb.from("acq_contractors").select("*").eq("id", contractor_id).single();
    if (!contractor?.email) throw new Error("contractor_no_email");
    const { data: seq } = await sb.from("acq_email_sequences").select("*").eq("code", sequence_code).single();
    if (!seq) throw new Error("sequence_not_found");

    const subject = seq.subject;
    const html = seq.body_html.replace(/{{company}}/g, contractor.company_name);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    let providerId: string | null = null;
    let status = "sent";
    let error: string | null = null;

    if (apiKey && resendKey) {
      try {
        const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "X-Connection-Api-Key": resendKey,
          },
          body: JSON.stringify({
            from: "UNPRO <noreply@unpro.ca>",
            to: [contractor.email],
            subject,
            html,
          }),
        });
        const j = await r.json();
        if (!r.ok) { status = "failed"; error = JSON.stringify(j); }
        else providerId = j.id || null;
      } catch (e: any) {
        status = "failed"; error = String(e?.message ?? e);
      }
    } else {
      status = "queued";
      error = "no_email_provider_configured";
    }

    await sb.from("acq_email_logs").insert({
      contractor_id,
      sequence_code,
      recipient_email: contractor.email,
      subject,
      status,
      provider_message_id: providerId,
      error,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });

    return new Response(JSON.stringify({ ok: status === "sent", status, error }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
