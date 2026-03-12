import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANSWER_SCHEMA = {
  type: "function",
  function: {
    name: "structured_answer",
    description: "Return a structured answer to a homeowner/condo question about property maintenance, repairs, costs, or professionals.",
    parameters: {
      type: "object",
      properties: {
        question: { type: "string" },
        short_answer: { type: "string", description: "Direct answer in 1-2 sentences" },
        explanation: { type: "string", description: "Helpful explanation in plain language" },
        causes: { type: "array", items: { type: "string" }, description: "Most probable causes" },
        solutions: { type: "array", items: { type: "string" }, description: "Recommended actions" },
        cost_min: { type: "integer", description: "Low end cost estimate in CAD" },
        cost_max: { type: "integer", description: "High end cost estimate in CAD" },
        recommended_professionals: { type: "array", items: { type: "string" }, description: "Best specialist types" },
        urgency: { type: "string", enum: ["low", "medium", "high", "emergency"] },
        preventive_advice: { type: "array", items: { type: "string" } },
        follow_up_question: { type: "string", description: "One clarifying next-step question" },
        related_questions: { type: "array", items: { type: "string" }, description: "3-5 connected questions" },
        confidence_score: { type: "number", description: "0 to 1 confidence in the answer" },
        property_type_relevance: { type: "string", description: "Which property type this answer is most relevant to" },
        next_actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              action_type: { type: "string", enum: ["book_inspection", "upload_quote", "analyze_project", "get_match", "check_score", "analyze_reserve_fund"] },
            },
            required: ["label", "action_type"],
          },
          description: "Recommended platform actions when confidence is high",
        },
      },
      required: ["question", "short_answer", "explanation", "causes", "solutions", "urgency", "confidence_score", "related_questions", "follow_up_question", "preventive_advice", "recommended_professionals"],
    },
  },
};

