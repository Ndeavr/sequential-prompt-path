// acq-followup-send — sends a follow-up email through Resend with mandatory dual-CTA.
// Uses the master AI Visibility sequences when sequence_code starts with "master_".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { wrapAllUrls, validateOutreachMessage, withReplyFooter } from "../_shared/ctaTracker.ts";
import { recordEmailEvent } from "../_shared/outreachEvents.ts";
import { MASTER_EMAIL_SEQUENCES } from "../_shared/masterOutreachCopy.ts";
import { sanitizeTags } from "../_shared/resendTags.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { contractor_id, sequence_code } = await req.json();
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: contractor } = await sb.from("acq_contractors").select("*").eq("id", contractor_id).single();
    if (!contractor?.email) throw new Error("contractor_no_email");

    let subject: string;
    let html: string;

    const masterFn = MASTER_EMAIL_SEQUENCES[sequence_code as keyof typeof MASTER_EMAIL_SEQUENCES];
    if (masterFn) {
      const built = masterFn({
        first_name: contractor.first_name ?? contractor.contact_name ?? null,
        business_name: contractor.company_name ?? contractor.business_name ?? null,
        slug: contractor.public_slug ?? null,
        prospect_id: contractor.id,
      });
      subject = built.subject;
      html = built.html;
    } else {
      const { data: seq } = await sb.from("acq_email_sequences").select("*").eq("code", sequence_code).single();
      if (!seq) throw new Error("sequence_not_found");
      subject = seq.subject;
      html = (seq.body_html || "").replace(/{{company}}/g, contractor.company_name ?? "");
    }

    // Append reply footer, wrap every internal URL through /r/, validate.
    html = withReplyFooter(html);
    const wrapped = await wrapAllUrls(html, {
      contractor_id, campaign: sequence_code, channel: "email",
    });
    const v = validateOutreachMessage(wrapped.body, "email");
    if (!v.ok) {
      await sb.from("acq_email_logs").insert({
        contractor_id, sequence_code, recipient_email: contractor.email,
        subject, status: "blocked", error: `BLOCKED: ${v.reason ?? "missing_cta"}`,
        sent_at: null,
      });
      return new Response(JSON.stringify({ ok: false, status: "blocked", reason: v.reason, error: "Email has no CTA link." }), {
        status: 422, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

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
            from: "Alex d'UNPRO <alex@mail.unpro.ca>",
            to: [contractor.email],
            subject,
            html: wrapped.body,
            tags: sanitizeTags([
              { name: "campaign", value: sequence_code },
              { name: "contractor_id", value: String(contractor_id) },
            ]),
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

    if (status === "sent" && providerId) {
      await recordEmailEvent(providerId, "sent", {
        recipient: contractor.email,
        contractor_id,
        campaign_id: sequence_code,
        template: sequence_code,
        subject,
      });
    }

    await sb.from("acq_email_logs").insert({
      contractor_id, sequence_code, recipient_email: contractor.email,
      subject, status, provider_message_id: providerId, error,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });

    return new Response(JSON.stringify({
      ok: status === "sent", status, error,
      cta_urls: wrapped.cta_urls, has_tracked_cta: wrapped.has_tracked_cta, has_reply_cta: v.has_reply_cta,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
