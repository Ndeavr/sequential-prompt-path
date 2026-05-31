// Scrape a partner website with Firecrawl + extract structured profile via Gemini.
// Updates public.signature_partners by slug.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2";

const EXTRACTION_PROMPT = `Tu analyses le site web d'un entrepreneur en isolation au Québec.
Extrais en JSON structuré: identité (legal_name, display_name, tagline, founded_year),
services (array {name, slug, description}), coverage (array de villes/régions),
certifications (array {label, verified}), contacts (phone, email, address),
témoignages (array {quote, author}), garanties (array de strings).
Réponds UNIQUEMENT avec un JSON valide, aucun markdown.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { slug, source_url } = await req.json();
    if (!slug || !source_url) {
      return new Response(JSON.stringify({ error: "slug + source_url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!FIRECRAWL_KEY) throw new Error("FIRECRAWL_API_KEY missing");
    if (!LOVABLE_KEY) throw new Error("LOVABLE_API_KEY missing");

    // 1. Firecrawl scrape (markdown + branding + screenshot + links)
    const scrapeRes = await fetch(`${FIRECRAWL}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: source_url,
        formats: ["markdown", "links", "screenshot", "branding"],
        onlyMainContent: true,
      }),
    });
    const scrape = await scrapeRes.json();
    if (!scrapeRes.ok) throw new Error(`Firecrawl: ${JSON.stringify(scrape)}`);

    const markdown = scrape.markdown || scrape.data?.markdown || "";
    const branding = scrape.branding || scrape.data?.branding || {};
    const screenshot = scrape.screenshot || scrape.data?.screenshot || null;

    // 2. AI extraction via Lovable Gateway
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: EXTRACTION_PROMPT },
          { role: "user", content: markdown.slice(0, 24000) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const aiJson = await aiRes.json();
    if (!aiRes.ok) throw new Error(`AI gateway: ${JSON.stringify(aiJson)}`);

    let extracted: Record<string, unknown> = {};
    try {
      extracted = JSON.parse(aiJson.choices?.[0]?.message?.content || "{}");
    } catch {
      extracted = {};
    }

    // 3. Persist
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const contacts = (extracted.contacts as Record<string, string>) || {};
    const update = {
      legal_name: extracted.legal_name ?? null,
      display_name: extracted.display_name ?? "Isolation Solution Royal",
      tagline: extracted.tagline ?? null,
      phone: contacts.phone ?? null,
      email: contacts.email ?? null,
      address: contacts.address ?? null,
      brand: branding,
      services: extracted.services ?? [],
      coverage: extracted.coverage ?? [],
      certifications: extracted.certifications ?? [],
      media: { screenshot, testimonials: extracted.témoignages ?? extracted.testimonials ?? [] },
      scraped_data: { markdown_excerpt: markdown.slice(0, 4000), links: scrape.links ?? [] },
      enriched_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("signature_partners")
      .update(update)
      .eq("slug", slug)
      .select()
      .single();

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, partner: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