async function fetchGraphContext(supabase: any, question: string) {
  // Search problems, solutions, professions from the knowledge graph
  const lowerQ = question.toLowerCase();

  const [{ data: problems }, { data: solutions }, { data: professions }] = await Promise.all([
    supabase.from("home_problems").select("name_fr, slug, description_fr, cost_estimate_low, cost_estimate_high, urgency_score, professional_category").eq("is_active", true).limit(50),
    supabase.from("home_solutions").select("name_fr, slug, description_fr, cost_estimate_low, cost_estimate_high, diy_possible").eq("is_active", true).limit(50),
    supabase.from("home_professions").select("name_fr, slug, description_fr, typical_hourly_rate_low, typical_hourly_rate_high, license_required").eq("is_active", true).limit(30),
  ]);

  // Find relevant items by keyword matching
  const relevantProblems = (problems || []).filter((p: any) =>
    lowerQ.includes(p.name_fr?.toLowerCase()) || p.description_fr?.toLowerCase()?.includes(lowerQ.split(" ").filter((w: string) => w.length > 3)[0] || "___")
  ).slice(0, 5);

  const relevantSolutions = (solutions || []).filter((s: any) =>
    lowerQ.includes(s.name_fr?.toLowerCase()) || s.description_fr?.toLowerCase()?.includes(lowerQ.split(" ").filter((w: string) => w.length > 3)[0] || "___")
  ).slice(0, 5);

  const relevantProfessions = (professions || []).filter((p: any) =>
    lowerQ.includes(p.name_fr?.toLowerCase())
  ).slice(0, 3);

  // Also search templates
  const { data: templates } = await supabase
    .from("answer_templates")
    .select("*")
    .eq("is_published", true)
    .limit(100);

  const matchedTemplate = (templates || []).find((t: any) =>
    lowerQ.includes(t.question_pattern.toLowerCase()) || t.question_pattern.toLowerCase().includes(lowerQ.split(" ").filter((w: string) => w.length > 4)[0] || "___")
  );

  // Market benchmarks
  const { data: benchmarks } = await supabase
    .from("market_price_benchmarks")
    .select("component, avg_cost_per_unit, unit_type, region")
    .limit(20);

  return {
    problems: relevantProblems,
    solutions: relevantSolutions,
    professions: relevantProfessions,
    benchmarks: benchmarks || [],
    matchedTemplate,
    allProblems: (problems || []).map((p: any) => p.name_fr).slice(0, 20),
    allProfessions: (professions || []).map((p: any) => p.name_fr).slice(0, 15),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { question, mode = "search", property_type, city, user_id, session_id, user_name } = await req.json();

    if (!question) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startTime = Date.now();

    // Fetch graph context
    const graphCtx = await fetchGraphContext(supabase, question);

    // If we have a direct template match with high confidence, use it directly
    if (graphCtx.matchedTemplate && graphCtx.matchedTemplate.confidence_base >= 0.9) {
      const t = graphCtx.matchedTemplate;
      const answer = {
        question,
        short_answer: t.short_answer,
        explanation: t.explanation,
        causes: t.causes,
        solutions: t.solutions,
        cost_min: t.cost_min,
        cost_max: t.cost_max,
        recommended_professionals: t.recommended_professionals,
        urgency: t.urgency,
        preventive_advice: t.preventive_advice,
        follow_up_question: t.follow_up_question,
        related_questions: t.related_questions,
        confidence_score: t.confidence_base,
        next_actions: [],
        source: "template",
      };

      await supabase.from("answer_logs").insert({
        question,
        answer_mode: mode,
        matched_template_id: t.id,
        structured_answer: answer,
        confidence_score: t.confidence_base,
        property_type, city, user_id, session_id,
        response_time_ms: Date.now() - startTime,
      });

      return new Response(JSON.stringify(answer), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build system prompt based on mode
    let systemPrompt = `Tu es un expert en bâtiment, rénovation et copropriété au Québec. Tu réponds aux questions des propriétaires, syndicats de copropriété et gestionnaires immobiliers.

Contexte du graphe de connaissances UNPRO:
- Problèmes connus: ${graphCtx.allProblems.join(", ")}
- Professions: ${graphCtx.allProfessions.join(", ")}
${graphCtx.problems.length > 0 ? `- Problèmes pertinents: ${JSON.stringify(graphCtx.problems)}` : ""}
${graphCtx.solutions.length > 0 ? `- Solutions pertinentes: ${JSON.stringify(graphCtx.solutions)}` : ""}
${graphCtx.professions.length > 0 ? `- Professionnels pertinents: ${JSON.stringify(graphCtx.professions)}` : ""}
${graphCtx.benchmarks.length > 0 ? `- Références de prix marché: ${JSON.stringify(graphCtx.benchmarks)}` : ""}
${graphCtx.matchedTemplate ? `- Template similaire trouvé: ${JSON.stringify(graphCtx.matchedTemplate)}` : ""}

Règles:
- Réponds en français du Québec
- Sois précis sur les coûts (en dollars canadiens)
- Adapte la réponse au type de propriété${property_type ? ` (${property_type})` : ""}
- Adapte au contexte local${city ? ` (${city})` : " (Québec)"}
- Inclus toujours des conseils préventifs
- Suggère des questions connexes pertinentes
- Évalue ton niveau de confiance honnêtement`;

    if (mode === "alex") {
      systemPrompt += `\n\nMode Alex AI Concierge:
- Ton chaleureux et professionnel
- ${user_name ? `Salue l'utilisateur par son prénom: ${user_name}` : "Salue poliment"}
- Maximum 3 questions de suivi
- Guide vers une action concrète sur la plateforme
- Sois concis mais complet`;
    } else if (mode === "seo") {
      systemPrompt += `\n\nMode SEO:
- Réponse optimisée pour les moteurs de recherche
- Format FAQ structuré
- Contenu unique et non-spam
- Réutilisable pour pages problèmes, villes, professions`;
    } else if (mode === "diagnostic") {
      systemPrompt += `\n\nMode Diagnostic:
- Analyse détaillée du problème
- Causes probables ordonnées par probabilité
- Recommandations d'actions immédiates
- Estimation d'urgence précise`;
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        tools: [ANSWER_SCHEMA],
        tool_choice: { type: "function", function: { name: "structured_answer" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, veuillez réessayer." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const answer = JSON.parse(toolCall.function.arguments);
    answer.source = "ai";

    // If confidence is high and mode supports it, add conversion actions
    if (answer.confidence_score >= 0.7 && (!answer.next_actions || answer.next_actions.length === 0)) {
      answer.next_actions = [];
      if (answer.urgency === "high" || answer.urgency === "emergency") {
        answer.next_actions.push({ label: "Demander une inspection", action_type: "book_inspection" });
      }
      if (answer.cost_min && answer.cost_max) {
        answer.next_actions.push({ label: "Obtenir des soumissions", action_type: "upload_quote" });
      }
      answer.next_actions.push({ label: "Trouver un entrepreneur", action_type: "get_match" });
    }

    // Log the answer
    await supabase.from("answer_logs").insert({
      question,
      answer_mode: mode,
      matched_template_id: graphCtx.matchedTemplate?.id || null,
      structured_answer: answer,
      confidence_score: answer.confidence_score,
      property_type, city, user_id, session_id,
      response_time_ms: Date.now() - startTime,
    });

    return new Response(JSON.stringify(answer), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Answer engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
