// AIPP — Import a website and extract a normalized entity payload.
// Uses Firecrawl (scrape) + Lovable AI Gateway (Gemini) for extraction.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2/scrape";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const extractionTool = {
  type: "function",
  function: {
    name: "extract_aipp_entity",
    description: "Extract a normalized contractor entity from a website.",
    parameters: {
      type: "object",
      properties: {
        legal_name: { type: "string" },
        display_name: { type: "string" },
        slug: { type: "string", description: "kebab-case slug derived from display_name" },
        primary_trade: { type: "string" },
        primary_city: { type: "string" },
        short_summary: { type: "string", description: "1-2 sentences, fr-CA" },
        long_summary: { type: "string", description: "3-6 paragraphs, fr-CA, factual" },
        services: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              category: { type: "string" },
              description: { type: "string" },
            },
            required: ["label"],
          },
        },
        service_areas: {
          type: "array",
          items: {
            type: "object",
            properties: { city: { type: "string" }, region: { type: "string" } },
            required: ["city"],
          },
        },
        contact: {
          type: "object",
          properties: {
            phone: { type: "string" },
            email: { type: "string" },
            website: { type: "string" },
            address: { type: "string" },
          },
        },
        rbq_number: { type: "string" },
        neq_number: { type: "string" },
        positioning: { type: "string", description: "Unique positioning, fr-CA" },
        faqs: {
          type: "array",
          items: {
            type: "object",
            properties: { question: { type: "string" }, answer: { type: "string" } },
            required: ["question", "answer"],
          },
        },
      },
      required: ["display_name", "slug", "primary_trade", "short_summary", "services"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY missing");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const { url, persist = false } = await req.json();
    if (!url || typeof url !== "string") throw new Error("url required");

    // 1) Scrape
    const scrapeRes = await fetch(FIRECRAWL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "links"],
        onlyMainContent: true,
      }),
    });
    if (!scrapeRes.ok) {
      const t = await scrapeRes.text();
      throw new Error(`Firecrawl ${scrapeRes.status}: ${t.slice(0, 300)}`);
    }
    const scraped = await scrapeRes.json();
    const markdown: string =
      scraped?.data?.markdown ?? scraped?.markdown ?? "";
    const metadata = scraped?.data?.metadata ?? scraped?.metadata ?? {};

    if (!markdown) throw new Error("No markdown returned from Firecrawl");

    // 2) Extract via Gemini (tool calling)
    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Tu es un extracteur d'entité AIPP UNPRO. Toujours répondre en français du Québec (fr-CA). N'invente AUCUNE certification, RBQ, NEQ ou note. Si une info n'est pas trouvée, omets-la. Le slug doit être en kebab-case, sans accents.",
          },
          {
            role: "user",
            content: `URL: ${url}\nMETADATA: ${JSON.stringify(metadata).slice(0, 1200)}\n\nCONTENU:\n${markdown.slice(0, 18000)}`,
          },
        ],
        tools: [extractionTool],
        tool_choice: { type: "function", function: { name: "extract_aipp_entity" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de requêtes atteinte." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "Crédits Lovable AI insuffisants." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI gateway ${aiRes.status}: ${t.slice(0, 300)}`);
    }
    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return a tool call");
    }
    const entity = JSON.parse(toolCall.function.arguments);

    // 3) Optional persist
    let profileId: string | null = null;
    if (persist) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const profileRow = {
        slug: entity.slug,
        legal_name: entity.legal_name ?? entity.display_name,
        display_name: entity.display_name,
        primary_trade: entity.primary_trade,
        primary_city: entity.primary_city ?? null,
        short_summary: entity.short_summary ?? null,
        long_summary: entity.long_summary ?? null,
        positioning: entity.positioning ?? null,
        contact: entity.contact ?? {},
        rbq_number: entity.rbq_number ?? null,
        neq_number: entity.neq_number ?? null,
        source_url: url,
        public_status: "draft",
      };

      const { data: up, error: upErr } = await supabase
        .from("aipp_profiles")
        .upsert(profileRow, { onConflict: "slug" })
        .select("id")
        .single();
      if (upErr) throw upErr;
      profileId = up.id;

      if (Array.isArray(entity.services) && entity.services.length) {
        await supabase.from("aipp_profile_services").delete().eq("profile_id", profileId);
        await supabase.from("aipp_profile_services").insert(
          entity.services.map((s: any, i: number) => ({
            profile_id: profileId,
            label: s.label,
            category: s.category ?? null,
            description: s.description ?? null,
            sort_order: i,
          })),
        );
      }
      if (Array.isArray(entity.service_areas) && entity.service_areas.length) {
        await supabase.from("aipp_profile_locations").delete().eq("profile_id", profileId);
        await supabase.from("aipp_profile_locations").insert(
          entity.service_areas.map((a: any, i: number) => ({
            profile_id: profileId,
            city: a.city,
            region: a.region ?? null,
            sort_order: i,
          })),
        );
      }
      await supabase.from("aipp_import_runs").insert({
        profile_id: profileId,
        source_url: url,
        status: "ok",
        payload: entity,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, entity, profile_id: profileId, source_url: url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("aipp-import-website", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
