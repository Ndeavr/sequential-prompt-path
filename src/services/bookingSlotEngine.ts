/**
 * UNPRO Booking Intelligence — Smart Slot Engine
 * Computes, ranks, and recommends available appointment slots.
 * Conversion-first: prioritizes closing probability, not just availability.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

export interface AppointmentType {
  id: string;
  contractor_id: string;
  title: string;
  slug: string;
  category: string;
  short_description: string | null;
  long_description: string | null;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  travel_padding_minutes: number;
  color: string;
  icon: string;
  price_type: string;
  price_amount: number;
  is_free: boolean;
  location_mode: string;
  availability_mode: string;
  requires_photos: boolean;
  requires_documents: boolean;
  requires_prequalification: boolean;
  requires_deposit: boolean;
  requires_manual_approval: boolean;
  supports_alex_booking: boolean;
  supports_qr_booking: boolean;
  allows_same_day: boolean;
  min_notice_hours: number;
  max_daily_count: number;
  is_active: boolean;
  sort_order: number;
}

export interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface Blackout {
  start_at: string;
  end_at: string;
  reason: string | null;
}

export interface ExistingBooking {
  scheduled_start: string;
  scheduled_end: string;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  travel_minutes_before: number;
}

export interface SlotCandidate {
  start: Date;
  end: Date;
  label: string;
  score: number;
  badges: SlotBadge[];
  travelMinutes: number;
  isRecommended: boolean;
  /** Declared max travel vs a reliable computed ETA; "unverified" when no ETA exists. */
  travelCheck?: TravelCheck;
}

export type TravelCheck = "not_declared" | "unverified" | "within" | "exceeds";

/** Compares a declared max travel only to a reliable computed ETA; never invents one. */
export function classifyTravel(maxTravelMinutes: number | null, etaMinutes: number | null | undefined): TravelCheck {
  if (maxTravelMinutes === null) return "not_declared";
  if (etaMinutes === null || etaMinutes === undefined || !Number.isFinite(etaMinutes)) return "unverified";
  return etaMinutes <= maxTravelMinutes ? "within" : "exceeds";
}

export type SlotBadge =
  | "best_overall"
  | "fastest"
  | "most_convenient"
  | "urgency_optimized"
  | "reduced_travel"
  | "recommended_by_alex";

/** A busy window imported from the contractor's connected calendar. */
export interface ExternalBusyWindow {
  starts_at: string;
  ends_at: string;
}

export interface SlotEngineInput {
  contractorId: string;
  appointmentTypeId: string;
  dateFrom: Date;
  dateTo: Date;
  clientLat?: number;
  clientLng?: number;
  urgencyLevel?: string;
  dnaMatchScore?: number;
  /** Homeowner explicitly asked for an evening: only visits ending after rules.eveningAfter. */
  eveningOnly?: boolean;
}

export interface SlotEngineOutput {
  slots: SlotCandidate[];
  recommendedSlot: SlotCandidate | null;
  alternativeTypes: AppointmentType[];
  /** Local weeks (Monday YYYY-MM-DD) whose evening cap is already reached by held bookings. */
  fullEveningWeeks?: string[];
}

// ─── Smart Defaults ───

export const SLOT_DEFAULTS = {
  bufferBefore: 15,
  bufferAfter: 15,
  travelPadding: 15,
  roundingMinutes: 15,
  minNoticeHoursStandard: 12,
  minNoticeHoursUrgency: 2,
  lunchStart: "12:00",
  lunchEnd: "13:00",
  lunchBlockEnabled: true,
  maxHeavyPerDay: 3,
  bookingHorizonDays: 30,
  serviceRadiusKm: 50,
} as const;

// ─── Day labels ───

const DAY_LABELS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

// ─── Fetch helpers ───

export async function fetchAppointmentTypes(contractorId: string): Promise<AppointmentType[]> {
  const { data, error } = await supabase
    .from("booking_appointment_types")
    .select("*")
    .eq("contractor_id", contractorId)
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;
  return (data ?? []) as unknown as AppointmentType[];
}

