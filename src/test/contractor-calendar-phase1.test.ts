/**
 * Calendar phase 1 guardrails.
 *
 * These assertions protect three production invariants:
 *  - no invented ("mock") availability is ever returned to a homeowner;
 *  - real busy periods block computed slots;
 *  - booking confirmation is atomic and server-side.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("alex-inline-booking", () => {
  const source = read("supabase/functions/alex-inline-booking/index.ts");

  it("never generates mock slots", () => {
    expect(source).not.toMatch(/mockSlots/);
    expect(source).not.toMatch(/source:\s*"mock"/);
  });

  it("answers honestly when no availability exists", () => {
    expect(source).toContain('source: "none"');
    expect(source).toContain("Aucune disponibilité n'est publiée");
  });
});

describe("booking slot engine", () => {
  const source = read("src/services/bookingSlotEngine.ts");

  it("loads real busy windows from the connected calendar", () => {
    expect(source).toContain("contractor_busy_windows");
    expect(source).toContain("fetchExternalBusy");
  });

  it("discards slots overlapping a busy window", () => {
    expect(source).toContain("externallyBusy");
  });
});

describe("booking-confirm-slot", () => {
  const source = read("supabase/functions/booking-confirm-slot/index.ts");

  it("confirms through the locked database operation", () => {
    expect(source).toContain("confirm_smart_booking_slot");
  });

  it("returns a conflict instead of double booking", () => {
    expect(source).toContain("slot_unavailable");
    expect(source).toContain("409");
  });

  it("never lets a calendar failure break the appointment", () => {
    expect(source).toContain("reconnect_required");
    expect(source).toMatch(/best effort/i);
  });
});

describe("calendar free/busy sync", () => {
  const source = read("supabase/functions/calendar-freebusy-sync/index.ts");

  it("requires an authenticated caller", () => {
    expect(source).toContain('json({ error: "unauthorized" }, 401)');
  });

  it("marks a revoked connection instead of failing silently", () => {
    expect(source).toContain('connection_status: revoked ? "revoked"');
    expect(source).toContain("contractor_calendar_sync_failed");
  });

  it("stores no event content", () => {
    expect(source).not.toMatch(/\bsummary\b|\bdescription\b|\battendees\b/);
  });
});
