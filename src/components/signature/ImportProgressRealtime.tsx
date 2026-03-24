/**
 * ImportProgressRealtime — Shows real-time import progress with premium animation.
 */
import { motion } from "framer-motion";
import { Search, Globe, Star, CheckCircle, Loader2 } from "lucide-react";

interface Props {
  progress: number;
}

const STAGES = [
  { key: "google", label: "Recherche Google Business...", icon: Search, threshold: 20 },
  { key: "website", label: "Analyse du site web...", icon: Globe, threshold: 45 },
  { key: "reviews", label: "Import des avis clients...", icon: Star, threshold: 70 },
  { key: "profile", label: "Génération du profil...", icon: CheckCircle, threshold: 90 },
];

export default function ImportProgressRealtime({ progress }: Props) {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <motion.div
          animate={{ rotate: progress < 100 ? 360 : 0 }}
          transition={{ duration: 2, repeat: progress < 100 ? Infinity : 0, ease: "linear" }}
          className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center"
        >
          {progress >= 100 ? (
            <CheckCircle className="w-8 h-8 text-green-500" />
          ) : (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          )}
        </motion.div>
        <h2 className="text-lg font-bold text-foreground">
          {progress >= 100 ? "Import terminé !" : "Import en cours..."}
        </h2>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <p className="text-center text-sm font-semibold text-foreground">{progress}%</p>

      {/* Stages */}
      <div className="space-y-3">
        {STAGES.map((stage) => {
          const isActive = progress >= stage.threshold - 15 && progress < stage.threshold + 15;
          const isDone = progress >= stage.threshold;
          const Icon = stage.icon;
          return (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: isDone || isActive ? 1 : 0.4 }}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                isActive ? "bg-primary/5 border border-primary/20" : isDone ? "bg-green-500/5 border border-green-500/10" : "border border-transparent"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDone ? "bg-green-500/10" : isActive ? "bg-primary/10" : "bg-muted/20"
              }`}>
                {isDone ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <Icon className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <span className={`text-sm ${isDone ? "text-foreground font-medium" : isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {stage.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
