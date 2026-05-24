// AIPP — Verify RBQ license against the public RBQ registry via Firecrawl.
// Updates aipp_profile_validations with rbq_status / rbq_number / candidates.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2/scrape";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const RBQ_SEARCH = "https://www.rbq.gouv.qc.ca/recherche-dun-titulaire-dune-licence-rbq/resultats-de-la-recherche.html";

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
      .select("id, company_name, legal_name, primary_city")
      .eq("id", profile_id)
      .single();
    if (pErr || !profile) throw new Error("Profile not found");

    const searchName = profile.legal_name || profile.company_name;
    const url = `${RBQ_SEARCH}?nomEntreprise=${encodeURIComponent(searchName)}`;

    // 1) Scrape the RBQ search results
    const scrapeRes = await fetch(FIRECRAWL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 1500,
      }),
    });
    if (!scrapeRes.ok) {
      const t = await scrapeRes.text();
      throw new Error(`Firecrawl ${scrapeRes.status}: ${t.slice(0, 200)}`);
    }
    const scraped = await scrapeRes.json();
    const markdown: string = scraped?.data?.markdown ?? scraped?.markdown ?? "";

    // 2) Extract structured candidates via Gemini
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
              "Tu es un extracteur de résultats du registre RBQ Québec. Extraire UNIQUEMENT les titulaires listés dans le contenu fourni. N'invente rien.",
          },
          {
            role: "user",
            content: `Entreprise recherchée: "${searchName}"\nVille: ${profile.primary_city ?? "—"}\n\nRÉSULTATS:\n${markdown.slice(0, 12000)}`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_rbq_candidates",
            description: "Extract RBQ license holder candidates from the registry results page.",
            parameters: {
              type: "object",
              properties: {
                candidates: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      license_number: { type: "string", description: "RBQ license number (format like 1234-5678-90)" },
                      legal_name: { type: "string" },
                      city: { type: "string" },
                      categories: { type: "array", items: { type: "string" } },
                      status: { type: "string", description: "Active / Suspended / etc" },
                    },
                    required: ["license_number", "legal_name"],
                  },
                },
              },
              required: ["candidates"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_rbq_candidates" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI gateway ${aiRes.status}: ${t.slice(0, 200)}`);
    }
    const aiJson = await aiRes.json();
    const args = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { candidates: [] };
    const candidates: any[] = Array.isArray(parsed.candidates) ? parsed.candidates : [];

    // 3) Determine match: exact-name + city → confirmed, multiple → unverified, none → not_found
    const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    const targetName = norm(searchName);
    const targetCity = norm(profile.primary_city || "");

    const strongMatches = candidates.filter((c) => {
      const n = norm(c.legal_name);
      const cityOk = !targetCity || norm(c.city || "").includes(targetCity);
      return (n === targetName || n.includes(targetName) || targetName.includes(n)) && cityOk;
    });

    let rbq_status: "confirmed" | "unverified" | "not_found" = "not_found";
    let rbq_number: string | null = null;
    let rbq_categories: string[] | null = null;

    if (strongMatches.length === 1) {
      rbq_status = "confirmed";
      rbq_number = strongMatches[0].license_number;
      rbq_categories = strongMatches[0].categories ?? null;
    } else if (candidates.length > 0) {
      rbq_status = "unverified";
    }

    // 4) Persist
    const { error: vErr } = await supabase
      .from("aipp_profile_validations")
      .upsert({
        profile_id,
        rbq_status,
        rbq_number,
        rbq_categories,
        rbq_candidates: candidates,
        rbq_source_url: url,
        rbq_verified_at: new Date().toISOString(),
      }, { onConflict: "profile_id" });
    if (vErr) throw vErr;

    await supabase.from("aipp_profile_sources").insert({
      profile_id,
      source_type: "rbq_registry",
      source_url: url,
      fetched_at: new Date().toISOString(),
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({
      ok: true,
      rbq_status,
      rbq_number,
      candidates_count: candidates.length,
      source_url: url,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("aipp-verify-rbq", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
