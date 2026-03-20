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

    const { data: appointment, error } = await svc
      .from("appointments")
      .select("*, leads(owner_profile_id), contractors(id, user_id, business_name)")
      .eq("id", appointmentId)
      .single();

    if (error || !appointment) {
      return new Response(
        JSON.stringify({ ok: false, error: "Appointment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notifications: Array<Record<string, unknown>> = [];
    const homeownerId = (appointment.leads as any)?.owner_profile_id;
    const contractorUserId = (appointment.contractors as any)?.user_id;
    const contractorName = (appointment.contractors as any)?.business_name || "Un entrepreneur";

    if (homeownerId) {
      notifications.push({
        profile_id: homeownerId,
        type: "appointment_created",
        title: "Nouveau rendez-vous confirmé",
        body: `${contractorName} a planifié un rendez-vous${appointment.preferred_date ? ` le ${appointment.preferred_date}` : ""}.`,
        channel: "in_app",
        entity_type: "appointment",
        entity_id: appointment.id,
        metadata: { appointment_id: appointment.id, lead_id: appointment.lead_id },
      });
    }

    if (contractorUserId) {
      notifications.push({
        profile_id: contractorUserId,
        type: "appointment_created",
        title: "Nouveau rendez-vous à votre agenda",
        body: "Un rendez-vous a été ajouté à votre calendrier.",
        channel: "in_app",
        entity_type: "appointment",
        entity_id: appointment.id,
        metadata: { appointment_id: appointment.id, lead_id: appointment.lead_id },
      });
    }

    if (notifications.length > 0) {
      await svc.from("notifications").insert(notifications);
    }

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