export async function fetchAvailability(contractorId: string): Promise<AvailabilitySlot[]> {
  const { data, error } = await supabase
    .from("booking_availability")
    .select("*")
    .eq("contractor_id", contractorId)
    .eq("is_active", true);

  if (error) throw error;
  return (data ?? []) as unknown as AvailabilitySlot[];
}

export async function fetchBlackouts(contractorId: string, from: Date, to: Date): Promise<Blackout[]> {
  const { data, error } = await supabase
    .from("booking_blackouts")
    .select("*")
    .eq("contractor_id", contractorId)
    .gte("end_at", from.toISOString())
    .lte("start_at", to.toISOString());

  if (error) throw error;
  return (data ?? []) as unknown as Blackout[];
}

export async function fetchExistingBookings(contractorId: string, from: Date, to: Date): Promise<ExistingBooking[]> {
  const { data, error } = await supabase
    .from("smart_bookings")
    .select("scheduled_start, scheduled_end, buffer_before_minutes, buffer_after_minutes, travel_minutes_before")
    .eq("contractor_id", contractorId)
    .in("status", ["pending", "confirmed", "en_route"])
    .gte("scheduled_end", from.toISOString())
    .lte("scheduled_start", to.toISOString());

  if (error) throw error;
  return (data ?? []) as unknown as ExistingBooking[];
}

/**
 * Real busy windows from the contractor's connected calendar.
 * Only start/end times are returned — never event content.
 */
export async function fetchExternalBusy(
  contractorId: string,
  from: Date,
  to: Date,
): Promise<ExternalBusyWindow[]> {
  const { data, error } = await supabase.rpc("contractor_busy_windows", {
    p_contractor_id: contractorId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error) throw error;
  return (data ?? []) as unknown as ExternalBusyWindow[];
}

// ─── Time zone (all contractor hours are America/Toronto wall-clock) ───

export const BOOKING_TIME_ZONE = "America/Toronto";

interface ZonedParts { year: number; month: number; day: number; hour: number; minute: number; weekday: number }

const zonedFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOOKING_TIME_ZONE,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
});
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Wall-clock parts of an instant in America/Toronto (independent of the browser zone). */
export function zonedParts(date: Date): ZonedParts {
  const p: Record<string, string> = {};
  for (const part of zonedFormatter.formatToParts(date)) p[part.type] = part.value;
  return {
    year: Number(p.year), month: Number(p.month), day: Number(p.day),
    hour: Number(p.hour) % 24, minute: Number(p.minute), weekday: WEEKDAYS[p.weekday] ?? 0,
  };
}

/** YYYY-MM-DD of an instant in America/Toronto. */
export function zonedDayKey(date: Date): string {
  const p = zonedParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** UTC instant for a America/Toronto wall-clock time (DST-safe). */
export function zonedWallTime(year: number, month: number, day: number, hour: number, minute: number): Date {
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(new Date(guess));
    const seen = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    if (seen === target) break;
    guess += target - seen;
  }
  return new Date(guess);
}

// ─── Lunch Block Helper ───

function isInLunchBlock(slotStart: Date, slotEnd: Date): boolean {
  if (!SLOT_DEFAULTS.lunchBlockEnabled) return false;
  const [lsH, lsM] = SLOT_DEFAULTS.lunchStart.split(":").map(Number);
  const [leH, leM] = SLOT_DEFAULTS.lunchEnd.split(":").map(Number);
  const p = zonedParts(slotStart);
  const lunchStart = zonedWallTime(p.year, p.month, p.day, lsH, lsM);
  const lunchEnd = zonedWallTime(p.year, p.month, p.day, leH, leM);
  return slotStart < lunchEnd && slotEnd > lunchStart;
}

// ─── Core Slot Engine ───

/** Contractor-declared rules (contractor_booking_rules); server trigger enforces the evening cap. */
export interface BookingRules {
  eveningAfter: string; // "HH:MM" local; a visit ending after this makes the date an evening
  maxEveningsPerWeek: number | null; // per local week Mon–Sun; null = no cap
  visitCapacity: 1; // one visit at a time until per-representative calendars exist
  preferCompactSchedule: boolean;
  maxTravelMinutes?: number | null; // declared; null/undefined = not declared, never defaulted
}

