// Alex V3 — Universal Qualification Engine edge function.
// Per turn: extract -> merge -> score -> either next_question or qualified recommendation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// --- Inline graph + scoring (mirror of src/lib/alexQualification) ---
type Urgency = "urgent" | "30d" | "3m" | "year" | "planning" | null;
type BudgetBand = "unknown" | "<5k" | "5-15k" | "15-50k" | "50k+" | null;

interface Graph {
  homeowner: { user_id: string | null; language: "fr" | "en"; name: string | null };
  property: {
    address: string | null; city: string | null; postal_code: string | null;
    property_id: string | null; type: string | null; confirmed: boolean;
  };
  problem: { category: string | null; sub_type: string | null; description: string | null };
  urgency: Urgency;
  budget: BudgetBand;
  quotes: { received: boolean | null; count: number; uploaded_ids: string[] };
  photos: { requested: boolean; uploaded_ids: string[] };
  compatibility: Record<string, unknown>;
  project_context: Record<string, unknown>;
  score: number;
  missing_dimensions: string[];
  ready_for_match: boolean;
  matching_confidence: number | null;
}

function emptyGraph(language: "fr" | "en" = "fr"): Graph {
  return {
    homeowner: { user_id: null, language, name: null },
    property: { address: null, city: null, postal_code: null, property_id: null, type: null, confirmed: false },
    problem: { category: null, sub_type: null, description: null },
    urgency: null, budget: null,
    quotes: { received: null, count: 0, uploaded_ids: [] },
    photos: { requested: false, uploaded_ids: [] },
    compatibility: {}, project_context: {},
    score: 0, missing_dimensions: [], ready_for_match: false, matching_confidence: null,
  };
}

function scoreGraph(g: Graph) {
  const property = g.property.confirmed && g.property.address ? 25 : 0;
  const problem = g.problem.category ? (g.problem.sub_type ? 20 : 10) : 0;
  const urgency = g.urgency ? 15 : 0;
  const property_type = g.property.type ? 10 : 0;
  const photos = g.photos.uploaded_ids.length > 0 ? 10 : 0;
  const quotes = g.quotes.uploaded_ids.length > 0 ? 10 : (g.quotes.received === false ? 5 : 0);
  const budget = g.budget && g.budget !== "unknown" ? 5 : 0;
  const compatibility = Object.values(g.compatibility).filter(Boolean).length > 0 ? 5 : 0;
  const total = property + problem + urgency + property_type + photos + quotes + budget + compatibility;
  const missing: string[] = [];
  if (!property) missing.push("property_address");
  if (!g.problem.category) missing.push("problem_category");
  if (!g.problem.sub_type) missing.push("problem_sub_type");
  if (!urgency) missing.push("urgency");
  if (!property_type) missing.push("property_type");
  const ready_for_match = !!g.property.confirmed && !!g.problem.category && !!g.problem.sub_type && !!g.urgency && total >= 70;
  return { total, missing, ready_for_match };
}

const CATEGORIES = ["roofing","foundation","electrical","plumbing","hvac","insulation","mold","windows","kitchen_reno","landscaping"];

const NEXT_QUESTIONS: Record<string, { q: string; why: string; field: string; ui: string; options?: any[] }> = {
  problem_category: { field: "problem.category", q: "Décrivez-moi en quelques mots la situation ou le projet pour votre propriété.", why: "Pour identifier la bonne expertise.", ui: "text" },
  property_address: { field: "property.address", q: "Quelle est l'adresse de la propriété concernée ?", why: "L'adresse nous donne ville, code postal et intelligence propriété.", ui: "address" },
  problem_sub_type: { field: "problem.sub_type", q: "Pouvez-vous préciser le type de travaux ?", why: "Chaque type de projet exige une expertise différente.", ui: "text" },
  urgency: { field: "urgency", q: "Quand souhaitez-vous réaliser les travaux ?", why: "Pour filtrer les professionnels disponibles.", ui: "choice",
    options: [
      { value: "urgent", label_fr: "Urgent" },
      { value: "30d", label_fr: "Dans les 30 jours" },
      { value: "3m", label_fr: "Dans 3 mois" },
      { value: "year", label_fr: "Cette année" },
      { value: "planning", label_fr: "Je planifie seulement" },
    ] },
  property_type: { field: "property.type", q: "De quel type de propriété s'agit-il ?", why: "Le type de bâtiment influence les exigences.", ui: "choice",
    options: [
      { value: "house", label_fr: "Maison" },
      { value: "condo", label_fr: "Condo" },
      { value: "duplex", label_fr: "Duplex" },
      { value: "multiplex", label_fr: "Multiplex" },
      { value: "cottage", label_fr: "Chalet" },
    ] },
};

function pickNext(g: Graph) {
  if (!g.problem.category) return NEXT_QUESTIONS.problem_category;
  if (!g.property.confirmed || !g.property.address) return NEXT_QUESTIONS.property_address;
  if (!g.problem.sub_type) return NEXT_QUESTIONS.problem_sub_type;
  if (!g.urgency) return NEXT_QUESTIONS.urgency;
  if (!g.property.type) return NEXT_QUESTIONS.property_type;
  if (g.quotes.received === null) return { field: "quotes.received", q: "Avez-vous déjà reçu des soumissions pour ce projet ?", why: "Nous pouvons les analyser gratuitement.", ui: "upload_quote" };
  if (!g.photos.requested) return { field: "photos", q: "Souhaitez-vous ajouter des photos ?", why: "Les photos améliorent la précision du matching.", ui: "upload_photo" };
  if (!g.budget) return { field: "budget", q: "Quel budget envisagez-vous ? (Facultatif)", why: "Pour proposer des solutions adaptées.", ui: "choice",
    options: [
      { value: "unknown", label_fr: "Je ne sais pas" },
      { value: "<5k", label_fr: "Moins de 5 000 $" },
      { value: "5-15k", label_fr: "5 000 – 15 000 $" },
      { value: "15-50k", label_fr: "15 000 – 50 000 $" },
      { value: "50k+", label_fr: "50 000 $ et plus" },
    ] };
  return null;
}

