/**
 * Google Calendar helpers (server-only).
 *
 * Reads free/busy windows and writes confirmed UNPRO appointments.
 * Never reads, stores or returns event titles, descriptions or attendees:
 * only busy windows leave this module.
 */
import { decryptCalendarToken, encryptCalendarToken } from "./calendarOAuthState.ts";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export interface BusyWindow {
  start: string;
  end: string;
}

export class CalendarAuthRevoked extends Error {
  constructor(message = "calendar_access_revoked") {
    super(message);
    this.name = "CalendarAuthRevoked";
  }
}

export interface GoogleConnectionRow {
  id: string;
  user_id: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
}

interface SupabaseLike {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: unknown }>;
    };
  };
}

/**
 * Returns a usable access token, refreshing it (and persisting the new one)
 * when it is expired or about to expire.
 */
export async function getGoogleAccessToken(
  admin: SupabaseLike,
  connection: GoogleConnectionRow,
  secret: string,
): Promise<string> {
  const expiresAt = connection.expires_at ? Date.parse(connection.expires_at) : 0;
  const stillValid = expiresAt - Date.now() > 120_000;
  const currentToken = await decryptCalendarToken(connection.access_token_encrypted, secret);
  if (stillValid && currentToken) return currentToken;

  const refreshToken = await decryptCalendarToken(connection.refresh_token_encrypted, secret);
  if (!refreshToken) throw new CalendarAuthRevoked("calendar_refresh_token_missing");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  const body = await res.json().catch(() => ({})) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!res.ok || !body.access_token) {
    // invalid_grant means the user revoked UNPRO's access in their Google account.
    if (body.error === "invalid_grant") throw new CalendarAuthRevoked();
    throw new Error(`google_token_refresh_failed:${res.status}:${body.error ?? "unknown"}`);
  }

  const newExpiry = new Date(Date.now() + (body.expires_in ?? 3600) * 1000).toISOString();
  await admin.from("calendar_connections").update({
    access_token_encrypted: await encryptCalendarToken(body.access_token, secret),
    expires_at: newExpiry,
    connection_status: "connected",
    last_error_message: null,
  }).eq("id", connection.id);

  return body.access_token;
}

/** Busy windows only — Google's freeBusy endpoint never returns event details. */
export async function fetchGoogleBusy(
  accessToken: string,
  timeMin: string,
  timeMax: string,
  calendarId = "primary",
): Promise<BusyWindow[]> {
  const res = await fetch(`${CALENDAR_API}/freeBusy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: "America/Toronto",
      items: [{ id: calendarId }],
    }),
  });
  const body = await res.json().catch(() => ({})) as {
    calendars?: Record<string, { busy?: BusyWindow[]; errors?: { reason?: string }[] }>;
    error?: { message?: string };
  };
  if (res.status === 401 || res.status === 403) throw new CalendarAuthRevoked();
  if (!res.ok) throw new Error(`google_freebusy_failed:${res.status}:${body.error?.message ?? ""}`);

  const calendar = body.calendars?.[calendarId];
  if (calendar?.errors?.length) {
    throw new Error(`google_freebusy_calendar_error:${calendar.errors[0]?.reason ?? "unknown"}`);
  }
  return (calendar?.busy ?? []).filter((w) => w.start && w.end);
}

export interface PushEventInput {
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
}

/** Writes a confirmed UNPRO appointment into the contractor's calendar. */
export async function pushGoogleEvent(
  accessToken: string,
  event: PushEventInput,
  calendarId = "primary",
): Promise<string | null> {
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description ?? undefined,
        location: event.location ?? undefined,
        start: { dateTime: event.start, timeZone: "America/Toronto" },
        end: { dateTime: event.end, timeZone: "America/Toronto" },
        source: { title: "UNPRO", url: "https://unpro.ca" },
      }),
    },
  );
  if (res.status === 401 || res.status === 403) throw new CalendarAuthRevoked();
  const body = await res.json().catch(() => ({})) as { id?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(`google_event_insert_failed:${res.status}:${body.error?.message ?? ""}`);
  return body.id ?? null;
}

/**
 * Minimal ICS busy extraction: keeps only DTSTART/DTEND pairs.
 * Titles and descriptions are ignored by construction.
 */
export function parseIcsBusyWindows(ics: string, from: Date, to: Date): BusyWindow[] {
  const unfolded = ics.replace(/\r\n[ \t]/g, "").split(/\r?\n/);
  const windows: BusyWindow[] = [];
  let start: Date | null = null;
  let end: Date | null = null;
  let inEvent = false;

  const parseIcsDate = (raw: string): Date | null => {
    const value = raw.trim();
    const utc = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
    if (utc) {
      return new Date(Date.UTC(+utc[1], +utc[2] - 1, +utc[3], +utc[4], +utc[5], +utc[6]));
    }
    const dateOnly = value.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (dateOnly) {
      return new Date(Date.UTC(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3]));
    }
    return null;
  };

  for (const line of unfolded) {
    if (line.startsWith("BEGIN:VEVENT")) {
      inEvent = true;
      start = null;
      end = null;
      continue;
    }
    if (!inEvent) continue;
    if (line.startsWith("END:VEVENT")) {
      if (start && end && end > start && end > from && start < to) {
        windows.push({ start: start.toISOString(), end: end.toISOString() });
      }
      inEvent = false;
      continue;
    }
    if (line.startsWith("DTSTART")) start = parseIcsDate(line.slice(line.indexOf(":") + 1));
    if (line.startsWith("DTEND")) end = parseIcsDate(line.slice(line.indexOf(":") + 1));
  }

  return windows;
}
