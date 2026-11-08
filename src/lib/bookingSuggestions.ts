export type BookingPeriod = 'this_week' | 'next_week' | 'flexible';
export type DayPreference = 'flexible' | 'morning' | 'afternoon' | 'evening';
export interface PublishedSlot { id: string; starts_at: string; ends_at: string; }
const zone = 'America/Toronto';
export function localDate(iso: string | Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}
export function selectSuggestions(slots: PublishedSlot[], period: BookingPeriod, preference: DayPreference, duration: number, now = new Date()) {
  const today = localDate(now);
  const day = new Date(`${today}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  const monday = day.toISOString().slice(0,10);
  day.setUTCDate(day.getUTCDate()+7); const next = day.toISOString().slice(0,10);
  day.setUTCDate(day.getUTCDate()+7); const after = day.toISOString().slice(0,10);
  const valid = slots.filter(s => {
    const start = new Date(s.starts_at), end = new Date(s.ends_at);
    if (!Number.isFinite(+start) || !Number.isFinite(+end) || +start <= +now || +end - +start !== duration * 60000) return false;
    const date = localDate(start);
    if (period === 'this_week' && !(date >= monday && date < next)) return false;
    if (period === 'next_week' && !(date >= next && date < after)) return false;
    const hour = Number(new Intl.DateTimeFormat('en-CA', { timeZone: zone, hour:'2-digit', hourCycle:'h23' }).format(start));
    return preference === 'flexible' || (preference === 'morning' ? hour < 12 : preference === 'afternoon' ? hour >= 12 && hour < 17 : hour >= 17);
  }).sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at));
  const selected: PublishedSlot[] = [];
  // Prefer different days over three adjacent starts.
  for (const slot of valid) if (!selected.some(s=>localDate(s.starts_at)===localDate(slot.starts_at))) { selected.push(slot); if(selected.length === 3) break; }
  for (const slot of valid) if(selected.length < 3 && !selected.some(s=>s.id===slot.id || (Date.parse(s.starts_at)<Date.parse(slot.ends_at)&&Date.parse(s.ends_at)>Date.parse(slot.starts_at)))) selected.push(slot);
  return selected.sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at));
}
