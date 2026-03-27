import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import type { ComplianceStatus } from "@/services/alexCondoManagerGuidanceEngine";
import { cn } from "@/lib/utils";

interface Props {
  status: ComplianceStatus;
  score: number;
  requiredMissing: number;
}

const CONFIG: Record<ComplianceStatus, { icon: typeof ShieldCheck; label: string; className: string }> = {
  conforme: { icon: ShieldCheck, label: "Conforme", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  partiel: { icon: AlertTriangle, label: "Partiel", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  a_risque: { icon: ShieldAlert, label: "À risque", className: "bg-destructive/10 text-destructive border-destructive/20" },
  unknown: { icon: ShieldAlert, label: "Non évalué", className: "bg-muted text-muted-foreground border-border" },
};

export function AlexComplianceStatusBadge({ status, score, requiredMissing }: Props) {
  const { icon: Icon, label, className } = CONFIG[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-2xl border p-5 space-y-3", className)}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5" />
        <div>
          <div className="font-semibold text-sm">Conformité Loi 16 : {label}</div>
          <div className="text-xs opacity-80">{score}% complété</div>
        </div>
      </div>

      {requiredMissing > 0 && (
        <div className="text-xs opacity-80">
          {requiredMissing} document{requiredMissing > 1 ? "s" : ""} obligatoire{requiredMissing > 1 ? "s" : ""} manquant{requiredMissing > 1 ? "s" : ""}
        </div>
      )}
    </motion.div>
  );
}
