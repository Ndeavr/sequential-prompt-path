/**
 * AlertHallucinationDetected — Admin-visible alert when Alex hallucinates
 */
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  detectedTerms: string[];
  severity: string;
  autoCorrected: boolean;
}

export default function AlertHallucinationDetected({ detectedTerms, severity, autoCorrected }: Props) {
  const isCritical = severity === "high" || severity === "critical";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-lg border p-3 text-xs ${
        isCritical
          ? "bg-destructive/10 border-destructive/30 text-destructive"
          : "bg-amber-500/10 border-amber-500/30 text-amber-400"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {isCritical ? <ShieldAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        <span className="font-semibold uppercase tracking-wide">
          Hallucination {severity}
        </span>
        {autoCorrected && (
          <span className="ml-auto px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-medium">
            Auto-corrigé
          </span>
        )}
      </div>
      <p className="text-muted-foreground">
        Termes interdits détectés : <strong>{detectedTerms.join(", ")}</strong>
      </p>
    </motion.div>
  );
}
