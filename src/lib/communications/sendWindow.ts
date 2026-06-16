/**
 * UNPRO — Frontend mirror of the outbound send-window policy.
 * Used by admin UI to display "Fenêtre ouverte / fermée" + next opening time.
 * The authoritative copy lives in `supabase/functions/_shared/sendWindow.ts`
 * and the DB table `outbound_send_window_policy`.
 */
import { supabase } from "@/integrations/supabase/client";

export type Channel = "sms" | "email" | "call" | "push";

export interface SendWindowRow {
  weekday: number; // 0=Sun..6=Sat
  start_minute: number;
  end_minute: number;
  enabled: boolean;
}

function montrealParts(at: Date): { weekday: number; minutesOfDay: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montreal",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    weekday: wdMap[get("weekday")] ?? 0,
    minutesOfDay: (parseInt(get("hour"), 10) || 0) * 60 + (parseInt(get("minute"), 10) || 0),
  };
}

export async function loadWindows(channel: Channel): Promise<SendWindowRow[]> {
  const { data } = await (supabase as any)
    .from("outbound_send_window_policy")
    .select("weekday,start_minute,end_minute,enabled")
    .eq("channel", channel)
    .order("weekday");
  return (data as SendWindowRow[]) ?? [];
}

export function isWithinSendWindow(rows: SendWindowRow[], at: Date = new Date()): boolean {
  const { weekday, minutesOfDay } = montrealParts(at);
  const row = rows.find((r) => r.weekday === weekday);
  if (!row || !row.enabled) return false;
  return minutesOfDay >= row.start_minute && minutesOfDay < row.end_minute;
}

export function describeNextOpening(rows: SendWindowRow[], at: Date = new Date()): {
  open: boolean;
  label: string;
} {
  const open = isWithinSendWindow(rows, at);
  if (open) return { open: true, label: "Fenêtre ouverte" };
  // Find next opening within 8 days
  for (let d = 0; d < 8; d++) {
    const probe = new Date(at.getTime() + d * 86400000);
    const { weekday, minutesOfDay } = montrealParts(probe);
    const row = rows.find((r) => r.weekday === weekday);
    if (!row || !row.enabled || row.end_minute <= row.start_minute) continue;
    if (d === 0 && minutesOfDay >= row.end_minute) continue;
    const startMin = d === 0 && minutesOfDay < row.start_minute ? row.start_minute : row.start_minute;
    const hh = String(Math.floor(startMin / 60)).padStart(2, "0");
    const mm = String(startMin % 60).padStart(2, "0");
    const dayLabel =
      d === 0 ? "aujourd'hui" :
      d === 1 ? "demain" :
      new Intl.DateTimeFormat("fr-CA", { timeZone: "America/Montreal", weekday: "long" }).format(probe);
    return { open: false, label: `Reprise ${dayLabel} à ${hh}h${mm}` };
  }
  return { open: false, label: "Fenêtre fermée" };
}

export function formatRange(row: SendWindowRow): string {
  if (!row.enabled || row.end_minute <= row.start_minute) return "Bloqué";
  const fmt = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}h${String(m % 60).padStart(2, "0")}`;
  return `${fmt(row.start_minute)} → ${fmt(row.end_minute)}`;
}

export const WEEKDAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
