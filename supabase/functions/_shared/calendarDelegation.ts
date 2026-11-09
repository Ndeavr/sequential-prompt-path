/**
 * Which Google connection receives a contractor's UNPRO appointments.
 * An active, still-valid delegation (admin-owned connection, same selected
 * calendar) wins; otherwise the contractor's own connected calendar.
 * No valid target => no write.
 */
export interface DelegationRow { calendar_connection_id: string; selected_calendar_id: string; status: string }
export interface ConnectionRow { id: string; user_id: string; connection_status: string; metadata?: Record<string, unknown> | null }

export type CalendarTarget =
  | { kind: "delegated" | "own"; connection: ConnectionRow; calendarId: string }
  | { kind: "none"; reason: "no_connection" | "delegation_invalid" | "no_selection" };

export function resolveBookingCalendar(
  delegation: DelegationRow | null,
  delegatedConnection: ConnectionRow | null,
  ownConnection: ConnectionRow | null,
): CalendarTarget {
  if (delegation && delegation.status === "active") {
    const c = delegatedConnection;
    const sel = c?.metadata?.selected_calendar_id;
    if (!c || c.id !== delegation.calendar_connection_id || c.connection_status !== "connected" || sel !== delegation.selected_calendar_id) {
      return { kind: "none", reason: "delegation_invalid" };
    }
    return { kind: "delegated", connection: c, calendarId: delegation.selected_calendar_id };
  }
  if (!ownConnection || ownConnection.connection_status !== "connected") return { kind: "none", reason: "no_connection" };
  const sel = ownConnection.metadata?.selected_calendar_id;
  if (typeof sel !== "string" || !sel) return { kind: "none", reason: "no_selection" };
  return { kind: "own", connection: ownConnection, calendarId: sel };
}
