import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://unpro.ca";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { contractor_id, homeowner_name, phone, email, project_type, city, completion_date, source } = body;

    if (!contractor_id || !homeowner_name || (!phone && !email)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load contractor for personalization
    const { data: contractor } = await supabase
      .from("contractors")
      .select("business_name")
      .eq("id", contractor_id)
      .maybeSingle();

    // Insert request
    const { data: request, error: reqErr } = await supabase
      .from("review_requests")
      .insert({
        contractor_id,
        homeowner_name,
        phone: phone ?? null,
        email: email ?? null,
        project_type: project_type ?? null,
        city: city ?? null,
        completion_date: completion_date ?? null,
        source: source ?? "manual",
        status: "pending",
      })
      .select()
      .single();

    if (reqErr) throw reqErr;

    const reviewUrl = `${APP_URL}/review/${request.token}`;
    const businessName = contractor?.business_name ?? "votre entrepreneur";
    const firstName = homeowner_name.split(" ")[0];
    const smsBody = `Bonjour ${firstName}, ${businessName} aimerait votre avis sur les travaux réalisés. Ça prend 60 sec : ${reviewUrl}`;

    // Send SMS via Twilio connector (if configured)
    let smsSent = false;
    let smsError: string | null = null;
    const twilioKey = Deno.env.get("TWILIO_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");

    if (phone && twilioKey && lovableKey && twilioFrom) {
      try {
        const res = await fetch(`https://connector-gateway.lovable.dev/twilio/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": twilioKey,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: phone, From: twilioFrom, Body: smsBody }),
        });
        if (res.ok) {
          smsSent = true;
        } else {
          smsError = `${res.status}: ${await res.text()}`;
        }
      } catch (e) {
        smsError = String(e);
      }
    }

    // Update status
    await supabase
      .from("review_requests")
      .update({
        status: smsSent ? "sent" : phone ? "failed" : "pending",
        sent_at: smsSent ? new Date().toISOString() : null,
        last_error: smsError,
      })
      .eq("id", request.id);

    // Schedule follow-ups J+3 and J+7
    if (smsSent) {
      const now = new Date();
      await supabase.from("review_request_sequence_jobs").insert([
        { request_id: request.id, step: 1, run_at: new Date(now.getTime() + 3 * 86400000).toISOString() },
        { request_id: request.id, step: 2, run_at: new Date(now.getTime() + 7 * 86400000).toISOString() },
      ]);
    }

    return new Response(
      JSON.stringify({
        request_id: request.id,
        token: request.token,
        review_url: reviewUrl,
        sms_sent: smsSent,
        sms_error: smsError,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("review-request-send error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
