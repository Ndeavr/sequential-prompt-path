import { motion } from "framer-motion";
import { MessageSquare, Shield, Brain, BarChart3 } from "lucide-react";

const values = [
  {
    icon: MessageSquare,
    title: "Meilleurs avis",
    desc: "Vos clients ne savent pas quoi écrire. UNPRO les aide à raconter la vraie histoire de votre travail.",
  },
  {
    icon: Shield,
    title: "Plus de confiance",
    desc: "Les avis détaillés convertissent 3× mieux que les avis vagues. Chaque mot compte.",
  },
  {
    icon: Brain,
    title: "Visibilité IA",
    desc: "Google, ChatGPT et Gemini comprennent enfin votre expertise. Vous apparaissez dans les bonnes recommandations.",
  },
  {
    icon: BarChart3,
    title: "Réputation structurée",
    desc: "Chaque avis devient une donnée. Communication, propreté, qualité — mesurables et exploitables.",
  },
];

export default function ValueCards() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {values.map((v, i) => {
        const Icon = v.icon;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="glass-strong rounded-3xl p-6 border border-white/5 hover:border-primary/30 transition-all"
            whileHover={{ y: -4 }}
          >
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center mb-4">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{v.title}</h3>
            <p className="text-sm text-white/60 leading-relaxed">{v.desc}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
