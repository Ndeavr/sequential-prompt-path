// LIVE Agent — Enrichment via Firecrawl scrape + Gemini extraction
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let runId: string | null = null;
  try {
    const { prospect_id } = await req.json();
    if (!prospect_id) throw new Error("prospect_id required");

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY missing");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const { data: prospect, error: pErr } = await supabase.from("contractor_prospects")
      .select("*").eq("id", prospect_id).single();
    if (pErr || !prospect) throw new Error("prospect not found");

    const { data: run } = await supabase.from("live_agent_runs").insert({
      agent_name: "live-agent-enrich", agent_type: "enrichment",
      input: { prospect_id }, run_status: "running",
    }).select("id").single();
    runId = run?.id ?? null;

    const url = prospect.website_url;
    if (!url) throw new Error("no website_url to enrich");

    // 1) Scrape
    const fc = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown", "branding"], onlyMainContent: true }),
    });
    const fcJson = await fc.json();
    if (!fc.ok) throw new Error(`Firecrawl scrape: ${fc.status}`);
    const markdown = (fcJson.data?.markdown ?? fcJson.markdown ?? "").slice(0, 12000);
    const branding = fcJson.data?.branding ?? fcJson.branding ?? null;
    const meta = fcJson.data?.metadata ?? fcJson.metadata ?? {};

    // 2) Gemini extraction via Lovable AI
    const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu extrais des infos d'entrepreneurs québécois. Réponds uniquement via l'outil." },
          { role: "user", content: `Site: ${url}\nTitre: ${meta.title || ""}\n\nContenu:\n${markdown}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_contractor",
            description: "Extract contractor info",
            parameters: {
              type: "object",
              properties: {
                business_name: { type: "string" },
                description: { type: "string", description: "Description courte (FR, max 280 char)" },
                services: { type: "array", items: { type: "string" } },
                service_areas: { type: "array", items: { type: "string" } },
                phone: { type: "string" },
                email: { type: "string" },
                address: { type: "string" },
                city: { type: "string" },
                postal_code: { type: "string" },
                rbq: { type: "string", description: "Numéro RBQ si trouvé" },
                neq: { type: "string" },
                language: { type: "string", enum: ["fr", "en", "bilingual"] },
                trade_confirmed: { type: "string" },
              },
              required: ["business_name", "description", "services"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_contractor" } },
      }),
    });
    const aiJson = await ai.json();
    if (!ai.ok) throw new Error(`Gemini: ${ai.status} ${JSON.stringify(aiJson).slice(0,200)}`);
    const args = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const extracted = args ? JSON.parse(args) : {};

    // 3) Update prospect
    const update: any = {
      enrichment_status: "enriched",
      qualification_status: "enriched",
      raw_data: { ...(prospect.raw_data || {}), branding, meta, extracted, enriched_at: new Date().toISOString() },
    };
    if (extracted.business_name) update.business_name = extracted.business_name;
    if (extracted.phone) update.phone = extracted.phone;
    if (extracted.email) update.email = extracted.email;
    if (extracted.address) update.address = extracted.address;
    if (extracted.postal_code) update.postal_code = extracted.postal_code;
    if (extracted.rbq) update.rbq = extracted.rbq;
    if (extracted.neq) update.neq = extracted.neq;
    if (extracted.language) update.language_guess = extracted.language === "bilingual" ? "fr" : extracted.language;

    await supabase.from("contractor_prospects").update(update).eq("id", prospect_id);

    if (runId) await supabase.from("live_agent_runs").update({
      run_status: "completed", finished_at: new Date().toISOString(),
      output: { extracted, has_branding: !!branding },
    }).eq("id", runId);

    return new Response(JSON.stringify({ success: true, extracted, run_id: runId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    if (runId) await supabase.from("live_agent_runs").update({
      run_status: "failed", finished_at: new Date().toISOString(), error_message: e.message,
    }).eq("id", runId);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
