// AI Entity — generate ai_summary (3-4 sentences) + 5 FAQs from scraped website corpus.
// Strict no-hallucination: model must only use facts from corpus. Persists into ai_entities.ai_summary
// and ai_entity_faq.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const { entity_id } = await req.json();
    if (!entity_id) throw new Error("entity_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: entity } = await supabase
      .from("ai_entities")
      .select("id, company_name, primary_service, primary_city")
      .eq("id", entity_id).single();
    if (!entity) throw new Error("Entity not found");

    const { data: source } = await supabase
      .from("ai_entity_sources").select("raw_payload")
      .eq("entity_id", entity_id).eq("source_type", "website").maybeSingle();
    const corpus = (source?.raw_payload as any)?.corpus ?? "";
    if (!corpus) throw new Error("No website corpus — run ai-entity-scrape-website first");

    const ai = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Tu rédiges en français québécois. ZÉRO hallucination : uniquement des faits présents dans le contenu fourni. Si une info manque, ne l'invente pas. Réponds en JSON STRICT: { \"summary\": string (3-4 phrases, factuel, ton neutre, mentionne service principal + ville si présents), \"faqs\": [{\"question\": string, \"answer\": string}] (exactement 5 questions utiles que poseraient un propriétaire ou ChatGPT) }.",
          },
          {
            role: "user",
            content: `Entreprise: ${entity.company_name}\nService principal: ${entity.primary_service ?? "n/a"}\nVille: ${entity.primary_city ?? "n/a"}\n\nContenu du site:\n${corpus.slice(0, 18000)}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!ai.ok) throw new Error(`AI ${ai.status}: ${await ai.text()}`);
    const ajson = await ai.json();
    const content = ajson?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const summary: string = parsed.summary ?? "";
    const faqs: { question: string; answer: string }[] = Array.isArray(parsed.faqs) ? parsed.faqs.slice(0, 5) : [];

    if (summary) {
      await supabase.from("ai_entities").update({ ai_summary: summary }).eq("id", entity_id);
    }
    if (faqs.length) {
      await supabase.from("ai_entity_faq").delete().eq("entity_id", entity_id).eq("generated_from", "ai_summary_v1");
      await supabase.from("ai_entity_faq").insert(
        faqs.map((f, i) => ({
          entity_id, question: f.question, answer: f.answer,
          generated_from: "ai_summary_v1", sort_order: i,
        })),
      );
    }

    await supabase.rpc("recompute_ai_entity_score", { p_entity: entity_id });

    return new Response(JSON.stringify({ ok: true, summary_length: summary.length, faqs: faqs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e instanceof Error ? e.message : e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