export const DEFAULT_BOOKING_RULES: BookingRules = {
  eveningAfter: "19:00",
  maxEveningsPerWeek: null,
  visitCapacity: 1,
  preferCompactSchedule: false,
  maxTravelMinutes: null,
};

/** Every real source the engine reads. Busy windows and bookings carry times only. */
export interface SlotEngineData {
  availability: AvailabilitySlot[];
  blackouts: Blackout[];
  existingBookings: ExistingBooking[];
  allTypes: AppointmentType[];
  externalBusy: ExternalBusyWindow[];
  rules?: BookingRules;
}

/** Rules + held bookings (times only) through the SECURITY DEFINER RPC; readable by visitors. */
export async function fetchBookingConstraints(
  contractorId: string,
  from: Date,
  to: Date,
): Promise<{ rules: BookingRules; bookings: ExistingBooking[] }> {
  const { data, error } = await supabase.rpc("contractor_booking_constraints" as never, {
    p_contractor_id: contractorId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  } as never);
  if (error) throw error;
  const raw = (data ?? {}) as {
    evening_after?: string; max_evenings_per_week?: number | null; max_travel_minutes?: number | null;
    prefer_compact_schedule?: boolean; bookings?: ExistingBooking[];
  };
  return {
    rules: {
      eveningAfter: raw.evening_after ?? DEFAULT_BOOKING_RULES.eveningAfter,
      maxEveningsPerWeek: raw.max_evenings_per_week ?? null,
      visitCapacity: 1,
      preferCompactSchedule: raw.prefer_compact_schedule === true,
      maxTravelMinutes: typeof raw.max_travel_minutes === "number" ? raw.max_travel_minutes : null,
    },
    bookings: raw.bookings ?? [],
  };
}

const hhmm = (v: string) => { const [h, m] = v.split(":").map(Number); return h * 60 + (m || 0); };

/** Monday (YYYY-MM-DD) of the local America/Toronto week containing dayKey. */
export function localWeekKey(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d, 12));
  const back = (anchor.getUTCDay() + 6) % 7;
  anchor.setUTCDate(anchor.getUTCDate() - back);
  return anchor.toISOString().slice(0, 10);
}

/** True when a visit ending at `end` makes its local date an evening. */
export function isEveningVisit(start: Date, end: Date, eveningAfter: string): boolean {
  if (zonedDayKey(end) !== zonedDayKey(start)) return true;
  const p = zonedParts(end);
  return p.hour * 60 + p.minute > hhmm(eveningAfter);
}

export async function computeSmartSlots(input: SlotEngineInput): Promise<SlotEngineOutput> {
  const [availability, blackouts, constraints, allTypes, externalBusy] = await Promise.all([
    fetchAvailability(input.contractorId),
    fetchBlackouts(input.contractorId, input.dateFrom, input.dateTo),
    fetchBookingConstraints(input.contractorId, input.dateFrom, input.dateTo),
    fetchAppointmentTypes(input.contractorId),
    fetchExternalBusy(input.contractorId, input.dateFrom, input.dateTo),
  ]);
  return computeSlotsFromData(
    { availability, blackouts, existingBookings: constraints.bookings, allTypes, externalBusy, rules: constraints.rules },
    input,
  );
}

/**
 * Pure slot computation shared by every surface (public booking page, Clara).
 * Never invents a time: no availability row → no slot.
 */
