// Public endpoint to submit a partner booking request.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: partner, error: pErr } = await supabase
      .from("signature_partners")
      .select("id, display_name, email")
      .eq("slug", partner_slug)
      .eq("is_active", true)
      .maybeSingle();
    if (pErr || !partner) throw new Error("Partner not found");

    const { data: booking, error } = await supabase
      .from("partner_bookings")
      .insert({
        partner_id: partner.id,
        service_type, postal_code, property_type, scheduled_at,
        contact, notes, source: "web",
      })
      .select()
      .single();
    if (error) throw error;

    // Optional: send notification via Resend
    const RESEND = Deno.env.get("RESEND_API_KEY");
    if (RESEND && partner.email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "UNPRO <notifications@unpro.ca>",
          to: [partner.email],
          subject: `Nouvelle demande de rendez-vous — ${contact.name}`,
          html: `<h2>Nouvelle demande UNPRO</h2>
            <p><b>Client:</b> ${contact.name} — ${contact.phone}</p>
            <p><b>Service:</b> ${service_type || "—"}</p>
            <p><b>Code postal:</b> ${postal_code || "—"}</p>
            <p><b>Date souhaitée:</b> ${scheduled_at || "—"}</p>
            <p><b>Notes:</b> ${notes || "—"}</p>`,
        }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true, booking_id: booking.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
