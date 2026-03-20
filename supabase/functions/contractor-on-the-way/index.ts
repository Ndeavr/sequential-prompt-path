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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser();
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const appointmentId = body?.appointmentId as string | undefined;
    if (!appointmentId) {
      return new Response(
        JSON.stringify({ ok: false, error: "appointmentId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify contractor
    const { data: contractor } = await svc
      .from("contractors")
      .select("id, business_name")
      .eq("user_id", user.id)
      .single();

    if (!contractor) {
      return new Response(
        JSON.stringify({ ok: false, error: "Contractor not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    if (appointment.contractor_id !== contractor.id) {
      return new Response(
        JSON.stringify({ ok: false, error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nowIso = new Date().toISOString();

    await svc
      .from("appointments")
      .update({ contractor_en_route_at: nowIso })
      .eq("id", appointmentId);

    const homeownerId = (appointment.leads as any)?.owner_profile_id;
    if (homeownerId) {
      await svc.from("notifications").insert({
        profile_id: homeownerId,
        type: "contractor_on_the_way",
        title: "Votre entrepreneur est en route",
        body: `${contractor.business_name} a indiqué être en route vers votre rendez-vous.`,
        channel: "in_app",
        entity_type: "appointment",
        entity_id: appointment.id,
        metadata: { appointment_id: appointment.id, contractor_id: contractor.id },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, enRouteAt: nowIso }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
