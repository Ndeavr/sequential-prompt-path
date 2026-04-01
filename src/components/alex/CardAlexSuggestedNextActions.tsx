/**
 * CardAlexSuggestedNextActions — Shows 2-3 contextual next actions after a reply.
 */
import { motion } from "framer-motion";
import { Eye, Calculator, Search, AlertTriangle, FileCheck, ArrowRight } from "lucide-react";
import { type LucideIcon } from "lucide-react";

interface NextAction {
  icon: LucideIcon;
  label: string;
  route: string;
}

const ACTION_MAP: Record<string, NextAction[]> = {
  design: [
    { icon: Eye, label: "Voir des idées", route: "/describe-project" },
    { icon: Calculator, label: "Estimer le projet", route: "/describe-project" },
    { icon: Search, label: "Trouver un entrepreneur", route: "/describe-project" },
  ],
  diagnostic: [
    { icon: AlertTriangle, label: "Détecter un problème", route: "/describe-project" },
    { icon: Search, label: "Trouver un pro", route: "/describe-project" },
    { icon: Calculator, label: "Estimer les coûts", route: "/describe-project" },
  ],
  matching: [
    { icon: Search, label: "Voir 3 options", route: "/describe-project" },
    { icon: Calculator, label: "Estimer d'abord", route: "/describe-project" },
    { icon: FileCheck, label: "Vérifier mes soumissions", route: "/dashboard/quotes/upload" },
  ],
  quote_analysis: [
    { icon: FileCheck, label: "Comparer les prix", route: "/dashboard/quotes/upload" },
    { icon: AlertTriangle, label: "Repérer les oublis", route: "/dashboard/quotes/upload" },
    { icon: Search, label: "Trouver un autre pro", route: "/describe-project" },
  ],
  general: [
    { icon: Search, label: "Trouver un pro", route: "/describe-project" },
    { icon: Calculator, label: "Estimer un projet", route: "/describe-project" },
    { icon: Eye, label: "Découvrir UNPRO", route: "/comment-ca-marche" },
  ],
};

interface CardAlexSuggestedNextActionsProps {
  flow: string;
  onAction: (route: string) => void;
  className?: string;
}

export default function CardAlexSuggestedNextActions({ flow, onAction, className = "" }: CardAlexSuggestedNextActionsProps) {
  const actions = ACTION_MAP[flow] || ACTION_MAP.general;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`space-y-2 ${className}`}
    >
      <p className="text-xs font-medium text-muted-foreground">Prochaines étapes</p>
      {actions.map((action, i) => (
        <motion.button
          key={action.label}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 + i * 0.1 }}
          onClick={() => onAction(action.route)}
          className="w-full flex items-center gap-3 rounded-xl p-3 bg-muted/30 border border-border/40 hover:bg-primary/5 hover:border-primary/20 transition-all group text-left"
        >
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <action.icon className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground flex-1">{action.label}</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        </motion.button>
      ))}
    </motion.div>
  );
}
