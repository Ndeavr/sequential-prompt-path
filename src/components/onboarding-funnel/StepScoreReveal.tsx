/**
 * StepScoreReveal — Reveals the pre-UNPRO AIPP score with animated gauge.
 */
import { motion } from "framer-motion";
import { Eye, EyeOff, AlertTriangle, TrendingDown, Shield, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";

interface ScoreData {
  pre_unpro_score: number;
  ai_visibility_score: number;
  trust_score: number;
  structure_score: number;
  local_authority_score: number;
  completeness_score: number;
}

interface Props {
  businessName: string;
  contractorId: string | null;
  onContinue: () => void;
  onScoreComputed?: (score: ScoreData) => void;
}

function getScoreLabel(score: number) {
  if (score >= 86) return { label: "Dominant", color: "text-green-400", bg: "from-green-500/20" };
  if (score >= 71) return { label: "Bien positionné", color: "text-blue-400", bg: "from-blue-500/20" };
  if (score >= 41) return { label: "Partiellement visible", color: "text-yellow-400", bg: "from-yellow-500/20" };
  return { label: "Invisible", color: "text-red-400", bg: "from-red-500/20" };
}

const SCORE_DIMENSIONS = [
  { key: "ai_visibility_score", label: "Visibilité IA", icon: Eye },
  { key: "structure_score", label: "Structure du profil", icon: BarChart3 },
  { key: "local_authority_score", label: "Autorité locale", icon: Shield },
  { key: "trust_score", label: "Confiance perçue", icon: Shield },
  { key: "completeness_score", label: "Complétude données", icon: BarChart3 },
];

export default function StepScoreReveal({ businessName, contractorId, onContinue, onScoreComputed }: Props) {
  const [score, setScore] = useState<ScoreData | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  // Mock score computation (will be replaced by real API)
  useEffect(() => {
    const timer = setTimeout(() => {
      const mockScore: ScoreData = {
        pre_unpro_score: 34,
        ai_visibility_score: 28,
        trust_score: 42,
        structure_score: 30,
        local_authority_score: 25,
        completeness_score: 45,
      };
      setScore(mockScore);
      onScoreComputed?.(mockScore);
    }, 1500);
    return () => clearTimeout(timer);
  }, [contractorId, onScoreComputed]);

  // Animate score counter
  useEffect(() => {
    if (!revealed || !score) return;
    const target = score.pre_unpro_score;
    let current = 0;
    const iv = setInterval(() => {
      current += 1;
      setAnimatedScore(current);
      if (current >= target) clearInterval(iv);
    }, 30);
    return () => clearInterval(iv);
  }, [revealed, score]);

  if (!score) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Analyse de votre visibilité en cours...</p>
      </div>
    );
  }

  const { label, color, bg } = getScoreLabel(score.pre_unpro_score);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Comment l'IA perçoit {businessName}</h2>
        <p className="text-sm text-muted-foreground">Voici votre score de visibilité actuel avant UNPRO</p>
      </div>

      {!revealed ? (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setRevealed(true)}
          className="w-full h-16 rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center gap-3 text-foreground font-bold"
        >
          <EyeOff className="w-5 h-5" />
          Révéler mon score
        </motion.button>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          {/* Main score gauge */}
          <div className={`relative rounded-2xl bg-gradient-to-br ${bg} to-card border border-border/40 p-6 text-center`}>
            <div className="text-6xl font-black text-foreground tabular-nums">{animatedScore}</div>
            <div className="text-sm text-muted-foreground mt-1">/ 100</div>
            <div className={`text-sm font-bold mt-2 ${color}`}>{label}</div>
          </div>

          {/* Dimension breakdown */}
          <div className="space-y-3">
            {SCORE_DIMENSIONS.map(({ key, label: dimLabel, icon: Icon }) => {
              const val = (score as any)[key] as number;
              return (
                <div key={key} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground flex-1">{dimLabel}</span>
                  <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${val}%` }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                  <span className="text-xs font-mono text-foreground w-8 text-right">{val}</span>
                </div>
              );
            })}
          </div>

          {/* Warning message */}
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Ce score réduit votre visibilité</p>
              <p className="text-xs text-muted-foreground mt-1">Les moteurs IA ne vous recommandent pas encore. UNPRO peut changer ça.</p>
            </div>
          </div>

          {/* CTA */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onContinue}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg flex items-center justify-center gap-2"
          >
            <TrendingDown className="w-5 h-5" />
            Voir ce que je laisse sur la table →
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
