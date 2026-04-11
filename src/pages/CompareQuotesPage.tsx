/**
 * UNPRO — Compare 3 Quotes Flow (Public landing page)
 */

import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Upload, ArrowRight, CheckCircle2, Shield, Star, Brain,
  FileText, BarChart3, AlertTriangle, ChevronRight, Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

export default function CompareQuotesPage() {
  const { isAuthenticated } = useAuth();
  const cta = "/analyse-soumissions/importer";

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-[-10%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-5 pt-28 pb-16 md:pt-36 md:pb-24">
          <motion.div className="space-y-5 max-w-lg" initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-primary/8 text-primary text-caption font-semibold">
              <Brain className="h-3 w-3" /> Propulsé par l'IA
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-hero-sm md:text-hero text-foreground">
              Comparez <span className="text-gradient">3 soumissions</span> en 30 secondes
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-body text-muted-foreground max-w-sm mx-auto">
              Téléversez vos soumissions. Notre IA analyse les prix, la couverture et les risques pour vous recommander la meilleure option.
            </motion.p>
            <motion.div variants={fadeUp} custom={3}>
              <Button asChild size="xl" className="rounded-2xl shadow-glow">
                <Link to={cta}>Analyser jusqu'à 3 soumissions <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Upload Preview ── */}
      <section className="px-5 py-10">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="glass-card-elevated rounded-2xl p-6 space-y-4">
              {/* Upload slots */}
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="upload-zone rounded-xl p-4 flex flex-col items-center gap-2">
                    <Upload className="h-5 w-5 text-primary/50" />
                    <p className="text-caption font-medium text-muted-foreground">Soumission {n}</p>
                  </div>
                ))}
              </div>

              <div className="divider-gradient" />

              {/* What gets analyzed */}
              <div className="space-y-2">
                <p className="text-meta font-semibold text-foreground">L'IA analyse pour vous :</p>
                {[
                  { icon: BarChart3, text: "Comparaison des prix ligne par ligne" },
                  { icon: Shield, text: "Couverture d'assurance et garanties" },
                  { icon: AlertTriangle, text: "Éléments manquants et risques" },
                  { icon: Star, text: "Score de confiance par soumission" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-primary/6 flex items-center justify-center shrink-0">
                      <item.icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-meta text-muted-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Comparison Preview ── */}
      <section className="px-5 py-10 relative">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <h2 className="text-section text-foreground">Résultat de l'analyse</h2>
            <p className="text-meta text-muted-foreground mt-1">Exemple de comparaison IA</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="glass-card-elevated rounded-2xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-4 gap-0 text-center bg-muted/30 border-b border-border/40">
                <div className="p-3 text-caption font-semibold text-muted-foreground">Critère</div>
                <div className="p-3 text-caption font-semibold text-muted-foreground">Soum. A</div>
                <div className="p-3 text-caption font-semibold text-success border-x border-border/20 bg-success/4">Soum. B ⭐</div>
                <div className="p-3 text-caption font-semibold text-muted-foreground">Soum. C</div>
              </div>

              {/* Table rows */}
              {[
                { label: "Prix total", a: "8 500$", b: "7 200$", c: "9 800$" },
                { label: "Matériaux", a: "Standard", b: "Premium", c: "Standard" },
                { label: "Garantie", a: "1 an", b: "5 ans", c: "2 ans" },
                { label: "Score IA", a: "72", b: "91", c: "65" },
              ].map((row, i) => (
                <div key={row.label} className={`grid grid-cols-4 gap-0 text-center ${i < 3 ? "border-b border-border/20" : ""}`}>
                  <div className="p-3 text-caption font-medium text-foreground text-left">{row.label}</div>
                  <div className="p-3 text-caption text-muted-foreground">{row.a}</div>
                  <div className="p-3 text-caption font-semibold text-foreground border-x border-border/20 bg-success/4">{row.b}</div>
                  <div className="p-3 text-caption text-muted-foreground">{row.c}</div>
                </div>
              ))}

              {/* Recommendation */}
              <div className="p-4 bg-success/6 border-t border-success/15 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <p className="text-caption text-foreground"><strong>Recommandation :</strong> Soumission B — meilleur rapport qualité-prix avec garantie étendue.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-5 py-14">
        <div className="max-w-lg mx-auto text-center space-y-5">
          <Sparkles className="h-8 w-8 text-primary mx-auto" />
          <h2 className="text-section text-foreground">Prêt à comparer vos soumissions?</h2>
          <p className="text-body text-muted-foreground max-w-sm mx-auto">
            C'est gratuit, rapide et confidentiel.
          </p>
          <Button asChild size="xl" variant="premium" className="rounded-2xl">
            <Link to={cta}>Analyser jusqu'à 3 soumissions <ChevronRight className="h-5 w-5 ml-1" /></Link>
          </Button>
          <div className="flex items-center justify-center gap-4">
            {[
              { icon: CheckCircle2, label: "100% gratuit" },
              { icon: Shield, label: "Données sécurisées" },
              { icon: Brain, label: "Analyse IA" },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-1">
                <b.icon className="h-3 w-3 text-success" />
                <span className="text-caption font-medium text-muted-foreground">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
