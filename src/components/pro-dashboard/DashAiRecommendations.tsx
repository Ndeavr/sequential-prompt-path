/**
 * AI Recommendations
 */
import { motion } from "framer-motion";
import { Brain, ArrowRight, MapPin, Zap, TrendingUp } from "lucide-react";

interface Props { completeness: number; plan: string; aipp: number; }

export default function DashAiRecommendations({ completeness, plan, aipp }: Props) {
  const recs = [
    completeness < 80 && { icon: TrendingUp, text: "Complétez votre profil pour augmenter votre visibilité", impact: "+15% rendez-vous" },
    plan === "recrue" && { icon: Zap, text: "Passez Pro pour accéder aux projets L", impact: "+3x rendez-vous" },
    plan === "pro" && { icon: Zap, text: "Activez Premium pour les projets XL et l'auto-acceptation", impact: "+5x rendez-vous" },
    aipp < 60 && { icon: TrendingUp, text: "Améliorez votre score AIPP pour monter dans les résultats", impact: "+20% visibilité" },
    { icon: MapPin, text: "Étendez votre territoire pour couvrir plus de zones", impact: "+rendez-vous" },
  ].filter(Boolean) as { icon: any; text: string; impact: string }[];

  if (recs.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
      className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Recommandations IA</span>
      </div>
      <div className="space-y-2">
        {recs.slice(0, 4).map((r, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-primary/[0.04] transition-colors cursor-pointer group">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <r.icon className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{r.text}</p>
              <p className="text-[10px] text-success font-semibold">{r.impact}</p>
            </div>
            <ArrowRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary transition-colors" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
