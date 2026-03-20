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
    const matchId = body?.matchId as string | undefined;
    const preferredDate = body?.preferredDate as string | undefined;
    const preferredTimeWindow = body?.preferredTimeWindow as string | undefined;
    const notes = body?.notes as string | undefined;
    const projectCategory = body?.projectCategory as string | undefined;

    if (!matchId || !preferredDate) {
      return new Response(
        JSON.stringify({ ok: false, error: "matchId and preferredDate required" }),
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
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!contractor) {
      return new Response(
        JSON.stringify({ ok: false, error: "Contractor profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load match + lead
    const { data: match } = await svc
      .from("matches")
      .select("*, leads(*)")
      .eq("id", matchId)
      .single();

    if (!match) {
      return new Response(
        JSON.stringify({ ok: false, error: "Match not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (match.contractor_id !== contractor.id) {
      return new Response(
        JSON.stringify({ ok: false, error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (match.response_status !== "accepted") {
      return new Response(
        JSON.stringify({ ok: false, error: "Match must be accepted before booking" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lead = match.leads as Record<string, unknown> | null;
    if (!lead) {
      return new Response(
        JSON.stringify({ ok: false, error: "Lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create appointment using existing schema
    const { data: appointment, error: apptErr } = await svc
      .from("appointments")
      .insert({
        contractor_id: contractor.id,
        homeowner_user_id: lead.owner_profile_id as string,
        property_id: (lead.property_id as string) ?? null,
        lead_id: lead.id as string,
        preferred_date: preferredDate,
        preferred_time_window: preferredTimeWindow ?? "morning",
        project_category: projectCategory ?? (lead.project_category as string) ?? null,
        notes: notes ?? null,
        status: "confirmed" as const,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (apptErr) {
      return new Response(
        JSON.stringify({ ok: false, error: apptErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update lead status
    await svc
      .from("leads")
      .update({
        status: "booked",
        matching_status: "booked",
        booked_at: new Date().toISOString(),
      })
      .eq("id", lead.id as string);

    // Trigger notifications
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-appointment-created`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ appointmentId: appointment.id }),
      });
    } catch (_) { /* non-blocking */ }

    return new Response(
      JSON.stringify({ ok: true, appointment }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
