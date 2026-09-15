/**
 * booking-confirm-slot — final, server-side confirmation of an appointment.
 *
 * Availability is re-verified inside a locked database transaction, so two
 * homeowners aiming at the same slot can never both book it. Frontend
 * availability is never trusted.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  CalendarAuthRevoked,
  getGoogleAccessToken,
  pushGoogleEvent,
} from "../_shared/googleCalendar.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(value: unknown, max = 240): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const contractorId = clean(body.contractor_id, 64);
    const appointmentTypeId = clean(body.appointment_type_id, 64);
    const start = clean(body.start, 40);
    const end = clean(body.end, 40);

    if (!contractorId || !UUID_RE.test(contractorId)) return json({ error: "invalid_contractor_id" }, 400);
    if (appointmentTypeId && !UUID_RE.test(appointmentTypeId)) return json({ error: "invalid_appointment_type_id" }, 400);
    if (!start || !end || Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
      return json({ error: "invalid_slot_window" }, 400);
    }
    if (Date.parse(end) <= Date.parse(start)) return json({ error: "invalid_slot_window" }, 400);
    if (Date.parse(start) < Date.now() - 60_000) return json({ error: "slot_in_the_past" }, 400);

    const clientName = clean(body.client_name, 120);
    if (!clientName) return json({ error: "client_name_required" }, 400);

    const { data: bookingId, error: rpcError } = await admin.rpc("confirm_smart_booking_slot", {
      p_contractor_id: contractorId,
      p_appointment_type_id: appointmentTypeId,
      p_start: start,
      p_end: end,
      p_client: {
        client_name: clientName,
        client_email: clean(body.client_email, 180),
        client_phone: clean(body.client_phone, 40),
        address_line1: clean(body.address_line1),
        city: clean(body.city, 120),
        province: clean(body.province, 8),
        postal_code: clean(body.postal_code, 12),
        urgency_level: clean(body.urgency_level, 24),
        requested_notes: clean(body.requested_notes, 2000),
        source: clean(body.source, 40) ?? "unpro",
        source_detail: clean(body.source_detail, 120),
      },
    });

    if (rpcError) {
      const message = rpcError.message ?? "";
      if (message.includes("slot_unavailable")) {
        return json({
          error: "slot_unavailable",
          message: "Ce créneau vient d'être pris. Choisissez une autre heure.",
        }, 409);
      }
      console.error("confirm_smart_booking_slot failed", { code: rpcError.code, message });
      return json({ error: "booking_failed", details: message }, 500);
    }

    // The appointment exists. Everything below is best effort and can never
    // undo or corrupt it.
    let calendarPush: "written" | "skipped" | "failed" | "reconnect_required" = "skipped";
    try {
      const { data: contractor } = await admin
        .from("contractors")
        .select("user_id, company_name")
        .eq("id", contractorId)
        .maybeSingle();

      if (contractor?.user_id) {
        const { data: connection } = await admin
          .from("calendar_connections")
          .select("id, user_id, access_token_encrypted, refresh_token_encrypted, expires_at")
          .eq("user_id", contractor.user_id)
          .eq("provider", "google")
          .eq("connection_status", "connected")
          .maybeSingle();

        if (connection) {
          const secret = Deno.env.get("CALENDAR_TOKEN_ENCRYPTION_KEY") ||
            Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") || "";
          const accessToken = await getGoogleAccessToken(admin, connection, secret);
          const eventId = await pushGoogleEvent(accessToken, {
            summary: `Rendez-vous UNPRO — ${clientName}`,
            description: "Rendez-vous confirmé via UNPRO.",
            location: [clean(body.address_line1), clean(body.city, 120)].filter(Boolean).join(", ") || undefined,
            start,
            end,
          });
          if (eventId) {
            await admin.from("smart_bookings")
              .update({ google_calendar_event_id: eventId })
              .eq("id", bookingId);
          }
          calendarPush = "written";

          // A freshly booked slot must block the next availability computation.
          await admin.from("calendar_busy_periods").insert({
            calendar_connection_id: connection.id,
            user_id: contractor.user_id,
            provider: "google",
            external_event_id: eventId,
            starts_at: start,
            ends_at: end,
          });
        }
      }
    } catch (error) {
      calendarPush = error instanceof CalendarAuthRevoked ? "reconnect_required" : "failed";
      console.error("calendar push after booking failed", {
        reason: error instanceof Error ? error.message : "unknown",
      });
    }

    await admin.from("calendar_conversion_events").insert({
      user_id: null,
      role_context: "contractor",
      surface: "booking_confirm",
      provider: "unpro",
      event_type: "contractor_appointment_created",
      metadata: { contractor_id: contractorId, booking_id: bookingId, calendar_push: calendarPush },
    });

    return json({ booking_id: bookingId, status: "confirmed", calendar_push: calendarPush });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("booking-confirm-slot error", message);
    return json({ error: "booking_failed", details: message }, 500);
  }
});
