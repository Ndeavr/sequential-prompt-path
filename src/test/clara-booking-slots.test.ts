/**
 * Clara ↔ booking page share one slot engine (synthetic data only).
 * Hours: Mon–Fri 11:00–19:00, Sat 09:30–14:00, Sun closed, America/Toronto.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  computeSlotsFromData,
  zonedParts,
  zonedWallTime,
  type AppointmentType,
  type AvailabilitySlot,
  type SlotEngineData,
} from "@/services/bookingSlotEngine";
import { resolveClaraBookingGate } from "@/services/clara/claraBookingSlots";

const CONTRACTOR = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";

const type = (over: Partial<AppointmentType> = {}): AppointmentType => ({
  id: "type-inspection", contractor_id: CONTRACTOR, title: "Inspection gratuite", slug: "inspection-gratuite",
  category: "inspection", short_description: null, long_description: null,
  duration_minutes: 60, buffer_before_minutes: 0, buffer_after_minutes: 15, travel_padding_minutes: 15,
  color: "", icon: "", price_type: "free", price_amount: 0, is_free: true, location_mode: "onsite",
  availability_mode: "standard", requires_photos: false, requires_documents: false,
  requires_prequalification: false, requires_deposit: false, requires_manual_approval: false,
  supports_alex_booking: true, supports_qr_booking: false, allows_same_day: false,
  min_notice_hours: 4, max_daily_count: 50, is_active: true, sort_order: 0, ...over,
});

const hours: AvailabilitySlot[] = [
  ...[1, 2, 3, 4, 5].map((d) => ({ day_of_week: d, start_time: "11:00", end_time: "19:00", is_active: true })),
  { day_of_week: 6, start_time: "09:30", end_time: "14:00", is_active: true },
];

// Monday 9 Nov 2026, 12:00 in Montréal.
const NOW = zonedWallTime(2026, 11, 9, 12, 0);
const FROM = NOW;
const TO = zonedWallTime(2026, 11, 15, 23, 59);

const data = (over: Partial<SlotEngineData> = {}): SlotEngineData => ({
  availability: hours, blackouts: [], existingBookings: [], allTypes: [type()], externalBusy: [], ...over,
});

const run = (d: SlotEngineData, typeId = "type-inspection", dateFrom = FROM) =>
  computeSlotsFromData(d, { contractorId: CONTRACTOR, appointmentTypeId: typeId, dateFrom, dateTo: TO }, NOW).slots;
// The engine returns at most 50 slots chronologically; Saturday is checked on its own window.
const SATURDAY = zonedWallTime(2026, 11, 14, 0, 0);

const minutes = (date: Date) => { const p = zonedParts(date); return p.hour * 60 + p.minute; };

describe("canonical slot engine — real ISR hours (America/Toronto)", () => {
  it("weekdays stay within 11:00–19:00 Montréal time", () => {
    const weekday = run(data()).filter((s) => [1, 2, 3, 4, 5].includes(zonedParts(s.start).weekday));
    expect(weekday.length).toBeGreaterThan(0);
    for (const s of weekday) {
      expect(minutes(s.start)).toBeGreaterThanOrEqual(11 * 60);
      expect(minutes(s.end)).toBeLessThanOrEqual(19 * 60);
    }
    expect(weekday.some((s) => minutes(s.start) === 11 * 60)).toBe(true);
    expect(weekday.some((s) => minutes(s.start) === 18 * 60)).toBe(true);
  });

  it("Saturday stays within 09:30–14:00", () => {
    const sat = run(data(), "type-inspection", SATURDAY).filter((s) => zonedParts(s.start).weekday === 6);
    expect(sat.length).toBeGreaterThan(0);
    for (const s of sat) {
      expect(minutes(s.start)).toBeGreaterThanOrEqual(9 * 60 + 30);
      expect(minutes(s.end)).toBeLessThanOrEqual(14 * 60);
    }
  });

  it("Sunday is closed and same day is never offered", () => {
    const slots = run(data());
    expect(run(data(), "type-inspection", SATURDAY).some((s) => zonedParts(s.start).weekday === 0)).toBe(false);
    expect(slots.some((s) => zonedParts(s.start).weekday === 0)).toBe(false);
    expect(slots.some((s) => zonedParts(s.start).day === 9)).toBe(false);
  });

  it("every slot lasts exactly 60 minutes", () => {
    for (const s of run(data())) expect(s.end.getTime() - s.start.getTime()).toBe(60 * 60000);
  });

  it("a calendar busy period blocks the slot plus travel and buffer", () => {
    const busy = { starts_at: zonedWallTime(2026, 11, 11, 14, 0).toISOString(), ends_at: zonedWallTime(2026, 11, 11, 15, 0).toISOString() };
    const wed = run(data({ externalBusy: [busy] })).filter((s) => zonedParts(s.start).day === 11).map((s) => minutes(s.start));
    for (let m = 13 * 60; m <= 15 * 60; m += 15) expect(wed).not.toContain(m);
    expect(wed).toContain(15 * 60 + 15);
    expect(wed).toContain(11 * 60);
  });

  it("invents nothing without hours, or for another contractor's type", () => {
    expect(run(data({ availability: [] }))).toEqual([]);
    expect(run(data({ allTypes: [type({ contractor_id: OTHER })] }))).toEqual([]);
    expect(run(data(), "unknown-type")).toEqual([]);
  });

  it("ISR's real daily limit (5) caps display at 10 per day", () => {
    const slots = run(data({ allTypes: [type({ max_daily_count: 5 })] }));
    const perDay: Record<number, number> = {};
    for (const s of slots) perDay[zonedParts(s.start).day] = (perDay[zonedParts(s.start).day] ?? 0) + 1;
    for (const n of Object.values(perDay)) expect(n).toBeLessThanOrEqual(10);
  });
});

describe("Clara booking gate", () => {
  const base = { contractorId: CONTRACTOR, slug: "isolation-solution-royal", types: [type()] };

  it("pending-verification business is never proposed publicly", () => {
    const gate = resolveClaraBookingGate({ ...base, publicStatus: "published_pending_verification" });
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.reason).toBe("not_verified");
  });

  it("verified business hands off to the same booking route", () => {
    const gate = resolveClaraBookingGate({ ...base, publicStatus: "verified_active", appointmentTypeId: "type-inspection" });
    expect(gate.ok).toBe(true);
    if (gate.ok) expect(gate.bookingPath).toBe("/book/isolation-solution-royal/inspection-gratuite");
  });

  it("rejects a type that is inactive, not Clara-bookable or foreign", () => {
    for (const t of [type({ is_active: false }), type({ supports_alex_booking: false }), type({ contractor_id: OTHER })]) {
      const gate = resolveClaraBookingGate({ ...base, types: [t], publicStatus: "verified_active", appointmentTypeId: "type-inspection" });
      expect(gate.ok).toBe(false);
    }
  });
});

describe("one source for Clara and the booking page", () => {
  const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

  it("both surfaces use the canonical engine and no legacy table", () => {
    const panel = read("src/components/alex-conversation/PanelAppointmentSchedulerInline.tsx");
    const page = read("src/pages/PublicBookingPage.tsx");
    expect(panel).toContain("computeSmartSlots");
    expect(page).toContain("computeSmartSlots");
    expect(panel).not.toContain("alex-inline-booking");
    expect(panel).not.toMatch(/confirmé/i);
    expect(read("src/services/bookingSlotEngine.ts")).not.toContain("availability_slots");
  });

  it("staged edge replacement never reads the missing table nor claims a booking", () => {
    const staged = read("supabase/staged/alex-inline-booking/index.ts");
    expect(staged).not.toMatch(/\.from\(\s*["']availability_slots/);
    expect(staged).not.toContain("createClient");
    expect(staged).not.toMatch(/Rendez-vous confirmé/);
    expect(staged).toContain('"booking_moved"');
  });
});
