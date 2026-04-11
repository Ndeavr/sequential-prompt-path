/**
 * CardProfessionalBestMatch — Inline card showing the recommended contractor.
 */
import { motion } from "framer-motion";
import { Star, MapPin, Clock, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface BestMatchData {
  id: string;
  company_name: string;
  specialty: string;
  city: string;
  trust_score: number;
  compatibility_score: number;
  availability_score: number;
  response_time_hours?: number;
  verification_status?: string;
  reason_summary: string;
  avatar_url?: string | null;
}

interface Props {
  match: BestMatchData;
  onBookNow?: (contractorId: string) => void;
  isPrimary?: boolean;
}

export default function CardProfessionalBestMatch({ match, onBookNow, isPrimary = true }: Props) {
  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border p-4 space-y-3 ${
        isPrimary
          ? "border-primary/30 bg-primary/5 ring-1 ring-primary/10"
          : "border-border/50 bg-card/80"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {match.company_name.charAt(0)}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground leading-tight">
              {match.company_name}
            </h4>
            <p className="text-xs text-muted-foreground">{match.specialty}</p>
          </div>
        </div>
        {isPrimary && (
          <Badge variant="default" className="text-[10px] px-2 py-0.5 bg-primary">
            Meilleur choix
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Star className="h-3 w-3 text-amber-500" />
          <span>{match.compatibility_score?.toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{match.city}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{match.response_time_hours ? `${match.response_time_hours}h` : "Rapide"}</span>
        </div>
      </div>

      {/* Verification */}
      {match.verification_status === "verified" && (
        <div className="flex items-center gap-1.5 text-xs text-green-600">
          <Shield className="h-3 w-3" />
          <span>Profil vérifié UNPRO</span>
        </div>
      )}

      {/* Reason */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {match.reason_summary}
      </p>

      {/* CTA */}
      {isPrimary && onBookNow && (
        <Button
          onClick={() => onBookNow(match.id)}
          className="w-full h-9 text-sm"
          size="sm"
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
          Réserver maintenant
        </Button>
      )}
    </motion.div>
  );
}
