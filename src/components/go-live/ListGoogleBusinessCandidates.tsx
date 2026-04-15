import { Star, MapPin, Phone, Globe, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import type { GmbCandidate } from "./FormGoogleBusinessLookup";
import { cn } from "@/lib/utils";

interface Props {
  candidates: GmbCandidate[];
  selectedId: string | null;
  onSelect: (candidate: GmbCandidate) => void;
  strategiesTried?: string[];
  latencyMs?: number;
}

const STRATEGY_LABELS: Record<string, string> = {
  name_city: "Nom + Ville",
  name_only: "Nom",
  phone: "Téléphone",
  domain: "Domaine",
  category_city: "Catégorie + Ville",
};

function confidenceColor(score: number) {
  if (score >= 0.85) return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
  if (score >= 0.60) return "text-amber-400 bg-amber-400/10 border-amber-400/30";
  return "text-red-400 bg-red-400/10 border-red-400/30";
}

export default function ListGoogleBusinessCandidates({ candidates, selectedId, onSelect, strategiesTried, latencyMs }: Props) {
  if (candidates.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground font-medium">
          {candidates.length} résultat{candidates.length > 1 ? "s" : ""} trouvé{candidates.length > 1 ? "s" : ""}
        </p>
        {latencyMs !== undefined && (
          <p className="text-[10px] text-muted-foreground/60">{latencyMs}ms</p>
        )}
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {candidates.map((candidate, i) => {
          const isSelected = selectedId === candidate.place_id;
          return (
            <motion.button
              key={candidate.place_id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelect(candidate)}
              className={cn(
                "w-full text-left rounded-xl border p-3.5 transition-all",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-foreground truncate">{candidate.name}</h4>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{candidate.formatted_address}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {candidate.rating > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium text-foreground">{candidate.rating}</span>
                        <span className="text-muted-foreground">({candidate.review_count})</span>
                      </span>
                    )}
                    {candidate.phone && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {candidate.phone}
                      </span>
                    )}
                    {candidate.website && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground truncate max-w-[140px]">
                        <Globe className="h-3 w-3 shrink-0" />
                        {candidate.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="outline" className={cn("text-[10px] font-mono px-1.5 py-0.5", confidenceColor(candidate.confidence_score))}>
                    {Math.round(candidate.confidence_score * 100)}%
                  </Badge>
                  <span className="text-[9px] text-muted-foreground/60">
                    {STRATEGY_LABELS[candidate.strategy_used] || candidate.strategy_used}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {strategiesTried && strategiesTried.length > 0 && (
        <p className="text-[10px] text-muted-foreground/50 px-1">
          Stratégies : {strategiesTried.map(s => STRATEGY_LABELS[s] || s).join(" → ")}
        </p>
      )}
    </div>
  );
}
