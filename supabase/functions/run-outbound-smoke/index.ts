// run-outbound-smoke — orchestrated end-to-end smoke test:
// pick N sniper_targets (filtered) → generate assets → send → return full trace.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const body = await req.json().catch(() => ({} as any));
    const limit: number = Math.min(body.limit || 1, 10);
    const channel: string | null = body.channel || null; // 'email' | 'sms' | null
    const overrideEmail: string | null = body.overrideEmail || null;
    const overridePhone: string | null = body.overridePhone || null;
    const dryRun: boolean = body.dryRun === true;
    const trace: any[] = [];

    // 1) Select targets
    let q = supabase.from("sniper_targets")
      .select("id, business_name, email, phone, recommended_channel, outreach_status, sniper_priority_score")
      .in("outreach_status", ["not_started", "enriched", "message_ready"])
      .order("sniper_priority_score", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (channel) q = q.eq("recommended_channel", channel);

    const { data: targets, error: tErr } = await q;
    if (tErr) throw tErr;
    if (!targets || targets.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "no_eligible_targets", trace }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    trace.push({ step: "select_targets", count: targets.length, targets });

    // 2) Optionally override email/phone on first target (for safe testing)
    if (overrideEmail || overridePhone) {
      const updates: any = { updated_at: new Date().toISOString() };
      if (overrideEmail) updates.email = overrideEmail;
      if (overridePhone) updates.phone = overridePhone;
      await supabase.from("sniper_targets").update(updates).eq("id", targets[0].id);
      trace.push({ step: "override_contact", targetId: targets[0].id, updates });
    }

    // 3) Generate assets for each target
    for (const t of targets) {
      const r = await supabase.functions.invoke("sniper-generate-assets", { body: { targetId: t.id } });
      trace.push({ step: "generate_assets", targetId: t.id, result: r.data ?? r.error });
    }

    // 4) Send (one batch)
    for (const t of targets) {
      const r = await supabase.functions.invoke("sniper-queue-send", { body: { targetId: t.id, dryRun } });
      trace.push({ step: "queue_send", targetId: t.id, result: r.data ?? r.error });
    }

    // 5) Aggregate final state
    const ids = targets.map((t: any) => t.id);
    const { data: finalQueue } = await supabase
      .from("sniper_send_queue")
      .select("sniper_target_id, channel, destination, send_status, provider, provider_message_id, error_message")
      .in("sniper_target_id", ids)
      .order("created_at", { ascending: false });

    return new Response(JSON.stringify({
      ok: true,
      dry_run: dryRun,
      trace,
      queue: finalQueue || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
