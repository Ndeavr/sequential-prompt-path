import { motion } from "framer-motion";
import { UserCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  missingFields: string[];
  completionPercent?: number;
  onComplete?: () => void;
}

const fieldLabels: Record<string, string> = {
  first_name: "Prénom",
  last_name: "Nom",
  phone: "Téléphone",
  email: "Courriel",
  city: "Ville",
  property_type: "Type de propriété",
};

export default function CardAlexProfileCompletionRequired({ missingFields, completionPercent = 60, onComplete }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <UserCircle className="w-3.5 h-3.5" />
        Profil à compléter
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Progression</span>
          <span className="font-medium text-foreground">{completionPercent}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-primary"
          />
        </div>
      </div>

      {/* Missing fields */}
      <div className="flex flex-wrap gap-1.5">
        {missingFields.slice(0, 4).map(field => (
          <span
            key={field}
            className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 font-medium"
          >
            {fieldLabels[field] || field}
          </span>
        ))}
      </div>

      <Button
        size="sm"
        className="w-full gap-1"
        onClick={onComplete}
      >
        Compléter mon profil
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>
    </motion.div>
  );
}
