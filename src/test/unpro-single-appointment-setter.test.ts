// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");
const confirmation = read("supabase/functions/booking-confirm-slot/index.ts");
const publicBooking = read("src/pages/PublicBookingPage.tsx");
const inlineBackend = read("supabase/functions/alex-inline-booking/index.ts");
const inlineUI = read("src/components/alex-conversation/PanelAppointmentSchedulerInline.tsx");
const slots = read("src/services/bookingSlotEngine.ts");

describe("single Clara appointment-setting path", () => {
  it("shows at most three real prefiltered options; no mocked time slots", () => {
    expect(publicBooking).toContain("computeSmartSlots({");
    expect(publicBooking).toContain("sort((a, b) => b.score - a.score).slice(0, 3)");
    expect(slots).toContain("contractor_busy_windows");
    expect(slots).toContain("fetchExternalBusy");
    expect(slots).toContain("buffer_before_minutes");
    expect(slots).toContain("travel_padding_minutes");
    expect(slots).not.toContain('badges.push("reduced_travel")');
  });
  it("confirms free bookings exclusively with the locked backend RPC", () => {
    expect(publicBooking).toContain("if (!isPaid) {");
    expect(publicBooking).toContain('"booking-confirm-slot"');
    expect(confirmation).toContain('admin.rpc("confirm_smart_booking_slot"');
    expect(publicBooking).toContain('confirmed?.status !== "confirmed"');
    expect(publicBooking).toContain("confirmed?.booking_id");
  });
  it("does not bypass payment or disabled contractor booking status", () => {
    expect(confirmation).toContain("appointment_type_not_directly_bookable");
    expect(confirmation).toContain("requires_deposit");
    expect(confirmation).toContain("requires_manual_approval");
    expect(confirmation).toContain("requires_prequalification");
    expect(confirmation).toContain('contractor.google_calendar_id || "primary"');
    expect(confirmation).toContain("booking_page_published");
    expect(confirmation).toContain("invalid_appointment_duration");
    expect(publicBooking).toContain("create-booking-checkout");
  });
  it("never simulates confirmation or holds a slot in old Clara chat", () => {
    expect(inlineBackend).toContain('error: "canonical_booking_required"');
    expect(inlineBackend).toContain('status: "not_confirmed"');
    expect(inlineBackend).not.toContain('.from("alex_booking_candidates").insert');
    expect(inlineBackend).not.toContain('status: "confirmed"');
    expect(inlineUI).not.toContain("setConfirmed(true)");
    expect(inlineUI).toContain("navigate(path)");
  });
  it("calendar push is real only with a returned Google event ID", () => {
    expect(confirmation).toContain("pushGoogleEvent(");
    expect(confirmation).toContain('calendarPush = eventId ? "written" : "failed"');
    expect(confirmation).toContain('calendar_push: calendarPush');
    expect(publicBooking).toContain('calendarPush !== "written"');
  });
  it("contractor notification is in-app; phone push is explicitly unconfigured", () => {
    expect(confirmation).toContain('.from("notifications").insert');
    expect(confirmation).toContain('channel: "in_app"');
    expect(confirmation).toContain('phone_push: "not_configured"');
    expect(confirmation).not.toContain('sms_sent: true');
    expect(confirmation).not.toContain('push_delivered: true');
  });
  it("has no source-level paid booking or notifications fabricated by a GET", () => {
    expect(inlineBackend).toContain('source: "none"');
    expect(inlineBackend).not.toContain('source: "mock"');
    expect(inlineBackend).not.toContain("calendarPush = \"written\";");
  });
});
