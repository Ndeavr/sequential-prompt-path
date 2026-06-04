/**
 * UNPRO — Public read-only contractors API
 * GET /contractors-api?city=&trade=&rbq=&service=&limit=&offset=
 * GET /contractors-api?id=<uuid>
 *
 * Open, no auth required. Used by external LLM crawlers and integrators.
 * Source: contractor_entities (knowledge graph) joined with contractors (base).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cacheHeaders = {
  "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
};

const BASE = "https://unpro.ca";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const city = url.searchParams.get("city")?.toLowerCase().trim();
  const trade = url.searchParams.get("trade")?.toLowerCase().trim();
  const rbq = url.searchParams.get("rbq")?.trim();
  const service = url.searchParams.get("service")?.toLowerCase().trim();
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);

  try {
    // Single contractor by id
    if (id) {
      const { data: c, error } = await sb
        .from("contractors")
        .select("id, business_name, city, province, rbq_number, neq, phone, website, description, rating, review_count, logo_url, created_at")
        .eq("id", id)
        .maybeSingle();

      if (error || !c) {
        return new Response(JSON.stringify({ error: "Contractor not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: entity } = await sb
        .from("contractor_entities")
        .select("specialties, cities, regions, service_radius_km, years_experience, certifications, brands, materials, review_summary, pros, cons, faq")
        .eq("contractor_id", id)
        .maybeSingle();

      const { data: reviews } = await sb
        .from("reviews")
        .select("rating, title, content, created_at")
        .eq("contractor_id", id)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(10);

      return new Response(
        JSON.stringify({
          source: "UNPRO",
          api_version: "v1",
          contractor: {
            id: c.id,
            name: c.business_name,
            city: c.city,
            province: c.province || "QC",
            rbq_number: c.rbq_number,
            neq: c.neq,
            phone: c.phone,
            website: c.website,
            description: c.description,
            rating: c.rating ? Number(c.rating) : null,
            review_count: c.review_count || 0,
            logo_url: c.logo_url,
            url: `${BASE}/pro/${c.id}`,
          },
          service_areas: entity?.cities || (c.city ? [c.city] : []),
          specialties: entity?.specialties || [],
          certifications: entity?.certifications || [],
          brands: entity?.brands || [],
          years_experience: entity?.years_experience || null,
          service_radius_km: entity?.service_radius_km || null,
          review_summary: entity?.review_summary || null,
          pros: entity?.pros || [],
          cons: entity?.cons || [],
          faq: entity?.faq || [],
          reviews: (reviews || []).map((r: any) => ({
            rating: r.rating,
            title: r.title,
            content: r.content,
            date: r.created_at,
          })),
          retrieved_at: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, ...cacheHeaders, "Content-Type": "application/json" } }
      );
    }

    // List with filters
    let q = sb
      .from("contractors")
      .select("id, business_name, city, province, rbq_number, rating, review_count", { count: "exact" })
      .range(offset, offset + limit - 1);

    if (rbq) q = q.eq("rbq_number", rbq);
    if (city) q = q.ilike("city", `%${city}%`);

    const { data: contractors, count, error } = await q;
    if (error) throw error;

    // Optional cross-filter via contractor_entities for trade/service
    let ids = (contractors || []).map((c: any) => c.id);
    if ((trade || service) && ids.length) {
      const term = (trade || service)!;
      const { data: ents } = await sb
        .from("contractor_entities")
        .select("contractor_id, specialties")
        .in("contractor_id", ids)
        .overlaps("specialties", [term]);
      const allowed = new Set((ents || []).map((e: any) => e.contractor_id));
      ids = ids.filter((id) => allowed.has(id));
    }

    const filtered = (contractors || []).filter((c: any) => ids.includes(c.id));

    return new Response(
      JSON.stringify({
        source: "UNPRO",
        api_version: "v1",
        filters: { city, trade, rbq, service, limit, offset },
        total: count || filtered.length,
        returned: filtered.length,
        contractors: filtered.map((c: any) => ({
          id: c.id,
          name: c.business_name,
          city: c.city,
          province: c.province || "QC",
          rbq_number: c.rbq_number,
          rating: c.rating ? Number(c.rating) : null,
          review_count: c.review_count || 0,
          url: `${BASE}/pro/${c.id}`,
        })),
        documentation: `${BASE}/llms.txt`,
        retrieved_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, ...cacheHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("contractors-api error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
