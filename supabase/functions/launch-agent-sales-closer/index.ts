/**
 * launch-agent-sales-closer — INTERESTED/BOOK_CALL → CHECKOUT_SENT.
 * Recommends plan based on visibility score + generates Stripe checkout link.
 */
import { corsHeaders, adminClient, transitionLead, logLaunchEvent } from "../_shared/launch.ts";
import { reportOutcome, FailureCode } from "../_shared/reliability.ts";
import { sendSms as sendSmsCanonical } from "../_shared/twilioSend.ts";

// CANONICAL PRICING — plan codes only; amounts and Stripe price IDs come from
// `public.plans` via _shared/planCatalog.ts. No hardcoded amounts here.
import { resolvePlan, planLineItem, planMetadata } from "../_shared/planCatalog.ts";

/** Returns a CANONICAL plan code (see public.plans). */
function recommendPlan(score: number): string {
  if (score >= 80) return "pro";
  if (score >= 60) return "premium";
  if (score >= 40) return "domination";
  return "pro"; // safe default for low-visibility (lots of upside)
}

async function createCheckout(lead: any, planKey: string): Promise<string | null> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return null;

  let plan;
  try {
    plan = await resolvePlan(adminClient(), planKey);
  } catch (e) {
    console.error("[sales-closer] plan resolution failed:", e instanceof Error ? e.message : e);
    return null;
  }

  let item;
  try {
    item = planLineItem(plan, "month");
  } catch (e) {
    console.error("[sales-closer] stripe price missing:", e instanceof Error ? e.message : e);
    return null;
  }

  const params = new URLSearchParams();
  params.append("mode", "subscription");
  params.append("line_items[0][quantity]", "1");
  params.append("line_items[0][price]", item.price);
  params.append("success_url", "https://app.unpro.ca/entrepreneur/active?launch=1");
  params.append("cancel_url", "https://app.unpro.ca/entrepreneur");
  params.append("metadata[launch_lead_id]", lead.id);
  for (const [k, v] of Object.entries(planMetadata(plan))) {
    params.append(`metadata[${k}]`, String(v));
  }
  if (lead.email) params.append("customer_email", lead.email);

  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!r.ok) return null;
  const data = await r.json();
  return data.url ?? null;
}

async function sendCheckoutSms(phone: string, url: string, name?: string | null, lead_id?: string): Promise<boolean> {
  const fn = (name ?? "").split(/\s+/)[0] || "Bonjour";
  const body = `${fn}, voici votre lien d'activation UNPRO sécurisé: ${url}`;
  const r = await sendSmsCanonical({ to: phone, body, message_type: "outreach", template_key: "launch_closer_checkout", lead_id });
  return r.status === "sending" || r.status === "queued";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const batch = Math.min(Number(body.batch ?? 10), 25);
  const sb = adminClient();

  const { data: leads } = await sb
    .from("launch_leads")
    .select("*")
    .eq("lead_status", "REPLIED")
    .in("reply_classification", ["INTERESTED", "BOOK_CALL"])
    .order("last_event_at", { ascending: true })
    .limit(batch);

  let sent = 0, failed = 0;
  for (const lead of leads ?? []) {
    try {
      const score = (lead as any).payload?.visibility?.score ?? 50;
      const planKey = recommendPlan(score);
      const url = await createCheckout(lead, planKey);
      if (!url) {
        failed++;
        await logLaunchEvent({
          lead_id: (lead as any).id, agent: "launch-agent-sales-closer",
          event: "checkout_create_failed", success: false,
        });
        continue;
      }
      const phone = (lead as any).phone;
      if (phone) await sendCheckoutSms(phone, url, (lead as any).company_name, (lead as any).id);

      await transitionLead((lead as any).id, "CHECKOUT_SENT", {
        payload: {
          ...((lead as any).payload ?? {}),
          checkout: { url, plan: planKey, sent_at: new Date().toISOString() },
        },
      }, "launch-agent-sales-closer");
      sent++;
    } catch (e) {
      failed++;
      await logLaunchEvent({
        lead_id: (lead as any).id, agent: "launch-agent-sales-closer",
        event: "closer_exception", success: false, message: String(e),
      });
    }
  }

  await reportOutcome({
    operation: "launch.closer.run",
    outcome: sent > 0 ? "achieved" : "partial",
    failure_code: failed > 0 ? FailureCode.UNKNOWN : null,
    payload: { sent, failed },
  });

  return new Response(JSON.stringify({ ok: true, sent, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
