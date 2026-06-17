/**
 * RecommendationCardQualified — Final recommendation card shown ONLY when qualification_score >= 70
 * AND service_category matches contractor specialty.
 */
import { Calendar, MapPin, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface QualifiedRecommendation {
  contractor_id: string;
  contractor_name: string;
  compatibility_score: number;       // 0-100
  unpro_score: number;               // 0-100
  matching_confidence: number;       // 0-1
  distance_km?: number;
  next_availability?: string;
  credentials?: string[];
  evidence?: string[];               // bullets explaining the match
}

interface Props {
  rec: QualifiedRecommendation;
  onBook?: () => void;
}

export default function RecommendationCardQualified({ rec, onBook }: Props) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl p-6 space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-readable-muted">Analyse complétée</p>
        <h3 className="mt-1 text-lg font-semibold text-readable leading-snug">
          Après analyse de votre projet, voici le professionnel qui correspond le mieux à votre situation.
        </h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-readable">{rec.contractor_name}</h4>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="w-3 h-3" /> {rec.compatibility_score}% compatibilité
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-readable-secondary">
            <Shield className="w-4 h-4 text-primary" />
            Score UNPRO {rec.unpro_score}
          </div>
          {rec.distance_km != null && (
            <div className="flex items-center gap-2 text-readable-secondary">
              <MapPin className="w-4 h-4 text-primary" />
              {rec.distance_km.toFixed(1)} km
            </div>
          )}
          {rec.next_availability && (
            <div className="col-span-2 flex items-center gap-2 text-readable-secondary">
              <Calendar className="w-4 h-4 text-primary" />
              Prochaine disponibilité : {rec.next_availability}
            </div>
          )}
        </div>

        {rec.credentials && rec.credentials.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {rec.credentials.map(c => (
              <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
            ))}
          </div>
        )}

        {rec.evidence && rec.evidence.length > 0 && (
          <ul className="text-xs text-readable-secondary space-y-1 border-l-2 border-primary/30 pl-3">
            {rec.evidence.map((e, i) => <li key={i}>• {e}</li>)}
          </ul>
        )}
      </div>

      <Button onClick={onBook} size="lg" className="w-full">
        Réserver un rendez-vous exclusif
      </Button>
    </div>
  );
}
