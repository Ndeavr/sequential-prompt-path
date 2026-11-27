import { useLanguage } from '@/components/ui/LanguageToggle';
import { PIONEER_COPY } from '@/lib/pricing/pioneer2026';
import { useGoldAvailability } from './useGold';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/** Reuses GOLD's public-safe aggregate. Unknown inventory never becomes scarcity. */
export default function PioneerOffer({ language }: { language?: 'fr' | 'en' }) {
  const { lang } = useLanguage();
  const copy = PIONEER_COPY[language ?? lang];
  const stock = useGoldAvailability();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set('activate', '1');
  params.set('pioneer', '2026');
  const ready = stock.data?.pioneer_status === 'active' && stock.data?.checkout_supported === true;
  return <section className="space-y-3 border-y border-border py-5" aria-label={copy.name}>
    <h2 className="text-lg font-semibold text-foreground">{copy.name}</h2>
    <p className="text-2xl font-semibold text-foreground">{copy.price}</p>
    <p className="text-sm font-medium text-foreground">{copy.regular}</p>
    <p className="text-sm font-semibold text-primary">{copy.savings}</p>
    <p className="text-sm text-muted-foreground">{copy.scope}</p>
    <p className="text-sm text-muted-foreground">{copy.limit}</p>
    <p className="text-sm text-foreground">{copy.renewal}</p>
    <p role="status" className="text-sm text-muted-foreground">
      {ready && stock.data?.pioneer_available != null
        ? `${stock.data.pioneer_available} ${copy.remaining}${stock.data.pioneer_next_number ? ` · ${copy.next} ${String(stock.data.pioneer_next_number).padStart(4, '0')}` : ''}`
        : stock.data?.pioneer_status === 'closed' ? copy.unavailable : copy.pending}
    </p>
    {ready && stock.data?.first_reserved && <p className="text-sm text-muted-foreground">{copy.reserved}</p>}
    {ready && (stock.data?.pioneer_available ?? 0) > 0 && !params.has('offre') && !params.has('proposal') &&
      <Button asChild className="min-h-12 whitespace-normal"><Link to={`/entrepreneurs/activation-350?${params}`}>{language === 'en' || (!language && lang === 'en') ? 'Continue with Pioneer — $350 + tax' : 'Continuer avec Pionnier — 350 $ + taxes'}</Link></Button>}
  </section>;
}