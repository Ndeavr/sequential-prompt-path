// AIPP — Verify NEQ via Registraire des entreprises (registreentreprises.gouv.qc.ca)
// Same pattern as aipp-verify-rbq: Firecrawl scrape → Gemini structured extraction → fuzzy match.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2/scrape";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
// Public REQ search URL
const REQ_SEARCH = "https://www.registreentreprises.gouv.qc.ca/RQAnonymeGR/GR/GR03/GR03A2_19A_PIU_RechEnt_PC/PageRechSimple.aspx";

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
    // Google search fallback — REQ's form is stateful so we use a Google site:search to land on the company file page.
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(
      `"${searchName}" site:registreentreprises.gouv.qc.ca`,
    )}`;

    const scrapeRes = await fetch(FIRECRAWL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: googleUrl,
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
              "Tu extrais des numéros NEQ (10 chiffres) du Registraire des entreprises Québec. Ne renvoie QUE les entreprises listées textuellement. N'invente rien.",
          },
          {
            role: "user",
            content: `Recherchée: "${searchName}"\nVille: ${profile.primary_city ?? "—"}\n\nRÉSULTATS:\n${markdown.slice(0, 12000)}`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_neq_candidates",
            description: "Extract NEQ candidates from search results.",
            parameters: {
              type: "object",
              properties: {
                candidates: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      neq_number: { type: "string", description: "NEQ — 10 chiffres" },
                      legal_name: { type: "string" },
                      city: { type: "string" },
                      status: { type: "string" },
                    },
                    required: ["neq_number", "legal_name"],
                  },
                },
              },
              required: ["candidates"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_neq_candidates" } },
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

    const norm = (s: string) =>
      (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    const targetName = norm(searchName);
    const targetCity = norm(profile.primary_city || "");

    const strong = candidates.filter((c) => {
      const n = norm(c.legal_name);
      const cityOk = !targetCity || norm(c.city || "").includes(targetCity);
      const validNeq = /^\d{10}$/.test((c.neq_number || "").replace(/\s/g, ""));
      return validNeq && (n === targetName || n.includes(targetName) || targetName.includes(n)) && cityOk;
    });

    let neq_status: "confirmed" | "unverified" | "not_found" = "not_found";
    let neq_number: string | null = null;
    if (strong.length === 1) {
      neq_status = "confirmed";
      neq_number = strong[0].neq_number.replace(/\s/g, "");
    } else if (candidates.length > 0) {
      neq_status = "unverified";
    }

    const { error: vErr } = await supabase
      .from("aipp_profile_validations")
      .upsert({
        profile_id,
        neq_status,
        neq_number,
        neq_candidates: candidates,
        neq_source_url: googleUrl,
        neq_verified_at: new Date().toISOString(),
      }, { onConflict: "profile_id" });
    if (vErr) throw vErr;

    return new Response(JSON.stringify({
      ok: true,
      neq_status,
      neq_number,
      candidates_count: candidates.length,
      source_url: googleUrl,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("aipp-verify-neq", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
