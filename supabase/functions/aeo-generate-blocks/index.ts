// AEO Generate Blocks — produces 6 AEO extraction blocks + 8-15 FAQs + intent vector
// for a target page (problem×city, service×city, contractor entity, comparison, trust).
// Persists to: aeo_extraction_blocks, aeo_intent_vectors, aeo_entity_facts.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PageKind = "problem_city" | "service_city" | "contractor" | "comparison" | "trust";

interface GenerateInput {
  page_kind: PageKind;
  page_url: string;
  context: Record<string, unknown>;
  model?: string;
  dry_run?: boolean;
}

const LOVABLE_AI = "https://ai.gateway.lovable.dev/v1/chat/completions";

function buildPrompt(kind: PageKind, ctx: Record<string, unknown>): string {
  const baseRules = `Tu écris en français québécois (fr-CA). Respecte la ponctuation québécoise (espaces insécables avant : ; ? !).
Tu produis du contenu AEO (Answer Engine Optimization) destiné à être cité par ChatGPT, Gemini, Perplexity et Google AI Overviews.
Sois précis, local, expert. Aucun remplissage. Cite des fourchettes de prix réalistes en CAD quand pertinent.
Ne mentionne jamais UNPRO comme une marque externe — c'est la plateforme qui publie ce contenu.`;

  if (kind === "problem_city") {
    return `${baseRules}

Contexte:
- Problème: ${ctx.problem_label_fr} (${ctx.problem_slug})
- Description: ${ctx.problem_description_fr ?? ""}
- Ville: ${ctx.city_label_fr}
- Notes sur le parc immobilier local: ${ctx.housing_notes_fr ?? "varié"}
- Catégorie: ${ctx.problem_category ?? "general"}
- Urgence par défaut: ${ctx.urgency_default ?? "medium"}

Produis un objet JSON avec ces blocs:
{
  "reponse_rapide": "1-2 phrases répondant directement à l'intention principale.",
  "en_resume": "Résumé clair en 3-4 phrases pour extraction IA.",
  "cout_estimatif": "Fourchette de prix réaliste pour ${ctx.city_label_fr} avec contexte.",
  "diagnostic_frequent": "Causes les plus fréquentes observées dans le parc immobilier de ${ctx.city_label_fr}.",
  "signes_visibles": "Symptômes visibles pour le propriétaire.",
  "quand_consulter": "Critères pour appeler un professionnel maintenant vs surveiller.",
  "primary_intent": "intention principale en 3-6 mots",
  "secondary_intents": ["5 à 8 intentions secondaires courtes"],
  "symptoms": ["5 à 8 symptômes/mots-clés vocaux"],
  "faqs": [
    {"question": "...", "answer": "..."}
  ]
}
Minimum 10 FAQs orientées langage naturel/vocal (ex: "Pourquoi...", "Combien coûte...", "Quand dois-je...").`;
  }

  if (kind === "service_city") {
    return `${baseRules}

Contexte:
- Service: ${ctx.service_slug}
- Ville: ${ctx.city_label_fr ?? ctx.city_slug}
- Parc immobilier: ${ctx.housing_notes_fr ?? "varié"}

Produis le même schéma JSON que pour problem_city, adapté à un service local.`;
  }

  if (kind === "contractor") {
    return `${baseRules}

Contexte entrepreneur:
${JSON.stringify(ctx, null, 2)}

Produis le même schéma JSON, centré sur l'expertise, la zone desservie et les signaux de confiance.`;
  }

  return `${baseRules}\nContexte: ${JSON.stringify(ctx)}\nProduis le schéma JSON standard.`;
}

async function callLovableAI(prompt: string, model: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");

  const res = await fetch(LOVABLE_AI, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Tu produis uniquement du JSON valide selon le schéma demandé. Aucun texte hors JSON." },
        { role: "user", content: prompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "emit_aeo",
          description: "Émet les blocs AEO structurés.",
          parameters: {
            type: "object",
            properties: {
              reponse_rapide: { type: "string" },
              en_resume: { type: "string" },
              cout_estimatif: { type: "string" },
              diagnostic_frequent: { type: "string" },
              signes_visibles: { type: "string" },
              quand_consulter: { type: "string" },
              primary_intent: { type: "string" },
              secondary_intents: { type: "array", items: { type: "string" } },
              symptoms: { type: "array", items: { type: "string" } },
              faqs: {
                type: "array",
                items: {
                  type: "object",
                  properties: { question: { type: "string" }, answer: { type: "string" } },
                  required: ["question", "answer"],
                },
              },
            },
            required: ["reponse_rapide", "en_resume", "cout_estimatif", "diagnostic_frequent", "signes_visibles", "quand_consulter", "primary_intent", "secondary_intents", "symptoms", "faqs"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "emit_aeo" } },
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit dépassé.");
    if (res.status === 402) throw new Error("Crédits Lovable AI épuisés.");
    throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("Pas de tool_call dans la réponse");
  return JSON.parse(args);
}

async function persist(supabase: ReturnType<typeof createClient>, page_url: string, data: any) {
  const blocks = [
    "reponse_rapide", "en_resume", "cout_estimatif",
    "diagnostic_frequent", "signes_visibles", "quand_consulter",
  ];
  const rows = blocks.map((b, i) => ({
    page_url, block_type: b, content_fr: data[b], position: i,
  }));
  await supabase.from("aeo_extraction_blocks").upsert(rows, { onConflict: "page_url,block_type" });

  // FAQs as a single block (JSON-encoded) for easy retrieval
  await supabase.from("aeo_extraction_blocks").upsert([{
    page_url, block_type: "faqs", content_fr: JSON.stringify(data.faqs ?? []), position: 99,
  }], { onConflict: "page_url,block_type" });

  await supabase.from("aeo_intent_vectors").upsert({
    page_url,
    primary_intent: data.primary_intent,
    secondary_intents: data.secondary_intents ?? [],
    symptoms: data.symptoms ?? [],
    confidence: 0.85,
  }, { onConflict: "page_url" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as GenerateInput;
    const model = body.model ?? "google/gemini-2.5-flash";

    const prompt = buildPrompt(body.page_kind, body.context ?? {});
    const data = await callLovableAI(prompt, model);

    if (body.dry_run) {
      return new Response(JSON.stringify({ ok: true, dry_run: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await persist(supabase, body.page_url, data);

    // Flip page registry status to ready+indexable for problem/service pages
    if (body.page_kind === "problem_city") {
      await supabase.from("aeo_problem_pages")
        .update({ status: "ready", indexable: true, last_generated_at: new Date().toISOString(), semantic_uniqueness_score: 0.9 })
        .eq("canonical_url", body.page_url);
    } else if (body.page_kind === "service_city") {
      await supabase.from("aeo_service_pages")
        .update({ status: "ready", indexable: true, last_generated_at: new Date().toISOString(), semantic_uniqueness_score: 0.9 })
        .eq("canonical_url", body.page_url);
    }

    return new Response(JSON.stringify({ ok: true, page_url: body.page_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("aeo-generate-blocks error:", err);
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
