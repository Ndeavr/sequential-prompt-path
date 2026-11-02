/**
 * A compatible appointment may be released to a contractor as soon as:
 * minimal useful profile + mandatory qualifications verified + compatible need
 * + canonical LIVE signed CA$350 entry payment (not refunded/disputed).
 * Payment never replaces eligibility. Cosmetic completeness never blocks.
 * Grants access to THIS appointment only; no general appointment promise.
 */
export type ContractorForRelease = {
  identity_verified: boolean;      // reliable identity + contact
  contact_reliable: boolean;
  trade_compatible: boolean;       // trade/surfaces
  territory_compatible: boolean;
  clarifications_answered: boolean; // required capability questions answered compatibly
  mandatory_qualifications_valid: boolean; // e.g. RBQ when required, verified
  // Cosmetic fields intentionally ignored: photo, marketing description, portfolio, completeness %.
  profile_completeness_pct?: number;
};
export type EntryPaymentEvidence = { livemode: boolean; signed_webhook: boolean; paid: boolean; amount_subtotal_cents: number; currency: string; refunded: boolean; disputed: boolean } | null;

export function hasCanonicalEntryPayment(p: EntryPaymentEvidence): boolean {
  return !!p && p.livemode && p.signed_webhook && p.paid && p.amount_subtotal_cents === 35000 && p.currency.toLowerCase() === "cad" && !p.refunded && !p.disputed;
}
export function minimalProfileOk(c: ContractorForRelease): boolean {
  return c.identity_verified && c.contact_reliable && c.trade_compatible && c.territory_compatible && c.clarifications_answered && c.mandatory_qualifications_valid;
}
export function mayReleaseAppointment(c: ContractorForRelease, p: EntryPaymentEvidence): boolean {
  return minimalProfileOk(c) && hasCanonicalEntryPayment(p);
}
/** Second CA$350 activation is never created: one entitlement per contractor. */
export function needsNewEntryActivation(existingActivations: number): boolean { return existingActivations === 0; }

export type BookingState = "requested_pending" | "confirmed" | "declined" | "slot_taken";
/** Without connected calendar: requested slot stays pending until the contractor accepts. Never invent a free slot. */
export function bookingStateAfterRequest(calendarConnected: boolean, slotFreeOnCalendar: boolean | null, serverConfirmed: boolean): BookingState {
  if (calendarConnected) return slotFreeOnCalendar === false ? "slot_taken" : serverConfirmed ? "confirmed" : "requested_pending";
  return serverConfirmed ? "confirmed" : "requested_pending";
}
export const detailsEmailKey = (bookingId: string) => `appointment-details-contractor-${bookingId}`;
export const clientConfirmationKey = (bookingId: string) => `appointment-confirmed-client-${bookingId}`;
/** Details email (with the minimum client info for the visit) only after real confirmation. */
export function shouldSendDetailsEmail(state: BookingState, alreadySentKeys: Set<string>, bookingId: string): boolean {
  return state === "confirmed" && !alreadySentKeys.has(detailsEmailKey(bookingId));
}
/** Existing personalized-plan path; resumes from company context, never opens Checkout. */
export const MORE_APPOINTMENTS_PATH = "/entrepreneur/devis-personnalise";
export function moreAppointmentsLink(contractorId: string) {
  return `${MORE_APPOINTMENTS_PATH}?from=appointment&contractor=${encodeURIComponent(contractorId)}`;
}
export function includeMoreAppointmentsCtaInEmail(marketingOptIn: boolean): boolean { return marketingOptIn; }
