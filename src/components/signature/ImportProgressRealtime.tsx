/**
 * ImportProgressRealtime — Shows real-time import progress with source-by-source status.
 */
import { motion } from "framer-motion";
import { Search, Globe, Star, CheckCircle, Loader2, Facebook, MapPin, Shield, BarChart3 } from "lucide-react";
import type { ImportModule } from "@/pages/signature/PageAlexGuidedOnboarding";

interface Props {
  progress: number;
  modules?: ImportModule[];
}

const DEFAULT_STAGES = [
  { key: "identity", label: "Identification de l'entreprise...", icon: Search, threshold: 15 },
  { key: "google", label: "Recherche Google Business...", icon: MapPin, threshold: 30 },
  { key: "website", label: "Analyse du site web...", icon: Globe, threshold: 50 },
  { key: "facebook", label: "Détection réseaux sociaux...", icon: Facebook, threshold: 65 },
  { key: "analysis", label: "Analyse de confiance...", icon: Shield, threshold: 80 },
  { key: "aipp", label: "Calcul du score AIPP...", icon: BarChart3, threshold: 90 },
];

const ICON_MAP: Record<string, any> = {
  identity: Search,
  google: MapPin,
  facebook: Facebook,
  website: Globe,
  matching: Shield,
  analysis: Star,
  aipp: BarChart3,
  plan: CheckCircle,
};

export default function ImportProgressRealtime({ progress, modules }: Props) {
  const stages = modules && modules.length > 0
    ? modules.map((m, i) => ({
        key: m.id,
        label: m.label,
        icon: ICON_MAP[m.id] || Search,
        threshold: Math.round(((i + 1) / modules.length) * 100),
        status: m.status,
        messages: m.messages,
      }))
    : DEFAULT_STAGES.map(s => ({ ...s, status: undefined, messages: undefined }));

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
        <p className="text-xs text-muted-foreground">
          {progress < 100
            ? "Nous recherchons vos informations publiques pour construire votre profil."
            : "Toutes les sources ont été analysées."}
        </p>
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
      <div className="space-y-2">
        {stages.map((stage) => {
          const isActive = progress >= (stage.threshold - 15) && progress < stage.threshold;
          const isDone = stage.status === "completed" || stage.status === "partial" || progress >= stage.threshold;
          const isMissing = stage.status === "missing";
          const Icon = stage.icon;

          return (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: isDone || isActive ? 1 : 0.4 }}
              className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                isActive
                  ? "bg-primary/5 border border-primary/20"
                  : isDone && !isMissing
                  ? "bg-green-500/5 border border-green-500/10"
                  : isMissing
                  ? "bg-amber-500/5 border border-amber-500/10"
                  : "border border-transparent"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isDone && !isMissing ? "bg-green-500/10" : isMissing ? "bg-amber-500/10" : isActive ? "bg-primary/10" : "bg-muted/20"
              }`}>
                {isDone && !isMissing ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : isMissing ? (
                  <Icon className="w-4 h-4 text-amber-500" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <Icon className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${isDone ? "text-foreground font-medium" : isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {stage.label}
                </span>
                {stage.messages && stage.messages.length > 0 && isDone && (
                  <div className="mt-1 space-y-0.5">
                    {stage.messages.map((msg, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground">{msg}</p>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
