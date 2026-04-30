// UNPRO — Lead Pipe Analyze edge function
// Computes deterministic risk score for a property and persists it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TYPE_WEIGHT: Record<string, number> = {
  triplex: 12, duplex: 10, quadruplex: 12, multiplex: 12,
  maison: 5, unifamiliale: 5, condo: 4, appartement: 6,
};

function compute(input: {
  cityRiskIndex?: number | null;
  neighborhoodRiskIndex?: number | null;
  yearBuilt?: number | null;
  propertyType?: string | null;
  publicLeadServiceEstimated?: boolean;
}) {
  const factors: any[] = [];
  let raw = 0;
  const city = Math.max(0, Math.min(100, input.cityRiskIndex ?? 50));
  const cityContribution = Math.round(city * 0.4);
  raw += cityContribution;
  factors.push({ label: "Risque géographique (ville)", weight: cityContribution, detail: `Indice ville ${city}/100` });
  if (input.neighborhoodRiskIndex != null) {
    const n = Math.max(0, Math.min(100, input.neighborhoodRiskIndex));
    const c = Math.round((n - 50) * 0.15);
    raw += c;
    factors.push({ label: "Quartier historique", weight: c, detail: `Indice quartier ${n}/100` });
  }
  if (input.yearBuilt && input.yearBuilt > 1800) {
    const y = input.yearBuilt;
    let c = 0, detail = "";
    if (y < 1950) { c = 30; detail = "Construit avant 1950"; }
    else if (y < 1970) { c = 22; detail = "Construit avant 1970"; }
    else if (y < 1986) { c = 12; detail = "Construit avant 1986"; }
    else if (y < 2000) { c = 5; detail = "Construit avant 2000"; }
    else { c = 0; detail = "Construction récente"; }
    raw += c;
    factors.push({ label: "Année de construction", weight: c, detail });
  } else {
    raw += 8;
    factors.push({ label: "Année de construction inconnue", weight: 8, detail: "Hypothèse prudente" });
  }
  const t = (input.propertyType ?? "").toLowerCase();
  for (const k of Object.keys(TYPE_WEIGHT)) {
    if (t.includes(k)) {
      raw += TYPE_WEIGHT[k];
      factors.push({ label: `Type de bâtiment (${k})`, weight: TYPE_WEIGHT[k] });
      break;
    }
  }
  if (input.publicLeadServiceEstimated) {
    raw += 8;
    factors.push({ label: "Conduite publique potentiellement en plomb", weight: 8 });
  }
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const riskLevel = score >= 70 ? "Élevé" : score >= 45 ? "Modéré" : "Faible";
  const recommendedActions: string[] =
    score >= 70 ? ["Test d'eau certifié recommandé rapidement", "Inspection visuelle de la plomberie par un plombier UNPRO", "Évaluer remplacement partiel des conduites"]
    : score >= 45 ? ["Test d'eau préventif recommandé", "Inspection visuelle de la tuyauterie d'entrée"]
    : ["Test d'eau si doute personnel", "Surveillance lors de rénovations futures"];
  return { score, riskLevel, factors, recommendedActions };
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "auth_required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const propertyId = String(body?.propertyId ?? "");
    const neighborhood = body?.neighborhood ? String(body.neighborhood) : null;
    if (!propertyId) {
      return new Response(JSON.stringify({ error: "propertyId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: property, error: pErr } = await admin
      .from("properties")
      .select("id, user_id, address, city, year_built, property_type, neighborhood")
      .eq("id", propertyId)
      .maybeSingle();
    if (pErr || !property) {
      return new Response(JSON.stringify({ error: "property_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (property.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cityName = property.city ?? "";
    const citySlug = slugify(cityName);
    const { data: cityProfile } = await admin
      .from("lead_pipe_city_profiles")
      .select("risk_index, public_lead_service_estimated, avg_build_year")
      .eq("city_slug", citySlug)
      .maybeSingle();

    const neighborhoodValue = neighborhood ?? property.neighborhood ?? null;
    let neighborhoodRisk: number | null = null;
    if (neighborhoodValue) {
      const nSlug = slugify(neighborhoodValue);
      const { data: np } = await admin
        .from("lead_pipe_neighborhood_profiles")
        .select("risk_index")
        .eq("city_slug", citySlug)
        .eq("neighborhood_slug", nSlug)
        .maybeSingle();
      neighborhoodRisk = np?.risk_index ?? null;
    }

    const result = compute({
      cityRiskIndex: cityProfile?.risk_index ?? 50,
      neighborhoodRiskIndex: neighborhoodRisk,
      yearBuilt: property.year_built ?? cityProfile?.avg_build_year ?? null,
      propertyType: property.property_type,
      publicLeadServiceEstimated: cityProfile?.public_lead_service_estimated ?? false,
    });

    const { data: inserted, error: iErr } = await admin
      .from("property_lead_scores")
      .insert({
        user_id: user.id,
        property_id: propertyId,
        city: cityName,
        city_slug: citySlug,
        neighborhood: neighborhoodValue,
        year_built: property.year_built,
        property_type: property.property_type,
        score: result.score,
        risk_level: result.riskLevel,
        factors: result.factors,
        recommended_actions: result.recommendedActions,
      })
      .select()
      .single();

    if (iErr) {
      return new Response(JSON.stringify({ error: iErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, result, record: inserted }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
