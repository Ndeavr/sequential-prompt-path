// pro-score-instant — Score IA déterministe pour entrepreneurs (Mission 48H).
// Public (no auth). Persiste un founder_score_prospect puis retourne 5 dimensions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function scoreFromSeed(seed: number, min = 58, max = 92): number {
  return min + (seed % (max - min));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { company, website, city, phone, email, trade } = body ?? {};
    if (!company || !email) {
      return new Response(JSON.stringify({ error: "company and email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const seedBase = hash(`${company}|${city ?? ""}|${trade ?? ""}|${website ?? ""}`);
    const visibility = scoreFromSeed(seedBase, 55, 88);
    const trust = scoreFromSeed(seedBase >> 3, 62, 92);
    const authority = scoreFromSeed(seedBase >> 5, 58, 86);
    const profile = scoreFromSeed(seedBase >> 7, 50, 82);
    const growth = scoreFromSeed(seedBase >> 11, 70, 95);

    const opportunities = [
      "Profil entrepreneur incomplet",
      "Avis Google sous-exploités",
      "Présence IA faible — peu cité par les moteurs",
      "Catégories de service mal structurées",
      "Données entreprise manquantes (NEQ, RBQ, territoire)",
    ];

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await admin
      .from("founder_score_prospects")
      .insert({
        company,
        website: website ?? null,
        city: city ?? null,
        phone: phone ?? null,
        email,
        trade: trade ?? null,
        score_visibility: visibility,
        score_trust: trust,
        score_authority: authority,
        score_profile: profile,
        score_growth: growth,
        opportunities,
        source: "pro-score",
        status: "lead",
      })
      .select("id")
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        prospect_id: data.id,
        scores: {
          visibility,
          trust,
          authority,
          profile,
          growth,
        },
        opportunities,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
