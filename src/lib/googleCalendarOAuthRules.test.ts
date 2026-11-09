import { afterEach, describe, expect, it, vi } from "vitest";
import {
  grantedRequiredCalendarScopes,
  reconnectMetadata,
} from "../../supabase/functions/_shared/googleCalendarSelection";
import {
  CalendarAuthRevoked,
  fetchGoogleBusy,
  isGoogleAuthFailure,
  pushGoogleEvent,
} from "../../supabase/functions/_shared/googleCalendar";

afterEach(() => vi.unstubAllGlobals());

const R = "https://www.googleapis.com/auth/calendar.readonly";
const E = "https://www.googleapis.com/auth/calendar.events";

describe("Google Calendar OAuth rules (synthetic)", () => {
  it("requires both calendar scopes granted", () => {
    expect(grantedRequiredCalendarScopes(`openid email ${R} ${E}`)).toBe(true);
    expect(grantedRequiredCalendarScopes(`openid email ${R}`)).toBe(false);
    expect(grantedRequiredCalendarScopes(`openid ${E}`)).toBe(false);
    expect(grantedRequiredCalendarScopes(undefined)).toBe(false);
  });

  it("keeps the chosen calendar when the same Google account reconnects", () => {
    const previous = {
      google_user_id: "g-1",
      selected_calendar_id: "team@group.calendar.google.com",
      selected_calendar_name: "Équipe",
      selected_calendar_access_role: "writer",
      calendar_snapshot_version: "v",
    };
    const next = reconnectMetadata(previous, "g-1", "Synthétique");
    expect(next.selected_calendar_id).toBe("team@group.calendar.google.com");
    expect(next.selected_calendar_access_role).toBe("writer");
  });

  it("drops the chosen calendar when a different Google account connects", () => {
    const next = reconnectMetadata({ google_user_id: "g-1", selected_calendar_id: "x" }, "g-2", null);
    expect(next.selected_calendar_id).toBeUndefined();
    expect(next.google_user_id).toBe("g-2");
  });

  it("only 401 or insufficient scope counts as revoked access", () => {
    expect(isGoogleAuthFailure(401, {})).toBe(true);
    expect(isGoogleAuthFailure(403, { error: { errors: [{ reason: "insufficientPermissions" }] } })).toBe(true);
    expect(isGoogleAuthFailure(403, { error: { errors: [{ reason: "accessNotConfigured" }] } })).toBe(false);
    expect(isGoogleAuthFailure(403, { error: { errors: [{ reason: "rateLimitExceeded" }] } })).toBe(false);
    expect(isGoogleAuthFailure(500, {})).toBe(false);
  });

  it("Calendar API disabled does not revoke the connection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 403,
      json: async () => ({ error: { errors: [{ reason: "accessNotConfigured" }] } }),
    }));
    const err = await fetchGoogleBusy("synthetic", "2026-11-10T00:00:00Z", "2026-11-11T00:00:00Z", "cal")
      .catch((e) => e);
    expect(err).not.toBeInstanceOf(CalendarAuthRevoked);
    expect(String(err.message)).toContain("accessNotConfigured");
  });

  it("free/busy and event writes target the selected calendar, never primary", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ calendars: { "cal-x": { busy: [] } } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: "evt" }) });
    vi.stubGlobal("fetch", fetchMock);
    await fetchGoogleBusy("synthetic", "2026-11-10T00:00:00Z", "2026-11-11T00:00:00Z", "cal-x");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).items).toEqual([{ id: "cal-x" }]);
    await pushGoogleEvent("synthetic", { summary: "Test", start: "2026-11-10T14:00:00Z", end: "2026-11-10T15:00:00Z" }, "cal-x");
    expect(fetchMock.mock.calls[1][0]).toContain("/calendars/cal-x/events");
  });
});
