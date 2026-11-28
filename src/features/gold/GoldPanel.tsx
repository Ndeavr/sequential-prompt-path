import { useState } from 'react';
import { Download, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/ui/LanguageToggle';
import { useGold, useGoldAvailability, useGoldAudit } from './useGold';
import GoldBadge from './GoldBadge';
import { goldNumber } from './model';

const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
export default function GoldPanel({ contractorId, slug, name, admin = false }: { contractorId?: string; slug?: string | null; name?: string | null; admin?: boolean }) {
  const { lang } = useLanguage();
  const en = lang === 'en';
  const member = useGold(contractorId);
  const stock = useGoldAvailability();
  const audit = useGoldAudit(contractorId, admin);
  const [notice, setNotice] = useState('');
  const active = member.data?.status === 'active';
  const url = slug ? `https://unpro.ca/entrepreneur/${encodeURIComponent(slug)}` : null;
  const certificate = () => {
    if (!active || !member.data || !url) return;
    const title = en ? 'Founding Member' : 'Membre fondateur';
    const html = `<!doctype html><html lang="${lang}"><meta charset="utf-8"><title>UNPRO GOLD</title><body><h1>UNPRO GOLD</h1><h2>${title} ${goldNumber(member.data.member_number)}</h2><p>${escape(name ?? '')}</p><p><a href="${url}">${en ? 'Current membership status' : 'Statut actuel du membre'}</a></p><p>${en ? 'Membership certificate, not a licence verification.' : 'Certificat de membre, distinct de la vérification de licence.'}</p></body></html>`;
    const href = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a'); a.href = href; a.download = 'UNPRO-GOLD.html'; a.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  };
  const copy = async () => {
    if (!url || !active) return;
    try {
      await navigator.clipboard.writeText(`<iframe src="${url}?gold_badge=1" title="UNPRO GOLD" width="360" height="100" loading="lazy"></iframe>`);
      setNotice(en ? 'Badge link copied.' : 'Lien du badge copié.');
    } catch { setNotice(en ? 'Unable to copy. Please try again.' : 'Copie impossible. Réessayez.'); }
  };
  return <section className="space-y-3 border-y border-border py-4" aria-label="UNPRO GOLD">
    <h2 className="text-lg font-semibold">UNPRO GOLD</h2>
    <GoldBadge member={member.data} lang={lang} />
    {stock.isLoading ? <p role="status" className="text-sm text-muted-foreground">{en ? 'Checking availability…' : 'Vérification des disponibilités…'}</p>
      : stock.isError || stock.data?.available == null ? <div className="flex flex-wrap items-center gap-2"><p className="text-sm text-muted-foreground">{en ? 'GOLD availability is not confirmed.' : 'Disponibilité GOLD non confirmée.'}</p><Button variant="ghost" size="icon" aria-label={en ? 'Retry' : 'Réessayer'} onClick={() => { void stock.refetch(); void member.refetch(); }}><RefreshCw className="h-4 w-4" /></Button></div>
      : <p className="text-sm text-muted-foreground">{stock.data.available} {en ? 'founding numbers available' : 'numéros fondateurs disponibles'}</p>}
    {contractorId && member.isError && <p role="status" className="text-sm text-muted-foreground">{en ? 'Membership status unavailable.' : 'Statut de membre indisponible.'}</p>}
    {admin && member.data && <p className="text-sm">{en ? 'Recorded status' : 'Statut enregistré'} : {member.data.status} · {goldNumber(member.data.member_number)}</p>}
    {admin && audit.isError && <p role="status" className="text-sm text-muted-foreground">{en ? 'Audit unavailable.' : 'Historique indisponible.'}</p>}
    {admin && audit.data && audit.data.length > 0 && <ul className="space-y-1 text-sm">{audit.data.map(event => <li key={event.status}>{event.status} · {new Intl.DateTimeFormat(en ? 'en-CA' : 'fr-CA', { dateStyle: 'medium', timeZone: 'America/Toronto' }).format(new Date(event.created_at))}</li>)}</ul>}
    {member.data?.status === 'refunded' && <p className="text-sm text-muted-foreground">{en ? 'GOLD inactive following refund; the number remains reserved.' : 'GOLD inactif après remboursement; le numéro reste réservé.'}</p>}
    {active && url && <div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-11" onClick={certificate}><Download className="mr-2 h-4 w-4" />{en ? 'Certificate' : 'Certificat'}</Button><Button variant="outline" className="min-h-11" onClick={() => void copy()}><Copy className="mr-2 h-4 w-4" />{en ? 'Embeddable badge' : 'Badge intégrable'}</Button></div>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
  </section>;
}
