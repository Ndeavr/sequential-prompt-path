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
}

export type SlotBadge =
  | "best_overall"
  | "fastest"
  | "most_convenient"
  | "urgency_optimized"
  | "reduced_travel"
  | "recommended_by_alex";

export interface SlotEngineInput {
  contractorId: string;
  appointmentTypeId: string;
  dateFrom: Date;
  dateTo: Date;
  clientLat?: number;
  clientLng?: number;
  urgencyLevel?: string;
  dnaMatchScore?: number;
}

export interface SlotEngineOutput {
  slots: SlotCandidate[];
  recommendedSlot: SlotCandidate | null;
  alternativeTypes: AppointmentType[];
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

// ─── Lunch Block Helper ───

function isInLunchBlock(slotStart: Date, slotEnd: Date): boolean {
  if (!SLOT_DEFAULTS.lunchBlockEnabled) return false;
  const [lsH, lsM] = SLOT_DEFAULTS.lunchStart.split(":").map(Number);
  const [leH, leM] = SLOT_DEFAULTS.lunchEnd.split(":").map(Number);

  const lunchStart = new Date(slotStart);
  lunchStart.setHours(lsH, lsM, 0, 0);
  const lunchEnd = new Date(slotStart);
  lunchEnd.setHours(leH, leM, 0, 0);

  return slotStart < lunchEnd && slotEnd > lunchStart;
}

// ─── Core Slot Engine ───

export async function computeSmartSlots(input: SlotEngineInput): Promise<SlotEngineOutput> {
  const [availability, blackouts, existingBookings, allTypes] = await Promise.all([
    fetchAvailability(input.contractorId),
    fetchBlackouts(input.contractorId, input.dateFrom, input.dateTo),
    fetchExistingBookings(input.contractorId, input.dateFrom, input.dateTo),
    fetchAppointmentTypes(input.contractorId),
  ]);

  const appointmentType = allTypes.find((t) => t.id === input.appointmentTypeId);
  if (!appointmentType) {
    return { slots: [], recommendedSlot: null, alternativeTypes: allTypes.slice(0, 3) };
  }

  const duration = appointmentType.duration_minutes;
  const bufferBefore = appointmentType.buffer_before_minutes;
  const bufferAfter = appointmentType.buffer_after_minutes;
  const travelPadding = appointmentType.travel_padding_minutes;
  const minNoticeMs = appointmentType.min_notice_hours * 3600000;
  const roundingMin = SLOT_DEFAULTS.roundingMinutes;
  const now = new Date();

  const rawSlots: SlotCandidate[] = [];

  const currentDate = new Date(input.dateFrom);
  while (currentDate <= input.dateTo) {
    const dayOfWeek = currentDate.getDay();
    const dayAvail = availability.find((a) => a.day_of_week === dayOfWeek);

    if (!dayAvail) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    const [startH, startM] = dayAvail.start_time.split(":").map(Number);
    const [endH, endM] = dayAvail.end_time.split(":").map(Number);

    const dayStart = new Date(currentDate);
    dayStart.setHours(startH, startM, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(endH, endM, 0, 0);

    // Count heavy bookings already on this day
    const slotDay = currentDate.toISOString().split("T")[0];
    const heavyOnDay = existingBookings.filter((eb) => {
      const ebDay = new Date(eb.scheduled_start).toISOString().split("T")[0];
      return ebDay === slotDay;
    }).length;

    const cursor = new Date(dayStart);
    while (cursor.getTime() + duration * 60000 <= dayEnd.getTime()) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);

      // Min notice check
      if (slotStart.getTime() - now.getTime() < minNoticeMs) {
        cursor.setMinutes(cursor.getMinutes() + roundingMin);
        continue;
      }

      // Same-day check
      if (!appointmentType.allows_same_day) {
        const todayStr = now.toISOString().split("T")[0];
        if (todayStr === slotDay) {
          cursor.setMinutes(cursor.getMinutes() + roundingMin);
          continue;
        }
      }

      // Lunch block check
      if (isInLunchBlock(slotStart, slotEnd)) {
        cursor.setMinutes(cursor.getMinutes() + roundingMin);
        continue;
      }

      // Max daily heavy appointments
      if (duration >= 90 && heavyOnDay >= SLOT_DEFAULTS.maxHeavyPerDay) {
        cursor.setMinutes(cursor.getMinutes() + roundingMin);
        continue;
      }

      // Expanded block with buffers
      const blockStart = new Date(slotStart.getTime() - (bufferBefore + travelPadding) * 60000);
      const blockEnd = new Date(slotEnd.getTime() + bufferAfter * 60000);

      // Check blackouts
      const inBlackout = blackouts.some((b) => {
        const bStart = new Date(b.start_at);
        const bEnd = new Date(b.end_at);
        return blockStart < bEnd && blockEnd > bStart;
      });

      if (inBlackout) {
        cursor.setMinutes(cursor.getMinutes() + roundingMin);
        continue;
      }

      // Check existing bookings
      const conflicts = existingBookings.some((eb) => {
        const ebStart = new Date(new Date(eb.scheduled_start).getTime() - (eb.buffer_before_minutes + eb.travel_minutes_before) * 60000);
        const ebEnd = new Date(new Date(eb.scheduled_end).getTime() + eb.buffer_after_minutes * 60000);
        return blockStart < ebEnd && blockEnd > ebStart;
      });

      if (conflicts) {
        cursor.setMinutes(cursor.getMinutes() + roundingMin);
        continue;
      }

      const score = scoreSlot(slotStart, appointmentType, input, existingBookings);
      const badges = computeBadges(slotStart, score, input, existingBookings);

      rawSlots.push({
        start: slotStart,
        end: slotEnd,
        label: formatSlotLabel(slotStart, slotEnd),
        score,
        badges,
        travelMinutes: travelPadding,
        isRecommended: false,
      });

      cursor.setMinutes(cursor.getMinutes() + roundingMin);
    }

    currentDate.setDate(currentDate.getDate() + 1);
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
    const dayKey = s.start.toISOString().split("T")[0];
    dayCount[dayKey] = (dayCount[dayKey] || 0) + 1;
    return dayCount[dayKey] <= maxPerDay * 2;
  });

  // Re-sort chronologically for display, keeping score info
  filteredSlots.sort((a, b) => a.start.getTime() - b.start.getTime());

  return {
    slots: filteredSlots.slice(0, 50),
    recommendedSlot: rawSlots[0] ?? null,
    alternativeTypes: allTypes.filter((t) => t.id !== input.appointmentTypeId).slice(0, 3),
  };
}

