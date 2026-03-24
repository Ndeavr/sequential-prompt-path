import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      source = "organic", homeowner_user_id, contractor_id,
      city_slug, trade_slug, specialty_slug, project_category,
      urgency_level = "normal", budget_range, timeline,
      property_type, description, contact_preference,
      referral_source, utm_source, utm_medium, utm_campaign,
      session_id, intake_metadata = {},
    } = body;

    const { data: lead, error } = await supabase
      .from("market_leads")
      .insert({
        source, homeowner_user_id, contractor_id,
        city_slug, trade_slug, specialty_slug, project_category,
        urgency_level, budget_range, timeline, property_type,
        description, contact_preference, referral_source,
        utm_source, utm_medium, utm_campaign, session_id,
        intake_metadata, status: "new",
      })
      .select("id")
      .single();

    if (error) throw error;

    // Auto-trigger prediction
    const predictUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/market-predict-value`;
    await fetch(predictUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ lead_id: lead.id }),
    });

    return new Response(JSON.stringify({ success: true, lead_id: lead.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
