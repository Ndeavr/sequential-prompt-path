/**
 * founder-meeting — public /commission meeting booking on the founder's PRIMARY Google calendar.
 *
 * Uses the existing server-side Google connection (tokens decrypted/refreshed only through
 * _shared/googleCalendar.ts). The calendar id is the connection's own account (its primary
 * calendar); the connection's selected calendar (used by a contractor delegation) is never
 * read or changed here, and a Google auth failure never marks the shared connection revoked.
 * Only busy windows are read; no event detail ever leaves this function.
 *
 * Actions: { action: "slots" } → 3 next free 90-min slots, or mode "unavailable".
 *          { action: "book", ... } → DB hold (unique per slot) → FreeBusy recheck → event insert
 *          → status "confirmed" only after Google success AND DB persistence.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { bookingEventId, CalendarAuthRevoked, fetchGoogleBusy, getGoogleAccessToken, isGoogleAuthFailure } from "../_shared/googleCalendar.ts";
import { HORIZON_DAYS, isValidCandidate, pickFreeSlots, TZ, type Busy } from "./slots.ts";

const CONNECTION_ID = Deno.env.get("FOUNDER_CALENDAR_CONNECTION_ID") || "bae0ae33-3ee0-411a-91e4-2dd4e70bfd54";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const ACTIVE = ["holding", "confirmed", "calendar_unknown"];
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// deno-lint-ignore no-explicit-any
type Admin = any;

class Unavailable extends Error {}

async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Access token + primary calendar id of the founder connection, or Unavailable. */
async function founderCalendar(admin: Admin): Promise<{ token: string; calendarId: string }> {
  const { data: c, error } = await admin.from("calendar_connections")
    .select("id, user_id, provider, provider_account_email, connection_status, access_token_encrypted, refresh_token_encrypted, expires_at, scopes_json")
    .eq("id", CONNECTION_ID).maybeSingle();
  if (error || !c) throw new Unavailable("connection_missing");
  if (c.provider !== "google" || c.connection_status !== "connected") throw new Unavailable("connection_not_connected");
  if (!JSON.stringify(c.scopes_json ?? "").includes("calendar.events")) throw new Unavailable("scope_missing");
  const calendarId = String(c.provider_account_email ?? "").trim().toLowerCase();
  if (!calendarId.includes("@")) throw new Unavailable("calendar_id_missing");
  const secret = Deno.env.get("CALENDAR_TOKEN_ENCRYPTION_KEY") || Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") || "";
  try {
    return { token: await getGoogleAccessToken(admin, c, secret), calendarId };
  } catch (e) {
    throw new Unavailable(e instanceof CalendarAuthRevoked ? "calendar_reauth_required" : "token_unavailable");
  }
}

async function busyWindows(admin: Admin, token: string, calendarId: string, from: Date, to: Date, excludeId?: string): Promise<Busy[]> {
  let google: Busy[];
  try {
    google = await fetchGoogleBusy(token, from.toISOString(), to.toISOString(), calendarId);
  } catch (e) {
    throw new Unavailable(e instanceof CalendarAuthRevoked ? "calendar_reauth_required" : `freebusy_failed`);
  }
  let q = admin.from("founder_meetings").select("slot_start, slot_end")
    .in("status", ACTIVE).gt("slot_end", from.toISOString()).lt("slot_start", to.toISOString());
  if (excludeId) q = q.neq("id", excludeId);
  const { data: held, error } = await q;
  if (error) throw new Unavailable("db_unavailable");
  return [...google, ...(held ?? []).map((h: { slot_start: string; slot_end: string }) => ({ start: h.slot_start, end: h.slot_end }))];
}

let cache: { at: number; slots: unknown } | null = null;

