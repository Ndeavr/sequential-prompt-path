/**
 * UNPRO — AIPP Score Widget
 * Affichage proéminent du score AIPP (AI Indexing & Public Presence) — différenciateur UNPRO.
 */
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Sparkles, Info } from "lucide-react";
import { Link } from "react-router-dom";

interface AippScoreWidgetProps {
  total: number;
  identity: number;       // /20
  trust: number;          // /20
  visibility: number;     // /20
  conversion: number;     // /15
  aiSeoReadiness: number; // /25
  confidence?: number;
}

const Bar = ({ label, value, max }: { label: string; value: number; max: number }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}<span className="text-muted-foreground">/{max}</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default function AippScoreWidget({
  total, identity, trust, visibility, conversion, aiSeoReadiness, confidence,
}: AippScoreWidgetProps) {
  const tier = total >= 85 ? "Élite" : total >= 70 ? "Pro" : total >= 50 ? "Standard" : "Recrue";
  return (
    <Card className="p-6 md:p-8 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium">Score AIPP</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="C'est quoi AIPP?" className="inline-flex">
                    <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs leading-relaxed">
                    <strong>AIPP — AI Indexing &amp; Public Presence.</strong> Score 0-100 mesurant
                    la performance numérique d'un entrepreneur : identité vérifiée, confiance,
                    visibilité, conversion, et lisibilité par les moteurs IA (ChatGPT, Claude,
                    Perplexity).
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <h2 className="text-2xl font-bold leading-tight">Performance numérique vérifiée par UNPRO</h2>
        </div>
        <div className="text-right shrink-0">
          <div className="text-5xl md:text-6xl font-bold text-primary tabular-nums leading-none">{total}</div>
          <div className="text-xs text-muted-foreground mt-1">/100 · Niveau {tier}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Bar label="Identité vérifiée" value={identity} max={20} />
        <Bar label="Confiance" value={trust} max={20} />
        <Bar label="Visibilité" value={visibility} max={20} />
        <Bar label="Conversion" value={conversion} max={15} />
        <Bar label="Lisibilité IA &amp; SEO" value={aiSeoReadiness} max={25} />
        {confidence != null && <Bar label="Indice de confiance" value={confidence} max={100} />}
      </div>

      <p className="mt-5 text-xs text-muted-foreground">
        <Link to="/aipp" className="text-primary hover:underline">En savoir plus sur le score AIPP →</Link>
      </p>
    </Card>
  );
}
