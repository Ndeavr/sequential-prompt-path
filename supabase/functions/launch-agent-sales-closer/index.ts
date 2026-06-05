/**
 * launch-agent-sales-closer — INTERESTED/BOOK_CALL → CHECKOUT_SENT.
 * Recommends plan based on visibility score + generates Stripe checkout link.
 */
import { corsHeaders, adminClient, transitionLead, logLaunchEvent } from "../_shared/launch.ts";
import { reportOutcome, FailureCode } from "../_shared/reliability.ts";

const PLANS = {
  Recrue:    { amount: 14900, label: "Recrue" },
  Pro:       { amount: 34900, label: "Pro" },
  Premium:   { amount: 59900, label: "Premium" },
  Elite:     { amount: 99900, label: "Élite" },
  Signature: { amount: 179900, label: "Signature" },
} as const;

function recommendPlan(score: number): keyof typeof PLANS {
  if (score >= 80) return "Pro";
  if (score >= 60) return "Premium";
  if (score >= 40) return "Elite";
  return "Pro"; // safe default for low-visibility (lots of upside)
}

async function createCheckout(lead: any, planKey: keyof typeof PLANS): Promise<string | null> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return null;
  const plan = PLANS[planKey];
  const params = new URLSearchParams();
  params.append("mode", "subscription");
  params.append("line_items[0][quantity]", "1");
  params.append("line_items[0][price_data][currency]", "cad");
  params.append("line_items[0][price_data][unit_amount]", String(plan.amount));
  params.append("line_items[0][price_data][recurring][interval]", "month");
  params.append("line_items[0][price_data][product_data][name]", `UNPRO ${plan.label}`);
  params.append("success_url", "https://app.unpro.ca/entrepreneur/active?launch=1");
  params.append("cancel_url", "https://app.unpro.ca/entrepreneur");
  params.append("metadata[launch_lead_id]", lead.id);
  params.append("metadata[plan]", planKey);
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

async function sendCheckoutSms(phone: string, url: string, name?: string | null): Promise<boolean> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const twilioKey = Deno.env.get("TWILIO_API_KEY");
  const from = Deno.env.get("TWILIO_FROM_NUMBER") ?? Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!lovableKey || !twilioKey || !from) return false;
  const fn = (name ?? "").split(/\s+/)[0] || "Bonjour";
  const body = `${fn}, voici votre lien d'activation UNPRO sécurisé: ${url}`;
  const r = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phone, From: from, Body: body }),
  });
  return r.ok;
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
      if (phone) await sendCheckoutSms(phone, url, (lead as any).company_name);

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
