// refresh-template-winner — recomputes outreach_template_metrics + designates a winner
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MIN_SENDS_FOR_WINNER = 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const templateKeys = ["war_room_variant_a", "war_room_variant_b", "war_room_variant_c"];
    const variantOf: Record<string, string> = {
      war_room_variant_a: "A",
      war_room_variant_b: "B",
      war_room_variant_c: "C",
    };

    const rollups: Array<{
      template_key: string;
      variant: string;
      sent_count: number;
      delivered_count: number;
      clicked_count: number;
      registered_count: number;
      activated_count: number;
      is_winner: boolean;
      computed_at: string;
    }> = [];

    for (const key of templateKeys) {
      const { data: logs } = await supabase
        .from("contractor_outreach_logs")
        .select("lead_id, status, clicked_at")
        .eq("template_key", key)
        .eq("channel", "sms");

      const rows = (logs as Array<{ lead_id: string; status: string; clicked_at: string | null }> | null) ?? [];
      const sent = rows.length;
      const delivered = rows.filter(r => r.status === "delivered" || r.status === "clicked").length;
      const clicked = rows.filter(r => r.clicked_at).length;

      const leadIds = [...new Set(rows.map(r => r.lead_id))];
      let registered = 0;
      let activated = 0;
      if (leadIds.length) {
        const { data: leads } = await supabase
          .from("contractor_leads")
          .select("id, onboarding_started_at, paid_at")
          .in("id", leadIds);
        for (const l of (leads as Array<{ onboarding_started_at: string | null; paid_at: string | null }> | null) ?? []) {
          if (l.onboarding_started_at) registered++;
          if (l.paid_at) activated++;
        }
      }

      rollups.push({
        template_key: key,
        variant: variantOf[key],
        sent_count: sent,
        delivered_count: delivered,
        clicked_count: clicked,
        registered_count: registered,
        activated_count: activated,
        is_winner: false,
        computed_at: new Date().toISOString(),
      });
    }

    // Winner: highest activation rate among variants with ≥ MIN_SENDS_FOR_WINNER
    const eligible = rollups.filter(r => r.sent_count >= MIN_SENDS_FOR_WINNER);
    if (eligible.length > 0) {
      const winner = eligible.reduce((best, cur) => {
        const rateBest = best.activated_count / best.sent_count;
        const rateCur = cur.activated_count / cur.sent_count;
        return rateCur > rateBest ? cur : best;
      });
      for (const r of rollups) r.is_winner = r.template_key === winner.template_key;
    }

    const { error } = await supabase
      .from("outreach_template_metrics")
      .upsert(rollups, { onConflict: "template_key" });
    if (error) throw error;

    return new Response(JSON.stringify({ rollups }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[refresh-template-winner]", e);
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
