import { Star, MapPin, Phone, Globe, ExternalLink, CheckCircle2, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import type { GmbCandidate } from "./FormGoogleBusinessLookup";

interface Props {
  candidate: GmbCandidate;
  onConfirm: () => void;
  onCancel: () => void;
  isImporting?: boolean;
}

export default function CardBusinessImportPreview({ candidate, onConfirm, onCancel, isImporting }: Props) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">{candidate.name}</h3>
                <p className="text-xs text-muted-foreground">{candidate.formatted_address}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {Math.round(candidate.confidence_score * 100)}%
            </Badge>
          </div>

          {/* Photo strip */}
          {candidate.photos && candidate.photos.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {candidate.photos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className="h-16 w-24 rounded-lg object-cover shrink-0"
                  loading="lazy"
                />
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            {candidate.rating > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium text-foreground">{candidate.rating}</span>
                <span>({candidate.review_count} avis)</span>
              </div>
            )}
            {candidate.phone && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {candidate.phone}
              </div>
            )}
            {candidate.website && (
              <a
                href={candidate.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary truncate col-span-2"
              >
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{candidate.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            )}
          </div>

          {candidate.opening_hours && (
            <details className="text-xs">
              <summary className="text-muted-foreground cursor-pointer hover:text-foreground">Horaires</summary>
              <ul className="mt-1 space-y-0.5 text-muted-foreground pl-1">
                {candidate.opening_hours.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </details>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onCancel} className="flex-1">
              Annuler
            </Button>
            <Button size="sm" onClick={onConfirm} disabled={isImporting} className="flex-1 font-bold">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {isImporting ? "Import..." : "Confirmer l'import"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
