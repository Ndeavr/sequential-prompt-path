/**
 * agent-activation-dispatch
 * Pour un lead intéressé, sélectionne le plan dynamique selon la saturation territoire,
 * appelle activation-create-checkout et envoie le lien.
 */
import { corsHeaders, recordAgentRun } from "../_shared/agentRun.ts";

function pickPlan(saturation: number, competitors: number): { slug: string; price: number } {
  if (saturation < 30 && competitors < 3) return { slug: "recrue", price: 149 };
  if (saturation > 70) return { slug: "premium", price: 599 };
  return { slug: "pro", price: 349 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { lead_id, triggered_by = "manual" } = await req.json().catch(() => ({}));
  if (!lead_id) return new Response(JSON.stringify({ error: "lead_id required" }), { status: 400, headers: corsHeaders });

  const result = await recordAgentRun("activation-dispatch", async (db) => {
    const { data: lead } = await db.from("contractor_leads").select("*").eq("id", lead_id).maybeSingle();
    if (!lead) throw new Error("lead not found");

    const trade = lead.trade ?? lead.category_primary;
    const { data: slot } = await db.from("acq_territory_slots")
      .select("saturation_percent, used_slots, max_slots, lock_status")
      .eq("trade", trade).eq("city", lead.city).maybeSingle();

    if (slot?.lock_status === "auto" || slot?.lock_status === "manual") {
      throw new Error("territory locked");
    }
    const saturation = Number(slot?.saturation_percent ?? 0);
    const competitors = Number(slot?.used_slots ?? 0);
    const plan = pickPlan(saturation, competitors);

    // Reuse existing checkout function
    const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/activation-create-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        lead_id, plan_slug: plan.slug, price_override_cad: plan.price,
        metadata: { source: "agent-activation-dispatch", saturation },
      }),
    });
    const checkout = await r.json();
    if (!checkout.url) throw new Error("no checkout url");

    const link = checkout.url as string;
    const sms = `${lead.first_name ?? lead.company_name}, votre activation UNPRO est prête (plan ${plan.slug.toUpperCase()} · ${plan.price}$/mois). Lien sécurisé: ${link}`;

    await db.from("outreach_messages").insert({
      recipient_id: lead_id, channel: "sms", body: sms, status: "pending",
      variant: "activation_link", scheduled_at: new Date().toISOString(),
    });
    await db.from("contractor_leads").update({
      outreach_status: "activation_sent", lead_status: "activation_sent",
      payment_status: "pending", last_agent_run_at: new Date().toISOString(),
    }).eq("id", lead_id);

    return { lead_id, plan: plan.slug, price: plan.price, checkout_url: link };
  }, triggered_by, { lead_id });

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: result.ok ? 200 : 500,
  });
});
