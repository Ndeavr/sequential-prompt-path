
import { motion } from "framer-motion";
import { ShieldCheck, Users, TrendingUp, Lock } from "lucide-react";

const REASONS = [
  { icon: ShieldCheck, title: "Qualité des rendez-vous", desc: "Moins de pros = plus de projets rentables par entrepreneur." },
  { icon: Users, title: "Éviter la saturation", desc: "Trop d'offre tue la demande. 30 pros max par plan garantit l'équilibre." },
  { icon: TrendingUp, title: "Maximiser vos revenus", desc: "Chaque fondateur reçoit un volume supérieur de clients qualifiés." },
  { icon: Lock, title: "Protéger le territoire", desc: "Votre zone de service est réservée. Aucun nouveau concurrent pendant 10 ans." },
];

export default function SectionWhyFounderPlans() {
  return (
    <section className="px-4 pb-20">
      <div className="max-w-3xl mx-auto space-y-8">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-2xl md:text-3xl font-bold text-center text-foreground"
        >
          Pourquoi seulement 30 places ?
        </motion.h2>

        <div className="grid sm:grid-cols-2 gap-4">
          {REASONS.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i }}
              className="p-5 rounded-xl border border-border/30 bg-card/40 backdrop-blur space-y-2"
            >
              <r.icon className="h-5 w-5 text-primary" />
              <h4 className="font-semibold text-foreground text-sm">{r.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
