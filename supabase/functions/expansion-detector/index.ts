// Expansion Detector — finds active subscribers ready to upgrade.
// Daily cron. Signals: 14d+ active, no existing pending opportunity.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_LADDER: Record<string, string> = {
  recrue: "pro",
  pro: "premium",
  premium: "elite",
  elite: "signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Find contractors with active subscriptions older than 14 days.
  // Defensive: works whether subscriptions table exists with these fields or not.
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  let candidates: Array<{ contractor_id: string; current_plan: string }> = [];

  try {
    const { data } = await supabase
      .from("subscriptions")
      .select("contractor_id, plan, status, created_at")
      .eq("status", "active")
      .lt("created_at", fourteenDaysAgo)
      .limit(500);
    candidates = (data ?? [])
      .filter((s) => s.contractor_id && s.plan && PLAN_LADDER[s.plan])
      .map((s) => ({ contractor_id: s.contractor_id, current_plan: s.plan }));
  } catch (e) {
    console.warn("[expansion-detector] subscriptions table query failed", e);
  }

  let created = 0;
  for (const c of candidates) {
    const { data: existing } = await supabase
      .from("expansion_opportunities")
      .select("id")
      .eq("contractor_id", c.contractor_id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) continue;

    const recommended = PLAN_LADDER[c.current_plan];
    const { error } = await supabase.from("expansion_opportunities").insert({
      contractor_id: c.contractor_id,
      current_plan: c.current_plan,
      recommended_plan: recommended,
      signal: { rule: "14d_active_default_ladder", detected_at: new Date().toISOString() },
    });
    if (!error) created++;
  }

  return new Response(JSON.stringify({ scanned: candidates.length, created }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
