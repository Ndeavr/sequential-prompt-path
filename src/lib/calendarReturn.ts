/**
 * Calendar connection return path: keeps the user's starting route and
 * active context across Google OAuth. Mirrors the server-side sanitizer
 * in supabase/functions/_shared/calendarOAuthState.ts (same-site paths only).
 */

export const CALENDAR_REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
] as const;

/** Event other calendar views listen to so they refetch the saved state. */
export const CALENDAR_CHANGED_EVENT = "unpro:calendar-connection-changed";

/** Returns a same-site path (path + query) or null. Never the calendar flow itself. */
export function safeCalendarReturn(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  try {
    const parsed = new URL(value, "https://unpro.invalid");
    if (parsed.origin !== "https://unpro.invalid") return null;
    if (parsed.pathname.startsWith("/calendar/connect")) return null;
    parsed.searchParams.delete("provider");
    const query = parsed.searchParams.toString();
    return `${parsed.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return null;
  }
}

/** Used only when no starting route was preserved. Never changes the role. */
export function calendarContextFallback(activeRole: string | null | undefined): string {
  if (activeRole === "admin") return "/admin";
  if (activeRole === "contractor") return "/entrepreneur/dashboard";
  return "/dashboard";
}

export function calendarSuccessPath(input: { role: string; surface: string; returnTo: string | null }): string {
  const params = new URLSearchParams({ role: input.role, surface: input.surface });
  const back = safeCalendarReturn(input.returnTo);
  if (back) params.set("return_to", back);
  return `/calendar/connect/success?${params.toString()}`;
}

/** Saved Google connection with every permission UNPRO needs. */
export function hasRequiredCalendarScopes(scopes: unknown): boolean {
  if (!Array.isArray(scopes)) return false;
  return CALENDAR_REQUIRED_SCOPES.every((scope) => scopes.includes(scope));
}
