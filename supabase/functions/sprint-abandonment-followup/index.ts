// First-Dollar Sprint — abandonment follow-up.
// Runs every 5 minutes via cron. Sends ONE SMS to prospects who opened
// checkout 15-45min ago and never paid. One follow-up per prospect.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOLLOWUP_COPY =
  "Une question sur l'activation 1 $ ? Répondez ici, un humain répond en moins de 15 minutes. — UNPRO";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();
  const lo = new Date(now - 45 * 60_000).toISOString();
  const hi = new Date(now - 15 * 60_000).toISOString();

  // Candidates: opened checkout in the window
  const { data: opened } = await supabase
    .from("first_dollar_sprint_events")
    .select("prospect_id, city, campaign_variant, created_at, metadata")
    .eq("event", "checkout_opened")
    .gte("created_at", lo)
    .lte("created_at", hi);

  if (!opened?.length) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ids = opened.map((r) => r.prospect_id).filter(Boolean);

  // Exclude those who paid or already got a follow-up
  const { data: excluded } = await supabase
    .from("first_dollar_sprint_events")
    .select("prospect_id, event")
    .in("event", ["checkout_paid", "followup_sent"])
    .in("prospect_id", ids as string[]);

  const excludeSet = new Set((excluded ?? []).map((r) => r.prospect_id));
  const targets = opened.filter((r) => r.prospect_id && !excludeSet.has(r.prospect_id));

  let sent = 0;
  for (const t of targets) {
    // Load phone from war_prospects
    const { data: p } = await supabase
      .from("war_prospects")
      .select("mobile_phone, phone")
      .eq("id", t.prospect_id)
      .maybeSingle();
    const phone = p?.mobile_phone || p?.phone;
    if (!phone) continue;

    // Best-effort SMS send via existing outbound function
    try {
      await supabase.functions.invoke("outbound-send-sms", {
        body: { to: phone, message: FOLLOWUP_COPY, tag: "sprint_followup" },
      });
      sent += 1;
      await supabase.from("first_dollar_sprint_events").insert({
        event: "followup_sent",
        prospect_id: t.prospect_id,
        campaign_variant: t.campaign_variant,
        city: t.city,
        category: "isolation",
        metadata: { copy: FOLLOWUP_COPY },
      });
    } catch (_) {
      /* ignore */
    }
  }

  return new Response(JSON.stringify({ processed: targets.length, sent }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
