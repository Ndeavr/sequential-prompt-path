// PROTECTED — Canonical outbound send-window policy.
// EVERY outbound prospection / followup message MUST gate through assertSendAllowed().
// Transactional messages (OTP, reset, payment/booking confirmation, direct replies,
// system alerts) bypass the window. Founder Mode also bypasses.
//
// Rules (default, mirrored in DB table `outbound_send_window_policy`):
//   SMS   — Mon-Fri 09:00-17:00, Sat 10:00-13:00, Sun blocked
//   Email — Mon-Fri 07:00-18:00, Sat 09:00-12:00, Sun blocked
// All times America/Montreal.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type Channel = "sms" | "email" | "call" | "push";
export type MessageClass =
  | "prospection"
  | "followup"
  | "transactional"
  | "reply"
  | "system_alert";

export const TRANSACTIONAL_CLASSES: ReadonlySet<MessageClass> = new Set([
  "transactional",
  "reply",
  "system_alert",
]);

export function isTransactional(cls: MessageClass): boolean {
  return TRANSACTIONAL_CLASSES.has(cls);
}

// Default (fallback) windows, used if DB table unreachable.
const DEFAULT_WINDOWS: Record<Channel, Array<{ weekday: number; start: number; end: number; enabled: boolean }>> = {
  sms: [
    { weekday: 0, start: 0,   end: 0,    enabled: false },
    { weekday: 1, start: 540, end: 1020, enabled: true  },
    { weekday: 2, start: 540, end: 1020, enabled: true  },
    { weekday: 3, start: 540, end: 1020, enabled: true  },
    { weekday: 4, start: 540, end: 1020, enabled: true  },
    { weekday: 5, start: 540, end: 1020, enabled: true  },
    { weekday: 6, start: 600, end: 780,  enabled: true  },
  ],
  email: [
    { weekday: 0, start: 0,   end: 0,    enabled: false },
    { weekday: 1, start: 420, end: 1080, enabled: true  },
    { weekday: 2, start: 420, end: 1080, enabled: true  },
    { weekday: 3, start: 420, end: 1080, enabled: true  },
    { weekday: 4, start: 420, end: 1080, enabled: true  },
    { weekday: 5, start: 420, end: 1080, enabled: true  },
    { weekday: 6, start: 540, end: 720,  enabled: true  },
  ],
  call: [
    { weekday: 0, start: 0,   end: 0,    enabled: false },
    { weekday: 1, start: 540, end: 1020, enabled: true  },
    { weekday: 2, start: 540, end: 1020, enabled: true  },
    { weekday: 3, start: 540, end: 1020, enabled: true  },
    { weekday: 4, start: 540, end: 1020, enabled: true  },
    { weekday: 5, start: 540, end: 1020, enabled: true  },
    { weekday: 6, start: 600, end: 780,  enabled: true  },
  ],
  push: [
    { weekday: 0, start: 540, end: 1260, enabled: true },
    { weekday: 1, start: 480, end: 1260, enabled: true },
    { weekday: 2, start: 480, end: 1260, enabled: true },
    { weekday: 3, start: 480, end: 1260, enabled: true },
    { weekday: 4, start: 480, end: 1260, enabled: true },
    { weekday: 5, start: 480, end: 1260, enabled: true },
    { weekday: 6, start: 540, end: 1260, enabled: true },
  ],
};

function montrealParts(at: Date): { weekday: number; minutesOfDay: number; ymd: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montreal",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = wdMap[get("weekday")] ?? 0;
  const h = parseInt(get("hour"), 10) || 0;
  const m = parseInt(get("minute"), 10) || 0;
  return {
    weekday,
    minutesOfDay: h * 60 + m,
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

type WindowRow = { weekday: number; start: number; end: number; enabled: boolean };

async function loadWindows(channel: Channel): Promise<WindowRow[]> {
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await sb
      .from("outbound_send_window_policy")
      .select("weekday,start_minute,end_minute,enabled")
      .eq("channel", channel);
    if (error || !data || data.length === 0) return DEFAULT_WINDOWS[channel];
    return data.map((r: any) => ({
      weekday: r.weekday,
      start: r.start_minute,
      end: r.end_minute,
      enabled: r.enabled,
    }));
  } catch {
    return DEFAULT_WINDOWS[channel];
  }
}

export async function isWithinSendWindow(channel: Channel, at: Date = new Date()): Promise<boolean> {
  const rows = await loadWindows(channel);
  const { weekday, minutesOfDay } = montrealParts(at);
  const row = rows.find((r) => r.weekday === weekday);
  if (!row || !row.enabled) return false;
  return minutesOfDay >= row.start && minutesOfDay < row.end;
}

// Convert "YYYY-MM-DD" + minutesOfDay (Montreal local) into a real UTC Date.
function montrealLocalToUtc(ymd: string, minutes: number): Date {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  // Build a date string interpreted as Montreal local by probing the offset.
  // Trick: format the candidate in Montreal then read back the offset.
  const probe = new Date(`${ymd}T${hh}:${mm}:00Z`);
  const tzName = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Montreal",
    timeZoneName: "shortOffset",
  }).formatToParts(probe).find((p) => p.type === "timeZoneName")?.value ?? "GMT-5";
  // tzName like "GMT-4" or "GMT-5"
  const offsetHours = parseInt(tzName.replace("GMT", ""), 10) || -5;
  const sign = offsetHours < 0 ? "-" : "+";
  const abs = Math.abs(offsetHours);
  const off = `${sign}${String(abs).padStart(2, "0")}:00`;
  return new Date(`${ymd}T${hh}:${mm}:00${off}`);
}

export async function nextAllowedSendAt(channel: Channel, from: Date = new Date()): Promise<Date> {
  const rows = await loadWindows(channel);
  for (let d = 0; d < 8; d++) {
    const probe = new Date(from.getTime() + d * 86400000);
    const { weekday, minutesOfDay, ymd } = montrealParts(probe);
    const row = rows.find((r) => r.weekday === weekday);
    if (!row || !row.enabled || row.end <= row.start) continue;
    if (d === 0) {
      if (minutesOfDay < row.start) return montrealLocalToUtc(ymd, row.start);
      if (minutesOfDay < row.end) return from; // already open
      continue;
    }
    return montrealLocalToUtc(ymd, row.start);
  }
  // Fallback: 24h later
  return new Date(from.getTime() + 86400000);
}

export type SendAllowed =
  | { ok: true }
  | { ok: false; reason: "OUT_OF_WINDOW"; next_send_at: string };

export async function assertSendAllowed(opts: {
  channel: Channel;
  messageClass: MessageClass;
  founderBypass?: boolean;
  at?: Date;
}): Promise<SendAllowed> {
  if (isTransactional(opts.messageClass)) return { ok: true };
  if (opts.founderBypass) return { ok: true };
  const ok = await isWithinSendWindow(opts.channel, opts.at);
  if (ok) return { ok: true };
  const next = await nextAllowedSendAt(opts.channel, opts.at);
  return { ok: false, reason: "OUT_OF_WINDOW", next_send_at: next.toISOString() };
}

export async function isFounderModeActive(): Promise<boolean> {
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await sb
      .from("launch_mode_state")
      .select("founder_mode_enabled,mode")
      .eq("id", true)
      .maybeSingle();
    if (!data) return false;
    return !!data.founder_mode_enabled && data.mode !== "first_customer_acquired";
  } catch {
    return false;
  }
}
