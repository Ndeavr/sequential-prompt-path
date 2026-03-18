/**
 * Objective / Calculator card
 */
import { motion } from "framer-motion";
import { Target, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props { plan: string; }

const PLAN_LABELS: Record<string, string> = {
  recrue: "Recrue",
  pro: "Pro",
  premium: "Premium",
  elite: "Élite",
  signature: "Signature",
};

export default function DashObjective({ plan }: Props) {
  const recommended = plan === "recrue" ? "Pro" : plan === "pro" ? "Premium" : plan === "premium" ? "Élite" : "Signature";
  const objective = plan === "recrue" ? "5 000" : plan === "pro" ? "15 000" : plan === "premium" ? "30 000" : "50 000";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
      className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-secondary" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Votre objectif</span>
      </div>
      <div className="rounded-lg bg-muted/[0.05] border border-border/15 p-4 space-y-2">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground">Objectif mensuel</p>
            <p className="text-lg font-bold text-foreground">{objective} $</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Plan actuel</p>
            <p className="text-lg font-bold text-foreground">{PLAN_LABELS[plan] ?? plan}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Plan recommandé</p>
            <p className="text-lg font-bold text-primary">{recommended}</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          Stratégie recommandée : projets L et XL dans votre territoire
        </p>
      </div>
      <Link to="/pricing">
        <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs gap-1.5 w-full">
          Voir les plans <ArrowRight className="w-3 h-3" />
        </Button>
      </Link>
    </motion.div>
  );
}
