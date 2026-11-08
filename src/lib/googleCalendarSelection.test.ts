import { afterEach, expect, it, vi } from 'vitest';
import { listGoogleCalendars, selectedGoogleCalendar } from '../../supabase/functions/_shared/googleCalendarSelection';
afterEach(()=>vi.unstubAllGlobals());
it('follows pagination and includes shared hidden calendars',async()=>{
 const fetchMock=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({items:[{id:'one',summary:'Personnel',accessRole:'owner'}],nextPageToken:'page2'})}).mockResolvedValueOnce({ok:true,json:async()=>({items:[{id:'two',summary:'Équipe',accessRole:'writer'}]})});
 vi.stubGlobal('fetch',fetchMock);
 expect((await listGoogleCalendars('synthetic')).map(c=>c.id)).toEqual(['one','two']);
 expect(fetchMock.mock.calls[1][0].searchParams.get('pageToken')).toBe('page2');
});
it('requires an explicit calendar and never defaults to primary',()=>{
 expect(()=>selectedGoogleCalendar({})).toThrow('calendar_selection_required');
 expect(selectedGoogleCalendar({selected_calendar_id:'shared-id'})).toBe('shared-id');
});
