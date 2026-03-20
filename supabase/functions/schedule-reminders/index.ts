import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Schedule reminders for an appointment (24h + 1h before).
 * Called after appointment creation.
 * Input: { appointmentId }
 */
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
      .select("*, leads(owner_profile_id), contractors(user_id)")
      .eq("id", appointmentId)
      .single();

    if (error || !appointment) {
      return new Response(
        JSON.stringify({ ok: false, error: "Appointment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine appointment datetime
    const appointmentDate = appointment.preferred_date;
    if (!appointmentDate) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "No preferred_date" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the date — assume format YYYY-MM-DD, default to 9am ET
    const baseTime = new Date(`${appointmentDate}T09:00:00-04:00`);
    const now = new Date();

    const homeownerId = (appointment.leads as any)?.owner_profile_id;
    const contractorUserId = (appointment.contractors as any)?.user_id;
    const reminders: Array<Record<string, unknown>> = [];

    // Helper to create reminders for a profile
    const addReminders = (profileId: string, role: string) => {
      // 24h reminder
      const reminder24h = new Date(baseTime.getTime() - 24 * 60 * 60 * 1000);
      if (reminder24h > now) {
        reminders.push({
          appointment_id: appointmentId,
          profile_id: profileId,
          reminder_type: "24h_before",
          scheduled_for: reminder24h.toISOString(),
          channel: "in_app",
          status: "pending",
          metadata: { role, appointment_date: appointmentDate },
        });
      }

      // 1h reminder
      const reminder1h = new Date(baseTime.getTime() - 60 * 60 * 1000);
      if (reminder1h > now) {
        reminders.push({
          appointment_id: appointmentId,
          profile_id: profileId,
          reminder_type: "1h_before",
          scheduled_for: reminder1h.toISOString(),
          channel: "in_app",
          status: "pending",
          metadata: { role, appointment_date: appointmentDate },
        });
      }
    };

    if (homeownerId) addReminders(homeownerId, "homeowner");
    if (contractorUserId) addReminders(contractorUserId, "contractor");

    if (reminders.length > 0) {
      const { error: insertErr } = await svc.from("scheduled_reminders").insert(reminders);
      if (insertErr) {
        return new Response(
          JSON.stringify({ ok: false, error: insertErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ ok: true, scheduled: reminders.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
