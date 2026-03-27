import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const rows = [
  { old: "Cold calls", unpro: "Rendez-vous fournis" },
  { old: "Leads froids partagés avec 3-4 compétiteurs", unpro: "Entrepreneurs qualifiés, exclusifs" },
  { old: "Vendre des clics Google, SEO, Facebook Ads", unpro: "Des vrais rendez-vous dans leur agenda" },
  { old: "Vente one-shot", unpro: "Revenus récurrents" },
];

export default function ComparisonSection() {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="max-w-3xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-display font-bold text-center text-foreground mb-10"
        >
          Ancien modèle vs UNPRO
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-border/60 overflow-hidden"
        >
          {/* Header */}
          <div className="grid grid-cols-2 bg-card">
            <div className="p-4 text-center font-semibold text-muted-foreground border-r border-border/60">Ancien modèle</div>
            <div className="p-4 text-center font-semibold text-primary">UNPRO</div>
          </div>

          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-2 border-t border-border/40">
              <div className="p-4 flex items-start gap-2 border-r border-border/40 bg-destructive/5">
                <X className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                <span className="text-sm text-muted-foreground">{row.old}</span>
              </div>
              <div className="p-4 flex items-start gap-2 bg-primary/5">
                <Check className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                <span className="text-sm font-medium text-foreground">{row.unpro}</span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
