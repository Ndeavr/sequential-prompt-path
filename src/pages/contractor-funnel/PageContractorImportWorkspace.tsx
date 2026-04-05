/**
 * UNPRO — PageContractorImportWorkspace
 * Real-time import workspace with source cards + timeline.
 */
import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RefreshCw, CheckCircle2, AlertCircle, Loader2, Search, Globe, Shield, Star, Camera, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import FunnelLayout from "@/components/contractor-funnel/FunnelLayout";
import CardGlass from "@/components/unpro/CardGlass";
import { useContractorFunnel } from "@/hooks/useContractorFunnel";
import { fadeUp, staggerContainer, scaleIn } from "@/lib/motion";
import type { ImportSourceState, ImportTimelineStep } from "@/types/contractorFunnel";
import { IMPORT_TIMELINE_STEPS } from "@/types/contractorFunnel";

const SOURCE_ICONS: Record<string, typeof Search> = {
  "Google Business": Star,
  "Site Web": Globe,
  RBQ: Shield,
  NEQ: FileText,
  "Avis Google": Star,
  Facebook: Globe,
  Instagram: Camera,
};

const STATUS_CONFIG = {
  searching: { color: "text-primary", bg: "bg-primary/10", icon: Search, label: "Recherche..." },
  matching: { color: "text-warning", bg: "bg-warning/10", icon: Loader2, label: "Correspondance..." },
  found: { color: "text-success", bg: "bg-success/10", icon: CheckCircle2, label: "Trouvé" },
  partial: { color: "text-warning", bg: "bg-warning/10", icon: AlertCircle, label: "Partiel" },
  failed: { color: "text-destructive", bg: "bg-destructive/10", icon: AlertCircle, label: "Échec" },
  retrying: { color: "text-warning", bg: "bg-warning/10", icon: RefreshCw, label: "Nouvel essai..." },
  completed: { color: "text-success", bg: "bg-success/10", icon: CheckCircle2, label: "Complété" },
};

// Simulate import process
function useSimulatedImport(businessName: string) {
  const [sources, setSources] = useState<ImportSourceState[]>([]);
  const [timeline, setTimeline] = useState<ImportTimelineStep[]>([...IMPORT_TIMELINE_STEPS]);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const startImport = useCallback(() => {
    const sourceNames = ["Google Business", "Site Web", "RBQ", "NEQ", "Avis Google"];
    const initialSources: ImportSourceState[] = sourceNames.map((name, i) => ({
      id: `src-${i}`,
      sourceName: name,
      status: "searching" as const,
      confidenceScore: 0,
    }));
    setSources(initialSources);

    // Simulate progressive updates
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const pct = Math.min(step * 9, 100);
      setProgress(pct);

      // Update sources
      setSources((prev) =>
        prev.map((s, i) => {
          if (step > i * 2 + 1 && s.status === "searching") {
            return { ...s, status: "matching", confidenceScore: 40 + Math.random() * 20 };
          }
          if (step > i * 2 + 3 && s.status === "matching") {
            const success = Math.random() > 0.15;
            return {
              ...s,
              status: success ? "found" : "partial",
              confidenceScore: success ? 85 + Math.random() * 15 : 45 + Math.random() * 20,
              message: success ? `${businessName} détecté` : "Données partielles",
            };
          }
          return s;
        })
      );

      // Update timeline
      setTimeline((prev) =>
        prev.map((t, i) => {
          if (step >= i * 1 + 1 && t.status === "pending") {
            return { ...t, status: "running" };
          }
          if (step >= i * 1 + 3 && t.status === "running") {
            return { ...t, status: "completed", message: "✓" };
          }
          return t;
        })
      );

      if (step >= 14) {
        clearInterval(interval);
        setProgress(100);
        setSources((prev) =>
          prev.map((s) => ({
            ...s,
            status: s.status === "searching" || s.status === "matching" ? "completed" : s.status,
            confidenceScore: s.confidenceScore < 60 ? 60 + Math.random() * 20 : s.confidenceScore,
          }))
        );
        setTimeline((prev) =>
          prev.map((t) => ({ ...t, status: "completed" as const }))
        );
        setIsDone(true);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [businessName]);

  return { sources, timeline, progress, isDone, startImport };
}

export default function PageContractorImportWorkspace() {
  const { state, updateState, goToStep } = useContractorFunnel();
  const { sources, timeline, progress, isDone, startImport } = useSimulatedImport(state.businessName || "Entreprise");

  useEffect(() => {
    const cleanup = startImport();
    return cleanup;
  }, [startImport]);

  // Sync state
  useEffect(() => {
    updateState({ importSources: sources, importTimeline: timeline, importProgress: progress });
  }, [sources, timeline, progress]);

  return (
    <>
      <Helmet>
        <title>Import en cours — {state.businessName || "AIPP"} | UNPRO</title>
      </Helmet>

      <FunnelLayout currentStep="import_workspace" width="wide">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ─── Left: Source Cards ─── */}
          <div className="lg:col-span-3 space-y-4">
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <h2 className="text-xl font-bold font-display text-foreground mb-1">
                Import de {state.businessName || "votre entreprise"}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Nos agents analysent vos données publiques en temps réel
              </p>

              {/* Global progress */}
              <div className="relative h-2 rounded-full bg-muted overflow-hidden mb-6">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-secondary"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </motion.div>

            {/* Source cards */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="space-y-3"
            >
              <AnimatePresence>
                {sources.map((source) => {
                  const config = STATUS_CONFIG[source.status];
                  const Icon = SOURCE_ICONS[source.sourceName] || Search;
                  const StatusIcon = config.icon;
                  return (
                    <motion.div
                      key={source.id}
                      variants={scaleIn}
                      layout
                    >
                      <CardGlass noAnimation className="!p-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${config.bg}`}>
                            <Icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{source.sourceName}</span>
                              {source.confidenceScore > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(source.confidenceScore)}%
                                </span>
                              )}
                            </div>
                            {source.message && (
                              <p className="text-xs text-muted-foreground truncate">{source.message}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <StatusIcon
                              className={`h-4 w-4 ${config.color} ${
                                source.status === "searching" || source.status === "matching" || source.status === "retrying"
                                  ? "animate-spin"
                                  : ""
                              }`}
                            />
                            <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                          </div>
                        </div>
                      </CardGlass>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* ─── Right: Timeline ─── */}
          <div className="lg:col-span-2">
            <CardGlass noAnimation className="sticky top-24">
              <h3 className="text-sm font-semibold text-foreground mb-4">Progression</h3>
              <div className="space-y-3">
                {timeline.map((step, i) => {
                  const isActive = step.status === "running";
                  const isDone = step.status === "completed";
                  return (
                    <div key={step.key} className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                          ${isDone ? "bg-success/20 text-success" : isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : isActive ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </div>
                      <span
                        className={`text-xs ${
                          isDone ? "text-foreground" : isActive ? "text-foreground font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Continue button */}
              {isDone && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <Button
                    className="w-full h-12 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-[var(--shadow-glow)]"
                    onClick={() => goToStep("aipp_builder")}
                  >
                    Voir mon profil AIPP
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </CardGlass>
          </div>
        </div>
      </FunnelLayout>
    </>
  );
}
