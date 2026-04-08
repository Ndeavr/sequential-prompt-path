/**
 * UNPRO Condo — Hero Section Teaser
 * Premium hero with value prop, CTAs, and dashboard mockup preview.
 */
import { motion } from "framer-motion";
import { ArrowRight, Shield, Smartphone, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MICRO_PROOFS = [
  { icon: Building2, label: "Québec-first" },
  { icon: Shield, label: "Conformité guidée" },
  { icon: Smartphone, label: "Mobile-first" },
  { icon: CheckCircle2, label: "Syndicats & autogestion" },
];

interface Props {
  onCTAClick?: () => void;
}

export default function HeroSectionCondoTeaser({ onCTAClick }: Props) {
  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-12 md:pt-24 md:pb-20">
      {/* Aura background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-5xl mx-auto text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-5"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary/80 border border-primary/20 rounded-full px-4 py-1.5">
            Bientôt disponible
          </span>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold font-display text-foreground leading-[1.1] tracking-tight">
            La gestion de copropriété au&nbsp;Québec,{" "}
            <span className="text-primary">enfin&nbsp;claire.</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Loi&nbsp;16, documents, fonds, assemblées, suivis, attestation, transfert du&nbsp;CA&nbsp;:
            UNPRO&nbsp;Condo simplifie tout dans une seule plateforme.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3 items-center justify-center"
        >
          <Button size="lg" className="gap-2 text-base px-8" onClick={onCTAClick}>
            Demander l'accès prioritaire <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" className="text-base px-8" asChild>
            <a href="#comment-ca-fonctionne">Voir comment ça fonctionne</a>
          </Button>
        </motion.div>

        {/* Micro proofs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap justify-center gap-4 md:gap-6"
        >
          {MICRO_PROOFS.map((p) => (
            <div key={p.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <p.icon className="h-3.5 w-3.5 text-primary/70" />
              <span>{p.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8 mx-auto max-w-3xl"
        >
          <div className="glass-card rounded-2xl border border-border/40 p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span className="text-xs font-medium text-foreground">Tableau de bord — 42 rue des Érables</span>
              </div>
              <span className="text-[10px] text-muted-foreground">UNPRO Condo</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Conformité", value: "78%", color: "text-warning" },
                { label: "Documents", value: "24", color: "text-primary" },
                { label: "Prochaine AG", value: "15 mai", color: "text-foreground" },
                { label: "Fonds prév.", value: "82 400 $", color: "text-success" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-muted/40 p-3 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</span>
                  <p className={`text-lg font-bold font-display ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {["3 tâches urgentes", "Attestation à préparer", "Relève CA en cours"].map((t) => (
                <span key={t} className="text-[10px] bg-primary/10 text-primary rounded-full px-2.5 py-1">{t}</span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
