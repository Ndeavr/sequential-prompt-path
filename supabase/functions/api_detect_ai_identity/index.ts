// UNPRO AI Trust Layer — Detect AI Identity
// Scrape website + reviews, use Lovable AI (Gemini) to extract what AI "sees".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { contractor_id, website, company_name, city } = await req.json();
    if (!contractor_id) {
      return new Response(JSON.stringify({ error: "contractor_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1) Scrape (best-effort)
    let scraped = "";
    if (website && FIRECRAWL_API_KEY) {
      try {
        const fc = await fetch("https://api.firecrawl.dev/v2/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: website, formats: ["markdown"], onlyMainContent: true }),
        });
        const d = await fc.json();
        scraped = (d?.markdown || d?.data?.markdown || "").slice(0, 6000);
      } catch (_) { /* ignore */ }
    }

    // 2) Ask Gemini
    const prompt = `Tu es un analyste qui détermine comment les systèmes d'IA (ChatGPT, Perplexity, Google AI) interprètent une entreprise de services résidentiels au Québec.

Entreprise: ${company_name || "?"}
Ville: ${city || "?"}
Site web: ${website || "(aucun)"}
Contenu scrapé:
"""${scraped || "(non disponible)"}"""

Retourne strictement un JSON:
{
  "detected_identity": "string court (ex: Entrepreneur général)",
  "confidence_score": 0-100,
  "ai_summary": "1-2 phrases sur l'interprétation actuelle",
  "semantic_entities": [{"name":"...","type":"specialty|service|trust","confidence":0-100}],
  "specialization_clarity": 0-100,
  "review_trust_density": "weak|medium|strong",
  "confusion_risk": "low|medium|high"
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    const aiData = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiData?.choices?.[0]?.message?.content || "{}"); } catch { parsed = {}; }

    // 3) Persist
    await supabase.from("contractor_ai_interpretation").insert({
      contractor_id,
      detected_identity: parsed.detected_identity || "Inconnu",
      ai_summary: parsed.ai_summary || "",
      confidence_score: parsed.confidence_score ?? 0,
    });

    if (Array.isArray(parsed.semantic_entities)) {
      const rows = parsed.semantic_entities.slice(0, 20).map((e: any) => ({
        contractor_id,
        entity_name: String(e.name || "").slice(0, 200),
        entity_type: String(e.type || "service").slice(0, 50),
        confidence_score: Number(e.confidence) || 0,
      })).filter((r: any) => r.entity_name);
      if (rows.length) await supabase.from("contractor_semantic_entities").insert(rows);
    }

    return new Response(JSON.stringify({ ok: true, interpretation: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
