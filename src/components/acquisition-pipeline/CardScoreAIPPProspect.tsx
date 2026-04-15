import { Card, CardContent } from "@/components/ui/card";
import { Eye, MousePointerClick, ShieldCheck, Star, DollarSign } from "lucide-react";

interface Score {
  score_visibilite: number;
  score_conversion: number;
  score_confiance: number;
  nombre_avis: number;
  revenu_manque_estime: number;
}

function ScoreRing({ value, max = 100, label, icon: Icon, color }: { value: number; max?: number; label: string; icon: React.ElementType; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <span className="text-lg font-bold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

export default function CardScoreAIPPProspect({ score }: { score: Score | null }) {
  if (!score) {
    return (
      <Card className="border-dashed border-muted">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Score AIPP non disponible. Lancez l'analyse.
        </CardContent>
      </Card>
    );
  }

  const global = Math.round((score.score_visibilite + score.score_conversion + score.score_confiance) / 3);

  return (
    <Card className="bg-gradient-to-br from-background to-muted/20 border-border/50">
      <CardContent className="pt-6">
        <div className="text-center mb-4">
          <span className="text-3xl font-bold text-foreground">{global}</span>
          <span className="text-muted-foreground text-sm">/100</span>
          <p className="text-xs text-muted-foreground mt-1">Score AIPP Global</p>
        </div>
        <div className="flex justify-around">
          <ScoreRing value={score.score_visibilite} label="Visibilité" icon={Eye} color="#3b82f6" />
          <ScoreRing value={score.score_conversion} label="Conversion" icon={MousePointerClick} color="#f59e0b" />
          <ScoreRing value={score.score_confiance} label="Confiance" icon={ShieldCheck} color="#10b981" />
        </div>
        <div className="flex justify-around mt-4 pt-4 border-t border-border/30">
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center text-muted-foreground">
              <Star className="h-3 w-3" />
              <span className="text-xs">Avis</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{score.nombre_avis}</span>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span className="text-xs">Revenu manqué</span>
            </div>
            <span className="text-sm font-semibold text-red-400">{score.revenu_manque_estime.toLocaleString("fr-CA")} $</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
