const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { website_url, phone } = await req.json();

    if (!website_url && !phone) {
      return new Response(
        JSON.stringify({ success: false, error: "website_url ou phone requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl non configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize URL
    let normalizedUrl = "";
    if (website_url) {
      normalizedUrl = website_url
        .trim()
        .replace(/\s+/g, "")  // remove all spaces
        .replace(/^(https?)?:?\/?\/*/i, "")  // remove protocol fragments
        .toLowerCase();
      // Re-add protocol
      normalizedUrl = `https://${normalizedUrl}`;
      // Remove trailing slashes
      normalizedUrl = normalizedUrl.replace(/\/+$/, "");
    }

    let scrapeResult: any = null;
    let screenshot: string | null = null;
    let branding: any = null;
    let markdown = "";
    let metadata: any = {};
    let links: string[] = [];

    if (normalizedUrl) {
      console.log("Scraping:", normalizedUrl);

      const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: normalizedUrl,
          formats: ["markdown", "screenshot", "branding", "links"],
          onlyMainContent: false,
          waitFor: 3000,
        }),
      });

      if (resp.ok) {
        scrapeResult = await resp.json();
        const data = scrapeResult?.data || scrapeResult;
        screenshot = data?.screenshot || null;
        branding = data?.branding || null;
        markdown = data?.markdown || "";
        metadata = data?.metadata || {};
        links = data?.links || [];
      } else {
        console.error("Firecrawl error:", resp.status, await resp.text());
      }
    }

    // Extract real signals from scraped data
    const signals = extractSignals(markdown, metadata, branding, links, normalizedUrl, phone);

    return new Response(
      JSON.stringify({
        success: true,
        normalized_url: normalizedUrl || null,
        screenshot,
        branding,
        metadata,
        signals,
        links_count: links.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("aipp-real-scan error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractSignals(
  markdown: string,
  metadata: any,
  branding: any,
  links: string[],
  url: string,
  phone?: string
) {
  const md = (markdown || "").toLowerCase();
  const title = metadata?.title || "";
  const description = metadata?.description || "";

  // Detect phone on page
  const phoneRegex = /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g;
  const phonesFound = md.match(phoneRegex) || [];

  // Detect email
  const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
  const emailsFound = md.match(emailRegex) || [];

  // Detect social links
  const socialPlatforms = ["facebook", "instagram", "linkedin", "twitter", "youtube", "tiktok"];
  const socialsFound = socialPlatforms.filter(
    (p) => links.some((l) => l.toLowerCase().includes(p))
  );

  // Detect structured data hints
  const hasStructuredHints =
    md.includes("schema") || md.includes("json-ld") || md.includes("itemtype");

  // Detect reviews / testimonials
  const hasReviews =
    md.includes("avis") || md.includes("review") || md.includes("témoignage") || md.includes("étoile");

  // Detect services mentioned
  const serviceKeywords = [
    "plomberie", "électricité", "toiture", "rénovation", "peinture",
    "isolation", "chauffage", "climatisation", "menuiserie", "excavation",
    "plumbing", "roofing", "renovation", "painting", "heating",
  ];
  const servicesDetected = serviceKeywords.filter((k) => md.includes(k));

  // Detect city/region
  const cityKeywords = [
    "montréal", "laval", "longueuil", "québec", "gatineau", "sherbrooke",
    "trois-rivières", "saguenay", "lévis", "terrebonne", "repentigny",
    "brossard", "drummondville", "saint-jean", "granby", "blainville",
  ];
  const citiesDetected = cityKeywords.filter((k) => md.includes(k));

  // Detect SSL
  const hasSSL = url.startsWith("https");

  // Has logo
  const hasLogo = !!(branding?.logo || branding?.images?.logo || branding?.images?.favicon);

  // Page count from links
  const internalLinks = links.filter((l) => {
    try {
      const u = new URL(l);
      const base = new URL(url);
      return u.hostname === base.hostname;
    } catch { return false; }
  });

  // Business name from title — clean up common patterns
  let businessNameFromSite = title.split("|")[0]?.split("–")[0]?.trim() || "";
  // Remove trailing " - " prefix
  businessNameFromSite = businessNameFromSite.split(" - ")[0]?.trim() || businessNameFromSite;
  // Remove "— " patterns like "UNPRO — Rendez"
  businessNameFromSite = businessNameFromSite.split("—")[0]?.trim() || businessNameFromSite;

  return {
    business_name_detected: businessNameFromSite,
    title,
    description,
    has_ssl: hasSSL,
    has_logo: hasLogo,
    phones_found: phonesFound.slice(0, 3),
    emails_found: emailsFound.slice(0, 3),
    socials_found: socialsFound,
    has_reviews: hasReviews,
    has_structured_data: hasStructuredHints,
    services_detected: servicesDetected,
    cities_detected: citiesDetected,
    internal_pages_count: internalLinks.length,
    total_links_count: links.length,
    branding_colors: branding?.colors || null,
    branding_fonts: branding?.fonts || null,
  };
}
