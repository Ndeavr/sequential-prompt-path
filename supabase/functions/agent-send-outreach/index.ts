/**
 * agent-send-outreach
 * Draine outreach_messages status=pending, envoie via send-sms-prospect, respecte les quotas.
 */
import { corsHeaders, recordAgentRun, checkAndConsumeQuota } from "../_shared/agentRun.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(body.limit ?? 25, 50);

  const result = await recordAgentRun("send-outreach", async (db) => {
    const { data: msgs } = await db
      .from("agent_outreach_messages")
      .select("id, lead_id, channel, body, variant")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(limit);

    let sent = 0; let blocked = 0; let failed = 0;

    for (const m of msgs ?? []) {
      const globalOk = await checkAndConsumeQuota(db, m.channel as any, "global", "*",
        m.channel === "sms" ? 50 : m.channel === "email" ? 25 : 5);
      if (!globalOk) { blocked++; continue; }

      const { data: lead } = await db
        .from("contractor_leads")
        .select("id, phone, email, trade, category_primary, city")
        .eq("id", m.lead_id).maybeSingle();
      if (!lead) { failed++; continue; }

      const tradeCity = `${lead.trade ?? lead.category_primary ?? "_"}:${lead.city ?? "_"}`;
      const tcOk = await checkAndConsumeQuota(db, m.channel as any, "trade_city", tradeCity, 10);
      if (!tcOk) { blocked++; continue; }

      try {
        if (m.channel === "sms" && lead.phone) {
          const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms-prospect`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ to: lead.phone, body: m.body, lead_id: lead.id }),
          });
          if (!r.ok) throw new Error(`sms ${r.status}`);
        }
        await db.from("agent_outreach_messages").update({
          status: "sent", sent_at: new Date().toISOString(),
        }).eq("id", m.id);
        await db.from("contractor_leads").update({
          outreach_status: "contacted", lead_status: "contacted",
          last_agent_run_at: new Date().toISOString(),
        }).eq("id", lead.id);
        sent++;
      } catch (e) {
        failed++;
        await db.from("agent_outreach_messages").update({
          status: "failed", error: e instanceof Error ? e.message : String(e),
        }).eq("id", m.id);
      }
    }
    return { sent, blocked, failed, queue: msgs?.length ?? 0 };
  });

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: result.ok ? 200 : 500,
  });
});