export function computeSlotsFromData(
  data: SlotEngineData,
  input: SlotEngineInput,
  now: Date = new Date(),
): SlotEngineOutput {
  const { availability, blackouts, existingBookings, allTypes, externalBusy } = data;
  const rules = data.rules ?? DEFAULT_BOOKING_RULES;
  // Local dates already holding an evening visit, grouped by local week (Mon–Sun).
  const eveningDays = new Set<string>();
  const eveningsByWeek: Record<string, number> = {};
  for (const eb of existingBookings) {
    const st = new Date(eb.scheduled_start);
    if (!isEveningVisit(st, new Date(eb.scheduled_end), rules.eveningAfter)) continue;
    const k = zonedDayKey(st);
    if (eveningDays.has(k)) continue;
    eveningDays.add(k);
    eveningsByWeek[localWeekKey(k)] = (eveningsByWeek[localWeekKey(k)] ?? 0) + 1;
  }
  const appointmentType = allTypes.find((t) => t.id === input.appointmentTypeId && t.contractor_id === input.contractorId);
  if (!appointmentType) {
    return { slots: [], recommendedSlot: null, alternativeTypes: allTypes.slice(0, 3) };
  }

  const duration = appointmentType.duration_minutes;
  const bufferBefore = appointmentType.buffer_before_minutes;
  const bufferAfter = appointmentType.buffer_after_minutes;
  const travelPadding = appointmentType.travel_padding_minutes;
  const minNoticeMs = appointmentType.min_notice_hours * 3600000;
  const roundingMin = SLOT_DEFAULTS.roundingMinutes;
  const todayKey = zonedDayKey(now);

  const rawSlots: SlotCandidate[] = [];

  const fromP = zonedParts(input.dateFrom);
  const lastKey = zonedDayKey(input.dateTo);
  // Iterate Toronto calendar days (noon UTC anchor avoids DST edge effects).
  const day = new Date(Date.UTC(fromP.year, fromP.month - 1, fromP.day, 12));
  for (let guard = 0; guard < 400; guard++) {
    const y = day.getUTCFullYear();
    const m = day.getUTCMonth() + 1;
    const d = day.getUTCDate();
    const slotDay = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (slotDay > lastKey) break;
    const dayOfWeek = day.getUTCDay();
    day.setUTCDate(day.getUTCDate() + 1);

    const dayAvail = availability.find((a) => a.day_of_week === dayOfWeek && a.is_active !== false);
    if (!dayAvail) continue;

    const [startH, startM] = dayAvail.start_time.split(":").map(Number);
    const [endH, endM] = dayAvail.end_time.split(":").map(Number);
    const dayStart = zonedWallTime(y, m, d, startH, startM);
    const dayEnd = zonedWallTime(y, m, d, endH, endM);

    // Count heavy bookings already on this day
    const heavyOnDay = existingBookings.filter((eb) => zonedDayKey(new Date(eb.scheduled_start)) === slotDay).length;

    for (let t = dayStart.getTime(); t + duration * 60000 <= dayEnd.getTime(); t += roundingMin * 60000) {
      const slotStart = new Date(t);
      const slotEnd = new Date(t + duration * 60000);

      if (slotStart < input.dateFrom || slotStart > input.dateTo) continue;
      // Min notice check
      if (slotStart.getTime() - now.getTime() < minNoticeMs) continue;
      // Same-day check
      if (!appointmentType.allows_same_day && todayKey === slotDay) continue;
      // Lunch block check
      if (isInLunchBlock(slotStart, slotEnd)) continue;
      // Max daily heavy appointments
      if (duration >= 90 && heavyOnDay >= SLOT_DEFAULTS.maxHeavyPerDay) continue;

      // Expanded block with buffers and travel time
      const blockStart = new Date(slotStart.getTime() - (bufferBefore + travelPadding) * 60000);
      const blockEnd = new Date(slotEnd.getTime() + bufferAfter * 60000);

      const inBlackout = blackouts.some((b) => blockStart < new Date(b.end_at) && blockEnd > new Date(b.start_at));
      if (inBlackout) continue;

      const conflicts = existingBookings.some((eb) => {
        const ebStart = new Date(new Date(eb.scheduled_start).getTime() - (eb.buffer_before_minutes + eb.travel_minutes_before) * 60000);
        const ebEnd = new Date(new Date(eb.scheduled_end).getTime() + eb.buffer_after_minutes * 60000);
        return blockStart < ebEnd && blockEnd > ebStart;
      });
      if (conflicts) continue;

      // Real busy periods from the connected (or delegated) calendar
      const externallyBusy = externalBusy.some((w) => blockStart < new Date(w.ends_at) && blockEnd > new Date(w.starts_at));
      if (externallyBusy) continue;

      // Evening cap: a new evening date is offered only while the local week has room.
      if (
        rules.maxEveningsPerWeek !== null &&
        isEveningVisit(slotStart, slotEnd, rules.eveningAfter) &&
        !eveningDays.has(slotDay) &&
        (eveningsByWeek[localWeekKey(slotDay)] ?? 0) >= rules.maxEveningsPerWeek
      ) continue;
      // Explicit evening request: never fall back to afternoon slots.
      if (input.eveningOnly && !isEveningVisit(slotStart, slotEnd, rules.eveningAfter)) continue;

      let score = scoreSlot(slotStart, appointmentType, input, existingBookings, now);
      if (rules.preferCompactSchedule) {
        score = Math.min(100, score + compactBonus(blockStart, blockEnd, slotDay, existingBookings));
      }
      const badges = computeBadges(slotStart, score, input, existingBookings, now);

      rawSlots.push({
        start: slotStart,
        end: slotEnd,
        label: formatSlotLabel(slotStart, slotEnd),
        score,
        badges,
        travelMinutes: travelPadding,
        isRecommended: false,
        // No reliable ETA source feeds the engine yet: a declared max stays "unverified", no slot removed.
        travelCheck: classifyTravel(rules.maxTravelMinutes ?? null, null),
      });
    }
  }

  // Sort by score descending
  rawSlots.sort((a, b) => b.score - a.score);

  // Mark top slot
  if (rawSlots.length > 0) {
    rawSlots[0].isRecommended = true;
    if (!rawSlots[0].badges.includes("best_overall")) {
      rawSlots[0].badges.unshift("best_overall");
    }
  }

  // Limit per day
  const maxPerDay = appointmentType.max_daily_count;
  const dayCount: Record<string, number> = {};
  const filteredSlots = rawSlots.filter((s) => {
    const dayKey = zonedDayKey(s.start);
    dayCount[dayKey] = (dayCount[dayKey] || 0) + 1;
    return dayCount[dayKey] <= maxPerDay * 2;
  });

  // Re-sort chronologically for display, keeping score info
  filteredSlots.sort((a, b) => a.start.getTime() - b.start.getTime());

  return {
    slots: filteredSlots.slice(0, 50),
    recommendedSlot: rawSlots[0] ?? null,
    alternativeTypes: allTypes.filter((t) => t.id !== input.appointmentTypeId).slice(0, 3),
    fullEveningWeeks: rules.maxEveningsPerWeek === null
      ? []
      : Object.keys(eveningsByWeek).filter((w) => eveningsByWeek[w] >= (rules.maxEveningsPerWeek as number)).sort(),
  };
}

