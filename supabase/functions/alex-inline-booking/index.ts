/**
 * alex-inline-booking — Manages inline booking flow within chat.
 * Actions: get_slots, hold_slot, confirm_booking
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, conversation_session_id, contractor_id, slot_id, user_id, slot_data } =
      await req.json();

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Legacy inline booking is a routing surface, NOT a second reservation
    // engine. Only /book/:slug may offer checked slots and the locked
    // booking-confirm-slot function can confirm them.
    switch (action) {
      case "get_slots": {
        const id = typeof contractor_id === "string" ? contractor_id : "";
        if (!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id)) return respond({ error: "invalid_contractor" }, 400);
        const { data: contractor, error } = await sb.from("contractors")
          .select("slug,booking_enabled,booking_page_published,is_accepting_appointments")
          .eq("id", id).maybeSingle();
        if (error || !contractor) return respond({ slots: [], source: "none", message: "Aucune disponibilité n'est publiée pour cet entrepreneur." }, 200);
        const configured = contractor.booking_enabled && contractor.booking_page_published && contractor.is_accepting_appointments && contractor.slug;
        return respond({
          slots: [], source: "none",
          booking_path: configured ? `/book/${encodeURIComponent(contractor.slug)}` : null,
          message: configured
            ? "Choisissez votre heure dans l’agenda UNPRO; seules les plages revalidées peuvent être confirmées."
            : "Aucune disponibilité n'est publiée. Clara peut transmettre votre demande de rappel.",
        });
      }
      case "hold_slot":
      case "confirm_booking":
        return respond({
          error: "canonical_booking_required",
          message: "La réservation doit être confirmée dans l’agenda UNPRO sécurisé.",
          status: "not_confirmed",
        }, 409);
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    console.error("alex-inline-booking error:", err);
    return new Response(
      JSON.stringify({ error: "Booking operation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function respond(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Content-Type": "application/json",
    },
  });
}

function formatSlotLabel(isoDate: string): string {
  const d = new Date(isoDate);
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const months = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${d.getHours()}h`;
}
