import { describe, it, expect, vi, beforeAll } from "vitest";

const { ISR, TYPE, HOURS, BUSY } = vi.hoisted(() => {
const ISR = "isr-synthetic";
const TYPE = {
  id: "type-insp", contractor_id: ISR, title: "Inspection gratuite", slug: "inspection-gratuite",
  duration_minutes: 60, buffer_before_minutes: 0, buffer_after_minutes: 15, travel_padding_minutes: 15,
  is_free: true, price_amount: 0, min_notice_hours: 4, max_daily_count: 5, allows_same_day: false,
  is_active: true, supports_alex_booking: true, sort_order: 0,
};
const HOURS = [1, 2, 3, 4, 5].map((d) => ({ contractor_id: ISR, day_of_week: d, start_time: "11:00:00", end_time: "19:00:00", is_active: true }))
  .concat([{ contractor_id: ISR, day_of_week: 6, start_time: "09:30:00", end_time: "14:00:00", is_active: true }]);
// Danny busy windows as synced (America/Toronto, EST = UTC-5)
const BUSY = [
  ["2026-11-10T17:00:00Z", "2026-11-10T18:00:00Z"],
  ["2026-11-11T16:00:00Z", "2026-11-11T17:00:00Z"],
  ["2026-11-13T16:00:00Z", "2026-11-13T17:00:00Z"],
  ["2026-11-13T18:00:00Z", "2026-11-13T19:00:00Z"],
  ["2026-11-21T15:00:00Z", "2026-11-21T16:00:00Z"],
].map(([s, e]: string[]) => ({ starts_at: s, ends_at: e }));

  return { ISR, TYPE, HOURS, BUSY };
});

vi.mock("@/integrations/supabase/client", () => {
  const rows: Record<string, unknown[]> = {
    booking_availability: HOURS, booking_blackouts: [], smart_bookings: [], booking_appointment_types: [TYPE],
  };
  const builder = (table: string) => {
    const q: any = { then: (r: any) => r({ data: rows[table] ?? [], error: null }) };
    for (const m of ["select", "eq", "in", "gte", "lte", "order"]) q[m] = () => q;
    return q;
  };
  return { supabase: { from: builder, rpc: async () => ({ data: BUSY, error: null }) } };
});

import { computeSmartSlots } from "@/services/bookingSlotEngine";

const hm = (d: Date) => d.getHours() * 60 + d.getMinutes();

describe("ISR weekly hours (synthetic)", () => {
  let slots: Awaited<ReturnType<typeof computeSmartSlots>>["slots"] = [];
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-09T23:30:00Z"));
    const res = await computeSmartSlots({
      contractorId: ISR, appointmentTypeId: TYPE.id,
      dateFrom: new Date(2026, 10, 9, 0, 0), dateTo: new Date(2026, 10, 22, 23, 59),
    });
    slots = res.slots;
    vi.useRealTimers();
  });

  it("runs in America/Toronto", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("America/Toronto");
  });
  it("has no slot on Sunday and none today", () => {
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.filter((s) => s.start.getDay() === 0)).toHaveLength(0);
    expect(slots.filter((s) => s.start.getDate() === 9)).toHaveLength(0);
  });
  it("Mon–Fri slots stay within 11:00–19:00", () => {
    const wk = slots.filter((s) => s.start.getDay() >= 1 && s.start.getDay() <= 5);
    expect(wk.length).toBeGreaterThan(0);
    for (const s of wk) { expect(hm(s.start)).toBeGreaterThanOrEqual(660); expect(hm(s.end)).toBeLessThanOrEqual(1140); }
  });
  it("Saturday slots stay within 09:30–14:00", () => {
    const sat = slots.filter((s) => s.start.getDay() === 6);
    expect(sat.length).toBeGreaterThan(0);
    for (const s of sat) { expect(hm(s.start)).toBeGreaterThanOrEqual(570); expect(hm(s.end)).toBeLessThanOrEqual(840); }
  });
  it("no slot (with 15 min travel before, 15 min buffer after) touches a Danny busy window", () => {
    for (const s of slots) {
      const bs = s.start.getTime() - 15 * 60000, be = s.end.getTime() + 15 * 60000;
      for (const w of BUSY) expect(bs < new Date(w.ends_at).getTime() && be > new Date(w.starts_at).getTime()).toBe(false);
    }
    // Tue 10 Nov 12:00 busy → 11:00 slot (block 10:45–12:15) must be gone
    expect(slots.some((s) => s.start.getDate() === 10 && hm(s.start) === 660)).toBe(false);
  });
  it("every slot lasts 60 minutes", () => {
    for (const s of slots) expect(s.end.getTime() - s.start.getTime()).toBe(3600000);
  });
  it("uncapped single days: last weekday slot 18:00–19:00, last Saturday slot 13:00–14:00, Sunday empty", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-09T23:30:00Z"));
    (TYPE as any).max_daily_count = 100;
    const day = async (d: number) => (await computeSmartSlots({ contractorId: ISR, appointmentTypeId: TYPE.id,
      dateFrom: new Date(2026, 10, d, 0, 0), dateTo: new Date(2026, 10, d, 23, 59) })).slots;
    const thu = await day(12), sat = await day(14), sun = await day(15);
    (TYPE as any).max_daily_count = 5;
    vi.useRealTimers();
    expect(Math.max(...thu.map((s) => hm(s.end)))).toBe(1140);
    expect(Math.min(...thu.map((s) => hm(s.start)))).toBe(660);
    expect(Math.max(...sat.map((s) => hm(s.end)))).toBe(840);
    expect(Math.min(...sat.map((s) => hm(s.start)))).toBe(570);
    expect(sun).toHaveLength(0);
    console.log("THU", thu.map((s) => `${s.start.getHours()}:${String(s.start.getMinutes()).padStart(2, "0")}`).join(" "));
  });
  it("prints day summary", () => {
    const by: Record<string, string[]> = {};
    for (const s of slots) { const k = s.start.toDateString(); (by[k] ??= []).push(`${s.start.getHours()}:${String(s.start.getMinutes()).padStart(2, "0")}`); }
    console.log(JSON.stringify(by));
  });
});
