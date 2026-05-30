import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlight?: "passeport" | "gold";
}

const PASSEPORT_FEATURES = [
  "5 soumissions analysées",
  "Historique des projets",
  "Stockage documents maison",
  "Comparaison détaillée",
  "Score de confiance entrepreneur",
];

const GOLD_FEATURES = [
  "10 soumissions analysées",
  "Analyse avancée clauses/exclusions",
  "Historique maison complet",
  "Factures + garanties centralisées",
  "Préparation vente/notaire/assurance",
  "IA proactive",
];

export default function ModalUpsellPasseportMaison({ open, onOpenChange, highlight = "passeport" }: Props) {
  const navigate = useNavigate();

  const go = (tier: "passeport" | "gold") => {
    onOpenChange(false);
    navigate(`/passeport-maison?tier=${tier}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="p-5 border-b border-border/40">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg">Analysez plus de soumissions</DialogTitle>
            <DialogDescription className="text-xs">
              Débloquez l'analyse multi-soumissions et bien plus avec le Passeport Maison.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Passeport Maison */}
          <div className={`rounded-2xl border p-4 space-y-3 ${highlight === "passeport" ? "border-primary/40 bg-primary/5" : "border-border/50 bg-card"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Home className="h-3.5 w-3.5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Passeport Maison</h3>
              </div>
              {highlight === "passeport" && (
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Recommandé</span>
              )}
            </div>
            <ul className="space-y-1.5">
              {PASSEPORT_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" /> {f}
                </li>
              ))}
            </ul>
            <Button onClick={() => go("passeport")} className="w-full rounded-xl" size="sm">
              Activer Passeport Maison
            </Button>
          </div>

          {/* Gold */}
          <div className={`rounded-2xl border p-4 space-y-3 ${highlight === "gold" ? "border-amber-500/40 bg-amber-500/5" : "border-border/50 bg-card"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Passeport Maison Gold</h3>
              </div>
              {highlight === "gold" && (
                <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Recommandé</span>
              )}
            </div>
            <ul className="space-y-1.5">
              {GOLD_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" /> {f}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => go("gold")}
              variant={highlight === "gold" ? "default" : "outline"}
              className="w-full rounded-xl"
              size="sm"
            >
              Passer à Gold
            </Button>
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors pt-1"
          >
            Continuer avec 3 analyses gratuites
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