async function liveSlots(admin: Admin, fresh = false) {
  if (!fresh && cache && Date.now() - cache.at < 60_000) return cache.slots;
  const { token, calendarId } = await founderCalendar(admin);
  const now = new Date();
  const busy = await busyWindows(admin, token, calendarId, now, new Date(now.getTime() + (HORIZON_DAYS + 1) * 86_400_000));
  const slots = pickFreeSlots(now, busy, 3);
  cache = { at: Date.now(), slots };
  return slots;
}

const Book = z.object({
  action: z.literal("book"),
  slot_start: z.string().min(10).max(40),
  topic: z.enum(["commission", "partnership"]),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  company: z.string().trim().min(2).max(160),
  email: z.string().trim().toLowerCase().email().max(255),
  domain_territory: z.string().trim().max(200).optional().nullable(),
  message: z.string().trim().max(1200).optional().nullable(),
  privacy_consent: z.literal(true),
  consent_text: z.string().trim().min(10).max(500),
  locale: z.enum(["fr", "en"]),
  idempotency_key: z.string().uuid(),
  website: z.string().max(200).optional(),
  started_at: z.number().int().optional(),
});

const TITLES = { commission: "UNPRO — Commission entrepreneur", partnership: "UNPRO — Entretien partenariat" } as const;

