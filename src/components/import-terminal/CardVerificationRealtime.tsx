/**
 * CardVerificationRealtime — Shows verification status progressively.
 */
import { motion } from "framer-motion";
import { Shield, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import type { ImportData } from "@/hooks/useTerminalImportAnimation";

interface Props {
  data: ImportData;
  revealed: boolean;
}

const StatusIcon = ({ status }: { status?: string }) => {
  if (status === "valid") return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
  if (status === "not_found") return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
  if (status === "invalid") return <XCircle className="w-3.5 h-3.5 text-red-400" />;
  return <div className="w-3.5 h-3.5 rounded-full bg-muted-foreground/20" />;
};

export default function CardVerificationRealtime({ data, revealed }: Props) {
  if (!revealed) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-emerald-500/15 p-4 space-y-3"
      style={{ background: "linear-gradient(135deg, hsl(160 20% 6%) 0%, hsl(160 30% 4%) 100%)" }}
    >
      <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
        <Shield className="w-4 h-4" /> Vérifications
      </h3>
      <div className="space-y-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <StatusIcon status={data.rbqStatus} />
          <span className="text-foreground/70">RBQ</span>
          <span className="text-emerald-300 ml-auto">{data.rbqStatus || "non vérifié"}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon status={data.neqStatus} />
          <span className="text-foreground/70">NEQ</span>
          <span className="text-emerald-300 ml-auto">{data.neqStatus || "non vérifié"}</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400/60" />
          <span className="text-foreground/70">Site web</span>
          <span className="text-emerald-300 ml-auto">{data.website ? "vérifié" : "—"}</span>
        </div>
      </div>
    </motion.div>
  );
}
