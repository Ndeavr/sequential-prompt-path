import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  deriveCalendarCapabilities,
  type CalendarConnection,
  type CalendarProvider,
  type CalendarStatus,
} from "@/hooks/useCalendarConnection";

const read = (path: string) => readFileSync(path, "utf8");
const connection = (
  provider: CalendarProvider,
  connection_status: CalendarStatus,
  is_primary = false,
): CalendarConnection => ({
  id: "synthetic-" + provider,
  user_id: "qa-synthetic",
  provider,
  provider_account_email: null,
  connection_status,
  ics_token: null,
  is_primary,
  connected_at: null,
  last_synced_at: null,
  last_error_message: null,
});

describe("UNPRO mobile trust fixes", () => {
  it("does not mistake an Apple ICS link for read access or confirmed subscription", () => {
    const appleOnly = deriveCalendarCapabilities([connection("apple", "subscribed_external")]);
    expect(appleOnly.isConnected).toBe(false);
    expect(appleOnly.hasExternalAppleFeed).toBe(true);
    expect(appleOnly.primary?.provider).toBe("apple");
    const revoked = deriveCalendarCapabilities([connection("google", "revoked")]);
    expect(revoked.isConnected).toBe(false);
    const google = deriveCalendarCapabilities([
      connection("apple", "subscribed_external", true),
      connection("google", "connected"),
    ]);
    expect(google.isConnected).toBe(true);
    expect(google.hasExternalAppleFeed).toBe(true);
    expect(google.primary?.provider).toBe("google");
  });

  it("uses a single accessible QR close action, preserving other dialogs", () => {
    const dialog = read("src/components/ui/dialog.tsx");
    const share = read("src/components/sharing/QRShareSheet.tsx");
    expect(dialog).toContain("showCloseButton = true");
    expect(dialog).toContain("{showCloseButton && (");
    expect(share).toContain("<DialogContent showCloseButton={false}");
    expect(share).toContain("Fermer le partage");
    expect(share).toContain("onOpenChange={onOpenChange}");
  });

  it("keeps navigation actions and provides legible mobile light/dark labels", () => {
    const nav = read("src/components/navigation/MobileBottomNav.tsx");
    expect(nav).toContain("useThemeToggle()");
    expect(nav).toContain('isDark ? "#E5ECF7" : "#334155"');
    expect(nav).toContain("tabColor(active)");
    expect(nav).toContain('aria-current={active ? "page" : undefined}');
    expect(nav).toContain('data-bottom-dock="nav"');
    expect(nav).toContain("<AlexBottomSheetLauncherUNPRO />");
  });

  it("keeps calendar claims accurate and the Google connection available after Apple ICS", () => {
    const card = read("src/components/calendar/CardCalendarConnectionRole.tsx");
    const badge = read("src/components/calendar/BadgeCalendarConnectionStatus.tsx");
    const apple = read("src/components/calendar/ButtonSubscribeAppleCalendar.tsx");
    expect(card).toContain("hasExternalAppleFeed");
    expect(card).toContain("!loading && !isConnected");
    expect(card).toContain("<ButtonConnectGoogleCalendar");
    expect(card).toContain("UNPRO ne peut ni confirmer l'abonnement");
    expect(badge).toContain("Lien Apple créé");
    expect(apple).toContain("Confirmez l'abonnement dans votre calendrier");
    expect(apple).not.toContain("Vos rendez-vous UNPRO apparaîtront dans Apple Calendar.");
  });
});