/**
 * Declared "least idle time" preference: favour slots whose buffered block
 * touches a held booking's buffered block on the same day. Uses only the
 * declared buffers/travel padding — never an invented travel time — and never
 * removes a slot.
 */
export function compactBonus(blockStart: Date, blockEnd: Date, dayKey: string, existing: ExistingBooking[]): number {
  let best = Infinity;
  for (const eb of existing) {
    if (zonedDayKey(new Date(eb.scheduled_start)) !== dayKey) continue;
    const ebStart = new Date(eb.scheduled_start).getTime() - (eb.buffer_before_minutes + eb.travel_minutes_before) * 60000;
    const ebEnd = new Date(eb.scheduled_end).getTime() + eb.buffer_after_minutes * 60000;
    const gap = blockStart.getTime() >= ebEnd ? blockStart.getTime() - ebEnd : ebStart - blockEnd.getTime();
    if (gap >= 0) best = Math.min(best, gap / 60000);
  }
  if (best <= 0) return 15;
  if (best <= 30) return 10;
  if (best <= 60) return 5;
  return 0;
}

// ─── Conversion-First Scoring ───

function scoreSlot(
  slotStart: Date,
  type: AppointmentType,
  input: SlotEngineInput,
  existing: ExistingBooking[],
  now: Date = new Date(),
): number {
  let score = 50;
  const zp = zonedParts(slotStart);
  const hour = zp.hour;

  // Morning prime time — highest closing probability
  if (hour >= 8 && hour <= 10) score += 12;
  else if (hour >= 10 && hour < 12) score += 8;
  else if (hour >= 13 && hour <= 15) score += 6;
  else if (hour >= 15 && hour < 17) score += 3;

  // Urgency boost
  if (input.urgencyLevel === "urgent" || input.urgencyLevel === "emergency") {
    const hoursFromNow = (slotStart.getTime() - now.getTime()) / 3600000;
    if (hoursFromNow < 6) score += 25;
    else if (hoursFromNow < 24) score += 18;
    else if (hoursFromNow < 48) score += 10;
    else if (hoursFromNow < 72) score += 5;
  }

  // Day clustering — operational efficiency
  const slotDay = zonedDayKey(slotStart);
  const sameDayBookings = existing.filter(
    (eb) => zonedDayKey(new Date(eb.scheduled_start)) === slotDay
  ).length;
  if (sameDayBookings > 0 && sameDayBookings < 4) score += 4 * sameDayBookings;

  // Adjacent slot bonus — reduced travel
  const adjacentBonus = existing.some((eb) => {
    const ebEnd = new Date(eb.scheduled_end);
    const gap = Math.abs(slotStart.getTime() - ebEnd.getTime()) / 60000;
    return gap > 0 && gap < 90;
  });
  if (adjacentBonus) score += 8;

  // DNA compatibility
  if (input.dnaMatchScore) {
    if (input.dnaMatchScore > 80) score += 10;
    else if (input.dnaMatchScore > 60) score += 5;
  }

  // Day-of-week preferences
  const dayOfWeek = zp.weekday;
  if (dayOfWeek >= 1 && dayOfWeek <= 4) score += 3; // Mon-Thu slightly preferred
  if (dayOfWeek === 5 && hour >= 15) score -= 5; // Late Friday penalty
  if (dayOfWeek === 6) score -= 4; // Saturday slight penalty
  if (dayOfWeek === 0) score -= 8; // Sunday penalty

  // Sooner is better for non-urgent (reduces no-show)
  const daysFromNow = (slotStart.getTime() - now.getTime()) / 86400000;
  if (daysFromNow <= 3) score += 5;
  else if (daysFromNow <= 7) score += 2;
  else if (daysFromNow > 14) score -= 3;

  return Math.max(0, Math.min(100, score));
}

