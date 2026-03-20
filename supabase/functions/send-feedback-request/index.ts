import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const appointmentId = body?.appointmentId as string | undefined;

    if (!appointmentId) {
      return new Response(
        JSON.stringify({ ok: false, error: "appointmentId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: appointment } = await svc
      .from("appointments")
      .select("*, leads(owner_profile_id)")
      .eq("id", appointmentId)
      .single();

    if (!appointment) {
      return new Response(
        JSON.stringify({ ok: false, error: "Appointment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const homeownerId = (appointment.leads as any)?.owner_profile_id;
    if (!homeownerId) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await svc.from("notifications").insert({
      profile_id: homeownerId,
      type: "feedback_requested",
      title: "Comment s'est passé votre rendez-vous ?",
      body: "Votre avis nous aide à améliorer la qualité des matchings et des entrepreneurs.",
      channel: "in_app",
      entity_type: "appointment",
      entity_id: appointment.id,
      metadata: { appointment_id: appointment.id, lead_id: appointment.lead_id },
    });

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
