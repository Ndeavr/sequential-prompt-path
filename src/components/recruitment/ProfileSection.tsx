import { motion } from "framer-motion";
import { Users, MessageCircle, Zap, Brain, Award } from "lucide-react";

const traits = [
  { icon: Users, label: "À l'aise en rencontre 1 à 1" },
  { icon: MessageCircle, label: "Bon communicateur (simple, direct, humain)" },
  { icon: Zap, label: "Autonome et structuré" },
  { icon: Brain, label: "Comprend les besoins des entrepreneurs" },
  { icon: Award, label: "Expérience en vente = un plus (pas obligatoire)" },
];

export default function ProfileSection() {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-3xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-display font-bold text-center text-foreground mb-10"
        >
          Profil recherché
        </motion.h2>
        <div className="space-y-3">
          {traits.map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-card"
            >
              <t.icon className="h-5 w-5 text-primary shrink-0" />
              <span className="text-foreground font-medium">{t.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
