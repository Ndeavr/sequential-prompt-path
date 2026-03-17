import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, ChevronRight, Shield, Check, Sparkles, ArrowRight, Award, Clock, ExternalLink } from "lucide-react";
import { PremiumMagneticButton } from "@/components/ui/PremiumMagneticButton";

interface Props {
  planName: string;
  price: number;
  interval: "month" | "year";
  aippScore: number;
  objective: string;
  onPay: () => void;
}

const addOns = [
  { id: "city-pages", label: "Pages ville supplémentaires", desc: "Étendez votre présence à plus de villes", price: 29 },
  { id: "review-campaign", label: "Campagne d'avis", desc: "Collecte automatisée d'avis clients", price: 49 },
  { id: "photo-enhance", label: "Amélioration photos", desc: "Portfolio optimisé par IA", price: 39 },
  { id: "logo-redesign", label: "Refonte du logo", desc: "Image de marque professionnelle", price: 149 },
  { id: "faq-pack", label: "Pack FAQ Autorité", desc: "Contenu FAQ optimisé pour le SEO", price: 59 },
];

export default function StepPayment({ planName, price, interval, aippScore, objective, onPay }: Props) {
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const toggleAddOn = (id: string) => setSelectedAddOns(p => p.includes(id) ? p.filter(a => a !== id) : [...p, id]);
  const addOnTotal = addOns.filter(a => selectedAddOns.includes(a.id)).reduce((s, a) => s + a.price, 0);
  const total = price + addOnTotal;
  const targetAipp = Math.min(100, aippScore + 25);

  return (
    <div className="dark min-h-screen px-4 py-10">
      <div className="w-full max-w-lg mx-auto space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-success text-xs font-semibold uppercase tracking-wide">
            <Lock className="w-3 h-3" /> Paiement sécurisé
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
            Finalisez votre commande
          </h2>
        </motion.div>

        {/* Order summary — premium card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/60 to-primary/[0.03] backdrop-blur-xl p-5 space-y-4 shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-bold text-foreground">Plan {planName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{interval === "year" ? "Facturation annuelle" : "Facturation mensuelle"}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{price}$</p>
              <p className="text-[10px] text-muted-foreground">/{interval === "month" ? "mois" : "an"}</p>
            </div>
          </div>
          <div className="h-px bg-border/20" />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/10 border border-border/20">
              <Award className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Score AIPP</p>
                <p className="text-xs font-bold text-foreground">{aippScore} → <span className="text-success">{targetAipp}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/10 border border-border/20">
              <Clock className="w-4 h-4 text-accent" />
              <div>
                <p className="text-[10px] text-muted-foreground">Activation</p>
                <p className="text-xs font-bold text-foreground">Immédiate</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Add-ons */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-2.5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-primary" /> Options supplémentaires
          </p>
          {addOns.map(addon => (
            <button key={addon.id} onClick={() => toggleAddOn(addon.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${
                selectedAddOns.includes(addon.id)
                  ? "bg-primary/[0.06] border border-primary/30"
                  : "bg-muted/[0.05] border border-transparent hover:bg-muted/10 hover:border-border/20"
              }`}>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                selectedAddOns.includes(addon.id)
                  ? "bg-primary border-primary"
                  : "border-border/40 group-hover:border-border/60"
              }`}>
                {selectedAddOns.includes(addon.id) && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">{addon.label}</span>
                <p className="text-[10px] text-muted-foreground/60">{addon.desc}</p>
              </div>
              <span className="text-sm font-semibold text-muted-foreground">+{addon.price}$</span>
            </button>
          ))}
        </motion.div>

        {/* Total + CTA */}
        <div className="rounded-xl border border-border/30 bg-card/30 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total aujourd'hui</p>
            <p className="text-2xl font-bold text-foreground">{total}$<span className="text-sm text-muted-foreground font-normal">/{interval === "month" ? "mois" : "an"}</span></p>
          </div>
          {selectedAddOns.length > 0 && (
            <p className="text-[10px] text-muted-foreground">+{selectedAddOns.length} option{selectedAddOns.length > 1 ? "s" : ""}</p>
          )}
        </div>

        {/* Stripe Checkout info */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="rounded-xl border border-accent/20 bg-accent/[0.04] p-3.5 flex items-start gap-3">
          <ExternalLink className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Vous serez redirigé vers notre page de paiement sécurisée Stripe pour compléter votre achat.
          </p>
        </motion.div>

        <PremiumMagneticButton
          onReleaseAction={onPay}
          variant="indigo"
          fullWidth
          iconRight={<ArrowRight className="w-4 h-4" />}
          className="h-14 text-base font-bold"
        >
          <Lock className="w-4 h-4" />
          Payer et activer maintenant
        </PremiumMagneticButton>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-muted-foreground/50 pb-4">
          <span className="inline-flex items-center gap-1"><Shield className="w-3 h-3 text-success/50" /> Chiffrement 256-bit</span>
          <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" /> Annulation sans frais</span>
          <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> Activation instantanée</span>
          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Garantie 30 jours</span>
        </div>
      </div>
    </div>
  );
}
