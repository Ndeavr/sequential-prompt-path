/**
 * UNPRO — contractor-activation-enrich
 * Orchestrates auto-import for the contractor activation funnel.
 * Input: { funnel_id, business_name, phone?, website? }
 * or: { action: "status", funnel_id }
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2.57.2/cors";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { action, funnel_id, business_name, phone, website } = body;

    if (!funnel_id) {
      return new Response(
        JSON.stringify({ error: "funnel_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Status polling
    if (action === "status") {
      const { data, error } = await supabase
        .from("contractor_activation_funnel")
        .select("import_status, imported_data, aipp_score")
        .eq("id", funnel_id)
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as running
    await supabase
      .from("contractor_activation_funnel")
      .update({ import_status: "running" })
      .eq("id", funnel_id);

    // Start enrichment in background
    const enrichPromise = enrichContractor(supabase, funnel_id, business_name, phone, website);

    // Return immediate 202
    // Use waitUntil-like pattern for background processing
    enrichPromise.catch(async (err: Error) => {
      console.error("Enrichment failed:", err);
      await supabase
        .from("contractor_activation_funnel")
        .update({ import_status: "failed" })
        .eq("id", funnel_id);
    });

    return new Response(
      JSON.stringify({ status: "processing", funnel_id }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("contractor-activation-enrich error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function enrichContractor(
  supabase: any,
  funnelId: string,
  businessName: string,
  phone?: string,
  website?: string,
) {
  const importedData: Record<string, unknown> = {};

  // 1. Google Places lookup (if GOOGLE_PLACES_API_KEY available)
  const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (googleApiKey && businessName) {
    try {
      const query = encodeURIComponent(`${businessName} Quebec`);
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${googleApiKey}`
      );
      const data = await res.json();
      if (data.results?.[0]) {
        const place = data.results[0];
        importedData.google_name = place.name;
        importedData.google_address = place.formatted_address;
        importedData.google_rating = place.rating;
        importedData.google_reviews_count = place.user_ratings_total;
        importedData.google_place_id = place.place_id;
        importedData.google_categories = place.types;
        if (place.photos?.[0]) {
          importedData.google_photo_ref = place.photos[0].photo_reference;
        }
      }
    } catch (e) {
      console.error("Google Places lookup failed:", e);
    }
  }

  // 2. Website scrape via Firecrawl (if available)
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (firecrawlKey && website) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: website,
          formats: ["markdown", "links"],
          onlyMainContent: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        importedData.website_content = data.markdown?.substring(0, 2000);
        importedData.website_links = data.links?.slice(0, 20);
        importedData.website_title = data.metadata?.title;
        importedData.website_description = data.metadata?.description;
      }
    } catch (e) {
      console.error("Firecrawl scrape failed:", e);
    }
  }

  // 3. RBQ lookup stub (structured for future API)
  importedData.rbq_lookup_attempted = true;
  importedData.rbq_number = null;
  importedData.rbq_classes = [];

  // 4. NEQ lookup stub
  importedData.neq_lookup_attempted = true;
  importedData.neq_number = null;

  // 5. Compute preliminary AIPP score
  let overall = 20; // Base score
  const subscores: Array<{ key: string; label: string; score: number; maxScore: number }> = [];

  // Visibility
  const visScore = (importedData.google_place_id ? 40 : 10) + (website ? 20 : 0);
  subscores.push({ key: "visibility", label: "Visibilité", score: Math.min(visScore, 100), maxScore: 100 });
  overall += visScore * 0.15;

  // Trust
  const trustScore = (importedData.rbq_number ? 60 : 10);
  subscores.push({ key: "trust", label: "Confiance", score: trustScore, maxScore: 100 });
  overall += trustScore * 0.15;

  // Reviews
  const reviewScore = importedData.google_rating
    ? Math.min(((importedData.google_rating as number) / 5) * 80 + 10, 100)
    : 5;
  subscores.push({ key: "reviews", label: "Réputation", score: Math.round(reviewScore), maxScore: 100 });
  overall += reviewScore * 0.12;

  // Media
  const mediaScore = importedData.google_photo_ref ? 30 : 5;
  subscores.push({ key: "media", label: "Contenu visuel", score: mediaScore, maxScore: 100 });
  overall += mediaScore * 0.1;

  // Conversion
  const convScore = website ? 35 : 10;
  subscores.push({ key: "conversion", label: "Conversion", score: convScore, maxScore: 100 });
  overall += convScore * 0.12;

  // AEO
  const aeoScore = importedData.website_content ? 25 : 5;
  subscores.push({ key: "aeo", label: "Structure IA", score: aeoScore, maxScore: 100 });
  overall += aeoScore * 0.12;

  // Service precision
  subscores.push({ key: "service_precision", label: "Précision services", score: 15, maxScore: 100 });
  overall += 15 * 0.12;

  // Geo precision
  const geoScore = importedData.google_address ? 30 : 5;
  subscores.push({ key: "geo_precision", label: "Précision géo", score: geoScore, maxScore: 100 });
  overall += geoScore * 0.12;

  const foundItems: string[] = [];
  const missingItems: string[] = [];

  if (importedData.google_name) foundItems.push("Nom d'entreprise détecté");
  if (importedData.google_address) foundItems.push("Adresse trouvée");
  if (importedData.google_rating) foundItems.push(`${importedData.google_reviews_count} avis Google trouvés`);
  if (importedData.google_photo_ref) foundItems.push("Photo Google détectée");
  if (importedData.website_title) foundItems.push("Site web analysé");
  if (phone) foundItems.push("Téléphone enregistré");

  if (!importedData.rbq_number) missingItems.push("Licence RBQ non vérifiée");
  if (!importedData.google_photo_ref) missingItems.push("Photos de projets manquantes");
  missingItems.push("Zones de service non confirmées");
  missingItems.push("Calendrier non connecté");
  if (!importedData.website_content) missingItems.push("Site web non analysé");

  const aippScore = {
    overall: Math.min(Math.round(overall), 100),
    subscores,
    found_items: foundItems,
    missing_items: missingItems,
  };

  // Save to DB
  await supabase
    .from("contractor_activation_funnel")
    .update({
      import_status: "completed",
      imported_data: importedData,
      aipp_score: aippScore,
    })
    .eq("id", funnelId);
}