// ─── Conversion-First Scoring ───

function scoreSlot(
  slotStart: Date,
  type: AppointmentType,
  input: SlotEngineInput,
  existing: ExistingBooking[]
): number {
  let score = 50;
  const hour = slotStart.getHours();

  // Morning prime time — highest closing probability
  if (hour >= 8 && hour <= 10) score += 12;
  else if (hour >= 10 && hour < 12) score += 8;
  else if (hour >= 13 && hour <= 15) score += 6;
  else if (hour >= 15 && hour < 17) score += 3;

  // Urgency boost
  if (input.urgencyLevel === "urgent" || input.urgencyLevel === "emergency") {
    const hoursFromNow = (slotStart.getTime() - Date.now()) / 3600000;
    if (hoursFromNow < 6) score += 25;
    else if (hoursFromNow < 24) score += 18;
    else if (hoursFromNow < 48) score += 10;
    else if (hoursFromNow < 72) score += 5;
  }

  // Day clustering — operational efficiency
  const slotDay = slotStart.toISOString().split("T")[0];
  const sameDayBookings = existing.filter(
    (eb) => new Date(eb.scheduled_start).toISOString().split("T")[0] === slotDay
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
  const dayOfWeek = slotStart.getDay();
  if (dayOfWeek >= 1 && dayOfWeek <= 4) score += 3; // Mon-Thu slightly preferred
  if (dayOfWeek === 5 && hour >= 15) score -= 5; // Late Friday penalty
  if (dayOfWeek === 6) score -= 4; // Saturday slight penalty
  if (dayOfWeek === 0) score -= 8; // Sunday penalty

  // Sooner is better for non-urgent (reduces no-show)
  const daysFromNow = (slotStart.getTime() - Date.now()) / 86400000;
  if (daysFromNow <= 3) score += 5;
  else if (daysFromNow <= 7) score += 2;
  else if (daysFromNow > 14) score -= 3;

  return Math.max(0, Math.min(100, score));
}

function computeBadges(
  slotStart: Date,
  score: number,
  input: SlotEngineInput,
  existing: ExistingBooking[]
): SlotBadge[] {
  const badges: SlotBadge[] = [];
  const hoursFromNow = (slotStart.getTime() - Date.now()) / 3600000;

  if (hoursFromNow < 24) badges.push("fastest");

  if (input.urgencyLevel === "urgent" || input.urgencyLevel === "emergency") {
    if (hoursFromNow < 48) badges.push("urgency_optimized");
  }

  // Reduced travel — adjacent to existing booking
  const slotDay = slotStart.toISOString().split("T")[0];
  const hasAdjacent = existing.some((eb) => {
    const ebDay = new Date(eb.scheduled_start).toISOString().split("T")[0];
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
    d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit", hour12: false });
  const dayLabel = DAY_LABELS_FR[start.getDay()];
  const dateStr = start.toLocaleDateString("fr-CA", { day: "numeric", month: "long" });
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
