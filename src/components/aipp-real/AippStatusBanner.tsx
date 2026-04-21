import type { AippAuditViewModel } from "@/types/aippReal";
import { AlertCircle, CheckCircle, Loader2, AlertTriangle } from "lucide-react";

const configs = {
  running: { icon: Loader2, className: "bg-primary/10 border-primary/20 text-primary", label: "Analyse en cours", text: "Nous validons vos données publiques en temps réel." },
  pending: { icon: Loader2, className: "bg-primary/10 border-primary/20 text-primary", label: "En attente", text: "Votre analyse va bientôt commencer." },
  partial: { icon: AlertTriangle, className: "bg-accent/10 border-accent/20 text-accent", label: "Analyse partielle", text: "Certaines données sont confirmées, d'autres sont encore en validation." },
  complete: { icon: CheckCircle, className: "bg-success/10 border-success/20 text-success", label: "Analyse complétée", text: "Votre score repose sur des signaux réellement détectés." },
  failed: { icon: AlertCircle, className: "bg-destructive/10 border-destructive/20 text-destructive", label: "Analyse interrompue", text: "Certaines sources n'ont pas pu être validées pour le moment." },
};

export default function AippStatusBanner({ model }: { model: AippAuditViewModel }) {
  if (!model.auditId && model.analysisStatus === "pending") return null;
  const cfg = configs[model.analysisStatus] || configs.pending;
  const Icon = cfg.icon;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.className}`}>
      <Icon className={`h-5 w-5 shrink-0 ${model.analysisStatus === "running" || model.analysisStatus === "pending" ? "animate-spin" : ""}`} />
      <div>
        <span className="font-semibold text-sm">{cfg.label}</span>
        <span className="text-sm ml-2 opacity-80">{cfg.text}</span>
      </div>
    </div>
  );
}
