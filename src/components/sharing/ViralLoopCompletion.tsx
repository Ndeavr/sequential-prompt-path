/**
 * UNPRO — Viral Loop Completion Component (Licorne Loop 🦄)
 * Shown after feature completion to encourage sharing and track progress.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useReferralProgress } from "@/hooks/useReferralProgress";
import { Share2, Gift, Trophy, ArrowRight, Sparkles, Check } from "lucide-react";

interface ViralLoopCompletionProps {
  featureLabel: string;
  onShare: () => void;
  onContinue: () => void;
}

export default function ViralLoopCompletion({ featureLabel, onShare, onContinue }: ViralLoopCompletionProps) {
  const { progress } = useReferralProgress();
  const [shared, setShared] = useState(false);

  const nextMilestone = progress.find(p => !p.unlocked);
  const lastUnlocked = [...progress].reverse().find(p => p.unlocked);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-sm mx-auto space-y-4"
    >
      {/* Success header */}
      <Card className="border-0 bg-gradient-to-b from-emerald-500/10 to-transparent overflow-hidden">
        <CardContent className="p-5 text-center space-y-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="h-14 w-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto"
          >
            <Check className="h-7 w-7 text-emerald-500" />
          </motion.div>
          <h2 className="text-lg font-bold text-foreground">{featureLabel} complété ! 🎉</h2>
          <p className="text-sm text-muted-foreground">
            Partagez pour débloquer des récompenses
          </p>
        </CardContent>
      </Card>

      {/* Progress toward next reward */}
      {nextMilestone && (
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold">Prochain objectif</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {nextMilestone.currentCount}/{nextMilestone.targetCount}
              </Badge>
            </div>
            <Progress
              value={(nextMilestone.currentCount / nextMilestone.targetCount) * 100}
              className="h-2"
            />
            <div className="flex items-center gap-2">
              <Gift className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">
                {nextMilestone.config?.rewardLabel || "Récompense"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recently unlocked */}
      {lastUnlocked && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-primary">Débloqué !</p>
                <p className="text-xs text-muted-foreground">{lastUnlocked.config?.rewardLabel}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <Button
          onClick={() => { setShared(true); onShare(); }}
          className="w-full gap-2 rounded-xl"
          size="lg"
          variant={shared ? "secondary" : "default"}
        >
          {shared ? (
            <><Check className="h-4 w-4" />Partagé !</>
          ) : (
            <><Share2 className="h-4 w-4" />Inviter d'autres personnes</>
          )}
        </Button>
        <Button
          onClick={onContinue}
          variant="ghost"
          className="w-full gap-2 rounded-xl text-muted-foreground"
        >
          Continuer <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
