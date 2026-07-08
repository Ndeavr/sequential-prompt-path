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
    // Fallback: read homeowner from appointment directly when no lead is linked (direct-book path).
    const homeownerUserId =
      (appointment.leads as any)?.owner_profile_id ??
      (appointment as any).homeowner_user_id ??
      null;
    const contractorUserId = (appointment.contractors as any)?.user_id ?? null;
    const contractorName = (appointment.contractors as any)?.business_name || "Un entrepreneur";

    // Resolve auth user_ids → profiles.id (notifications.profile_id FK targets profiles.id).
    const userIds = [homeownerUserId, contractorUserId].filter(Boolean) as string[];
    const profileByUser = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profs } = await svc
        .from("profiles")
        .select("id, user_id")
        .in("user_id", userIds);
      (profs ?? []).forEach((p: any) => profileByUser.set(p.user_id, p.id));
    }

    const homeownerProfileId = homeownerUserId ? profileByUser.get(homeownerUserId) ?? null : null;
    const contractorProfileId = contractorUserId ? profileByUser.get(contractorUserId) ?? null : null;

    if (homeownerProfileId) {
      notifications.push({
        profile_id: homeownerProfileId,
        type: "appointment_created",
        title: "Nouveau rendez-vous confirmé",
        body: `${contractorName} a planifié un rendez-vous${appointment.preferred_date ? ` le ${appointment.preferred_date}` : ""}.`,
        channel: "in_app",
        status: "pending",
        entity_type: "appointment",
        entity_id: appointment.id,
        metadata: { appointment_id: appointment.id, lead_id: appointment.lead_id },
      });
    }

    if (contractorProfileId) {
      notifications.push({
        profile_id: contractorProfileId,
        type: "appointment_created",
        title: "Nouveau rendez-vous à votre agenda",
        body: `Un rendez-vous a été ajouté à votre calendrier${appointment.preferred_date ? ` le ${appointment.preferred_date}` : ""}.`,
        channel: "in_app",
        status: "pending",
        entity_type: "appointment",
        entity_id: appointment.id,
        metadata: { appointment_id: appointment.id, lead_id: appointment.lead_id },
      });
    }

    let insertError: string | null = null;
    if (notifications.length > 0) {
      const { error: insErr } = await svc.from("notifications").insert(notifications);
      if (insErr) insertError = insErr.message;
    }

    return new Response(
      JSON.stringify({
        ok: !insertError,
        inserted: notifications.length,
        homeowner_resolved: !!homeownerProfileId,
        contractor_resolved: !!contractorProfileId,
        error: insertError,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
