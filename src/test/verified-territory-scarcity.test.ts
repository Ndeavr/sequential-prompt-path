// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { readVerifiedExclusiveCapacity } from "@/lib/market/verifiedScarcity";

const now = Date.parse("2026-10-27T16:00:00Z");
const verified = {
  updated_at: "2026-10-27T15:00:00Z",
  max_slots: 6, active_slots: 2, waiting_list_count: 0,
  capacity_explanation: {
    provenance: "live_completed_appointments_and_commitments",
    verified_at: "2026-10-27T15:00:00Z",
    monthly_completed_appointments: 12,
    minimum_appointments_per_partner: 3,
    verified_active_commitments: 2,
  },
};
describe("no fake territory scarcity or waiting list", () => {
  it("never invents 3 remaining positions for absent capacity data", () => {
    expect(readVerifiedExclusiveCapacity(null, now)).toMatchObject({
      status: "unverified", slotsRemaining: null, verified: false,
    });
  });
  it("treats old marketing max_slots and zero demand as unverified", () => {
    const old = { ...verified, updated_at: "2026-08-16T13:58:13Z", capacity_explanation: null };
    expect(readVerifiedExclusiveCapacity(old, now).status).toBe("unverified");
    expect(readVerifiedExclusiveCapacity({ ...verified, capacity_explanation: undefined }, now).slotsRemaining).toBeNull();
  });
  it("caps positions by genuinely completed appointments and required minimum", () => {
    expect(readVerifiedExclusiveCapacity(verified, now)).toMatchObject({
      status: "available", verified: true, slotsRemaining: 2, slotsTotal: 4, slotsUsed: 2,
    });
  });
  it("only displays one remaining after source-verified calculations", () => {
    expect(readVerifiedExclusiveCapacity({
      ...verified, capacity_explanation: { ...verified.capacity_explanation, monthly_completed_appointments: 9 },
    }, now)).toMatchObject({ status: "almost_full", slotsRemaining: 1 });
  });
  it("only displays full after source-verified commitments", () => {
    expect(readVerifiedExclusiveCapacity({
      ...verified, capacity_explanation: { ...verified.capacity_explanation, monthly_completed_appointments: 6 },
    }, now)).toMatchObject({ status: "waitlist", slotsRemaining: 0 });
  });
  it("rejects a made-up commitment count, stale proof, or zero actual demand", () => {
    for (const patch of [
      { verified_active_commitments: 1 },
      { verified_at: "2026-07-01T01:00:00Z" },
      { monthly_completed_appointments: 0 },
      { minimum_appointments_per_partner: 0 },
    ]) {
      const actual = { ...verified, capacity_explanation: { ...verified.capacity_explanation, ...patch } };
      expect(readVerifiedExclusiveCapacity(actual, now).status).toBe("unverified");
    }
  });
  it("keeps missing data from blocking broker profile enrollment", () => {
    const broker = readFileSync("src/components/broker/BrokerQualificationModal.tsx", "utf8");
    const matching = readFileSync("src/services/leadMatchingService.ts", "utf8");
    expect(broker).toContain('result.status === "unverified"');
    expect(broker).toContain("Continuer mon inscription");
    expect(broker).not.toContain("maxSlots: 3");
    expect(matching).toContain("readVerifiedExclusiveCapacity");
    expect(matching).not.toContain('slots_remaining: 3');
  });
});
