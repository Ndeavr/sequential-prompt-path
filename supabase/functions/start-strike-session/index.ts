import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { target_conversions = 1, target_category, target_city, max_targets = 100 } = await req.json();

    // Create session
    const now = new Date();
    const endTime = new Date(now.getTime() + 36 * 60 * 60 * 1000);

    const { data: session, error: sessionErr } = await supabase
      .from("strike_sessions")
      .insert({
        start_time: now.toISOString(),
        end_time: endTime.toISOString(),
        target_conversions,
        status: "active",
      })
      .select()
      .single();

    if (sessionErr) throw sessionErr;

    // Seed targets from contractor_prospects
    let query = supabase
      .from("contractor_prospects")
      .select("id, business_name, city, category_slug")
      .order("created_at", { ascending: false })
      .limit(max_targets);

    if (target_category) query = query.eq("category_slug", target_category);
    if (target_city) query = query.eq("city", target_city);

    const { data: prospects } = await query;

    if (prospects && prospects.length > 0) {
      const targets = prospects.map((p, i) => ({
        session_id: session.id,
        contractor_id: p.id,
        business_name: p.business_name,
        city: p.city,
        category: p.category_slug,
        priority_score: prospects.length - i,
        status: "new",
      }));

      await supabase.from("strike_targets").insert(targets);
    }

    // Create initial results row
    await supabase.from("strike_results").insert({ session_id: session.id });

    return new Response(JSON.stringify({ session_id: session.id, targets_seeded: prospects?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
