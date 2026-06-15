import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Process due reminders — called via cron or manually.
 * Checks scheduled_reminders for pending items where scheduled_for <= now,
 * creates in-app notifications, and optionally sends SMS if Twilio is configured.
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

    const now = new Date().toISOString();

    // Fetch due reminders
    const { data: dueReminders, error } = await svc
      .from("scheduled_reminders")
      .select("*, appointments(preferred_date, preferred_time_window, contractor_id, status)")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .limit(50);

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    let smsAttempted = 0;
    const { sendSms } = await import("../_shared/twilioSend.ts");

    for (const reminder of dueReminders) {
      const appointment = reminder.appointments as Record<string, unknown> | null;

      // Skip if appointment was cancelled
      if (appointment?.status === "cancelled") {
        await svc
          .from("scheduled_reminders")
          .update({ status: "skipped", sent_at: now })
          .eq("id", reminder.id);
        continue;
      }

      const isOneHour = reminder.reminder_type === "1h_before";
      const title = isOneHour
        ? "Rappel : rendez-vous dans 1 heure"
        : "Rappel : rendez-vous demain";
      const body = isOneHour
        ? `Votre rendez-vous est prévu dans environ 1 heure${appointment?.preferred_time_window ? ` (${appointment.preferred_time_window})` : ""}.`
        : `Votre rendez-vous est prévu demain${appointment?.preferred_date ? ` le ${appointment.preferred_date}` : ""}.`;

      // Create in-app notification
      const { data: notif } = await svc
        .from("notifications")
        .insert({
          profile_id: reminder.profile_id,
          type: `reminder_${reminder.reminder_type}`,
          title,
          body,
          channel: "in_app",
          entity_type: "appointment",
          entity_id: reminder.appointment_id,
          metadata: { reminder_id: reminder.id, ...(reminder.metadata as Record<string, unknown>) },
        })
        .select("id")
        .single();

      const { data: pref } = await svc
        .from("notification_preferences")
        .select("phone_number, is_enabled")
        .eq("profile_id", reminder.profile_id)
        .eq("channel", "sms")
        .eq("is_enabled", true)
        .maybeSingle();

      if (pref?.phone_number) {
        try {
          const smsBody = `[UNPRO] ${title}\n${body}`;
          const res = await sendSms({
            to: pref.phone_number,
            body: smsBody,
            message_type: "other",
            template_key: `reminder_${reminder.reminder_type}`,
            metadata: { source: "process-reminders", reminder_id: reminder.id, appointment_id: reminder.appointment_id },
          });
          const ok = res.status === "sending" || res.status === "sent" || res.status === "delivered";
          if (ok) {
            smsAttempted++;
            if (notif?.id) {
              await svc.from("notifications")
                .update({ sms_sent_at: now, sms_status: "sent" })
                .eq("id", notif.id);
            }
          }
        } catch (_) { /* non-blocking */ }
      }

      // Mark reminder as sent
      await svc
        .from("scheduled_reminders")
        .update({
          status: "sent",
          sent_at: now,
          notification_id: notif?.id ?? null,
        })
        .eq("id", reminder.id);

      processed++;
    }

    return new Response(
      JSON.stringify({ ok: true, processed, smsAttempted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
