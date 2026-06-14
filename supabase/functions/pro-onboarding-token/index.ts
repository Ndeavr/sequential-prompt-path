/**
 * pro-onboarding-token — public resolver for /pro/onboarding/:token
 * Returns lead snapshot for the private activation page. Marks onboarding_started on first view.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Token requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: lead, error } = await sb
      .from("contractor_leads")
      .select("id,company_name,full_name,first_name,city,category_primary,trade,website_url,phone,mobile_phone,email,fit_score,fit_reasons,recommended_plan_slug,pipeline_status,metadata_json,ai_visibility_score")
      .eq("onboarding_token", token)
      .maybeSingle();

    if (error || !lead) {
      return new Response(JSON.stringify({ error: "Lien invalide ou expiré" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark onboarding_started (first time only) + clicked engagement
    const updates: Record<string, unknown> = {
      clicked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (
      lead.pipeline_status &&
      ["sms_sent", "email_sent", "message_ready", "opened", "clicked"].includes(lead.pipeline_status)
    ) {
      updates.pipeline_status = "onboarding_started";
      updates.onboarding_started_at = new Date().toISOString();
    }
    await sb.from("contractor_leads").update(updates).eq("id", lead.id);

    const md = lead.metadata_json ?? {};
    const payload = {
      lead_id: lead.id,
      business_name: lead.company_name || lead.full_name || "Votre entreprise",
      first_name: lead.first_name ?? null,
      city: lead.city ?? null,
      category: lead.category_primary ?? lead.trade ?? null,
      website_url: lead.website_url ?? null,
      phone: lead.phone ?? lead.mobile_phone ?? null,
      email: lead.email ?? null,
      google_rating: md?.google_rating ?? md?.gmb?.rating ?? null,
      reviews_count: md?.google_reviews_count ?? md?.gmb?.reviews_count ?? null,
      rbq: md?.rbq ?? md?.rbq_number ?? null,
      neq: md?.neq ?? md?.neq_number ?? null,
      fit_score: lead.fit_score ?? null,
      fit_reasons: lead.fit_reasons ?? [],
      ai_visibility_score: lead.ai_visibility_score ?? null,
      recommended_plan_slug: lead.recommended_plan_slug ?? "fondateur-149",
      pipeline_status: lead.pipeline_status,
    };

    return new Response(JSON.stringify({ ok: true, lead: payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