function computeBadges(
  slotStart: Date,
  score: number,
  input: SlotEngineInput,
  existing: ExistingBooking[],
  now: Date = new Date(),
): SlotBadge[] {
  const badges: SlotBadge[] = [];
  const hoursFromNow = (slotStart.getTime() - now.getTime()) / 3600000;

  if (hoursFromNow < 24) badges.push("fastest");

  if (input.urgencyLevel === "urgent" || input.urgencyLevel === "emergency") {
    if (hoursFromNow < 48) badges.push("urgency_optimized");
  }

  // Reduced travel — adjacent to existing booking
  const slotDay = zonedDayKey(slotStart);
  const hasAdjacent = existing.some((eb) => {
    const ebDay = zonedDayKey(new Date(eb.scheduled_start));
    if (ebDay !== slotDay) return false;
    const ebEnd = new Date(eb.scheduled_end);
    const gap = Math.abs(slotStart.getTime() - ebEnd.getTime()) / 60000;
    return gap > 0 && gap < 90;
  });
  if (hasAdjacent) badges.push("reduced_travel");

  if (score >= 78) badges.push("most_convenient");

  return badges;
}

function formatSlotLabel(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: BOOKING_TIME_ZONE });
  const dayLabel = DAY_LABELS_FR[zonedParts(start).weekday];
  const dateStr = start.toLocaleDateString("fr-CA", { day: "numeric", month: "long", timeZone: BOOKING_TIME_ZONE });
  return `${dayLabel} ${dateStr}, ${fmt(start)} – ${fmt(end)}`;
}

// ─── Default appointment type templates ───

