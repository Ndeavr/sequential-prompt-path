import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GraduationCap, Sun, Clock, Home } from "lucide-react";

const pills = [
  { icon: GraduationCap, label: "Étudiants bienvenus" },
  { icon: Clock, label: "Temps partiel OK" },
  { icon: Sun, label: "☕ En personne ou remote" },
];

interface Props {
  onSimulate: () => void;
  onApply: () => void;
}

export default function HeroSectionCloser({ onSimulate, onApply }: Props) {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gray-950 px-4 py-20">
      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-secondary/15 blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-white leading-tight"
        >
          Job d'été. Pas de bureau. Pas de cold call.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed"
        >
          Rencontre des entrepreneurs dans un café. Crée leur profil IA en live.
          Encaisse des commissions récurrentes.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-2"
        >
          {pills.map((pill) => (
            <span
              key={pill.label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-sm text-gray-200 border border-white/10"
            >
              <pill.icon className="h-3.5 w-3.5" />
              {pill.label}
            </span>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button size="lg" onClick={onSimulate} className="text-base px-8 py-6 font-semibold">
            Voir combien tu peux gagner
          </Button>
          <Button size="lg" variant="outline" onClick={onApply} className="text-base px-8 py-6 font-semibold border-white/20 text-white hover:bg-white/10">
            Postuler maintenant
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
