/**
 * Never sell an exclusive appointment position using old placeholder
 * market_capacity values or a missing row. Base $350 AI presence is not a
 * capacity-reserved appointment product.
 *
 * Future backend source can populate capacity_explanation ONLY after
 * reconciliation with actual completed appointments and paid commitments.
 */
export type CapacityStatus = "unverified" | "available" | "almost_full" | "waitlist";
export interface VerifiedCapacity {
  status: CapacityStatus;
  verified: boolean;
  slotsRemaining: number | null;
  slotsTotal: number | null;
  slotsUsed: number | null;
  waiting: number | null;
}
type CapacityRow = {
  updated_at?: string | null;
  max_slots?: number | null;
  active_slots?: number | null;
  waiting_list_count?: number | null;
  capacity_explanation?: unknown;
};

export function readVerifiedExclusiveCapacity(row: CapacityRow | null | undefined, now = Date.now()): VerifiedCapacity {
  const unknown: VerifiedCapacity = {
    status: "unverified", verified: false,
    slotsRemaining: null, slotsTotal: null, slotsUsed: null, waiting: null,
  };
  if (!row || !row.updated_at) return unknown;
  const timestamp = Date.parse(row.updated_at);
  if (!Number.isFinite(timestamp) || timestamp > now || now - timestamp > 30 * 24 * 60 * 60 * 1000) return unknown;
  // This evidence is not in historic rows. The actual server must explicitly
  // reconcile paid appointments and active commitments before enabling FOMO.
  const proof = row.capacity_explanation as {
    provenance?: string;
    verified_at?: string;
    monthly_completed_appointments?: number;
    minimum_appointments_per_partner?: number;
    verified_active_commitments?: number;
  } | null;
  if (proof?.provenance !== "live_completed_appointments_and_commitments") return unknown;
  const verifiedAt = Date.parse(proof.verified_at ?? "");
  if (!Number.isFinite(verifiedAt) || verifiedAt > now || now - verifiedAt > 30 * 24 * 60 * 60 * 1000) return unknown;
  const count = proof.monthly_completed_appointments;
  const minimum = proof.minimum_appointments_per_partner;
  const active = proof.verified_active_commitments;
  if (![count, minimum, active].every(v => Number.isInteger(v) && (v as number) >= 0) || !minimum || !count) return unknown;
  if (!Number.isInteger(row.max_slots) || row.max_slots! <= 0 || !Number.isInteger(row.active_slots)) return unknown;
  if (row.active_slots !== active) return unknown;
  // Deliverable capacity must never be greater than genuinely completed
  // appointments divided by the minimum promised per professional.
  const cap = Math.min(row.max_slots!, Math.floor(count! / minimum!));
  if (cap < 1 || active! > cap) return unknown;
  const remaining = cap - active!;
  return {
    verified: true,
    status: remaining === 0 ? "waitlist" : remaining === 1 ? "almost_full" : "available",
    slotsRemaining: remaining,
    slotsTotal: cap,
    slotsUsed: active!,
    waiting: Number.isInteger(row.waiting_list_count) && row.waiting_list_count! >= 0 ? row.waiting_list_count! : null,
  };
}
