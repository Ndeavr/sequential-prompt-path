import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { company_id } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get company
    const { data: company } = await supabase
      .from("outbound_companies")
      .select("*")
      .eq("id", company_id)
      .maybeSingle();

    if (!company) {
      return new Response(JSON.stringify({ error: "Company not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const domain = company.website_url
      ? company.website_url.replace(/^https?:\/\//, "").replace(/\/+$/, "").replace(/\s+/g, "")
      : null;

    let enrichment: any = {
      prospect_id: company_id,
      has_https: false,
      has_schema: false,
      has_faq: false,
      has_booking_cta: false,
      has_reviews_widget: false,
      has_service_pages: false,
      has_city_pages: false,
      has_before_after_gallery: false,
      has_phone_visible: false,
      has_email_visible: false,
      has_financing_visible: false,
      estimated_review_count: company.review_count || 0,
      estimated_google_rating: company.google_rating || null,
    };

    let screenshotUrl: string | null = null;

    // Try Firecrawl if available
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (domain && firecrawlKey) {
      try {
        const url = `https://${domain}`;
        const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            formats: ["markdown", "screenshot", "links"],
            onlyMainContent: false,
            waitFor: 3000,
          }),
        });

        if (res.ok) {
          const scrapeData = await res.json();
          const md = (scrapeData.data?.markdown || scrapeData.markdown || "").toLowerCase();
          const html = md;
          const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

          enrichment.website_title = metadata.title || null;
          enrichment.website_meta_description = metadata.description || null;
          enrichment.has_https = url.startsWith("https");
          enrichment.has_faq = /faq|questions? fr[eé]quentes|frequently asked/i.test(md);
          enrichment.has_booking_cta = /r[eé]server|book|prendre rendez|planifier|schedule/i.test(md);
          enrichment.has_reviews_widget = /t[eé]moignages|avis|reviews|google reviews/i.test(md);
          enrichment.has_service_pages = /nos services|services offerts|our services/i.test(md);
          enrichment.has_city_pages = /montr[eé]al|laval|longueuil|qu[eé]bec|gatineau|sherbrooke|trois-rivi[eè]res/i.test(md);
          enrichment.has_phone_visible = /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(md);
          enrichment.has_email_visible = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(md);
          enrichment.has_financing_visible = /financement|financing|paiement/i.test(md);
          enrichment.has_before_after_gallery = /avant[- ]apr[eè]s|before[- ]after|galerie|portfolio/i.test(md);
          enrichment.has_schema = /schema\.org|application\/ld\+json|itemtype/i.test(md);

          // Detect platform
          if (/wordpress|wp-content/i.test(md)) enrichment.detected_platform = "WordPress";
          else if (/wix\.com/i.test(md)) enrichment.detected_platform = "Wix";
          else if (/squarespace/i.test(md)) enrichment.detected_platform = "Squarespace";
          else if (/shopify/i.test(md)) enrichment.detected_platform = "Shopify";
          else if (/godaddy/i.test(md)) enrichment.detected_platform = "GoDaddy";

          screenshotUrl = scrapeData.data?.screenshot || scrapeData.screenshot || null;
        }
      } catch (e) {
        console.error("Firecrawl error:", e);
      }
    }

    // Upsert enrichment
    const { data: existing } = await supabase
      .from("prospect_enrichments")
      .select("id")
      .eq("prospect_id", company_id)
      .maybeSingle();

    if (existing) {
      await supabase.from("prospect_enrichments").update({ ...enrichment, enriched_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("prospect_enrichments").insert(enrichment);
    }

    // Upsert domain
    if (domain) {
      const { data: existingDomain } = await supabase
        .from("prospect_domains")
        .select("id")
        .eq("prospect_id", company_id)
        .eq("domain", domain)
        .maybeSingle();

      const domainData = {
        prospect_id: company_id,
        domain,
        status: "active",
        website_live: true,
        screenshot_url: screenshotUrl,
      };

      if (existingDomain) {
        await supabase.from("prospect_domains").update(domainData).eq("id", existingDomain.id);
      } else {
        await supabase.from("prospect_domains").insert(domainData);
      }
    }

    // Update lead status
    const { data: leads } = await supabase
      .from("outbound_leads")
      .select("id, crm_status")
      .eq("company_id", company_id);

    for (const lead of (leads || [])) {
      if (["new", "imported"].includes(lead.crm_status)) {
        await supabase.from("outbound_leads").update({ crm_status: "enriched" }).eq("id", lead.id);
      }
    }

    return new Response(JSON.stringify({ success: true, enrichment, screenshot_url: screenshotUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
