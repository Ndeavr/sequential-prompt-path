import { describe, it, expect } from "vitest";
import { resolveBookingCalendar } from "../../supabase/functions/_shared/calendarDelegation";
import { bookingEventId } from "../../supabase/functions/_shared/googleCalendar";

const del = { calendar_connection_id: "conn-admin", selected_calendar_id: "cal-danny", status: "active" };
const adminConn = { id: "conn-admin", user_id: "admin", connection_status: "connected", metadata: { selected_calendar_id: "cal-danny" } };
const ownConn = { id: "conn-own", user_id: "owner", connection_status: "connected", metadata: { selected_calendar_id: "cal-own" } };

describe("delegated booking calendar", () => {
  it("writes to the delegated selected calendar, never primary", () => {
    const t = resolveBookingCalendar(del, adminConn, ownConn);
    expect(t.kind).toBe("delegated");
    if (t.kind !== "none") expect(t.calendarId).toBe("cal-danny");
  });
  it("revoked connection blocks the write (no fallback to own)", () => {
    expect(resolveBookingCalendar(del, { ...adminConn, connection_status: "revoked" }, ownConn))
      .toEqual({ kind: "none", reason: "delegation_invalid" });
  });
  it("selection changed or missing blocks the write", () => {
    expect(resolveBookingCalendar(del, { ...adminConn, metadata: {} }, null).kind).toBe("none");
    expect(resolveBookingCalendar(del, { ...adminConn, metadata: { selected_calendar_id: "other" } }, null).kind).toBe("none");
  });
  it("delegation pointing to another connection is refused", () => {
    expect(resolveBookingCalendar(del, { ...adminConn, id: "conn-x" }, null).kind).toBe("none");
  });
  it("other contractors keep their own calendar", () => {
    const t = resolveBookingCalendar(null, null, ownConn);
    expect(t.kind).toBe("own");
    if (t.kind !== "none") expect(t.calendarId).toBe("cal-own");
  });
  it("own connection without selection is not written", () => {
    expect(resolveBookingCalendar(null, null, { ...ownConn, metadata: {} })).toEqual({ kind: "none", reason: "no_selection" });
  });
  it("event id is deterministic per booking (no duplicate on retry) and Google-valid", () => {
    const id = bookingEventId("3414fb29-8141-4918-bd75-1c48e6102f89");
    expect(id).toBe(bookingEventId("3414fb29-8141-4918-bd75-1c48e6102f89"));
    expect(id).toMatch(/^[a-v0-9]{5,1024}$/);
  });
});
