/**
 * STAGED — not deployed. Proposed replacement for
 * supabase/functions/alex-inline-booking/index.ts (active, auto-deploys on edit).
 *
 * Why: the active handler reads `availability_slots` (table does not exist) and
 * its `confirm_booking` action answers "confirmed" without creating a booking,
 * using the service role without authentication.
 *
 * This replacement reads no table and writes nothing:
 *  - get_slots      → explicit empty answer pointing to the canonical engine
 *                     (computeSmartSlots, same source as /book/:slug/:typeSlug).
 *  - hold_slot      → refused (410), no write.
 *  - confirm_booking→ refused (410), no write, never claims a confirmation.
 * Release requires explicit owner approval (copying this file auto-deploys).
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let action: unknown;
  try {
    ({ action } = await req.json());
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  switch (action) {
    case "get_slots":
      return json({
        slots: [],
        source: "canonical_engine_required",
        message: "Les disponibilités sont calculées par la page de réservation de l'entreprise.",
      });
    case "hold_slot":
    case "confirm_booking":
      return json({
        error: "booking_moved",
        message: "La réservation se fait sur la page de réservation de l'entreprise.",
      }, 410);
    default:
      return json({ error: "unknown_action" }, 400);
  }
}

if (import.meta.main) Deno.serve(handle);
