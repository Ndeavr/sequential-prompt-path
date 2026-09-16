/**
 * Carte « Votre objectif » — aucune donnée inventée.
 * Le plan recommandé et les montants réels vivent dans le plan personnalisé.
 */
import { motion } from "framer-motion";
import { Target, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  CONTRACTOR_PLAN_DEFAULT_CTA,
  contractorPlanLink,
} from "@/lib/routing/contractorPlanRoute";

interface Props { plan: string; }

const PLAN_LABELS: Record<string, string> = {
  recrue: "Recrue",
  depart: "Départ",
  croissance_v2: "Croissance",
  pro_v2: "Pro",
  elite_v2: "Élite",
  pro: "Pro",
  premium: "Élite",
  elite: "Élite",
  signature: "Signature",
};

export default function DashObjective({ plan }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
      className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-secondary" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Votre objectif</span>
      </div>
      <div className="rounded-lg bg-muted/[0.05] border border-border/15 p-4 space-y-2">
        <p className="text-[10px] text-muted-foreground text-center">Plan actuel</p>
        <p className="text-lg font-bold text-foreground text-center">
          {PLAN_LABELS[plan] ?? plan}
        </p>
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          Votre plan recommandé est calculé à partir de vos services, de votre territoire et de
          votre capacité réelle.
        </p>
      </div>
      <Link to={contractorPlanLink({ objective: "upgrade", from: "dashboard_objective" })}>
        <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs gap-1.5 w-full">
          {CONTRACTOR_PLAN_DEFAULT_CTA} <ArrowRight className="w-3 h-3" />
        </Button>
      </Link>
    </motion.div>
  );
}
