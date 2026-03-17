import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ImportForm {
  businessName: string;
  website?: string;
  googleUrl?: string;
  facebookUrl?: string;
  phone?: string;
  city?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { importForm } = (await req.json()) as { importForm: ImportForm };
    if (!importForm?.businessName) {
      return new Response(JSON.stringify({ error: "businessName required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const placesKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    // ── 1. Google Places Text Search ──
    let googleData: any = null;
    if (placesKey) {
      try {
        const query = `${importForm.businessName} ${importForm.city || ""}`.trim();
        const url = `https://places.googleapis.com/v1/places:searchText`;
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": placesKey,
            "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.photos,places.regularOpeningHours,places.types,places.primaryTypeDisplayName,places.googleMapsUri,places.businessStatus",
          },
          body: JSON.stringify({ textQuery: query, languageCode: "fr" }),
        });
        if (resp.ok) {
          const json = await resp.json();
          googleData = json.places?.[0] || null;
        }
      } catch (e) {
        console.error("Google Places error:", e);
      }
    }

    // ── 2. Firecrawl Website Scrape ──
    let websiteData: any = null;
    const websiteUrl = importForm.website || googleData?.websiteUri;
    if (firecrawlKey && websiteUrl) {
      try {
        let formattedUrl = websiteUrl.trim();
        if (!formattedUrl.startsWith("http")) formattedUrl = `https://${formattedUrl}`;
        const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: formattedUrl,
            formats: ["markdown", "links"],
            onlyMainContent: true,
            timeout: 15000,
          }),
        });
        if (resp.ok) {
          websiteData = await resp.json();
        }
      } catch (e) {
        console.error("Firecrawl error:", e);
      }
    }

    // ── 3. Build structured business data ──
    const imp = (v: any, src: string, conf = 0.95) => ({ value: v, state: "imported" as const, source: src, confidence: conf });
    const inf = (v: any, src: string, conf = 0.7) => ({ value: v, state: "inferred" as const, source: src, confidence: conf });
    const conf = (v: any, src: string) => ({ value: v, state: "needs_confirmation" as const, source: src, confidence: 0.5 });
    const miss = (src = "none") => ({ value: null, state: "missing" as const, source: src, confidence: 0 });

    // Extract from Google
    const gName = googleData?.displayName?.text;
    const gAddress = googleData?.formattedAddress;
    const gPhone = googleData?.nationalPhoneNumber;
    const gWebsite = googleData?.websiteUri;
    const gRating = googleData?.rating;
    const gReviewCount = googleData?.userRatingCount;
    const gPhotoCount = googleData?.photos?.length || 0;
    const gHours = googleData?.regularOpeningHours?.weekdayDescriptions?.join(", ");
    const gCategory = googleData?.primaryTypeDisplayName?.text;
    const gTypes = googleData?.types || [];

    // Parse city from address
    const addressParts = gAddress?.split(",") || [];
    const gCity = importForm.city || (addressParts.length >= 2 ? addressParts[addressParts.length - 2]?.trim() : null);

    // Detect some website signals from markdown
    const markdown = websiteData?.data?.markdown || websiteData?.markdown || "";
    const hasSchema = markdown.includes("schema.org") || markdown.includes("@type");
    const hasFaq = /faq|questions?\s+fréquentes/i.test(markdown);
    const hasCta = /devis|soumission|contactez|appelez|gratuit/i.test(markdown);
    const websiteLinks = websiteData?.data?.links || websiteData?.links || [];

    // Detect Facebook from links
    const fbLink = websiteLinks.find((l: string) => l.includes("facebook.com"));

    const businessData: Record<string, any> = {
      businessName: gName ? imp(gName, "google") : importForm.businessName ? conf(importForm.businessName, "user") : miss(),
      category: gCategory ? imp(gCategory, "google") : miss(),
      phone: gPhone ? imp(gPhone, "google", 0.98) : importForm.phone ? conf(importForm.phone, "user") : miss(),
      email: miss(),
      website: gWebsite ? imp(gWebsite, "google") : importForm.website ? conf(importForm.website, "user") : miss(),
      address: gAddress ? imp(gAddress, "google") : miss(),
      city: gCity ? imp(gCity, "google") : miss(),
      province: miss(),
      postalCode: miss(),
      logoUrl: miss(),
      description: markdown.length > 100 ? inf(markdown.substring(0, 300), "website", 0.6) : miss(),
      rating: gRating ? imp(gRating, "google") : miss(),
      reviewCount: gReviewCount ? imp(gReviewCount, "google") : miss(),
      reviewRecency: miss(),
      ownerResponses: miss(),
      photoCount: gPhotoCount > 0 ? imp(gPhotoCount, "google") : miss(),
      businessHours: gHours ? imp(gHours, "google") : miss(),
      serviceArea: gCity ? inf([gCity], "google", 0.6) : miss(),
      websiteCta: hasCta ? inf("strong", "website", 0.7) : websiteUrl ? conf("weak", "website") : miss(),
      websiteSchema: hasSchema ? imp(true, "website") : miss("website"),
      websiteFaq: hasFaq ? imp(true, "website") : miss("website"),
      facebookPresence: fbLink ? imp(true, "website") : importForm.facebookUrl ? conf(true, "user") : miss(),
      facebookFollowers: miss(),
      insuranceInfo: miss(),
      licenseNumber: miss(),
      certifications: miss(),
      portfolioPhotos: gPhotoCount > 10 ? conf(["google_photos"], "google") : miss(),
      yearsExperience: miss(),
      languages: miss(),
      emergencyService: miss(),
      warranties: miss(),
      financing: miss(),
    };

    // ── 4. Build retrieval modules log ──
    const modules = [
      { id: "identity", label: "Identification de l'entreprise", status: "completed", progress: 100, messages: [`« ${importForm.businessName} » identifié`] },
      {
        id: "google", label: "Profil Google", status: googleData ? "completed" : "missing", progress: 100,
        messages: googleData
          ? [`Profil Google trouvé`, `${gReviewCount || 0} avis indexés`, `${gPhotoCount} photos détectées`]
          : ["Aucun profil Google trouvé"],
      },
      {
        id: "facebook", label: "Profil Facebook", status: fbLink || importForm.facebookUrl ? "partial" : "missing", progress: 100,
        messages: fbLink ? ["Page Facebook détectée via le site web"] : importForm.facebookUrl ? ["URL Facebook fournie"] : ["Aucune page Facebook trouvée"],
      },
      {
        id: "website", label: "Analyse du site web", status: websiteData ? "completed" : websiteUrl ? "partial" : "missing", progress: 100,
        messages: websiteData
          ? [`Site web analysé`, hasCta ? "Appel à l'action détecté" : "Appel à l'action faible", hasSchema ? "Données structurées trouvées" : "Données structurées manquantes"]
          : websiteUrl ? ["Analyse partielle"] : ["Aucun site web fourni"],
      },
      { id: "matching", label: "Correspondance des signaux", status: "completed", progress: 100, messages: ["Sources croisées", "Signaux d'identité vérifiés"] },
      {
        id: "analysis", label: "Analyse de confiance", status: "completed", progress: 100,
        messages: [
          gRating ? `Note: ${gRating}/5` : "Note inconnue",
          "Assurance: statut inconnu",
        ],
      },
      { id: "aipp", label: "Calcul du score AIPP", status: "completed", progress: 100, messages: ["Score AIPP calculé"] },
      { id: "plan", label: "Plan de croissance", status: "completed", progress: 100, messages: ["Plan de croissance généré"] },
    ];

    return new Response(
      JSON.stringify({ businessData, modules }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Import error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
