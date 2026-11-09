/**
 * Calendar false-success guards — synthetic data only, no Google, no network.
 * Activation calendar step, availability widget, OAuth success page.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

const m = vi.hoisted(() => ({
  tables: {} as Record<string, { data: unknown; error: unknown }>,
  updates: [] as Array<{ table: string; values: unknown }>,
  startGoogle: vi.fn(async () => true),
  track: vi.fn(async () => undefined),
  invoke: vi.fn(async () => ({ data: { calendars: [], selected_calendar_id: null } })),
}));

vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string) => {
    const result = () => m.tables[table] ?? { data: [], error: null };
    const c: Record<string, unknown> = {};
    for (const k of ["select", "eq", "gte", "order", "limit", "single", "maybeSingle"]) c[k] = () => c;
    c.update = (values: unknown) => { m.updates.push({ table, values }); return c; };
    c.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(result()).then(ok, ko);
    return c;
  };
  return {
    supabase: {
      from: (t: string) => chain(t),
      auth: {
        getUser: async () => ({ data: { user: { id: "qa-synthetic" } } }),
        getSession: async () => ({ data: { session: { access_token: "synthetic" } } }),
      },
      functions: { invoke: m.invoke },
    },
  };
});
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "qa-synthetic" } }) }));
vi.mock("@/hooks/useCalendarConnection", async (orig) => ({
  ...(await orig<typeof import("@/hooks/useCalendarConnection")>()),
  useStartGoogleOAuth: () => ({ startGoogle: m.startGoogle }),
  useCalendarConversionTracking: () => ({ track: m.track }),
}));
vi.mock("@/hooks/useHesitationRescue", () => ({ useHesitationRescue: () => undefined }));
vi.mock("@/components/contractor-funnel/FunnelLayout", () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/ui/StickyMobileCTA", () => ({ default: () => null }));
vi.mock("@/layouts/MainLayout", () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("react-helmet-async", () => ({ Helmet: () => null }));
vi.mock("@/contexts/ActiveRoleContext", () => ({ useActiveRole: () => ({ activeRole: "contractor" }) }));

import ScreenCalendar, { ACTIVATION_CALENDAR_OAUTH_RETURN } from "@/pages/entrepreneur/activation/ScreenCalendar";
import WidgetCalendarAvailabilityPreview from "@/components/calendar/WidgetCalendarAvailabilityPreview";
import PageCalendarConnectionSuccess from "@/pages/calendar/PageCalendarConnectionSuccess";
import {
  deriveCalendarReadiness,
  shouldTrackCalendarSuccess,
  type CalendarConnection,
} from "@/hooks/useCalendarConnection";

const conn = (over: Partial<CalendarConnection> = {}): CalendarConnection => ({
  id: "synthetic-conn",
  user_id: "qa-synthetic",
  provider: "google",
  provider_account_email: "qa@example.test",
  connection_status: "connected",
  ics_token: null,
  is_primary: true,
  connected_at: "2026-01-01T00:00:00.000Z",
  last_synced_at: null,
  last_error_message: null,
  scopes_json: SCOPES,
  metadata: {},
  ...over,
});
const READY = conn({ metadata: { selected_calendar_id: "cal-1" }, last_synced_at: "2026-01-01T00:05:00.000Z" });

const setConnections = (rows: CalendarConnection[]) => {
  m.tables.calendar_connections = { data: rows, error: null };
};

beforeEach(() => {
  vi.clearAllMocks();
  m.updates.length = 0;
  m.tables = {
    contractor_activation_funnel: { data: { id: "funnel-synthetic", user_id: "qa-synthetic", calendar_connected: false }, error: null },
    calendar_busy_periods: { data: [], error: null },
  };
  sessionStorage.clear();
});
afterEach(cleanup);

describe("calendar readiness (pure)", () => {
  it("separates not connected, revoked, missing permission, no selection, not synced and ready", () => {
    expect(deriveCalendarReadiness([]).readiness).toBe("not_connected");
    expect(deriveCalendarReadiness([conn({ connection_status: "revoked" })]).readiness).toBe("reconnect_required");
    expect(deriveCalendarReadiness([conn({ scopes_json: [SCOPES[0]] })]).readiness).toBe("reconnect_required");
    expect(deriveCalendarReadiness([conn()]).readiness).toBe("no_selection");
    expect(deriveCalendarReadiness([conn({ metadata: { selected_calendar_id: "cal-1" } })]).readiness).toBe("not_synced");
    expect(deriveCalendarReadiness([READY]).readiness).toBe("ready");
  });
  it("counts a success only for a fresh connection, once", () => {
    const now = Date.parse("2026-01-01T00:10:00.000Z");
    expect(shouldTrackCalendarSuccess("2026-01-01T00:05:00.000Z", now, null)).toBe(true);
    expect(shouldTrackCalendarSuccess("2026-01-01T00:05:00.000Z", now, "2026-01-01T00:05:00.000Z")).toBe(false);
    expect(shouldTrackCalendarSuccess("2025-12-31T20:00:00.000Z", now, null)).toBe(false);
    expect(shouldTrackCalendarSuccess(null, now, null)).toBe(false);
  });
});

describe("activation calendar step", () => {
  const renderScreen = () => render(<MemoryRouter><ScreenCalendar /></MemoryRouter>);

  it("a click starts real Google OAuth and never shows or saves 'connected'", async () => {
    setConnections([]);
    renderScreen();
    const button = await screen.findByRole("button", { name: /Connecter Google Calendar/ });
    fireEvent.click(button);
    await waitFor(() => expect(m.startGoogle).toHaveBeenCalledWith(ACTIVATION_CALENDAR_OAUTH_RETURN));
    expect(ACTIVATION_CALENDAR_OAUTH_RETURN).toContain("return_to=%2Fentrepreneur%2Factiver%2Fcalendrier");
    expect(screen.queryByText(/connecté|Prêt à recevoir/)).toBeNull();
    expect(m.updates.some((u) => (u.values as { calendar_connected?: boolean }).calendar_connected === true)).toBe(false);
  });

  it("revoked access asks to reconnect", async () => {
    setConnections([conn({ connection_status: "revoked" })]);
    renderScreen();
    expect(await screen.findByText(/a été retiré ou est incomplet/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Reconnecter Google Agenda/ })).toBeTruthy();
    expect(screen.queryByText(/Prêt à recevoir/)).toBeNull();
  });

  it("connected without a chosen calendar asks to choose it", async () => {
    setConnections([conn()]);
    renderScreen();
    expect(await screen.findByText("Choisissez votre calendrier")).toBeTruthy();
    expect(screen.queryByText(/Prêt à recevoir/)).toBeNull();
    await waitFor(() => expect(m.invoke).toHaveBeenCalledWith("calendar-google-selection", { body: { action: "list" } }));
  });

  it("ready only from the saved row, then mirrors the funnel flag", async () => {
    setConnections([READY]);
    renderScreen();
    expect(await screen.findByText("Prêt à recevoir des rendez-vous")).toBeTruthy();
    await waitFor(
      () => expect(m.updates).toContainEqual({ table: "contractor_activation_funnel", values: { calendar_connected: true } }),
      { timeout: 3000 },
    );
  });
});

describe("availability widget", () => {
  it("never invents slots without a synchronized calendar", async () => {
    setConnections([]);
    render(<WidgetCalendarAvailabilityPreview role="contractor" />);
    expect(await screen.findByText("Disponibilités non encore synchronisées")).toBeTruthy();
    expect(screen.queryByText(/Plages détectées/)).toBeNull();
  });
  it("asks to choose the calendar when none is selected", async () => {
    setConnections([conn()]);
    render(<WidgetCalendarAvailabilityPreview role="contractor" />);
    expect(await screen.findByText("Choisissez votre calendrier")).toBeTruthy();
  });
  it("shows only synchronized busy periods when ready", async () => {
    setConnections([READY]);
    m.tables.calendar_busy_periods = { data: [{ starts_at: "2099-03-02T14:00:00.000Z", ends_at: "2099-03-02T15:00:00.000Z" }], error: null };
    render(<WidgetCalendarAvailabilityPreview role="contractor" />);
    expect(await screen.findByText("Plages occupées synchronisées")).toBeTruthy();
    expect(screen.getAllByText(/2099|mars/i).length).toBe(1);
  });
});

describe("OAuth success page", () => {
  const renderSuccess = (query = "?role=contractor&surface=activation&return_to=%2Fentrepreneur%2Factiver%2Fcalendrier") =>
    render(<MemoryRouter initialEntries={[`/calendar/connect/success${query}`]}><PageCalendarConnectionSuccess /></MemoryRouter>);

  it("opened directly without a connection: no success, no tracking", async () => {
    setConnections([]);
    renderSuccess();
    expect(await screen.findByText("Connexion non confirmée")).toBeTruthy();
    expect(screen.queryByText(/Calendrier connecté|Prêt à recevoir/)).toBeNull();
    expect(m.track).not.toHaveBeenCalled();
  });

  it("revoked: no success, no tracking", async () => {
    setConnections([conn({ connection_status: "revoked" })]);
    renderSuccess();
    expect(await screen.findByText("Connexion non confirmée")).toBeTruthy();
    expect(m.track).not.toHaveBeenCalled();
  });

  it("connected without selection is not 'ready'", async () => {
    setConnections([conn({ connected_at: new Date().toISOString() })]);
    renderSuccess();
    expect(await screen.findByText("Calendrier connecté")).toBeTruthy();
    expect(screen.getByText(/Choisissez votre calendrier/)).toBeTruthy();
    expect(screen.queryByText(/Prêt à recevoir/)).toBeNull();
    await waitFor(() => expect(m.track).toHaveBeenCalledTimes(1));
  });

  it("an old connection reopened directly is shown but not re-counted", async () => {
    setConnections([READY]);
    renderSuccess();
    expect(await screen.findByText("Prêt à recevoir des rendez-vous")).toBeTruthy();
    expect(m.track).not.toHaveBeenCalled();
  });
});
