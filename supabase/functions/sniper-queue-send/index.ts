import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const targetId: string | null = body.targetId || null;
    const batchSize: number = body.batchSize || 20;

    let targetIds: string[] = [];

    if (targetId) {
      targetIds = [targetId];
    } else {
      // Batch mode: pick message_ready targets without existing queue entry
      const { data: readyTargets } = await supabase.from("sniper_targets")
        .select("id")
        .eq("outreach_status", "message_ready")
        .limit(batchSize);
      targetIds = (readyTargets || []).map((t: any) => t.id);
    }

    let queued = 0;
    let sent = 0;

    for (const tid of targetIds) {
      // Get selected message variant
      const { data: variant } = await supabase.from("sniper_message_variants")
        .select("*")
        .eq("sniper_target_id", tid)
        .eq("is_selected", true)
        .limit(1)
        .single();

      if (!variant) continue;

      // Get target for destination
      const { data: target } = await supabase.from("sniper_targets")
        .select("email, phone, recommended_channel")
        .eq("id", tid)
        .single();

      if (!target) continue;

      const destination = variant.channel === "sms" ? target.phone : target.email;
      if (!destination) continue;

      // Check no duplicate queue entry
      const { data: existing } = await supabase.from("sniper_send_queue")
        .select("id")
        .eq("sniper_target_id", tid)
        .eq("channel", variant.channel)
        .in("send_status", ["queued", "sent"])
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Create queue entry
      const { error: qErr } = await supabase.from("sniper_send_queue").insert({
        sniper_target_id: tid,
        message_variant_id: variant.id,
        channel: variant.channel,
        destination,
        send_status: "sent", // placeholder - real integration later
        sent_at: new Date().toISOString(),
      });

      if (qErr) continue;
      queued++;

      // Log engagement event
      await supabase.from("sniper_engagement_events").insert({
        sniper_target_id: tid,
        event_name: variant.channel === "sms" ? "sms_sent" : "email_sent",
        event_props: { variant_type: variant.variant_type },
      });

      // Update target status
      await supabase.from("sniper_targets").update({
        outreach_status: "sent",
        updated_at: new Date().toISOString(),
      }).eq("id", tid);

      sent++;
    }

    return new Response(JSON.stringify({ queued, sent, total: targetIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
