import { motion } from "framer-motion";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";

interface Props {
  resolvedRole: string;
  primaryIntent: string;
  confidence: number;
  currentRoute: string | null;
  needQualified: boolean;
  missingData: string[];
  serviceCategory: string | null;
  violations: string[];
}

export default function PanelAlexLiveIntentState({
  resolvedRole, primaryIntent, confidence, currentRoute,
  needQualified, missingData, serviceCategory, violations,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm p-3 space-y-2 text-[11px] font-mono"
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
        <Shield className="h-3.5 w-3.5 text-primary" />
        Alex Brain State
      </div>
      
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <span className="text-muted-foreground">Role:</span>
        <span className="text-foreground font-medium">{resolvedRole}</span>
        
        <span className="text-muted-foreground">Intent:</span>
        <span className="text-foreground font-medium">{primaryIntent}</span>
        
        <span className="text-muted-foreground">Confidence:</span>
        <span className={confidence > 0.7 ? "text-emerald-500" : confidence > 0.4 ? "text-amber-500" : "text-destructive"}>
          {Math.round(confidence * 100)}%
        </span>
        
        <span className="text-muted-foreground">Route:</span>
        <span className="text-foreground">{currentRoute || "—"}</span>
        
        <span className="text-muted-foreground">Need:</span>
        <span>{needQualified ? <CheckCircle className="h-3 w-3 inline text-emerald-500" /> : <AlertTriangle className="h-3 w-3 inline text-amber-500" />}</span>
        
        <span className="text-muted-foreground">Service:</span>
        <span className="text-foreground">{serviceCategory || "—"}</span>
      </div>

      {missingData.length > 0 && (
        <div className="text-amber-500">
          Missing: {missingData.join(", ")}
        </div>
      )}

      {violations.length > 0 && (
        <div className="space-y-0.5">
          {violations.map((v, i) => (
            <div key={i} className="text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {v}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
