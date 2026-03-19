import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LeadRow {
  id: string;
  lead_type: "contractor" | "broker";
  city: string | null;
  project_category: string | null;
  specialty_needed: string | null;
  budget_min: number | null;
  budget_max: number | null;
  language: string | null;
}

function scoreContractor(c: Record<string, unknown>, lead: LeadRow) {
  let score = 0;
  const reasons: string[] = [];
  const areas = (c.service_areas as string[]) || [];
  const specs = (c.specialties as string[]) || [];
  const subs = (c.sub_specialties as string[]) || [];
  const langs = (c.languages as string[]) || [];

  if (lead.city && (areas.includes(lead.city) || c.city === lead.city)) {
    score += 25;
    reasons.push("Dessert la zone");
  }
  if (lead.project_category && specs.includes(lead.project_category)) {
    score += 20;
    reasons.push("Bonne spécialité");
  }
  if (lead.specialty_needed && subs.includes(lead.specialty_needed)) {
    score += 15;
    reasons.push("Sous-spécialité exacte");
  }
  const minVal = c.min_job_value as number | null;
  const maxVal = c.max_job_value as number | null;
  if (
    (!minVal || (lead.budget_max ?? Infinity) >= minVal) &&
    (!maxVal || (lead.budget_min ?? 0) <= maxVal)
  ) {
    score += 10;
    reasons.push("Compatible avec le budget");
  }
  if (lead.language && langs.includes(lead.language)) {
    score += 5;
    reasons.push("Même langue");
  }
  const exp = c.years_experience as number | null;
  if (exp) {
    score += Math.min(exp, 10);
    reasons.push(`${exp} ans d'expérience`);
  }

  return {
    id: c.id as string,
    score: Math.min(score, 100),
    reasons,
  };
}

function scoreBroker(b: Record<string, unknown>, lead: LeadRow) {
  let score = 0;
  const reasons: string[] = [];
  const areas = (b.service_areas as string[]) || [];
  const specs = (b.specialties as string[]) || [];
  const langs = (b.languages as string[]) || [];

  if (lead.city && (areas.includes(lead.city) || b.city === lead.city)) {
    score += 25;
    reasons.push("Dessert la zone");
  }
  if (lead.project_category && specs.includes(lead.project_category)) {
    score += 20;
    reasons.push("Spécialité correspondante");
  }
  const minP = b.avg_price_min as number | null;
  const maxP = b.avg_price_max as number | null;
  if (
    (!minP || (lead.budget_max ?? Infinity) >= minP) &&
    (!maxP || (lead.budget_min ?? 0) <= maxP)
  ) {
    score += 15;
    reasons.push("Gamme de prix compatible");
  }
  if (lead.language && langs.includes(lead.language)) {
    score += 5;
    reasons.push("Même langue");
  }
  const exp = b.years_experience as number | null;
  if (exp) {
    score += Math.min(exp, 10);
    reasons.push(`${exp} ans d'expérience`);
  }

  return {
    id: b.id as string,
    score: Math.min(score, 100),
    reasons,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
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
      await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { leadId } = await req.json();
    if (!leadId) {
      return new Response(
        JSON.stringify({ error: "leadId is required" }),
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

    // Fetch lead
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadErr || !lead) {
      return new Response(
        JSON.stringify({ error: "Lead introuvable" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const typedLead = lead as unknown as LeadRow;
    let scored: { id: string; score: number; reasons: string[] }[] = [];

    if (typedLead.lead_type === "contractor") {
      const { data: contractors } = await supabase
        .from("contractors")
        .select(
          "id, company_name, city, service_areas, specialties, sub_specialties, languages, min_job_value, max_job_value, years_experience",
        );

      if (contractors) {
        scored = contractors
          .map((c) => scoreContractor(c as Record<string, unknown>, typedLead))
          .filter((m) => m.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
      }
    } else {
      const { data: brokers } = await supabase
        .from("broker_profiles")
        .select(
          "id, agency_name, city, service_areas, specialties, languages, avg_price_min, avg_price_max, years_experience",
        );

      if (brokers) {
        scored = brokers
          .map((b) => scoreBroker(b as Record<string, unknown>, typedLead))
          .filter((m) => m.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
      }
    }

    // Write matches
    if (scored.length > 0) {
      const matchRows = scored.map((m, i) => ({
        lead_id: leadId,
        match_type: typedLead.lead_type,
        contractor_id: typedLead.lead_type === "contractor" ? m.id : null,
        broker_id: typedLead.lead_type === "broker" ? m.id : null,
        score: m.score,
        rank_position: i + 1,
        reasons: m.reasons,
        status: i === 0 ? "primary" : "suggested",
        response_status: "pending",
      }));

      const { data: insertedMatches } = await supabase.from("matches").insert(matchRows).select("id, rank_position");
      
      const primaryMatchId = insertedMatches?.find((m: any) => m.rank_position === 1)?.id ?? null;
      
      await supabase
        .from("leads")
        .update({ 
          status: "matched",
          matching_status: "matched",
          assigned_match_id: primaryMatchId,
        })
        .eq("id", leadId);
    } else {
      await supabase
        .from("leads")
        .update({ 
          status: "no_match",
          matching_status: "empty",
        })
        .eq("id", leadId);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        matches_count: scored.length,
        matches: scored,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
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
