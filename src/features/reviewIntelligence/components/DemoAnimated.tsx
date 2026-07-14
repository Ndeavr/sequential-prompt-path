import { motion } from "framer-motion";
import { MessageSquare, Sparkles, Star, TrendingUp, Send } from "lucide-react";

const steps = [
  { icon: Send, label: "Demande envoyée", color: "from-blue-500 to-cyan-500" },
  { icon: MessageSquare, label: "SMS reçu", color: "from-cyan-500 to-teal-500" },
  { icon: Sparkles, label: "IA génère l'avis", color: "from-teal-500 to-emerald-500" },
  { icon: Star, label: "Publié sur Google", color: "from-emerald-500 to-amber-500" },
  { icon: TrendingUp, label: "Alex recommande", color: "from-amber-500 to-primary" },
];

export default function DemoAnimated() {
  return (
    <div className="relative">
      <div className="grid md:grid-cols-5 gap-3 md:gap-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="glass-strong rounded-2xl p-4 border border-white/5 relative"
            >
              <div
                className={`h-10 w-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3 shadow-lg`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
                Étape {i + 1}
              </div>
              <div className="text-sm font-medium text-white">{s.label}</div>
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary"
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
