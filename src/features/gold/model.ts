export type GoldMembership = { contractor_id: string; member_number: number; status: 'active' | 'refunded'; joined_at: string; pioneer_2026?: boolean };
export function goldNumber(n: number): string | null {
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? `#${String(n).padStart(6, '0')}` : null;
}
export function sinceMonth(date: string | null | undefined, lang: 'fr' | 'en'): string | null {
  if (!date || !Number.isFinite(Date.parse(date))) return null;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', month: '2-digit', year: 'numeric' }).formatToParts(new Date(date));
  return `${lang === 'fr' ? 'Depuis' : 'Since'} ${parts.find(p => p.type === 'month')?.value}/${parts.find(p => p.type === 'year')?.value}`;
}
