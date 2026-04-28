// Nightly metrics rollup for /admin/omega.
// Aggregates yesterday's loop runs into a stat row for fast dashboards.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const today = new Date().toISOString().slice(0, 10);
  const { data: runs } = await supabase
    .from("omega_loop_runs")
    .select("phase, status, stats")
    .eq("loop_date", today);

  const summary = {
    phases_total: runs?.length ?? 0,
    phases_success: runs?.filter((r) => r.status === "success").length ?? 0,
    phases_failed: runs?.filter((r) => r.status === "failed").length ?? 0,
  };

  return new Response(JSON.stringify({ summary, date: today }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
