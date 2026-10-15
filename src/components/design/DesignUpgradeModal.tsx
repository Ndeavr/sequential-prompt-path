/** The existing homeowner plan catalog owns upgrades; no parallel Design+ checkout. */
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DesignQuotaNotice } from '@/lib/design/quota';

interface Props { quota: DesignQuotaNotice; onClose: () => void }
export default function DesignUpgradeModal({ quota, onClose }: Props) {
  const reset = quota.resetsAt && !Number.isNaN(Date.parse(quota.resetsAt))
    ? new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Toronto', day: 'numeric', month: 'long' }).format(new Date(quota.resetsAt)) : null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="design-upgrade-title" onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4">
        <Button variant="ghost" size="icon" className="absolute top-2 right-2" aria-label="Fermer les options de forfait" onClick={onClose}><X className="w-4 h-4" /></Button>
        <Sparkles className="w-7 h-7 text-primary" />
        <h3 id="design-upgrade-title" className="text-lg font-semibold">Adoptez le plan {quota.upgradeLabel} pour continuer.</h3>
        <p className="text-sm text-muted-foreground">Votre photo, vos instructions et vos designs sont conservés.</p>
        {reset && <p className="text-sm text-muted-foreground">Ou revenez le {reset}, au renouvellement de votre quota.</p>}
        <Button asChild className="w-full"><Link to={`/tarifs/proprietaires?plan=${quota.upgradeTarget}`}>Adoptez le plan {quota.upgradeLabel}</Link></Button>
        <Button variant="outline" className="w-full" onClick={onClose}>Revenir à mon design</Button>
      </div>
    </motion.div>
  );
}
