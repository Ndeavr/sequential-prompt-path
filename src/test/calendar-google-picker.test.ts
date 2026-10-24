import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const selection = read("supabase/functions/calendar-google-selection/index.ts");
const sync = read("supabase/functions/calendar-freebusy-sync/index.ts");
const confirm = read("supabase/functions/booking-confirm-slot/index.ts");
const success = read("src/pages/calendar/PageCalendarConnectionSuccess.tsx");
const card = read("src/components/calendar/CardCalendarConnectionRole.tsx");
const chooser = read("src/components/calendar/CardGoogleCalendarSelection.tsx");
const preview = read("src/components/calendar/WidgetCalendarAvailabilityPreview.tsx");
const policy = read("supabase/migrations/20261024184500_calendar_selection_owner_read_only.sql");

describe("UNPRO explicitly selected Google Calendar", () => {
  it("never authorizes a new Google connection automatically", () => {
    expect(chooser).not.toContain("startGoogle(");
    expect(chooser).not.toContain("accounts.google.com");
    expect(selection).toContain("no_unpro_google_connection");
  });
  it("binds the selected calendar to the signed-in business owner", () => {
    expect(selection).toContain('.eq("user_id", user.id).maybeSingle()');
    expect(selection).toContain('.eq("user_id", user.id).eq("provider", "google")');
    expect(selection).toContain('calendar_not_in_google_account');
    expect(selection).toContain('calendar_read_only');
    expect(selection).toContain('writable(selected)');
    expect(selection).toContain('status: "pending_sync"');
    expect(policy).toContain('DROP POLICY IF EXISTS "Contractors manage calendar integrations"');
    expect(policy).toContain('FOR SELECT TO authenticated');
  });
  it("uses the selected ID for freebusy and confirmed booking writes", () => {
    expect(sync).toContain('calendar_choice_required_or_ambiguous');
    expect(sync).toContain("from(\"booking_calendar_integrations\")");
    expect(sync).toContain("to.toISOString(), selectedCalendarId)");
    expect(confirm).toContain('.eq("status", "connected").eq("sync_write_events", true)');
    expect(confirm).toContain("}, selectedIntegration.selected_calendar_id)");
  });
  it("offers a picker without automatic redirects or imaginary slots", () => {
    expect(card).toContain('<CardGoogleCalendarSelection />');
    expect(success).toContain('<CardGoogleCalendarSelection />');
    expect(success).not.toContain("setTimeout(");
    expect(preview).not.toContain("Array.from(");
    expect(preview).not.toContain("setHours(");
    expect(chooser).toContain('Enregistrer ce calendrier');
    expect(chooser).toContain('disabled={!c.writable}');
  });
});
