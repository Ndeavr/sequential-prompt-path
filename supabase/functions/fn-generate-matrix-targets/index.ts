import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch all clusters and primary activities
    const [{ data: clusters }, { data: activities }] = await Promise.all([
      supabase.from("cities_quebec_clusters").select("*").eq("status", "active"),
      supabase.from("activities_primary").select("*").eq("status", "active"),
    ]);

    if (!clusters?.length || !activities?.length) {
      return new Response(JSON.stringify({ error: "No clusters or activities found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Seasonality scoring
    const month = new Date().getMonth(); // 0-11
    const seasonMap: Record<string, number> = {
      year_round: 1.0,
      spring_summer: (month >= 3 && month <= 8) ? 1.5 : 0.6,
      spring_fall: (month >= 2 && month <= 10) ? 1.3 : 0.5,
      fall_winter: (month >= 9 || month <= 2) ? 1.5 : 0.6,
    };

    // 3. Generate all cluster × activity combinations
    const targets: any[] = [];
    for (const cluster of clusters) {
      for (const activity of activities) {
        // Priority formula:
        // (population_normalized * 0.3) + (urgency * 0.25) + (job_value_normalized * 0.2) + (seasonality * 0.15) + (density * 0.1)
        const popScore = Math.min(cluster.population_total / 1800000, 1) * 100;
        const urgScore = (activity.urgency_level / 5) * 100;
        const jobScore = Math.min(activity.avg_job_value / 25000, 1) * 100;
        const seasonScore = (seasonMap[activity.seasonality] || 1.0) * 60;
        const densityScore = cluster.density_score || 50;

        const priority = Math.round(
          popScore * 0.3 + urgScore * 0.25 + jobScore * 0.2 + seasonScore * 0.15 + densityScore * 0.1
        );

        // Estimate contractor count from population + density
        const estimatedContractors = Math.max(
          5,
          Math.round((cluster.population_total / 50000) * (activity.urgency_level / 3) * 8)
        );

        targets.push({
          city_cluster_id: cluster.id,
          primary_activity_id: activity.id,
          secondary_activity_id: null,
          priority_score: priority,
          estimated_contractors: estimatedContractors,
          status: "pending",
        });
      }
    }

    // 4. Upsert (avoid duplicates)
    const { data: inserted, error } = await supabase
      .from("contractor_generation_targets")
      .upsert(targets, {
        onConflict: "city_cluster_id,primary_activity_id,secondary_activity_id",
        ignoreDuplicates: false,
      })
      .select("id");

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      clusters_count: clusters.length,
      activities_count: activities.length,
      targets_generated: inserted?.length ?? targets.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fn-generate-matrix-targets error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
