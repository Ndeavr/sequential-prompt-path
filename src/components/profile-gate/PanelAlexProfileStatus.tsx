import { motion } from "framer-motion";
import { UserCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import BadgeProfileCompleteState from "./BadgeProfileCompleteState";
import WidgetProfileCompletionProgress from "./WidgetProfileCompletionProgress";

const FIELD_LABELS: Record<string, string> = {
  first_name: "Prénom",
  phone: "Téléphone",
  email: "Courriel",
  address_line_1: "Adresse",
  city: "Ville",
  postal_code: "Code postal",
};

interface Props {
  score: number;
  isComplete: boolean;
  missingFields: string[];
  onOpenDrawer: () => void;
}

export default function PanelAlexProfileStatus({
  score,
  isComplete,
  missingFields,
  onOpenDrawer,
}: Props) {
  if (isComplete) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <UserCircle className="w-3.5 h-3.5" />
          Profil
        </div>
        <BadgeProfileCompleteState isComplete={isComplete} score={score} />
      </div>

      <WidgetProfileCompletionProgress score={score} />

      <div className="flex flex-wrap gap-1.5">
        {missingFields.slice(0, 4).map((field) => (
          <span
            key={field}
            className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 font-medium"
          >
            {FIELD_LABELS[field] || field}
          </span>
        ))}
      </div>

      <Button size="sm" className="w-full gap-1" onClick={onOpenDrawer}>
        Compléter mon profil
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>
    </motion.div>
  );
}
