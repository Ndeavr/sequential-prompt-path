import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useStartGoogleOAuth } from '@/hooks/useCalendarConnection';
import { CALENDAR_CHANGED_EVENT } from '@/lib/calendarReturn';
import { canWriteCalendar, type CalendarChoice } from '../../../supabase/functions/_shared/googleCalendarSelection';

export default function GoogleCalendarSelector({ lang = 'fr' }: { lang?: 'fr' | 'en' }) {
  const en = lang === 'en';
  const [calendars, setCalendars] = useState<CalendarChoice[]>([]);
  const [selected, setSelected] = useState('');
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const { startGoogle } = useStartGoogleOAuth();
  useEffect(() => {
    let live = true;
    setLoading(true); setMessage('');
    supabase.functions.invoke('calendar-google-selection', { body: { action: 'list' } }).then(({data,error}) => {
      if (!live) return;
      if (error || data?.error) throw new Error('load');
      setCalendars(data.calendars ?? []);
      setSelected(data.selected_calendar_id ?? ''); setSaved(data.selected_calendar_id ?? '');
    }).catch(() => { if(live) setMessage(en ? 'Unable to load your calendars. Retry or reconnect Google.' : 'Impossible de charger vos agendas. Réessayez ou reconnectez Google.'); })
      .finally(() => {if(live) setLoading(false);});
    return () => { live = false; };
  }, [reload,en]);
  async function save() {
    setSaving(true); setMessage('');
    try {
      const {data,error} = await supabase.functions.invoke('calendar-google-selection', {body:{action:'select',calendar_id:selected}});
      if(error || data?.error || !data?.synced) throw new Error('save');
      setSaved(data.selected_calendar_id);
      // Other calendar views reread the saved server state (selection + sync time).
      window.dispatchEvent(new Event(CALENDAR_CHANGED_EVENT));
      setMessage(en ? 'Calendar saved and busy times synchronized.' : 'Agenda enregistré et plages occupées synchronisées.');
    } catch {
      setMessage(en ? 'Calendar not changed. Check permissions and retry.' : 'Agenda non modifié. Vérifiez vos autorisations et réessayez.');
    } finally { setSaving(false); }
  }
  return <section className="space-y-3 rounded-xl border p-4">
    <label htmlFor="google-calendar-choice" className="block font-semibold">{en ? 'Which calendar should UNPRO use?' : 'Quel agenda UNPRO doit-il utiliser?'}</label>
    {loading ? <p role="status">{en?'Loading your calendars…':'Chargement de vos agendas…'}</p> : <>
      <select id="google-calendar-choice" className="w-full min-h-12 rounded-xl border bg-background px-3 py-2" value={selected} disabled={saving} onChange={e=>{setSelected(e.target.value);setMessage('');}}>
        <option value="">{en?'Choose a calendar':'Choisir un agenda'}</option>
        {calendars.map(c=><option key={c.id} value={c.id} disabled={!canWriteCalendar(c.accessRole)}>{c.name}{!canWriteCalendar(c.accessRole)?en?' — read only':' — lecture seule':''}</option>)}
      </select>
      <p className="text-sm text-muted-foreground">{en?'Busy times and new UNPRO appointments use this calendar. Editing permission is required.':'Les plages occupées et les nouveaux rendez-vous UNPRO utilisent cet agenda. Une autorisation de modification est requise.'}</p>
      {saved && <p className="text-sm">{en?'Current calendar: ':'Agenda actuel : '}{calendars.find(c=>c.id===saved)?.name ?? (en?'Unavailable':'Indisponible')}</p>}
      <Button className="w-full" disabled={!selected||saving} onClick={save}>{saving?(en?'Saving…':'Enregistrement…'):(en?'Use this calendar':'Utiliser cet agenda')}</Button>
    </>}
    <p role="status" className="text-sm">{message}</p>
    {!loading && <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={saving} onClick={()=>setReload(n=>n+1)}>{en?'Refresh list':'Actualiser la liste'}</Button>
      <Button variant="ghost" disabled={saving} onClick={()=>void startGoogle(`${window.location.pathname}${window.location.search}`).catch(()=>setMessage(en?'Google connection unavailable.':'Connexion Google indisponible.'))}>{en?'Reconnect Google':'Reconnecter Google'}</Button>
    </div>}
  </section>;
}
