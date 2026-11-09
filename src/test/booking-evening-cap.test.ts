// @vitest-environment node
/**
 * ISR declared rules (synthetic data only): Mon–Thu 11:00–21:00, Fri 11:00–16:00,
 * Sat 09:30–14:00, Sun closed; at most 3 evenings (visit ending after 19:00)
 * per local week Mon–Sun; compact schedule; one visit at a time.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import {
  computeSlotsFromData,
  compactBonus,
  localWeekKey,
  zonedParts,
  zonedWallTime,
  type AppointmentType,
  type AvailabilitySlot,
  type BookingRules,
  type ExistingBooking,
  type SlotEngineData,
} from "@/services/bookingSlotEngine";
import {
  applyHoursToAvailability,
  parseBookingPreferences,
  summarizeBookingPreferences,
} from "@/services/clara/claraBookingPreferences";

const C = "00000000-0000-4000-8000-000000000001";
const type: AppointmentType = {
  id: "t", contractor_id: C, title: "Inspection gratuite", slug: "inspection-gratuite", category: "inspection",
  short_description: null, long_description: null, duration_minutes: 60, buffer_before_minutes: 0,
  buffer_after_minutes: 15, travel_padding_minutes: 15, color: "", icon: "", price_type: "free", price_amount: 0,
  is_free: true, location_mode: "onsite", availability_mode: "standard", requires_photos: false,
  requires_documents: false, requires_prequalification: false, requires_deposit: false,
  requires_manual_approval: false, supports_alex_booking: true, supports_qr_booking: false,
  allows_same_day: false, min_notice_hours: 4, max_daily_count: 50, is_active: true, sort_order: 0,
};
const hours: AvailabilitySlot[] = [
  ...[1, 2, 3, 4].map((d) => ({ day_of_week: d, start_time: "11:00", end_time: "21:00", is_active: true })),
  { day_of_week: 5, start_time: "11:00", end_time: "16:00", is_active: true },
  { day_of_week: 6, start_time: "09:30", end_time: "14:00", is_active: true },
];
const rules: BookingRules = { eveningAfter: "19:00", maxEveningsPerWeek: 3, visitCapacity: 1, preferCompactSchedule: true };
const NOW = zonedWallTime(2026, 11, 13, 9, 0); // Friday before the tested week
const booking = (d: number, h: number, m = 0): ExistingBooking => ({
  scheduled_start: zonedWallTime(2026, 11, d, h, m).toISOString(),
  scheduled_end: zonedWallTime(2026, 11, d, h + 1, m).toISOString(),
  buffer_before_minutes: 0, buffer_after_minutes: 15, travel_minutes_before: 15,
});
const run = (over: Partial<SlotEngineData> = {}, from = zonedWallTime(2026, 11, 16, 0, 0), to = zonedWallTime(2026, 11, 22, 23, 59)) =>
  computeSlotsFromData(
    { availability: hours, blackouts: [], existingBookings: [], allTypes: [type], externalBusy: [], rules, ...over },
    { contractorId: C, appointmentTypeId: "t", dateFrom: from, dateTo: to },
    NOW,
  ).slots;
const day = (d: number, slots = run()) => slots.filter((s) => zonedParts(s.start).day === d);
const mins = (dt: Date) => { const p = zonedParts(dt); return p.hour * 60 + p.minute; };
const lastEnd = (d: number, over?: Partial<SlotEngineData>) => Math.max(...day(d, run(over, zonedWallTime(2026, 11, d, 0, 0), zonedWallTime(2026, 11, d, 23, 59))).map((s) => mins(s.end)));

describe("new ISR hours (America/Toronto)", () => {
  it("Mon–Thu last visit 20:00–21:00", () => {
    for (const d of [16, 17, 18, 19]) expect(lastEnd(d)).toBe(21 * 60);
  });
  it("Friday last visit 15:00–16:00", () => expect(lastEnd(20)).toBe(16 * 60));
  it("Saturday last visit 13:00–14:00", () => expect(lastEnd(21)).toBe(14 * 60));
  it("Sunday has no slot", () => expect(day(22, run({}, zonedWallTime(2026, 11, 22, 0, 0)))).toEqual([]));
});

describe("evening cap in suggestions", () => {
  const evening = (d: number, over: Partial<SlotEngineData>) =>
    day(d, run(over, zonedWallTime(2026, 11, d, 0, 0), zonedWallTime(2026, 11, d, 23, 59))).some((s) => mins(s.end) > 19 * 60);

  it("3 evenings booked → 4th evening date not offered, daytime still offered", () => {
    const held = { existingBookings: [booking(16, 19, 30), booking(17, 19, 30), booking(18, 19, 30)] };
    expect(evening(19, held)).toBe(false);
    expect(day(19, run(held, zonedWallTime(2026, 11, 19, 0, 0), zonedWallTime(2026, 11, 19, 23, 59))).length).toBeGreaterThan(0);
    // An evening already counted can hold another visit.
    expect(evening(16, held)).toBe(true);
  });
  it("2 evenings booked → any remaining weekday evening is offered (no forced days)", () => {
    const held = { existingBookings: [booking(16, 19, 30), booking(17, 19, 30)] };
    expect(evening(18, held)).toBe(true);
    expect(evening(19, held)).toBe(true);
  });
  it("next local week starts fresh (Mon–Sun)", () => {
    expect(localWeekKey("2026-11-22")).toBe("2026-11-16");
    expect(localWeekKey("2026-11-23")).toBe("2026-11-23");
    const held = { existingBookings: [booking(16, 19, 30), booking(17, 19, 30), booking(18, 19, 30)] };
    expect(evening(23, held)).toBe(true);
  });
  it("Danny's busy period still blocks, with travel and buffer", () => {
    const busy = [{ starts_at: zonedWallTime(2026, 11, 17, 19, 0).toISOString(), ends_at: zonedWallTime(2026, 11, 17, 21, 0).toISOString() }];
    const tue = day(17, run({ externalBusy: busy }, zonedWallTime(2026, 11, 17, 0, 0), zonedWallTime(2026, 11, 17, 23, 59)));
    expect(tue.some((s) => mins(s.end) > 18 * 60 - 15)).toBe(false);
  });
});

describe("least idle time", () => {
  it("slot touching a held booking's buffered block scores higher, travel kept", () => {
    const held = [booking(17, 14, 0)]; // 14:00–15:00, buffered block 13:45–15:15
    const touching = compactBonus(zonedWallTime(2026, 11, 17, 15, 15), zonedWallTime(2026, 11, 17, 16, 30), "2026-11-17", held);
    const far = compactBonus(zonedWallTime(2026, 11, 17, 18, 0), zonedWallTime(2026, 11, 17, 19, 15), "2026-11-17", held);
    expect(touching).toBeGreaterThan(far);
    const tue = day(17, run({ existingBookings: held }, zonedWallTime(2026, 11, 17, 0, 0), zonedWallTime(2026, 11, 17, 23, 59)));
    // Travel + buffer respected: the earliest slot after it starts at 15:30 (15:00 + 15 buffer + 15 travel).
    expect(tue.map((s) => mins(s.start))).not.toContain(15 * 60 + 15);
    expect(tue.map((s) => mins(s.start))).toContain(15 * 60 + 30);
    // No slot removed by the preference itself.
    const plain = day(17, run({ existingBookings: held, rules: { ...rules, preferCompactSchedule: false } }, zonedWallTime(2026, 11, 17, 0, 0), zonedWallTime(2026, 11, 17, 23, 59)));
    expect(tue.length).toBe(plain.length);
  });
  it("one visit at a time: an overlapping slot is never offered", () => {
    const tue = day(17, run({ existingBookings: [booking(17, 14, 0)] }, zonedWallTime(2026, 11, 17, 0, 0), zonedWallTime(2026, 11, 17, 23, 59)));
    expect(tue.some((s) => mins(s.start) > 12 * 60 + 45 && mins(s.start) < 15 * 60 + 30)).toBe(false);
  });
});

describe("Clara reads the owner's own words", () => {
  const said = "Les visites se terminent au plus tard à 21h en semaine , sauf vendredi, 16h max 3 soirs par semaine. Laisser le moins de temps vide possible entre les rendez-vous";
  it("extracts end times, evening cap and compact preference, assumes no representatives", () => {
    const p = parseBookingPreferences(said);
    for (const d of [1, 2, 3, 4]) expect(p.hours[d]).toEqual({ end: "21:00" });
    expect(p.hours[5]).toEqual({ end: "16:00" });
    expect(p.maxEveningsPerWeek).toBe(3);
    expect(p.preferCompactSchedule).toBe(true);
    expect(p.representatives).toBeNull();
    expect(summarizeBookingPreferences(p)).toContain("Au plus 3 soirées par semaine (visite finissant après 19 h)");
  });
  it("applies only stated bounds onto existing hours", () => {
    const rows = applyHoursToAvailability(
      [1, 2, 3, 4, 5].map((d) => ({ day_of_week: d, start_time: "11:00", end_time: "19:00", is_active: true })),
      parseBookingPreferences(said).hours,
    );
    expect(rows.find((r) => r.day_of_week === 1)).toMatchObject({ start_time: "11:00", end_time: "21:00" });
    expect(rows.find((r) => r.day_of_week === 5)).toMatchObject({ start_time: "11:00", end_time: "16:00" });
  });
  it("reads ranges, closed days and representative counts", () => {
    const p = parseBookingPreferences("Samedi de 9h30 à 14h. Dimanche fermé. Nous avons deux représentants.");
    expect(p.hours[6]).toEqual({ start: "09:30", end: "14:00" });
    expect(p.hours[0]).toEqual({ closed: true });
    expect(p.representatives).toBe(2);
    expect(parseBookingPreferences("bonjour").hours).toEqual({});
  });
});

describe("server trigger: 4th evening refused, even direct insert", { timeout: 30_000 }, () => {
  const setup = async () => {
    const db = new PGlite();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'select null::uuid';
      CREATE TYPE public.app_role AS ENUM ('admin');
      CREATE FUNCTION public.has_role(uuid, public.app_role) RETURNS boolean LANGUAGE sql AS 'select false';
      CREATE TABLE public.contractors(id uuid primary key, user_id uuid);
      CREATE TABLE public.smart_bookings(id uuid primary key default gen_random_uuid(), contractor_id uuid, status text,
        scheduled_start timestamptz, scheduled_end timestamptz, buffer_before_minutes int, buffer_after_minutes int, travel_minutes_before int);
      INSERT INTO public.contractors VALUES ('${C}', null), ('00000000-0000-4000-8000-000000000002', null);`);
    await db.exec(readFileSync("drizzle/migrations/0050_contractor_booking_rules_evening_cap.sql", "utf8").replace(/--> statement-breakpoint/g, ""));
    await db.exec(`INSERT INTO public.contractor_booking_rules(contractor_id, max_evenings_per_week) VALUES ('${C}', 3)`);
    return db;
  };
  const ins = (db: PGlite, b: ExistingBooking, contractor = C) =>
    db.query(`INSERT INTO public.smart_bookings(contractor_id,status,scheduled_start,scheduled_end) VALUES ($1,'confirmed',$2,$3)`,
      [contractor, b.scheduled_start, b.scheduled_end]).then(() => "ok", (e: Error) => e.message);

  it("3 evenings accepted, 4th refused, same evening and daytime still accepted", async () => {
    const db = await setup();
    expect(await ins(db, booking(16, 19, 30))).toBe("ok");
    expect(await ins(db, booking(17, 20, 0))).toBe("ok");
    expect(await ins(db, booking(18, 19, 15))).toBe("ok");
    expect(await ins(db, booking(19, 19, 30))).toContain("evening_cap_reached");
    expect(await ins(db, booking(16, 18, 15))).toBe("ok"); // ends 19:15 on an already-counted evening
    expect(await ins(db, booking(19, 13, 0))).toBe("ok"); // daytime ends 14:00
    expect(await ins(db, booking(19, 18, 0))).toBe("ok"); // ends exactly 19:00 → not an evening
    expect(await ins(db, booking(23, 19, 30))).toBe("ok"); // next local week
    expect(await ins(db, booking(19, 19, 30), "00000000-0000-4000-8000-000000000002")).toBe("ok"); // other business untouched
  });

  it("two concurrent 4th-evening writers: at most one passes", async () => {
    const db = await setup();
    for (const d of [16, 17]) await ins(db, booking(d, 19, 30));
    const results = await Promise.all([ins(db, booking(18, 19, 30)), ins(db, booking(19, 19, 30))]);
    expect(results.filter((r) => r === "ok").length).toBe(1);
    expect(results.filter((r) => r.includes("evening_cap_reached")).length).toBe(1);
  });

  it("moving a booking into a 4th evening is refused too", async () => {
    const db = await setup();
    for (const d of [16, 17, 18]) await ins(db, booking(d, 19, 30));
    await ins(db, booking(19, 13, 0));
    const b = booking(19, 19, 30);
    const r = await db.query(`UPDATE public.smart_bookings SET scheduled_start=$1, scheduled_end=$2 WHERE scheduled_start=$3`,
      [b.scheduled_start, b.scheduled_end, booking(19, 13, 0).scheduled_start]).then(() => "ok", (e: Error) => e.message);
    expect(r).toContain("evening_cap_reached");
  });
});
