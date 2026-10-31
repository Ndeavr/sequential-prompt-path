// UNPRO Demand Intelligence — Server data for /pro/demande/:city/:category landing.
// PUBLIC: returns only aggregates and recruitment target metadata. No PII.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const city = url.searchParams.get("city");
    const category = url.searchParams.get("category");
    if (!city || !category) return json({ ok: false, error: "city+category required" }, 400);

    if (city.length > 120 || category.length > 120 || /[<>\x00-\x1f]/.test(city + category)) return json({ ok: false, error: "invalid_segment" }, 400);
    return json({ ok: true, city: city.trim(), category: category.trim().toLowerCase(), market: null, recruitment_target: null, neighbor_segments: [], demand_verified: false });
  } catch (e) {
    console.error("recruitment-landing-resolver error", e);
    return json({ ok: false, error: "request_unavailable" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
