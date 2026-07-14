import { motion } from "framer-motion";
import { Star, ArrowRight, Sparkles } from "lucide-react";

const stars = [0, 1, 2, 3, 4];

export default function HeroBeforeAfter() {
  return (
    <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-8 items-center">
      {/* Weak review */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong rounded-[28px] p-6 border border-white/5 relative"
      >
        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-3">Avant</div>
        <div className="flex gap-1 mb-3">
          {stars.map((i) => (
            <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <p className="text-white/70 text-lg leading-relaxed">"Great service."</p>
        <p className="text-white/30 text-xs mt-4">— Marie L.</p>
      </motion.div>

      {/* Arrow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="hidden md:flex items-center justify-center"
      >
        <div className="h-12 w-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
          <ArrowRight className="h-5 w-5 text-primary" />
        </div>
      </motion.div>

      {/* Strong review */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong rounded-[28px] p-6 border border-primary/30 relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="flex items-center gap-2 mb-3">
          <div className="text-[10px] uppercase tracking-widest text-primary">Après</div>
          <Sparkles className="h-3 w-3 text-primary" />
        </div>
        <div className="flex gap-1 mb-3">
          {stars.map((i) => (
            <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <p className="text-white/95 text-base leading-relaxed relative">
          "<span className="text-primary font-medium">Isolation Solution Royal</span> a soufflé{" "}
          <span className="text-primary font-medium">R-51 de fibre de verre</span> dans notre grenier à{" "}
          <span className="text-primary font-medium">Terrebonne</span>. Équipe ponctuelle, propre, et
          Jean nous a expliqué chaque étape. Facture d'électricité en baisse dès le premier mois."
        </p>
        <p className="text-white/40 text-xs mt-4">— Marie L., propriétaire vérifiée</p>
      </motion.div>
    </div>
  );
}
