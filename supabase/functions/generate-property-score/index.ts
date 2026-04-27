import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function calculateHomeScore(input: Record<string, unknown>) {
  let structure = 75;
  let insulation = 60;
  let roof = 70;
  const humidity = input.humidityIssue ? 30 : 85;
  const windows =
    input.windowsCondition === "good"
      ? 85
      : input.windowsCondition === "average"
        ? 65
        : 40;
  const heating = input.heatingType ? 75 : 50;
  const electrical = input.electricalUpdated ? 85 : 55;
  const plumbing = input.plumbingUpdated ? 85 : 55;

  if (
    typeof input.yearBuilt === "number" &&
    (input.yearBuilt as number) < 1970
  )
    structure -= 10;

  if (input.insulation === "poor") insulation = 35;
  if (input.insulation === "average") insulation = 60;
  if (input.insulation === "good") insulation = 80;
  if (input.insulation === "excellent") insulation = 92;

  if (typeof input.roofAge === "number") {
    const age = input.roofAge as number;
    if (age <= 5) roof = 92;
    else if (age <= 12) roof = 80;
    else if (age <= 20) roof = 60;
    else roof = 35;
  }

  const overall =
    structure * 0.18 +
    insulation * 0.16 +
    roof * 0.16 +
    humidity * 0.14 +
    windows * 0.1 +
    heating * 0.08 +
    electrical * 0.09 +
    plumbing * 0.09;

  return {
    overall_score: Number(overall.toFixed(2)),
    structure_score: structure,
    insulation_score: insulation,
    roof_score: roof,
    humidity_score: humidity,
    windows_score: windows,
    heating_score: heating,
    electrical_score: electrical,
    plumbing_score: plumbing,
    confidence_score: 72,
    scoring_version: "v1",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await (supabaseAuth.auth as any).getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { propertyId, input } = await req.json();

    if (!propertyId || !input) {
      return new Response(
        JSON.stringify({ error: "propertyId and input are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const result = calculateHomeScore(input);

    const { error: insertError } = await supabase
      .from("property_scores")
      .insert({
        property_id: propertyId,
        ...result,
      });

    if (insertError) {
      return new Response(
        JSON.stringify({ ok: false, error: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