async function extractWithLLM(userMessage: string, currentGraph: Graph): Promise<Partial<Graph>> {
  const sys = `Tu es un extracteur strict pour le moteur de qualification UNPRO.
Catégories valides: ${CATEGORIES.join(", ")}.
À partir du message utilisateur et du contexte, retourne UNIQUEMENT du JSON valide qui patche le graph.
Format attendu (omets les champs inconnus): {
  "problem": { "category": "roofing", "sub_type": "leak", "description": "..." },
  "property": { "address": "...", "city": "...", "postal_code": "...", "type": "house", "confirmed": true },
  "urgency": "urgent"|"30d"|"3m"|"year"|"planning",
  "budget": "unknown"|"<5k"|"5-15k"|"15-50k"|"50k+",
  "quotes": { "received": true|false }
}
N'invente RIEN. Si l'utilisateur n'a pas dit l'info, ne mets pas le champ.`;

  const ctx = `Contexte actuel: ${JSON.stringify({
    problem: currentGraph.problem, property: currentGraph.property,
    urgency: currentGraph.urgency, budget: currentGraph.budget, quotes: currentGraph.quotes,
  })}`;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `${ctx}\n\nMessage utilisateur: ${userMessage}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) return {};
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    return JSON.parse(content);
  } catch (e) {
    console.error("[alex-qualify-turn] extract error", e);
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { session_token, user_message, service_category_hint } = body ?? {};
    if (!session_token) {
      return new Response(JSON.stringify({ error: "session_token required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Auth (optional)
    const authHeader = req.headers.get("Authorization") ?? "";
    let userId: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    // Load or create session
    let { data: session } = await supabase
      .from("alex_qualification_sessions")
      .select("*").eq("session_token", session_token).maybeSingle();

    if (!session) {
      const { data: created, error } = await supabase
        .from("alex_qualification_sessions")
        .insert({
          session_token,
          user_id: userId,
          service_category: service_category_hint ?? null,
          graph: emptyGraph("fr"),
        })
        .select("*").single();
      if (error) {
        console.error("[alex-qualify-turn] create session error", error);
        return new Response(JSON.stringify({ error: "Failed to start session" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      session = created;
    }

    let graph: Graph = (session.graph as Graph) ?? emptyGraph("fr");

    // Extract & merge
    let extracted: Partial<Graph> = {};
    if (user_message) {
      extracted = await extractWithLLM(user_message, graph);
      graph = {
        ...graph,
        homeowner: { ...graph.homeowner, ...(extracted.homeowner ?? {}) },
        property: { ...graph.property, ...(extracted.property ?? {}) },
        problem: { ...graph.problem, ...(extracted.problem ?? {}) },
        urgency: (extracted.urgency as Urgency) ?? graph.urgency,
        budget: (extracted.budget as BudgetBand) ?? graph.budget,
        quotes: { ...graph.quotes, ...(extracted.quotes ?? {}) },
      };
      // If address came back, assume confirmed pending UI validation
      if (extracted.property?.address) graph.property.confirmed = true;
    }

    const breakdown = scoreGraph(graph);
    graph.score = breakdown.total;
    graph.missing_dimensions = breakdown.missing;
    graph.ready_for_match = breakdown.ready_for_match;

    // Persist session + turn
    await supabase.from("alex_qualification_sessions").update({
      graph,
      score: breakdown.total,
      ready_for_match: breakdown.ready_for_match,
      service_category: graph.problem.category ?? session.service_category,
      user_id: userId ?? session.user_id,
    }).eq("id", session.id);

    await supabase.from("alex_qualification_turns").insert({
      session_id: session.id,
      question_asked: null,
      user_answer: user_message ?? null,
      extracted: extracted as Record<string, unknown>,
      score_delta: breakdown.total - (session.score ?? 0),
    });

    // Decision: ask next OR recommend
    if (!breakdown.ready_for_match) {
      const next = pickNext(graph);
      return new Response(JSON.stringify({
        status: "qualifying",
        score: breakdown.total,
        missing: breakdown.missing,
        next_question: next,
        graph_summary: {
          category: graph.problem.category,
          sub_type: graph.problem.sub_type,
          address: graph.property.address,
          urgency: graph.urgency,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Qualified → return summary (matching call left to existing services for now)
    return new Response(JSON.stringify({
      status: "qualified",
      score: breakdown.total,
      ready_for_match: true,
      summary_fr: "Après analyse de votre projet, je vais maintenant chercher le professionnel qui correspond le mieux à votre situation.",
      graph: {
        category: graph.problem.category,
        sub_type: graph.problem.sub_type,
        address: graph.property.address,
        property_type: graph.property.type,
        urgency: graph.urgency,
        has_quotes: graph.quotes.uploaded_ids.length > 0,
        has_photos: graph.photos.uploaded_ids.length > 0,
        budget: graph.budget,
      },
      recommendation_headline_fr: "Après analyse de votre projet, voici le professionnel qui correspond le mieux à votre situation.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[alex-qualify-turn] fatal", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
