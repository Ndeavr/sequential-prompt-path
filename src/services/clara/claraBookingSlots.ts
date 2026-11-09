/**
 * Clara booking gate — decides whether Clara may propose real appointment
 * times for a contractor. Slots themselves always come from the canonical
 * engine (`computeSmartSlots` / `computeSlotsFromData`), the same source as
 * the public route /book/:slug/:typeSlug. Nothing here invents a time.
 */
import type { AppointmentType } from "@/services/bookingSlotEngine";

export type ClaraBookingBlock =
  | "not_verified"
  | "no_bookable_type"
  | "type_mismatch";

export type ClaraBookingGate =
  | { ok: true; type: AppointmentType; bookingPath: string | null }
  | { ok: false; reason: ClaraBookingBlock; message: string };

export const CLARA_BOOKING_BLOCK_MESSAGES: Record<ClaraBookingBlock, string> = {
  not_verified:
    "Cette entreprise est en cours de vérification. Clara proposera ses disponibilités dès que la vérification sera terminée.",
  no_bookable_type:
    "Cette entreprise n'a pas encore ouvert de rendez-vous réservables avec Clara.",
  type_mismatch:
    "Ce type de rendez-vous n'est pas offert par cette entreprise.",
};

export interface ClaraBookingGateInput {
  contractorId: string;
  publicStatus: string | null | undefined;
  slug: string | null | undefined;
  types: AppointmentType[];
  appointmentTypeId?: string | null;
}

const block = (reason: ClaraBookingBlock): ClaraBookingGate => ({
  ok: false,
  reason,
  message: CLARA_BOOKING_BLOCK_MESSAGES[reason],
});

export function resolveClaraBookingGate(input: ClaraBookingGateInput): ClaraBookingGate {
  // Public Clara recommendations require a verified, admin-confirmed business.
  if (input.publicStatus !== "verified_active") return block("not_verified");

  const bookable = input.types.filter(
    (t) => t.contractor_id === input.contractorId && t.is_active && t.supports_alex_booking,
  );

  let type: AppointmentType | undefined;
  if (input.appointmentTypeId) {
    type = bookable.find((t) => t.id === input.appointmentTypeId);
    if (!type) return block("type_mismatch");
  } else {
    type = bookable[0];
  }
  if (!type) return block("no_bookable_type");

  const bookingPath = input.slug && type.slug
    ? `/book/${encodeURIComponent(input.slug)}/${encodeURIComponent(type.slug)}`
    : null;
  return { ok: true, type, bookingPath };
}
