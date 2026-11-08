import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
const mocks=vi.hoisted(()=>({invoke:vi.fn(),startGoogle:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke}}}));
vi.mock('@/hooks/useCalendarConnection',()=>({useStartGoogleOAuth:()=>({startGoogle:mocks.startGoogle})}));
import GoogleCalendarSelector from './GoogleCalendarSelector';
beforeEach(()=>vi.clearAllMocks());
afterEach(cleanup);
it('lists named calendars, disables read-only entries, and saves the selected id',async()=>{
 mocks.invoke.mockResolvedValueOnce({data:{calendars:[{id:'shared-id',name:'Équipe exemple',accessRole:'writer'},{id:'read-id',name:'Jours fériés',accessRole:'reader'}],selected_calendar_id:null}}).mockResolvedValueOnce({data:{selected_calendar_id:'shared-id',synced:true}});
 render(<GoogleCalendarSelector/>);
 await screen.findByRole('option',{name:'Équipe exemple'});
 expect((screen.getByRole('option',{name:/Jours fériés/}) as HTMLOptionElement).disabled).toBe(true);
 fireEvent.change(screen.getByLabelText('Quel agenda UNPRO doit-il utiliser?'),{target:{value:'shared-id'}});
 fireEvent.click(screen.getByRole('button',{name:'Utiliser cet agenda'}));
 await screen.findByText('Agenda enregistré et plages occupées synchronisées.');
 expect(mocks.invoke).toHaveBeenLastCalledWith('calendar-google-selection',{body:{action:'select',calendar_id:'shared-id'}});
});
it('never shows success on a failed save',async()=>{
 mocks.invoke.mockResolvedValueOnce({data:{calendars:[{id:'c',name:'Exemple',accessRole:'owner'}]}}).mockResolvedValueOnce({error:new Error('denied')});
 render(<GoogleCalendarSelector/>);
 await screen.findByRole('option',{name:'Exemple'});
 fireEvent.change(screen.getByLabelText('Quel agenda UNPRO doit-il utiliser?'),{target:{value:'c'}});
 fireEvent.click(screen.getByRole('button',{name:'Utiliser cet agenda'}));
 await screen.findByText(/Agenda non modifié/);
 expect(screen.queryByText(/Agenda enregistré et/)).toBeNull();
});
