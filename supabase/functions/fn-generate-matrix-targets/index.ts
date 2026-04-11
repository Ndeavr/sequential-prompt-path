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

    const [{ data: clusters }, { data: activities }, { data: secondaries }] = await Promise.all([
      supabase.from("cities_quebec_clusters").select("*").eq("status", "active"),
      supabase.from("activities_primary").select("*").eq("status", "active"),
      supabase.from("activities_secondary").select("*").eq("status", "active"),
    ]);

    if (!clusters?.length || !activities?.length) {
      return new Response(JSON.stringify({ error: "No clusters or activities found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const month = new Date().getMonth();
    const seasonMap: Record<string, number> = {
      year_round: 1.0,
      printemps: (month >= 2 && month <= 4) ? 1.5 : 0.6,
      ete: (month >= 5 && month <= 7) ? 1.5 : 0.6,
      automne: (month >= 8 && month <= 10) ? 1.5 : 0.6,
      hiver: (month >= 11 || month <= 1) ? 1.5 : 0.6,
      spring_summer: (month >= 3 && month <= 8) ? 1.5 : 0.6,
      spring_fall: (month >= 2 && month <= 10) ? 1.3 : 0.5,
      fall_winter: (month >= 9 || month <= 2) ? 1.5 : 0.6,
    };

    const targets: any[] = [];

    // Primary activity targets
    for (const cluster of clusters) {
      for (const activity of activities) {
        const popScore = Math.min(cluster.population_total / 1800000, 1) * 100;
        const urgScore = (activity.urgency_level / 5) * 100;
        const jobScore = Math.min(activity.avg_job_value / 25000, 1) * 100;
        const seasonScore = (seasonMap[activity.seasonality] || 1.0) * 60;
        const densityScore = cluster.density_score || 50;
        const priority = Math.round(
          popScore * 0.3 + urgScore * 0.25 + jobScore * 0.2 + seasonScore * 0.15 + densityScore * 0.1
        );
        const estimatedContractors = Math.max(
          5, Math.round((cluster.population_total / 50000) * (activity.urgency_level / 3) * 8)
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

    // Secondary activity targets (cluster × secondary)
    if (secondaries?.length) {
      for (const cluster of clusters) {
        for (const sec of secondaries) {
          const popScore = Math.min(cluster.population_total / 1800000, 1) * 100;
          const freqScore = ((sec.frequency_score || 5) / 10) * 100;
          const ticketScore = Math.min((sec.avg_ticket_value || 300) / 5000, 1) * 100;
          const seasonScore = (seasonMap[sec.seasonality_peak] || 1.0) * 60;
          const densityScore = cluster.density_score || 50;
          const priority = Math.round(
            popScore * 0.2 + freqScore * 0.3 + ticketScore * 0.15 + seasonScore * 0.2 + densityScore * 0.15
          );
          const estimatedContractors = Math.max(
            3, Math.round((cluster.population_total / 80000) * ((sec.frequency_score || 5) / 5) * 5)
          );
          targets.push({
            city_cluster_id: cluster.id,
            primary_activity_id: null,
            secondary_activity_id: sec.id,
            priority_score: priority,
            estimated_contractors: estimatedContractors,
            status: "pending",
          });
        }
      }
    }

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
      primary_count: activities.length,
      secondary_count: secondaries?.length ?? 0,
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
