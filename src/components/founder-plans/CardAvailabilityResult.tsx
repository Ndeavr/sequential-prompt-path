import { motion } from "framer-motion";
import { MapPin, ArrowRight } from "lucide-react";
import type { AvailabilityResult } from "@/hooks/useAvailabilityCheck";
import BadgeAvailabilityStatus from "./BadgeAvailabilityStatus";
import IndicatorTerritoryPressure from "./IndicatorTerritoryPressure";
import { Button } from "@/components/ui/button";

interface Props {
  result: AvailabilityResult;
  onReserve?: () => void;
}

const statusText = {
  available: "Votre position est encore ouverte dans cette zone.",
  limited: "Plus que quelques places avant verrouillage complet.",
  locked: "Ce territoire est déjà verrouillé par un membre fondateur.",
};

const ctaText = {
  available: "Réserver immédiatement",
  limited: "Sécuriser maintenant",
  locked: "Voir alternatives",
};

export default function CardAvailabilityResult({ result, onReserve }: Props) {
  const isLocked = result.status === "locked";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card/50 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-foreground">{result.category_name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {result.city_name}
          </p>
        </div>
        <BadgeAvailabilityStatus status={result.status} />
      </div>

      <p className="text-sm text-muted-foreground">{statusText[result.status]}</p>

      {(result.status === "limited" || result.status === "locked") && (
        <IndicatorTerritoryPressure score={result.pressure_score} />
      )}

      {isLocked && result.suggestions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Villes alternatives disponibles :</p>
          <div className="flex flex-wrap gap-1.5">
            {result.suggestions.map((s) => (
              <span key={s.slug} className="text-xs bg-muted/20 px-2 py-0.5 rounded-full text-foreground">
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <Button
        onClick={onReserve}
        size="sm"
        variant={isLocked ? "outline" : "default"}
        className="w-full gap-1.5"
      >
        {ctaText[result.status]}
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  );
}
