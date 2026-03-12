import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COMPONENT_TRADE_MAP: Record<string, string[]> = {
  toiture: ["Toiture", "Couvreur"],
  roof: ["Toiture", "Couvreur"],
  fenêtres: ["Fenêtres", "Vitrier"],
  windows: ["Fenêtres", "Vitrier"],
  maçonnerie: ["Maçonnerie", "Maçon"],
  masonry: ["Maçonnerie", "Maçon"],
  membrane: ["Membrane", "Imperméabilisation"],
  parking: ["Stationnement", "Béton"],
  ascenseur: ["Ascenseur", "Mécanique"],
  elevator: ["Ascenseur", "Mécanique"],
  hvac: ["CVAC", "Mécanique du bâtiment"],
  plomberie: ["Plomberie", "Plombier"],
  plumbing: ["Plomberie", "Plombier"],
  électricité: ["Électricité", "Électricien"],
  electrical: ["Électricité", "Électricien"],
  balcons: ["Balcons", "Béton"],
  balconies: ["Balcons", "Béton"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { syndicate_id, action } = await req.json();

    if (!syndicate_id) {
      return new Response(JSON.stringify({ error: "syndicate_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: scan — Scan capex forecasts for at-risk components ──
    if (action === "scan" || !action) {
      const currentYear = new Date().getFullYear();

      // 1. Get capex forecasts with remaining life
      const { data: forecasts, error: fErr } = await supabase
        .from("syndicate_capex_forecasts")
        .select("*")
        .eq("syndicate_id", syndicate_id)
        .order("forecast_year");
      if (fErr) throw fErr;

      // 2. Get existing projects to avoid duplicates
      const { data: existingProjects } = await supabase
        .from("syndicate_projects")
        .select("component, estimated_year")
        .eq("syndicate_id", syndicate_id);

      const existingSet = new Set(
        (existingProjects ?? []).map((p: any) => `${p.component}-${p.estimated_year}`)
      );

      // 3. Detect at-risk components and create projects
      const newProjects: any[] = [];
      for (const forecast of forecasts ?? []) {
        const remainingLife = forecast.remaining_life_years ?? (forecast.forecast_year - currentYear);
        const key = `${forecast.component}-${forecast.forecast_year}`;

        if (remainingLife <= 5 && !existingSet.has(key)) {
          const priority = remainingLife <= 2 ? "critical" : remainingLife <= 3 ? "high" : "medium";
          const riskScore = Math.max(0, Math.min(100, Math.round((1 - remainingLife / 10) * 100)));

          newProjects.push({
            syndicate_id,
            component: forecast.component,
            title: `${forecast.component} — ${forecast.description || "Remplacement prévu"}`,
            description: forecast.notes || `Composante à risque détectée. Vie utile résiduelle: ${remainingLife} ans.`,
            estimated_cost: forecast.estimated_cost,
            estimated_year: forecast.forecast_year,
            priority,
            status: "detected",
            remaining_life_years: remainingLife,
            risk_score: riskScore,
          });
        }
      }

      if (newProjects.length > 0) {
        const { error: insertErr } = await supabase
          .from("syndicate_projects")
          .insert(newProjects);
        if (insertErr) throw insertErr;
      }

      // 4. Match contractors for all projects
      const { data: allProjects } = await supabase
        .from("syndicate_projects")
        .select("*")
        .eq("syndicate_id", syndicate_id)
        .in("status", ["detected", "planning"]);

      // Get syndicate city for location matching
      const { data: syndicate } = await supabase
        .from("syndicates")
        .select("city, province")
        .eq("id", syndicate_id)
        .single();

      const matchResults: any[] = [];

      for (const project of allProjects ?? []) {
        const componentLower = project.component.toLowerCase();
        const trades = COMPONENT_TRADE_MAP[componentLower] || [project.component];

        // Find contractors matching trade + location
        let query = supabase
          .from("contractors")
          .select("id, business_name, specialty, city, aipp_score, rating, review_count, verification_status")
          .or(trades.map(t => `specialty.ilike.%${t}%`).join(","));

        if (syndicate?.city) {
          query = query.eq("city", syndicate.city);
        }

        const { data: contractors } = await query
          .order("aipp_score", { ascending: false })
          .limit(10);

        // Update matched count
        await supabase
          .from("syndicate_projects")
          .update({ matched_contractor_count: contractors?.length ?? 0 })
          .eq("id", project.id);

        matchResults.push({
          project_id: project.id,
          component: project.component,
          matched_contractors: contractors?.length ?? 0,
          top_contractors: (contractors ?? []).slice(0, 3).map((c: any) => ({
            id: c.id,
            name: c.business_name,
            aipp_score: c.aipp_score,
            rating: c.rating,
            verified: c.verification_status === "verified",
          })),
        });
      }

      return new Response(JSON.stringify({
        success: true,
        new_projects_created: newProjects.length,
        total_active_projects: allProjects?.length ?? 0,
        matches: matchResults,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: express_interest — Contractor expresses interest ──
    if (action === "express_interest") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Authorization required");

      const { data: { user }, error: authErr } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      if (authErr || !user) throw new Error("Invalid auth token");

      const { project_id, estimated_price, message } = await req.json();

      // Get contractor profile
      const { data: contractor } = await supabase
        .from("contractors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!contractor) throw new Error("Contractor profile not found");

      const { data, error } = await supabase
        .from("syndicate_project_interests")
        .upsert({
          project_id,
          contractor_id: contractor.id,
          interest_type: "expressed",
          estimated_price,
          message,
        }, { onConflict: "project_id,contractor_id" })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, interest: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: complete_project — Record actual costs & feedback ──
    if (action === "complete_project") {
      const body = await req.clone().json();
      const { project_id, actual_cost, actual_contractor_id, owner_rating, owner_feedback } = body;
      if (!project_id || !actual_cost) throw new Error("project_id and actual_cost required");

      const { data: project, error: pErr } = await supabase
        .from("syndicate_projects")
        .select("*")
        .eq("id", project_id)
        .single();
      if (pErr || !project) throw new Error("Project not found");

      const estimatedCost = project.estimated_cost || actual_cost;
      const variancePercent = Math.round(((actual_cost - estimatedCost) / estimatedCost) * 100 * 10) / 10;
      const predictionAccuracy = Math.max(0, 100 - Math.abs(variancePercent));

      const { error: uErr } = await supabase
        .from("syndicate_projects")
        .update({
          status: "completed",
          actual_cost,
          actual_contractor_id: actual_contractor_id || null,
          completed_at: new Date().toISOString(),
          owner_rating: owner_rating || null,
          owner_feedback: owner_feedback || null,
          cost_variance_percent: variancePercent,
          ai_prediction_accuracy: predictionAccuracy,
        })
        .eq("id", project_id);
      if (uErr) throw uErr;

      // Update market benchmark with running average
      const { data: benchmark } = await supabase
        .from("market_price_benchmarks")
        .select("*")
        .eq("component", project.component)
        .eq("region", "quebec")
        .single();

      if (benchmark) {
        const oldCount = benchmark.sample_count || 1;
        const newAvg = Math.round((benchmark.avg_cost_per_unit * oldCount + actual_cost) / (oldCount + 1));
        await supabase
          .from("market_price_benchmarks")
          .update({
            avg_cost_per_unit: newAvg,
            sample_count: oldCount + 1,
            last_updated_from_actuals: new Date().toISOString(),
          })
          .eq("id", benchmark.id);
      }

      // Update contractor rating if feedback provided
      if (actual_contractor_id && owner_rating) {
        const { data: contractor } = await supabase
          .from("contractors")
          .select("aipp_score, review_count, rating")
          .eq("id", actual_contractor_id)
          .single();

        if (contractor) {
          const oldCount = contractor.review_count || 0;
          const oldRating = contractor.rating || 0;
          const newRating = Math.round(((oldRating * oldCount + owner_rating) / (oldCount + 1)) * 10) / 10;
          await supabase
            .from("contractors")
            .update({ rating: newRating, review_count: oldCount + 1 })
            .eq("id", actual_contractor_id);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        cost_variance_percent: variancePercent,
        ai_prediction_accuracy: predictionAccuracy,
        market_benchmark_updated: !!benchmark,
        contractor_score_updated: !!(actual_contractor_id && owner_rating),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: ai_recommendations — Generate AI insights ──
    if (action === "ai_recommendations") {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      // Gather building data
      const [projectsRes, reserveRes, syndicateRes] = await Promise.all([
        supabase.from("syndicate_projects").select("*").eq("syndicate_id", syndicate_id),
        supabase.from("syndicate_reserve_fund_snapshots").select("*").eq("syndicate_id", syndicate_id).order("snapshot_date", { ascending: false }).limit(1),
        supabase.from("syndicates").select("*").eq("id", syndicate_id).single(),
      ]);

      const context = {
        building: syndicateRes.data,
        projects: projectsRes.data ?? [],
        reserve: reserveRes.data?.[0] ?? null,
      };

      const aiResponse = await fetch("https://ai.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Tu es un expert en gestion de copropriétés au Québec. Analyse les données de l'immeuble et génère des recommandations stratégiques en français. Retourne un JSON avec: { "recommendations": [{ "type": "risk"|"saving"|"opportunity", "title": string, "description": string, "priority": "critical"|"high"|"medium"|"low", "estimated_savings_percent": number|null, "action": string }] }. Maximum 5 recommandations.`,
            },
            {
              role: "user",
              content: `Données de la copropriété:\n${JSON.stringify(context, null, 2)}`,
            },
          ],
          temperature: 0.3,
        }),
      });

      if (!aiResponse.ok) throw new Error(`AI call failed: ${aiResponse.status}`);

      const aiData = await aiResponse.json();
      let recommendations;
      try {
        const content = aiData.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        recommendations = jsonMatch ? JSON.parse(jsonMatch[0]).recommendations : [];
      } catch {
        recommendations = [{
          type: "risk",
          title: "Analyse non disponible",
          description: "Veuillez ajouter des données de composantes pour recevoir des recommandations.",
          priority: "medium",
          action: "Compléter les données du bâtiment",
        }];
      }

      return new Response(JSON.stringify({ success: true, recommendations }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Growth engine error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