async function getEvent(token: string, calendarId: string, eventId: string): Promise<boolean | null> {
  try {
    const r = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?fields=id,status`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 404) return false;
    if (!r.ok) return null;
    const b = await r.json().catch(() => ({}));
    return b?.id === eventId && b?.status !== "cancelled";
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const raw = await req.json().catch(() => null) as { action?: string } | null;

  if (raw?.action === "slots") {
    try {
      return json({ mode: "live", tz: TZ, slots: await liveSlots(admin) });
    } catch (e) {
      const reason = e instanceof Unavailable ? e.message : "unexpected";
      console.error("founder-meeting slots unavailable", reason);
      return json({ mode: "unavailable", reason });
    }
  }

  const parsed = Book.safeParse(raw);
  if (!parsed.success) return json({ error: "invalid", fields: Object.keys(parsed.error.flatten().fieldErrors) }, 400);
  const b = parsed.data;
  if ((b.website ?? "") !== "" || (b.started_at && Date.now() - b.started_at < 2000)) return json({ error: "rejected" }, 422);

  // Idempotent replay: same key returns the recorded outcome, never a second event.
  const { data: prior } = await admin.from("founder_meetings").select("id, status, slot_start, slot_end").eq("idempotency_key", b.idempotency_key).maybeSingle();
  if (prior) {
    if (prior.status === "confirmed") return json({ status: "confirmed", slot: { start: prior.slot_start, end: prior.slot_end } });
    return json({ status: "fallback", reason: `prior_${prior.status}` });
  }

  const now = new Date();
  const slot = isValidCandidate(b.slot_start, now);
  if (!slot) return json({ status: "conflict", reason: "slot_invalid", slots: await liveSlots(admin, true).catch(() => []) });

  const ipHash = await sha256(`fm:${(req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown"}`);
  const { count: ipCount, error: rlErr } = await admin.from("founder_meetings").select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash).gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  if (rlErr) return json({ status: "fallback", reason: "db_unavailable" });
  if ((ipCount ?? 0) >= 3) return json({ error: "rate_limited" }, 429);
  const { count: emailCount } = await admin.from("founder_meetings").select("id", { count: "exact", head: true })
    .eq("email", b.email).in("status", ACTIVE).gte("slot_start", now.toISOString());
  if ((emailCount ?? 0) > 0) return json({ status: "duplicate_email" }, 409);

  // Hold: the partial unique index allows one active meeting per slot (race-safe).
  const { data: row, error: insErr } = await admin.from("founder_meetings").insert({
    slot_start: slot.start, slot_end: slot.end, topic: b.topic, status: "holding",
    first_name: b.first_name, last_name: b.last_name, company: b.company, email: b.email,
    domain_territory: b.domain_territory || null, message: b.message || null, locale: b.locale,
    privacy_consent: true, consent_text: b.consent_text, idempotency_key: b.idempotency_key, ip_hash: ipHash,
  }).select("id").single();
  if (insErr || !row) {
    if (insErr?.code === "23505") return json({ status: "conflict", reason: "slot_taken", slots: await liveSlots(admin, true).catch(() => []) });
    console.error("founder_meetings insert failed", insErr?.code);
    return json({ status: "fallback", reason: "db_unavailable" });
  }
  const mark = (status: string, extra: Record<string, unknown> = {}) =>
    admin.from("founder_meetings").update({ status, ...extra }).eq("id", row.id);

  let token: string, calendarId: string;
  try {
    ({ token, calendarId } = await founderCalendar(admin));
    // Recheck Google + every other active hold for this exact window (our own hold excluded).
    const busy = await busyWindows(admin, token, calendarId, new Date(slot.start), new Date(slot.end), row.id);
    if (busy.some((w) => Date.parse(slot.start) < Date.parse(w.end) && Date.parse(slot.end) > Date.parse(w.start))) {
      await mark("conflict", { failure_reason: "busy_on_recheck" });
      cache = null;
      return json({ status: "conflict", reason: "slot_busy", slots: await liveSlots(admin, true).catch(() => []) });
    }
  } catch (e) {
    const reason = e instanceof Unavailable ? e.message : "unexpected";
    await mark("calendar_failed", { failure_reason: reason });
    return json({ status: "fallback", reason });
  }

  const eventId = bookingEventId(row.id);
  const description = [
    `Sujet : ${b.topic === "commission" ? "Formule 100 % à la commission" : "Proposition de partenariat"}`,
    `Entreprise : ${b.company}`,
    `Contact : ${b.first_name} ${b.last_name} — ${b.email}`,
    b.domain_territory ? `Domaine / territoire : ${b.domain_territory}` : "",
    b.message ? `Message : ${b.message}` : "",
    "Réservé depuis unpro.ca/commission.",
  ].filter(Boolean).join("\n");

  let created = false, definiteFailure = false, failure = "";
  try {
    const r = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        id: eventId, summary: TITLES[b.topic], description,
        start: { dateTime: slot.start, timeZone: TZ }, end: { dateTime: slot.end, timeZone: TZ },
        attendees: [{ email: b.email, displayName: `${b.first_name} ${b.last_name}` }],
        guestsCanInviteOthers: false, guestsCanSeeOtherGuests: false,
        source: { title: "UNPRO", url: "https://unpro.ca/commission" },
      }),
    });
    const body = await r.json().catch(() => ({}));
    if (r.ok && body?.id === eventId) created = true;
    else if (r.status === 409) created = (await getEvent(token, calendarId, eventId)) === true;
    else {
      failure = isGoogleAuthFailure(r.status, body) ? "calendar_reauth_required" : `event_insert_${r.status}`;
      definiteFailure = r.status >= 400 && r.status < 500;
    }
  } catch {
    failure = "event_insert_network";
  }
  if (!created && !definiteFailure) {
    const exists = await getEvent(token, calendarId, eventId);
    if (exists === true) created = true;
    else if (exists === false) definiteFailure = true;
  }

  if (!created) {
    // Unknown outcome keeps the slot held (calendar_unknown) so it can never be double-booked.
    await mark(definiteFailure ? "calendar_failed" : "calendar_unknown", { failure_reason: failure || "event_not_created" });
    console.error("founder-meeting event not created", failure);
    return json({ status: "fallback", reason: failure || "event_not_created" });
  }

  const { error: upErr } = await mark("confirmed", { google_event_id: eventId, confirmed_at: new Date().toISOString(), failure_reason: null });
  cache = null;
  if (upErr) {
    console.error("founder-meeting confirm persist failed", upErr.code);
    return json({ status: "fallback", reason: "persist_failed" });
  }
  return json({ status: "confirmed", slot });
});
