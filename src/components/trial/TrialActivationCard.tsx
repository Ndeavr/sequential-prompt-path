/**
 * TrialActivationCard — "Tester UNPRO sans risque" pré-checkout.
 *
 * 7 jours pour 1 $. CTA primaire active l'essai (callback parent), CTA secondaire
 * bascule vers l'abonnement standard. Backend Stripe trial à brancher dans une
 * itération suivante; ici on expose les hooks UI.
 */
import { motion } from "framer-motion";
import { Check, Sparkles, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const BENEFITS = [
  "Activation immédiate du profil",
  "Accès complet au tableau de bord",
  "Connexion de votre agenda",
  "Visibilité IA dans votre territoire",
  "Conversations avec Alex incluses",
  "Premières opportunités envoyées",
];

interface Props {
  onActivateTrial: () => void;
  onSkipToStandard: () => void;
  loading?: boolean;
}

export default function TrialActivationCard({
  onActivateTrial,
  onSkipToStandard,
  loading,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-xl"
    >
      <div
        className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent)" }}
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-md">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Offre sans risque
          </span>
        </div>

        <h3 className="text-xl font-bold text-foreground tracking-tight">
          Tester UNPRO sans risque
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          7 jours pour 1 $ · Annulable à tout moment
        </p>

        <ul className="mt-4 grid grid-cols-1 gap-2">
          {BENEFITS.map((b, i) => (
            <motion.li
              key={b}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              className="flex items-center gap-2 text-[12.5px] text-foreground"
            >
              <span className="h-4 w-4 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5 text-primary" />
              </span>
              {b}
            </motion.li>
          ))}
        </ul>

        <div className="mt-5 space-y-2">
          <Button
            onClick={onActivateTrial}
            disabled={loading}
            className="w-full h-12 text-sm font-bold rounded-xl bg-gradient-to-r from-primary to-primary-glow hover:opacity-95 shadow-lg"
          >
            Activer mon essai 7 jours — 1 $
          </Button>
          <button
            type="button"
            onClick={onSkipToStandard}
            className="w-full text-[12px] text-muted-foreground hover:text-foreground transition-colors py-1.5"
          >
            Voir l'abonnement complet
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10.5px] text-muted-foreground">
          <Shield className="h-3 w-3" />
          Paiement sécurisé Stripe · Aucun engagement
        </div>
      </div>
    </motion.div>
  );
}
