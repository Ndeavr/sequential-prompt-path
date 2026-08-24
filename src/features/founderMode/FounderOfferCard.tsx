/**
 * FounderOfferCard — replaces the 3-plan grid when Founder slots remain.
 * Offre d'entrée UNPRO : 350 $ paiement unique · live X/10 counter.
 */
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFounderSlots } from "@/hooks/useFounderSlots";

interface Props {
  onActivate: () => void;
  ctaLabel?: string;
  busy?: boolean;
}

export default function FounderOfferCard({ onActivate, ctaLabel = "Activer ma garantie — 350 $", busy }: Props) {
  const { remaining, total, loading } = useFounderSlots();
  if (loading) return null;
  if (remaining <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 md:p-6"
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-70"
        aria-hidden
        style={{
          background:
            "radial-gradient(60% 80% at 15% 0%, hsl(var(--primary)/0.35), transparent 60%), radial-gradient(60% 80% at 100% 100%, hsl(280 90% 60%/0.22), transparent 60%)",
        }}
      />
      <div className="relative">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-foreground/80">
          <Sparkles className="h-3 w-3" /> Offre Fondateur
        </div>

        <h3 className="mt-3 text-2xl font-semibold leading-tight text-foreground">
          Activez votre profil complet
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Réservé aux 10 premiers entrepreneurs activés. Paiement unique, aucun abonnement.
        </p>

        <div className="mt-4 flex items-end gap-3">
          <div className="text-4xl font-bold tracking-tight text-foreground">350 $</div>
          <div className="pb-1 text-sm text-muted-foreground">paiement unique · aucun abonnement</div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>
            <span className="font-semibold text-foreground">{remaining}</span> / {total} places restantes
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-1.5 text-xs text-foreground/80">
          <div>✓ Profil UNPRO complet, indexé dans l'écosystème IA</div>
          <div>✓ Jusqu'à 5 rendez-vous exclusifs garantis (nombre calculé avant le paiement)</div>
          <div>✓ Priorité de matching dans votre territoire</div>
          <div>✓ Paiement unique — aucun engagement récurrent</div>
        </div>

        <Button
          size="lg"
          onClick={onActivate}
          disabled={busy}
          className="mt-5 h-14 w-full rounded-2xl text-base font-semibold"
        >
          {busy ? "Préparation…" : (<>{ctaLabel} <ArrowRight className="ml-2 h-4 w-4" /></>)}
        </Button>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3" /> Paiement sécurisé Stripe · Paiement unique
        </div>
      </div>
    </motion.div>
  );
}