export const DEFAULT_APPOINTMENT_TEMPLATES: Partial<AppointmentType>[] = [
  {
    title: "Soumission gratuite",
    slug: "soumission-gratuite",
    category: "estimate",
    short_description: "Évaluation sur place sans frais ni engagement",
    duration_minutes: 90,
    buffer_before_minutes: 15,
    buffer_after_minutes: 15,
    travel_padding_minutes: 20,
    color: "#3B82F6",
    icon: "clipboard-check",
    price_type: "free",
    price_amount: 0,
    is_free: true,
    location_mode: "client_address",
    availability_mode: "standard",
    allows_same_day: false,
    min_notice_hours: 12,
    max_daily_count: 4,
    sort_order: 0,
  },
  {
    title: "Expertise approfondie",
    slug: "expertise",
    category: "diagnostic",
    short_description: "Analyse complète avec rapport détaillé",
    duration_minutes: 180,
    buffer_before_minutes: 15,
    buffer_after_minutes: 15,
    travel_padding_minutes: 25,
    color: "#8B5CF6",
    icon: "search",
    price_type: "starting_from",
    price_amount: 15000,
    is_free: false,
    location_mode: "client_address",
    availability_mode: "standard",
    allows_same_day: false,
    min_notice_hours: 24,
    max_daily_count: 2,
    sort_order: 1,
  },
  {
    title: "Visite express",
    slug: "visite-express",
    category: "quick_visit",
    short_description: "Visite rapide d'évaluation sur place",
    duration_minutes: 45,
    buffer_before_minutes: 10,
    buffer_after_minutes: 10,
    travel_padding_minutes: 15,
    color: "#F97316",
    icon: "zap",
    price_type: "free",
    price_amount: 0,
    is_free: true,
    location_mode: "client_address",
    availability_mode: "standard",
    allows_same_day: true,
    min_notice_hours: 4,
    max_daily_count: 6,
    sort_order: 2,
  },
  {
    title: "Consultation vidéo",
    slug: "consultation-video",
    category: "consult",
    short_description: "Discussion rapide par appel vidéo",
    duration_minutes: 30,
    buffer_before_minutes: 5,
    buffer_after_minutes: 5,
    travel_padding_minutes: 0,
    color: "#10B981",
    icon: "video",
    price_type: "free",
    price_amount: 0,
    is_free: true,
    location_mode: "video",
    availability_mode: "standard",
    allows_same_day: true,
    min_notice_hours: 2,
    max_daily_count: 6,
    sort_order: 3,
  },
  {
    title: "Urgence prioritaire",
    slug: "urgence",
    category: "emergency",
    short_description: "Intervention rapide pour situation urgente",
    duration_minutes: 60,
    buffer_before_minutes: 10,
    buffer_after_minutes: 10,
    travel_padding_minutes: 15,
    color: "#EF4444",
    icon: "alert-triangle",
    price_type: "starting_from",
    price_amount: 20000,
    is_free: false,
    location_mode: "client_address",
    availability_mode: "emergency",
    allows_same_day: true,
    min_notice_hours: 2,
    max_daily_count: 3,
    sort_order: 4,
  },
  {
    title: "Suivi / 2e visite",
    slug: "visite-suivi",
    category: "follow_up",
    short_description: "Deuxième visite ou vérification après travaux",
    duration_minutes: 45,
    buffer_before_minutes: 10,
    buffer_after_minutes: 10,
    travel_padding_minutes: 15,
    color: "#F59E0B",
    icon: "refresh-cw",
    price_type: "free",
    price_amount: 0,
    is_free: true,
    location_mode: "client_address",
    availability_mode: "standard",
    allows_same_day: false,
    min_notice_hours: 12,
    max_daily_count: 4,
    sort_order: 5,
  },
  {
    title: "Rencontre condo / gestionnaire",
    slug: "rencontre-condo",
    category: "condo",
    short_description: "Rencontre pour projets de copropriété ou syndicat",
    duration_minutes: 60,
    buffer_before_minutes: 15,
    buffer_after_minutes: 15,
    travel_padding_minutes: 20,
    color: "#06B6D4",
    icon: "building",
    price_type: "free",
    price_amount: 0,
    is_free: true,
    location_mode: "client_address",
    availability_mode: "standard",
    allows_same_day: false,
    min_notice_hours: 24,
    max_daily_count: 3,
    sort_order: 6,
  },
];
