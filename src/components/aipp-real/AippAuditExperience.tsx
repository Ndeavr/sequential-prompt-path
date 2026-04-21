import { motion } from "framer-motion";
import type { AippAuditViewModel } from "@/types/aippReal";
import AippHeroHeader from "./AippHeroHeader";
import AippStatusBanner from "./AippStatusBanner";
import AippMainScoreCard from "./AippMainScoreCard";
import AippSourcesCard from "./AippSourcesCard";
import AippBreakdownGrid from "./AippBreakdownGrid";
import AippPriorityBlockersCard from "./AippPriorityBlockersCard";
import AippStrengthsCard from "./AippStrengthsCard";
import AippPotentialCard from "./AippPotentialCard";
import AippActionPlanCard from "./AippActionPlanCard";
import AippConversionCard from "./AippConversionCard";
import AippAuditTimelineCard from "./AippAuditTimelineCard";
import AippDebugDrawer from "./AippDebugDrawer";

interface Props {
  model: AippAuditViewModel;
  isAdmin?: boolean;
  onLaunchAudit?: () => void;
  launching?: boolean;
}

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function AippAuditExperience({ model, isAdmin, onLaunchAudit, launching }: Props) {
  const isRunning = model.analysisStatus === "running" || model.analysisStatus === "pending";
  const hasResult = model.analysisStatus === "complete" || model.analysisStatus === "partial";

  return (
    <motion.div
      className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8"
      initial="hidden" animate="visible" variants={stagger}
    >
      <motion.div variants={fadeUp}><AippHeroHeader model={model} /></motion.div>
      <motion.div variants={fadeUp}><AippStatusBanner model={model} /></motion.div>

      {!model.auditId && !isRunning && (
        <motion.div variants={fadeUp} className="glass-card p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold">Découvrez comment votre entreprise est perçue</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Nous analysons votre présence web, vos signaux de confiance et votre capacité à convertir.
          </p>
          <button
            onClick={onLaunchAudit}
            disabled={launching}
            className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {launching ? "Lancement..." : "Lancer mon analyse"}
          </button>
        </motion.div>
      )}

      {isRunning && (
        <motion.div variants={fadeUp} className="glass-card p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
            <span className="font-semibold">Analyse en cours...</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: "5%" }}
              animate={{ width: `${model.jobProgress || 10}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Nous validons vos signaux publics pour produire un score réel, jamais inventé.
          </p>
          <div className="space-y-2">
            {["Site web détecté", "Métadonnées analysées", "Présence Google en vérification", "Signaux de confiance en validation", "Score en calcul"].map((step, i) => {
              const progress = model.jobProgress || 0;
              const done = progress > (i + 1) * 18;
              const active = !done && progress > i * 18;
              return (
                <div key={step} className="flex items-center gap-2 text-sm">
                  {done ? (
                    <span className="text-success">✓</span>
                  ) : active ? (
                    <span className="animate-pulse text-primary">●</span>
                  ) : (
                    <span className="text-muted-foreground">○</span>
                  )}
                  <span className={done ? "text-foreground" : "text-muted-foreground"}>{step}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {hasResult && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <motion.div className="xl:col-span-7 space-y-6" variants={stagger}>
            <motion.div variants={fadeUp}><AippMainScoreCard model={model} /></motion.div>
            <motion.div variants={fadeUp}><AippPriorityBlockersCard model={model} /></motion.div>
            <motion.div variants={fadeUp}><AippActionPlanCard model={model} /></motion.div>
            <motion.div variants={fadeUp}><AippBreakdownGrid model={model} /></motion.div>
            <motion.div variants={fadeUp}><AippStrengthsCard model={model} /></motion.div>
          </motion.div>
          <motion.div className="xl:col-span-5 space-y-6" variants={stagger}>
            <motion.div variants={fadeUp}><AippSourcesCard model={model} /></motion.div>
            <motion.div variants={fadeUp}><AippPotentialCard model={model} /></motion.div>
            <motion.div variants={fadeUp}><AippConversionCard model={model} /></motion.div>
            <motion.div variants={fadeUp}><AippAuditTimelineCard model={model} /></motion.div>
          </motion.div>
        </div>
      )}

      {isAdmin && hasResult && (
        <motion.div variants={fadeUp}><AippDebugDrawer model={model} /></motion.div>
      )}
    </motion.div>
  );
}
