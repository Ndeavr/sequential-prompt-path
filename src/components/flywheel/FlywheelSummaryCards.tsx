import { motion } from "framer-motion";
import { Home, Briefcase, Zap } from "lucide-react";

const cards = [
  {
    icon: Home,
    title: "Pour les propriétaires",
    text: "UNPRO les aide à comprendre, entretenir et améliorer leur maison avec plus de confiance.",
    color: "text-primary",
    glow: "222 100% 65%",
  },
  {
    icon: Briefcase,
    title: "Pour les entrepreneurs",
    text: "UNPRO les aide à devenir plus visibles, plus crédibles et mieux recommandés au fil du temps.",
    color: "text-success",
    glow: "152 69% 51%",
  },
  {
    icon: Zap,
    title: "Pour la plateforme",
    text: "Chaque action augmente la qualité des données, la confiance et l'intelligence du réseau.",
    color: "text-accent",
    glow: "195 100% 55%",
  },
];

export const FlywheelSummaryCards = () => (
  <div className="grid md:grid-cols-3 gap-4 md:gap-6">
    {cards.map((card, i) => {
      const Icon = card.icon;
      return (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-xl p-5 md:p-6 hover:border-border/60 transition-all duration-300 group"
          style={{
            boxShadow: `0 0 20px -8px hsl(${card.glow} / 0.06)`,
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 border border-border/30"
            style={{ background: `hsl(${card.glow} / 0.08)` }}
          >
            <Icon className={`w-5 h-5 ${card.color}`} />
          </div>
          <h3 className="font-display text-body-lg font-semibold text-foreground mb-2">
            {card.title}
          </h3>
          <p className="text-body text-muted-foreground leading-relaxed">{card.text}</p>
        </motion.div>
      );
    })}
  </div>
);
