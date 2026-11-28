import { Award } from 'lucide-react';
import { goldNumber, sinceMonth, type GoldMembership } from './model';
import { pioneerNumber } from '@/lib/pricing/pioneer2026';
export default function GoldBadge({ member, registeredAt, lang = 'fr' }: { member?: GoldMembership | null; registeredAt?: string | null; lang?: 'fr' | 'en' }) {
  const number = member?.status === 'active' ? goldNumber(member.member_number) : null;
  const since = sinceMonth(registeredAt, lang);
  const pioneer = member?.pioneer_2026 ? pioneerNumber(member.member_number) : null;
  if (!number && !since && !pioneer) return null;
  return <div className="flex flex-wrap items-center gap-2 py-1">
    {pioneer && <span className="unpro-gold-badge inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold"><Award className="h-4 w-4 shrink-0" aria-hidden />{lang === 'fr' ? 'PIONNIER' : 'PIONEER'} 2026 · {pioneer}</span>}
    {number && !pioneer && <span className="unpro-gold-badge inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold"><Award className="h-4 w-4 shrink-0" aria-hidden />UNPRO GOLD · {lang === 'fr' ? 'Membre fondateur' : 'Founding Member'} {number}</span>}
    {since && <span className="text-sm text-muted-foreground">{since}</span>}
  </div>;
}
