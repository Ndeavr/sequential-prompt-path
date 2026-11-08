export interface CalendarChoice { id: string; name: string; accessRole: string; primary: boolean }
export function selectedGoogleCalendar(metadata: unknown): string {
  const id = (metadata as Record<string, unknown> | null)?.selected_calendar_id;
  if (typeof id !== 'string' || !id) throw new Error('calendar_selection_required');
  return id;
}
export const canWriteCalendar = (role: string) => ['owner', 'writer', 'writerWithoutPrivateAccess'].includes(role);
export async function listGoogleCalendars(token: string): Promise<CalendarChoice[]> {
  const calendars: CalendarChoice[] = [];
  let pageToken: string | undefined;
  const seen = new Set<string>();
  do {
    const url = new URL('https://www.googleapis.com/calendar/v3/users/me/calendarList');
    url.searchParams.set('maxResults', '250');
    url.searchParams.set('showHidden', 'true');
    url.searchParams.set('fields', 'nextPageToken,items(id,summary,summaryOverride,accessRole,primary,deleted)');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(response.status === 401 ? 'google_reconnect_required' : response.status === 403 ? 'google_calendar_permission_required' : 'google_calendar_list_failed');
    const body = await response.json();
    for (const c of body.items ?? []) {
      if (!c.deleted && typeof c.id === 'string' && ['owner','writer','writerWithoutPrivateAccess','reader','freeBusyReader'].includes(c.accessRole))
        calendars.push({ id: c.id, name: c.summaryOverride || c.summary || c.id, accessRole: c.accessRole, primary: c.primary === true });
    }
    pageToken = body.nextPageToken;
    if (pageToken && seen.has(pageToken)) throw new Error('google_calendar_pagination_failed');
    if (pageToken) seen.add(pageToken);
  } while (pageToken);
  return calendars;
}
