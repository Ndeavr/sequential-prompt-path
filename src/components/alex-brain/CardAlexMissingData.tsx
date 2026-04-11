import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface Props {
  missingFields: string[];
  message?: string;
}

const FIELD_LABELS: Record<string, string> = {
  need_description: "Description du besoin",
  problem_type: "Type de problème",
  service_category: "Type de service",
  city: "Ville",
  address: "Adresse",
  plan_selection: "Choix de plan",
};

export default function CardAlexMissingData({ missingFields, message }: Props) {
  if (missingFields.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <p className="text-sm font-semibold text-foreground">Information manquante</p>
      </div>
      {message && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {missingFields.map(f => (
          <span key={f} className="inline-block px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-medium">
            {FIELD_LABELS[f] || f}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
