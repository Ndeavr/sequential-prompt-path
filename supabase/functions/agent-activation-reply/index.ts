/**
 * agent-activation-reply
 * Triggered after an inbound SMS reply is ingested. Classifies intent via
 * Lovable AI, picks a plan, creates a Stripe checkout, and sends the link
 * back to the lead via SMS (with email fallback).
 *
 * Body: { reply_id: string }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PlanCode = "recrue" | "pro" | "premium" | "elite" | "signature";

function pickPlan(aippScore: number | null | undefined): PlanCode {
  const s = aippScore ?? 50;
  if (s >= 80) return "elite";
  if (s >= 65) return "premium";
  if (s >= 50) return "pro";
  return "recrue";
}

async function classifyIntent(reply: string): Promise<{ intent: string; confidence: number }> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { intent: "unknown", confidence: 0 };
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Classifie l'intention d'une réponse SMS d'un entrepreneur. Réponds en JSON: {intent: 'interested'|'not_interested'|'question'|'stop'|'unknown', confidence: 0..1}." },
          { role: "user", content: reply.slice(0, 500) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const data = await r.json();
    const txt = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(txt);
    return { intent: parsed.intent ?? "unknown", confidence: Number(parsed.confidence ?? 0) };
  } catch {
    return { intent: "unknown", confidence: 0 };
  }
}

import { sendSms as sharedSendSms } from "../_shared/twilioSend.ts";

async function sendSms(to: string, body: string, ctx?: { lead_id?: string }) {
  const res = await sharedSendSms({
    to, body, message_type: "onboarding", template_key: "activation_checkout_link",
    lead_id: ctx?.lead_id, metadata: { source: "agent-activation-reply" },
  });
  const ok = res.status === "sending" || res.status === "sent" || res.status === "delivered";
  return { ok, sid: res.twilio_sid ?? undefined, raw: { event_id: res.event_id, status: res.status, error: res.error_message } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const replyId = body?.reply_id as string | undefined;
    if (!replyId) return new Response(JSON.stringify({ error: "reply_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: reply } = await sb.from("outreach_replies").select("*").eq("id", replyId).maybeSingle();
    if (!reply) return new Response(JSON.stringify({ error: "reply not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { intent, confidence } = await classifyIntent(reply.body ?? "");

    // Persist intent on the reply
    await sb.from("outreach_replies").update({ intent, processed: true, metadata: { ...(reply.metadata ?? {}), confidence } }).eq("id", replyId);

    if (intent !== "interested") {
      await sb.from("activation_sessions").insert({
        lead_id: reply.lead_id, reply_id: replyId, intent, intent_confidence: confidence, status: "skipped",
      });
      return new Response(JSON.stringify({ ok: true, intent, action: "skipped" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load lead + AIPP score
    const { data: lead } = await sb.from("contractor_leads")
      .select("id, first_name, company_name, phone, mobile_phone, email, ai_visibility_score")
      .eq("id", reply.lead_id).maybeSingle();
    if (!lead) return new Response(JSON.stringify({ error: "lead missing" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const plan = pickPlan(lead.ai_visibility_score);

    // Build Stripe checkout
    const checkoutRes = await sb.functions.invoke("create-contractor-checkout", {
      body: { plan_code: plan },
    });
    const checkoutUrl = (checkoutRes.data as any)?.url as string | undefined;
    if (!checkoutUrl) {
      await sb.from("activation_sessions").insert({
        lead_id: lead.id, reply_id: replyId, intent, intent_confidence: confidence,
        recommended_plan: plan, status: "checkout_failed",
        metadata: { checkout_error: (checkoutRes.error as any)?.message ?? "no url" },
      });
      return new Response(JSON.stringify({ error: "checkout failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: session } = await sb.from("activation_sessions").insert({
      lead_id: lead.id, reply_id: replyId, intent, intent_confidence: confidence,
      recommended_plan: plan, checkout_url: checkoutUrl, status: "checkout_sent",
    }).select("id").single();

    // Send the link via SMS
    const phone = reply.from_address || lead.mobile_phone || lead.phone;
    const greeting = lead.first_name ? `${lead.first_name}, ` : "";
    const msg = `${greeting}voici votre lien sécurisé pour activer UNPRO (plan ${plan}) : ${checkoutUrl}\n— Alex d'UNPRO`;

    let providerId: string | undefined;
    if (phone) {
      const sms = await sendSms(phone, msg);
      providerId = sms.sid;
      await sb.from("outreach_delivery_logs").insert({
        lead_id: lead.id, channel: "sms", provider: "twilio",
        recipient_raw: phone, recipient_normalized: phone, message_body: msg,
        status: sms.ok ? "sent" : "failed",
        provider_message_id: sms.sid ?? null,
        error_code: sms.ok ? null : "activation_send_failed",
        metadata: { activation_session_id: session?.id, raw: sms.raw },
        sent_at: sms.ok ? new Date().toISOString() : null,
      });
    }

    await sb.from("contractor_leads").update({ pipeline_status: "CheckoutSent" }).eq("id", lead.id);

    return new Response(JSON.stringify({
      ok: true, intent, plan, checkout_url: checkoutUrl, provider_message_id: providerId,
      activation_session_id: session?.id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
