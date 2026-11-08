import { describe, expect, it } from "vitest";
import { calendarContextFallback, calendarSuccessPath, hasRequiredCalendarScopes, safeCalendarReturn } from "@/lib/calendarReturn";
import { deriveCalendarCapabilities, type CalendarConnection } from "@/hooks/useCalendarConnection";

const google = (scopes_json: string[] | null): CalendarConnection => ({
  id: "synthetic", user_id: "qa-synthetic", provider: "google", provider_account_email: null,
  connection_status: "connected", ics_token: null, is_primary: true, connected_at: null,
  last_synced_at: null, last_error_message: null, scopes_json,
});

describe("calendar return path", () => {
  it("keeps the starting admin route instead of the Home Passport", () => {
    const path = calendarSuccessPath({ role: "homeowner", surface: "account", returnTo: "/admin/operations?tab=ops" });
    expect(new URL(path, "https://x.test").searchParams.get("return_to")).toBe("/admin/operations?tab=ops");
  });

  it("resumes a booking URL with its query", () => {
    expect(safeCalendarReturn("/entrepreneurs/demo/reserver?slot=abc")).toBe("/entrepreneurs/demo/reserver?slot=abc");
  });

  it("rejects external, protocol-relative and calendar-loop targets", () => {
    expect(safeCalendarReturn("https://evil.example/")).toBeNull();
    expect(safeCalendarReturn("//evil.example")).toBeNull();
    expect(safeCalendarReturn("/calendar/connect/success")).toBeNull();
  });

  it("falls back by active context only when no route was kept", () => {
    expect(calendarContextFallback("admin")).toBe("/admin");
    expect(calendarContextFallback("contractor")).toBe("/entrepreneur/dashboard");
    expect(calendarContextFallback("homeowner")).toBe("/dashboard");
  });
});

describe("connected only with saved permissions", () => {
  const both = ["openid", "https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/calendar.events"];
  it("requires both calendar permissions", () => {
    expect(hasRequiredCalendarScopes(both)).toBe(true);
    expect(hasRequiredCalendarScopes(["https://www.googleapis.com/auth/calendar.readonly"])).toBe(false);
    expect(deriveCalendarCapabilities([google(both)]).isConnected).toBe(true);
    expect(deriveCalendarCapabilities([google(["openid", "email"])]).isConnected).toBe(false);
    expect(deriveCalendarCapabilities([google(null)]).isConnected).toBe(false);
  });
});
