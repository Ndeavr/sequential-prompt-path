import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const before = [
  "Trop de soumissions sans résultat",
  "Trop de concurrence sur le même lead",
  "Demandes peu sérieuses",
  "Visibilité IA faible ou inexistante",
  "Marketing flou et coûteux",
  "Temps perdu en déplacements inutiles",
];

const after = [
  "Moins de soumissions inutiles",
  "Plus de contrats signés",
  "Clients sérieux et compatibles",
  "Visibilité IA optimisée",
  "Matching intelligent par l'IA",
  "Rendez-vous qualifiés, non partagés",
];

export default function SectionPainToOutcome() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display mb-2">
            Moins de bruit. Meilleure décision. Meilleurs clients.
          </h2>
          <p className="text-muted-foreground">Ce qui change avec UNPRO.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Before */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 space-y-3"
          >
            <p className="text-sm font-bold text-destructive uppercase tracking-wider">Avant</p>
            {before.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-foreground/70">
                <X className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                {item}
              </div>
            ))}
          </motion.div>

          {/* After */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-success/20 bg-success/5 p-6 space-y-3"
          >
            <p className="text-sm font-bold text-success uppercase tracking-wider">Avec UNPRO</p>
            {after.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                {item}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
