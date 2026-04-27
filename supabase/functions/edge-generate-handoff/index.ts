/**
 * UNPRO — Generate Handoff Structured
 * Takes a project_request and generates:
 * 1. Structured handoff (project_handoff)
 * 2. Lead score (lead_scores)
 * 3. Contractor matches (contractor_matches)
 * 4. Status logs
 */
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, request_id } = body;

    if (action === "generate_handoff") {
      return await generateHandoff(supabase, request_id);
    }

    if (action === "compute_score") {
      return await computeScore(supabase, request_id);
    }

    if (action === "match_contractors") {
      return await matchContractors(supabase, request_id);
    }

    if (action === "full_pipeline") {
      const h = await runFullPipeline(supabase, request_id);
      return new Response(JSON.stringify(h), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), { status: 400, headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function runFullPipeline(supabase: any, requestId: string) {
  // 1. Get request
  const { data: request } = await supabase
    .from("project_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (!request) throw new Error("request_not_found");

  // 2. Generate structured handoff
  const handoff = await createStructuredHandoff(supabase, request);

  // 3. Compute lead score
  const score = await createLeadScore(supabase, request, handoff);

  // 4. Match contractors
  const matches = await createContractorMatches(supabase, request, handoff, score);

  // 5. Update request status
  await supabase.from("project_requests").update({ status: "matched" }).eq("id", requestId);

  // 6. Log
  await supabase.from("job_status_logs").insert([
    { request_id: requestId, status: "handoff_created", actor: "system" },
    { request_id: requestId, status: "matched", actor: "system" },
  ]);

  return { handoff, score, matches: matches.length };
}

async function createStructuredHandoff(supabase: any, request: any) {
  const conversation = request.raw_conversation || [];
  const intent = request.intent || "";

  // Extract structured data from conversation
  const extracted = extractFromConversation(conversation, intent);

  const handoff = {
    request_id: request.id,
    title: extracted.title,
    summary: extracted.summary,
    category: extracted.category,
    sub_category: extracted.subCategory,
    urgency_level: extracted.urgency,
    estimated_budget_min: extracted.budgetMin,
    estimated_budget_max: extracted.budgetMax,
    estimated_duration: extracted.duration,
    complexity: extracted.complexity,
    client_availability: extracted.availability,
    location_city: extracted.city,
    missing_fields: extracted.missingFields,
    structured_data: { intent, extracted_at: new Date().toISOString() },
  };

  const { data, error } = await supabase.from("project_handoff").insert(handoff).select().single();
  if (error) throw error;
  return data;
}

function extractFromConversation(conversation: any[], intent: string) {
  const allText = Array.isArray(conversation)
    ? conversation.map((m: any) => m.content || m.text || "").join(" ").toLowerCase()
    : intent.toLowerCase();

  // Category detection
  const categoryMap: Record<string, string[]> = {
    "Plomberie": ["plomberie", "tuyau", "fuite", "robinet", "eau chaude", "chauffe-eau", "drain"],
    "Électricité": ["électri", "panneau", "prise", "filage", "disjoncteur"],
    "Toiture": ["toiture", "toit", "bardeaux", "gouttière", "infiltration toit"],
    "Chauffage / Climatisation": ["chauffage", "climatisation", "thermopompe", "fournaise", "ventilation"],
    "Rénovation générale": ["rénovation", "rénover", "cuisine", "salle de bain", "plancher"],
    "Peinture": ["peinture", "peinturer", "peintre"],
    "Isolation": ["isolation", "isoler", "grenier", "entretoit"],
    "Déménagement": ["déménagement", "déménager"],
  };

  let category = "Général";
  let subCategory = null;
  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(k => allText.includes(k))) {
      category = cat;
      subCategory = keywords.find(k => allText.includes(k)) || null;
      break;
    }
  }

  // Urgency
  let urgency = "normal";
  if (/urgent|urgence|immédiat|tout de suite|asap|dégât/i.test(allText)) urgency = "critical";
  else if (/bientôt|rapidement|cette semaine/i.test(allText)) urgency = "high";

  // Budget extraction
  let budgetMin: number | null = null;
  let budgetMax: number | null = null;
  const budgetMatch = allText.match(/(\d[\d\s]*)\s*\$?\s*(?:à|-)\s*(\d[\d\s]*)\s*\$?/);
  if (budgetMatch) {
    budgetMin = parseInt(budgetMatch[1].replace(/\s/g, ""));
    budgetMax = parseInt(budgetMatch[2].replace(/\s/g, ""));
  }

  // City
  const cities = ["montréal", "laval", "longueuil", "québec", "gatineau", "sherbrooke", "trois-rivières", "lévis", "terrebonne", "brossard", "repentigny", "drummondville"];
  const city = cities.find(c => allText.includes(c));

  // Missing fields
  const missingFields: string[] = [];
  if (!city) missingFields.push("Ville / localisation");
  if (!budgetMin) missingFields.push("Budget estimé");
  if (allText.length < 50) missingFields.push("Description détaillée du problème");

  // Complexity
  const complexity = allText.length > 200 ? "high" : allText.length > 80 ? "medium" : "low";

  return {
    title: `${category}${city ? ` — ${city.charAt(0).toUpperCase() + city.slice(1)}` : ""}`,
    summary: allText.slice(0, 300),
    category,
    subCategory,
    urgency,
    budgetMin,
    budgetMax,
    duration: urgency === "critical" ? "Immédiat" : "1-2 semaines",
    complexity,
    availability: null,
    city: city ? city.charAt(0).toUpperCase() + city.slice(1) : null,
    missingFields,
  };
}

async function createLeadScore(supabase: any, request: any, handoff: any) {
  let total = 0;
  const breakdown: Record<string, number> = {};

  // Completeness (30%)
  const missingCount = (handoff.missing_fields || []).length;
  const completeness = Math.max(0, 100 - missingCount * 33);
  breakdown.completeness = Math.round(completeness * 0.3);
  total += breakdown.completeness;

  // Clarity (20%)
  const textLen = (handoff.summary || "").length;
  const clarity = textLen > 200 ? 100 : textLen > 100 ? 70 : textLen > 30 ? 40 : 10;
  breakdown.clarity = Math.round(clarity * 0.2);
  total += breakdown.clarity;

  // Budget (15%)
  const hasBudget = handoff.estimated_budget_min != null;
  breakdown.budget = hasBudget ? 15 : 0;
  total += breakdown.budget;

  // Urgency (15%)
  const urgencyMap: Record<string, number> = { critical: 100, high: 70, normal: 40, low: 10 };
  breakdown.urgency = Math.round((urgencyMap[handoff.urgency_level] || 40) * 0.15);
  total += breakdown.urgency;

  // Booking probability (20%)
  const probScore = (hasBudget ? 30 : 0) + (handoff.location_city ? 30 : 0) + (handoff.urgency_level === "critical" ? 40 : 20);
  breakdown.booking_probability = Math.round(Math.min(100, probScore) * 0.2);
  total += breakdown.booking_probability;

  const score = Math.min(100, total);
  const label = score >= 80 ? "ELITE" : score >= 60 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW";

  const { data, error } = await supabase.from("lead_scores").insert({
    request_id: request.id, score, label, scoring_breakdown: breakdown,
  }).select().single();
  if (error) throw error;
  return data;
}

async function createContractorMatches(supabase: any, request: any, handoff: any, score: any) {
  // Find eligible contractors by city / category
  let query = supabase.from("contractors").select("id, aipp_score, city, specialty").eq("status", "active").limit(10);

  if (handoff.location_city) {
    query = query.ilike("city", `%${handoff.location_city}%`);
  }

  const { data: candidates } = await query;
  if (!candidates || candidates.length === 0) return [];

  // Rank by AIPP score
  const ranked = candidates
    .sort((a: any, b: any) => (b.aipp_score || 0) - (a.aipp_score || 0))
    .slice(0, 3);

  const matches = ranked.map((c: any, i: number) => ({
    request_id: request.id,
    contractor_id: c.id,
    match_score: Math.max(0, 100 - i * 15 - (100 - (c.aipp_score || 50)) * 0.3),
    rank: i + 1,
    status: "pending",
  }));

  const { data, error } = await supabase.from("contractor_matches").insert(matches).select();
  if (error) throw error;
  return data || [];
}

async function generateHandoff(supabase: any, requestId: string) {
  const result = await runFullPipeline(supabase, requestId);
  return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function computeScore(supabase: any, requestId: string) {
  const { data: request } = await supabase.from("project_requests").select("*").eq("id", requestId).single();
  const { data: handoff } = await supabase.from("project_handoff").select("*").eq("request_id", requestId).single();
  if (!request || !handoff) throw new Error("missing_data");
  const score = await createLeadScore(supabase, request, handoff);
  return new Response(JSON.stringify(score), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function matchContractors(supabase: any, requestId: string) {
  const { data: request } = await supabase.from("project_requests").select("*").eq("id", requestId).single();
  const { data: handoff } = await supabase.from("project_handoff").select("*").eq("request_id", requestId).single();
  const { data: score } = await supabase.from("lead_scores").select("*").eq("request_id", requestId).single();
  if (!request || !handoff) throw new Error("missing_data");
  const matches = await createContractorMatches(supabase, request, handoff, score);
  return new Response(JSON.stringify(matches), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
