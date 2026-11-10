/**
 * Clara booking gate — decides whether Clara may propose real appointment
 * times for a contractor. Slots themselves always come from the canonical
 * engine (`computeSmartSlots` / `computeSlotsFromData`), the same source as
 * the public route /book/:slug/:typeSlug. Nothing here invents a time.
 */
import {
  localWeekKey,
  zonedDayKey,
  type AppointmentType,
  type SlotCandidate,
  type SlotEngineOutput,
} from "@/services/bookingSlotEngine";

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

// ─── Explicit evening request ("absolument en soirée") ───

/** True only when the homeowner explicitly requires an evening visit. */
export function detectEveningRequirement(text: string): boolean {
  const t = text.toLowerCase().replace(/\s+/g, " ");
  return /\b(?:absolument|seulement|uniquement|obligatoirement|juste|que|exclusivement)\s+(?:en|le|les|un|une)?\s*(?:soir|soirée|soirées|soirs)\b/.test(t)
    || /\bpas (?:avant|possible avant) (?:le soir|19 ?h|18 ?h)\b/.test(t);
}

/** Evening search window when the homeowner insists on an evening. */
export const EVENING_SEARCH_DAYS = 30;

const NUMBER_FR = ["zéro", "une", "deux", "trois", "quatre", "cinq", "six", "sept"];

export type EveningPlan =
  | { kind: "this_week"; slots: SlotCandidate[] }
  | { kind: "week_full"; message: string; nextWeek: string; nextSlots: SlotCandidate[] }
  | { kind: "none_this_week"; message: string; nextWeek: string; nextSlots: SlotCandidate[] }
  | { kind: "none"; message: string };

/**
 * Splits evening-only engine output (computed with eveningOnly over
 * EVENING_SEARCH_DAYS) into "this local week" vs the next week holding real
 * evening slots. Never invents a slot and never lifts the weekly cap.
 */
export function planEveningSearch(
  output: Pick<SlotEngineOutput, "slots" | "fullEveningWeeks">,
  now: Date,
  maxEveningsPerWeek: number | null,
): EveningPlan {
  const thisWeek = localWeekKey(zonedDayKey(now));
  const weekOf = (s: SlotCandidate) => localWeekKey(zonedDayKey(s.start));
  const current = output.slots.filter((s) => weekOf(s) === thisWeek);
  if (current.length) return { kind: "this_week", slots: current };

  const later = output.slots.filter((s) => weekOf(s) > thisWeek).sort((a, b) => a.start.getTime() - b.start.getTime());
  if (!later.length) {
    return { kind: "none", message: `Je ne vois aucune soirée libre dans les ${EVENING_SEARCH_DAYS} prochains jours.` };
  }
  const nextWeek = weekOf(later[0]);
  const nextSlots = later.filter((s) => weekOf(s) === nextWeek);
  const full = maxEveningsPerWeek !== null && (output.fullEveningWeeks ?? []).includes(thisWeek);
  if (full) {
    const n = NUMBER_FR[maxEveningsPerWeek as number] ?? String(maxEveningsPerWeek);
    const msg = maxEveningsPerWeek === 1
      ? "Notre soirée est déjà prise cette semaine."
      : `Nos ${n} soirées sont déjà prises cette semaine.`;
    return {
      kind: "week_full",
      message: `${msg} Je peux vérifier les soirées disponibles la semaine prochaine.`,
      nextWeek,
      nextSlots,
    };
  }
  return {
    kind: "none_this_week",
    message: "Je ne vois plus de soirée libre cette semaine. Je peux vérifier les soirées disponibles la semaine prochaine.",
    nextWeek,
    nextSlots,
  };
}
