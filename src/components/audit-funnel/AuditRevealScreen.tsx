import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw, AlertTriangle, Globe, Phone, MapPin } from "lucide-react";
import { useAuditIntakeFunnel } from "@/hooks/useAuditIntakeFunnel";

interface Props {
  contractorId: string | null;
  auditId: string | null;
  score: number | null;
  confidence: "low" | "medium" | "high" | null;
  degraded?: boolean;
  onContinue: () => void;
  onRetry?: () => void;
}

const scoreLabel = (s: number) => {
  if (s >= 90) return "Position très forte";
  if (s >= 75) return "Bonne présence, optimisation possible";
  if (s >= 60) return "Base solide, potentiel bloqué";
  if (s >= 40) return "Visibilité IA faible";
  return "Présence très fragile";
};

export function AuditRevealScreen({ score, confidence, degraded, onContinue, onRetry }: Props) {
  const showScore = score !== null;
  // Range when degraded: ±10 around the heuristic
  const rangeLow = score !== null ? Math.max(0, Math.round(score) - 10) : null;
  const rangeHigh = score !== null ? Math.min(100, Math.round(score) + 10) : null;

  // Re-derive partial signals from sessionStorage (best-effort, no extra fetch)
  let intake: { websiteUrl?: string; phone?: string; city?: string } = {};
  try {
    const saved = JSON.parse(sessionStorage.getItem("unpro_audit_funnel") || "{}");
    intake = saved.intake ?? {};
  } catch {}

  return (
    <div className="max-w-2xl mx-auto px-4 pt-16 pb-16 text-center">
      <h2 className="font-display text-2xl font-bold mb-2">
        {degraded ? "Analyse partielle" : showScore ? "Votre AIPP réel" : "Analyse partielle"}
      </h2>
      <p className="text-sm text-muted-foreground mb-8">
        {degraded
          ? "Estimation basée sur vos signaux publics. Une analyse complète affinera votre score."
          : "Voici ce que vos signaux envoient aujourd'hui à Google, aux IA et à vos futurs clients."}
      </p>

      {degraded && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs text-amber-300">
          <AlertTriangle className="w-3 h-3" /> Certaines données n'ont pas pu être vérifiées
        </div>
      )}

      {showScore && (
        <div className="rounded-3xl border border-border/30 bg-card/20 backdrop-blur-md p-10 mb-8 inline-block">
          {degraded && rangeLow !== null && rangeHigh !== null ? (
            <>
              <div className="text-5xl font-bold text-primary mb-2">
                {rangeLow}–{rangeHigh}
              </div>
              <div className="text-sm text-muted-foreground">/ 100 (estimation)</div>
            </>
          ) : (
            <>
              <div className="text-6xl font-bold text-primary mb-2">{Math.round(score!)}</div>
              <div className="text-sm text-muted-foreground">/ 100</div>
            </>
          )}
          <div className="mt-3 text-sm font-medium">{scoreLabel(score!)}</div>
          {confidence && (
            <div
              className={`mt-2 inline-flex px-3 py-1 rounded-full text-xs ${
                confidence === "high"
                  ? "bg-green-500/10 text-green-400"
                  : confidence === "medium"
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-border/20 text-muted-foreground"
              }`}
            >
              Confiance {confidence === "high" ? "élevée" : confidence === "medium" ? "moyenne" : "faible"}
            </div>
          )}
        </div>
      )}

      {degraded && (
        <div className="grid grid-cols-3 gap-2 max-w-md mx-auto mb-6 text-xs">
          <div className={`rounded-lg border p-2 ${intake.websiteUrl ? "border-green-500/30 text-green-300" : "border-border/20 text-muted-foreground"}`}>
            <Globe className="w-3 h-3 mx-auto mb-1" />
            {intake.websiteUrl ? "Site détecté" : "Site absent"}
          </div>
          <div className={`rounded-lg border p-2 ${intake.phone ? "border-green-500/30 text-green-300" : "border-border/20 text-muted-foreground"}`}>
            <Phone className="w-3 h-3 mx-auto mb-1" />
            {intake.phone ? "Téléphone OK" : "Téléphone absent"}
          </div>
          <div className={`rounded-lg border p-2 ${intake.city ? "border-green-500/30 text-green-300" : "border-border/20 text-muted-foreground"}`}>
            <MapPin className="w-3 h-3 mx-auto mb-1" />
            {intake.city || "Ville ?"}
          </div>
        </div>
      )}

      <p className="text-muted-foreground mb-6">
        Votre potentiel est réel. Le plus rentable maintenant est de corriger vos blocages prioritaires avec le bon niveau d'activation.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button size="lg" onClick={onContinue} className="gap-2">
          Voir mon plan recommandé <ArrowRight className="w-4 h-4" />
        </Button>
        {degraded && onRetry && (
          <Button size="lg" variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Relancer l'analyse complète
          </Button>
        )}
      </div>
    </div>
  );
}
