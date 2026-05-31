// Public endpoint to submit a partner booking request.
// Inserts in DB, sends email via Resend, and pushes to Google Calendar
// (only if a Google Calendar connection is linked — graceful skip otherwise).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GCAL_GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

async function pushToGoogleCalendar(args: {
  calendarId: string;
  startISO: string;
  durationMin: number;
  summary: string;
  description: string;
  attendees: string[];
}): Promise<{ event_id: string | null; error: string | null }> {
  const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
  const GCAL_KEY = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
  if (!LOVABLE || !GCAL_KEY) return { event_id: null, error: "google_calendar_not_connected" };

  try {
    const start = new Date(args.startISO);
    const end = new Date(start.getTime() + args.durationMin * 60_000);
    const res = await fetch(
      `${GCAL_GATEWAY}/calendars/${encodeURIComponent(args.calendarId)}/events?sendUpdates=all`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE}`,
          "X-Connection-Api-Key": GCAL_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: args.summary,
          description: args.description,
          start: { dateTime: start.toISOString(), timeZone: "America/Toronto" },
          end:   { dateTime: end.toISOString(),   timeZone: "America/Toronto" },
          attendees: args.attendees.filter(Boolean).map((email) => ({ email })),
          reminders: {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 24 * 60 },
              { method: "popup", minutes: 60 },
            ],
          },
        }),
      },
    );
    const json = await res.json();
    if (!res.ok) return { event_id: null, error: JSON.stringify(json).slice(0, 500) };
    return { event_id: json.id ?? null, error: null };
  } catch (e: any) {
    return { event_id: null, error: String(e?.message ?? e).slice(0, 500) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { partner_slug, service_type, postal_code, property_type, scheduled_at, contact, notes } = body;

    if (!partner_slug || !contact?.name || !contact?.phone) {
      return new Response(JSON.stringify({ error: "partner_slug, contact.name, contact.phone required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: partner, error: pErr } = await supabase
      .from("signature_partners")
      .select("id, display_name, email, brand")
      .eq("slug", partner_slug)
      .eq("is_active", true)
      .maybeSingle();
    if (pErr || !partner) throw new Error("Partner not found");

    const calendarId = (partner.brand as Record<string, any> | null)?.google_calendar_id as string | undefined;

    // 1. Insert booking
    const { data: booking, error } = await supabase
      .from("partner_bookings")
      .insert({
        partner_id: partner.id,
        service_type, postal_code, property_type, scheduled_at,
        contact, notes, source: "web",
        google_calendar_id: calendarId ?? null,
        google_sync_status: calendarId ? "pending" : "skipped",
      })
      .select()
      .single();
    if (error) throw error;

    // 2. Google Calendar push (best-effort)
    let gcal = { event_id: null as string | null, error: null as string | null };
    if (calendarId && scheduled_at) {
      gcal = await pushToGoogleCalendar({
        calendarId,
        startISO: scheduled_at,
        durationMin: 60,
        summary: `RDV ${partner.display_name} · ${contact.name}`,
        description:
          `Demande UNPRO\n` +
          `Client: ${contact.name} — ${contact.phone}${contact.email ? " — " + contact.email : ""}\n` +
          `Service: ${service_type || "—"}\n` +
          `Code postal: ${postal_code || "—"}\n` +
          `Type propriété: ${property_type || "—"}\n` +
          `Notes: ${notes || "—"}\n` +
          `Booking ID: ${booking.id}`,
        attendees: [contact.email, partner.email].filter(Boolean),
      });
      await supabase.from("partner_bookings").update({
        google_event_id: gcal.event_id,
        google_sync_status: gcal.event_id ? "synced" : "failed",
        google_sync_error: gcal.error,
      }).eq("id", booking.id);
    }

    // 3. Notification email
    const RESEND = Deno.env.get("RESEND_API_KEY");
    if (RESEND && partner.email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "UNPRO <notifications@unpro.ca>",
          to: [partner.email],
          subject: `Nouvelle demande de rendez-vous — ${contact.name}`,
          html: `<h2>Nouvelle demande UNPRO</h2>
            <p><b>Client:</b> ${contact.name} — ${contact.phone}</p>
            <p><b>Service:</b> ${service_type || "—"}</p>
            <p><b>Code postal:</b> ${postal_code || "—"}</p>
            <p><b>Date souhaitée:</b> ${scheduled_at || "—"}</p>
            <p><b>Notes:</b> ${notes || "—"}</p>
            <p>Google Calendar: ${gcal.event_id ? "synchronisé ✅" : (calendarId ? "échec sync ⚠️" : "non configuré")}</p>`,
        }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({
      ok: true,
      booking_id: booking.id,
      google_synced: !!gcal.event_id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
