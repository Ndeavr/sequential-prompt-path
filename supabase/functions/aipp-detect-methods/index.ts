// AIPP — Detect methods/materials per service from a contractor website.
// Re-scrapes the homepage + /services + /a-propos via Firecrawl, then asks Gemini to extract
// {service, method, material, evidence_snippet, confidence} with strict no-hallucination rules.
// Persists into aipp_detected_methods. Only rows with confidence ≥ 0.7 are public.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2/scrape";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function scrape(url: string, key: string): Promise<string> {
  try {
    const r = await fetch(FIRECRAWL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    if (!r.ok) return "";
    const j = await r.json();
    return j?.data?.markdown ?? j?.markdown ?? "";
  } catch {
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY missing");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const { profile_id } = await req.json();
    if (!profile_id) throw new Error("profile_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile, error: pErr } = await supabase
      .from("aipp_profiles")
      .select("id, company_name, website_url")
      .eq("id", profile_id)
      .single();
    if (pErr || !profile) throw new Error("Profile not found");
    if (!profile.website_url) throw new Error("Profile has no website_url");

    const { data: services } = await supabase
      .from("aipp_profile_services")
      .select("service_name, sub_services")
      .eq("profile_id", profile_id);
    const serviceNames = (services ?? []).map((s) => s.service_name).filter(Boolean);

    const base = profile.website_url.replace(/\/$/, "");
    const pages = await Promise.all([
      scrape(base, FIRECRAWL_API_KEY),
      scrape(`${base}/services`, FIRECRAWL_API_KEY),
      scrape(`${base}/a-propos`, FIRECRAWL_API_KEY),
    ]);
    const corpus = pages.filter(Boolean).join("\n\n---\n\n").slice(0, 18000);
    if (!corpus) throw new Error("No content scraped");

    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Tu extrais STRICTEMENT les méthodes et matériaux mentionnés textuellement dans le contenu d'un site d'entrepreneur. ZÉRO hallucination : chaque entrée DOIT inclure un extrait verbatim (`evidence_snippet`) tiré du contenu. Si un matériau n'est pas mentionné, ne l'inclus pas. Confidence ≥ 0.7 uniquement si l'extrait est explicite.",
          },
          {
            role: "user",
            content:
              `Entreprise: ${profile.company_name}\nServices déclarés: ${serviceNames.join(", ") || "—"}\n\nCONTENU:\n${corpus}`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_methods",
            description: "Extract verifiable methods/materials per service.",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      service_name: { type: "string" },
                      method: { type: "string", description: "Ex: Soufflage, Pulvérisation, Injection" },
                      material: { type: "string", description: "Ex: Fibre de verre, Cellulose, Uréthane" },
                      evidence_snippet: { type: "string", description: "Extrait verbatim du contenu" },
                      confidence: { type: "number", description: "0.0–1.0" },
                    },
                    required: ["service_name", "evidence_snippet", "confidence"],
                  },
                },
              },
              required: ["items"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_methods" } },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI gateway ${aiRes.status}: ${t.slice(0, 200)}`);
    }
    const aiJson = await aiRes.json();
    const args = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { items: [] };
    const items: any[] = Array.isArray(parsed.items) ? parsed.items : [];

    // Verify snippet really appears in corpus (anti-hallucination guardrail)
    const corpusLower = corpus.toLowerCase();
    const verified = items
      .filter((i) => i.evidence_snippet && corpusLower.includes(String(i.evidence_snippet).toLowerCase().slice(0, 40)))
      .map((i) => ({
        profile_id,
        service_name: i.service_name,
        method: i.method ?? null,
        material: i.material ?? null,
        evidence_snippet: String(i.evidence_snippet).slice(0, 500),
        source_url: base,
        confidence: Math.max(0, Math.min(1, Number(i.confidence) || 0.5)),
      }));

    if (verified.length > 0) {
      // Replace prior detections for this profile (admin can re-run anytime)
      await supabase.from("aipp_detected_methods").delete().eq("profile_id", profile_id);
      const { error: insErr } = await supabase.from("aipp_detected_methods").insert(verified);
      if (insErr) throw insErr;
    }

    return new Response(JSON.stringify({
      ok: true,
      detected: verified.length,
      raw: items.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("aipp-detect-methods", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
