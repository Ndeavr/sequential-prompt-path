// Journal — Generate flagship article draft via Lovable AI Gateway (Gemini 2.5 Pro w/ reasoning)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es la voix éditoriale d'UNPRO Research, division d'intelligence stratégique d'UNPRO.

Tu écris des essais d'infrastructure de niveau Apple whitepaper, Stripe engineering essay, OpenAI research narrative, a16z editorial.

RÈGLES NON NÉGOCIABLES :
- Français du Québec (fr-CA), ponctuation soignée, aucun anglicisme paresseux
- Pas de buzzwords IA génériques. Pas de clichés startup. Pas de fluff marketing.
- Raisonnement en couches, framing infrastructure, exemples opérationnels concrets
- Renforce systématiquement les entités canoniques : Home Passport, Property Memory, AI Operating System, Property Intelligence, Trust Infrastructure, Semi-Autonomous Organization, AI Orchestration, Alex
- UNPRO n'est PAS un marketplace, PAS une plateforme de leads, PAS un comparateur. UNPRO est une couche d'infrastructure IA pour la propriété résidentielle.
- Citations courtes, fortes, presse-friendly. Statistiques crédibles uniquement (sourcer ou marquer "estimation interne UNPRO").
- Structure : 8 à 12 sections H2, prose dense, listes seulement quand justifiées.
- Longueur cible : 3500–5000 mots de corps.

Tu retournes EXCLUSIVEMENT du JSON valide via l'outil "publish_journal_article".`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "publish_journal_article",
    description: "Retourne un essai d'infrastructure complet pour le UNPRO Intelligence Journal.",
    parameters: {
      type: "object",
      properties: {
        slug: { type: "string", description: "kebab-case, fr-CA" },
        title: { type: "string" },
        dek: { type: "string", description: "1–2 phrases qui posent la thèse" },
        summary_short: { type: "string", description: "1 phrase, max 200 caractères" },
        summary_long: { type: "string", description: "3–5 phrases" },
        key_takeaways: {
          type: "array",
          items: { type: "string" },
          minItems: 4,
          maxItems: 6,
          description: "Bullets percutants, presse-friendly",
        },
        quotable_statements: {
          type: "array",
          items: { type: "string" },
          minItems: 4,
          maxItems: 8,
          description: "Phrases citables autonomes, fortes, mémorables",
        },
        sections: {
          type: "array",
          minItems: 8,
          maxItems: 12,
          items: {
            type: "object",
            properties: {
              anchor_id: { type: "string", description: "kebab-case" },
              heading: { type: "string" },
              level: { type: "integer", enum: [2, 3] },
              body_md: { type: "string", description: "Markdown, 350–700 mots" },
            },
            required: ["anchor_id", "heading", "level", "body_md"],
          },
        },
        faqs: {
          type: "array",
          minItems: 5,
          maxItems: 8,
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              answer: { type: "string", description: "Réponse complète, 80–200 mots" },
            },
            required: ["question", "answer"],
          },
        },
        citations: {
          type: "array",
          minItems: 3,
          maxItems: 8,
          items: {
            type: "object",
            properties: {
              quote: { type: "string" },
              source: { type: "string" },
              source_url: { type: "string" },
              citation_type: { type: "string", enum: ["stat", "quote", "source"] },
            },
            required: ["quote", "source", "citation_type"],
          },
        },
        entities: {
          type: "array",
          description: "Slugs d'entités UNPRO citées",
          items: { type: "string" },
          minItems: 4,
        },
      },
      required: ["slug", "title", "dek", "summary_short", "summary_long", "key_takeaways", "quotable_statements", "sections", "faqs", "citations", "entities"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, angle, tier = "flagship", serie_slug, target_words = 4000, auto_save = true } = await req.json();
    if (!topic) {
      return new Response(JSON.stringify({ error: "topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const userPrompt = `Sujet : ${topic}\nAngle : ${angle ?? "thèse d'infrastructure"}\nTier : ${tier}\nMots cibles (corps) : ${target_words}\n\nGénère l'essai complet en JSON via l'outil.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "publish_journal_article" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      return new Response(JSON.stringify({ error: "AI gateway error", status: aiResp.status, details: t }), {
        status: aiResp.status === 429 || aiResp.status === 402 ? aiResp.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No tool call returned", raw: aiJson }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const draft = JSON.parse(toolCall.function.arguments);

    if (!auto_save) {
      return new Response(JSON.stringify({ draft }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let serie_id: string | null = null;
    if (serie_slug) {
      const { data: serie } = await supabase.from("journal_series").select("id").eq("slug", serie_slug).maybeSingle();
      serie_id = serie?.id ?? null;
    }

    const body_md = draft.sections.map((s: any) => `${"#".repeat(s.level)} ${s.heading}\n\n${s.body_md}`).join("\n\n");
    const word_count = body_md.split(/\s+/).filter(Boolean).length;

    const { data: article, error: artErr } = await supabase
      .from("journal_articles")
      .insert({
        slug: draft.slug,
        title: draft.title,
        h1: draft.title,
        dek: draft.dek,
        body_md,
        summary_short: draft.summary_short,
        summary_long: draft.summary_long,
        key_takeaways: draft.key_takeaways,
        quotable_statements: draft.quotable_statements,
        word_count,
        reading_time_minutes: Math.max(1, Math.round(word_count / 220)),
        status: "review",
        tier,
        serie_id,
      })
      .select("id")
      .single();

    if (artErr) throw artErr;

    const articleId = article.id;

    if (draft.sections?.length) {
      await supabase.from("journal_article_sections").insert(
        draft.sections.map((s: any, i: number) => ({
          article_id: articleId,
          anchor_id: s.anchor_id,
          heading: s.heading,
          level: s.level,
          body_md: s.body_md,
          order_index: i,
        })),
      );
    }
    if (draft.faqs?.length) {
      await supabase.from("journal_article_faqs").insert(
        draft.faqs.map((f: any, i: number) => ({ article_id: articleId, question: f.question, answer: f.answer, order_index: i })),
      );
    }
    if (draft.citations?.length) {
      await supabase.from("journal_article_citations").insert(
        draft.citations.map((c: any, i: number) => ({
          article_id: articleId,
          quote: c.quote,
          source: c.source,
          source_url: c.source_url,
          citation_type: c.citation_type ?? "source",
          order_index: i,
        })),
      );
    }
    if (draft.entities?.length) {
      const { data: ents } = await supabase.from("journal_entities").select("id,slug").in("slug", draft.entities);
      if (ents?.length) {
        await supabase.from("journal_article_entities").insert(
          ents.map((e) => ({ article_id: articleId, entity_id: e.id, relevance_weight: 7 })),
        );
      }
    }

    return new Response(JSON.stringify({ article_id: articleId, slug: draft.slug, word_count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
