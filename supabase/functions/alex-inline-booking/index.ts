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

    switch (action) {
      case "get_slots": {
        // Try real availability_slots first
        const { data: realSlots } = await sb
          .from("availability_slots")
          .select("*")
          .eq("contractor_id", contractor_id)
          .gte("start_time", new Date().toISOString())
          .limit(5);

        if (realSlots && realSlots.length > 0) {
          return respond({
            slots: realSlots.map((s: any) => ({
              id: s.id,
              contractorId: s.contractor_id,
              start: s.start_time,
              end: s.end_time,
              label: formatSlotLabel(s.start_time),
              type: s.slot_type || "estimation",
              status: "available",
            })),
            source: "database",
          });
        }

        // Generate mock slots
        const now = new Date();
        const mockSlots = [];
        for (let d = 1; d <= 5; d++) {
          const date = new Date(now);
          date.setDate(date.getDate() + d);
          if (date.getDay() === 0) continue; // Skip Sunday
          
          const hours = d <= 2 ? [9, 14] : [10];
          for (const h of hours) {
            date.setHours(h, 0, 0, 0);
            const end = new Date(date);
            end.setHours(h + 1);
            mockSlots.push({
              id: `mock-slot-${d}-${h}`,
              contractorId: contractor_id || "mock-c1",
              start: date.toISOString(),
              end: end.toISOString(),
              label: formatSlotLabel(date.toISOString()),
              type: "estimation",
              status: "available",
            });
          }
          if (mockSlots.length >= 5) break;
        }

        return respond({ slots: mockSlots.slice(0, 5), source: "mock" });
      }

      case "hold_slot": {
        if (conversation_session_id) {
          await sb.from("alex_booking_candidates").insert({
            conversation_session_id,
            contractor_id: contractor_id || null,
            slot_start_at: slot_data?.start || null,
            slot_end_at: slot_data?.end || null,
            slot_type: slot_data?.type || "estimation",
            slot_status: "held",
          });
        }
        return respond({ status: "held", message: "Créneau réservé temporairement." });
      }

      case "confirm_booking": {
        // Update candidate to booked
        if (slot_id && conversation_session_id) {
          await sb
            .from("alex_booking_candidates")
            .update({ slot_status: "booked" })
            .eq("id", slot_id)
            .eq("conversation_session_id", conversation_session_id);

          // Update session
          await sb
            .from("alex_conversation_sessions")
            .update({
              session_status: "booked",
              selected_contractor_id: contractor_id,
              selected_booking_slot: slot_data,
            })
            .eq("id", conversation_session_id);
        }

        return respond({
          status: "confirmed",
          message: "Rendez-vous confirmé!",
          booking: {
            contractor_id,
            slot: slot_data,
            confirmed_at: new Date().toISOString(),
          },
        });
      }

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

function respond(data: any) {
  return new Response(JSON.stringify(data), {
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
