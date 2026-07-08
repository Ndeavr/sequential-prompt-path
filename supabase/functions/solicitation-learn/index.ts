// solicitation-learn — nightly: aggregate 7d stats, update variant weights, snapshot daily row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const { data: rows } = await sb.from("contractor_outreach_queue").select("message_variant, category, city, sent_at, clicked_at, registered_at, activated_at").gte("sent_at", since);
    const list = rows ?? [];

    // Per variant aggregation
    const byVariant: Record<string, { sent: number; clicked: number; activated: number }> = {};
    for (const r of list) {
      const v = r.message_variant || "?";
      byVariant[v] ??= { sent: 0, clicked: 0, activated: 0 };
      if (r.sent_at) byVariant[v].sent++;
      if (r.clicked_at) byVariant[v].clicked++;
      if (r.activated_at) byVariant[v].activated++;
    }

    // Update weights (floor 0.2, boost by activation rate)
    for (const [code, s] of Object.entries(byVariant)) {
      const activationRate = s.sent > 0 ? s.activated / s.sent : 0;
      const weight = Math.max(0.2, 0.5 + activationRate * 10);
      await sb.from("solicitation_message_variants").update({ weight }).eq("code", code);
    }

    // Daily snapshot
    const today = new Date().toISOString().slice(0, 10);
    const todayRows = list.filter((r: any) => r.sent_at?.startsWith(today));
    const revenueCents = todayRows.filter((r: any) => r.activated_at).length * 100;
    await sb.from("solicitation_daily_stats").insert({
      stat_date: today,
      sent: todayRows.length,
      clicked: todayRows.filter((r: any) => r.clicked_at).length,
      registered: todayRows.filter((r: any) => r.registered_at).length,
      activated: todayRows.filter((r: any) => r.activated_at).length,
      revenue_cents: revenueCents,
    });

    return json({ ok: true, variants: byVariant, revenue_today_cents: revenueCents });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
