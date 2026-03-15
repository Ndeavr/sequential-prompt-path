/**
 * UNPRO — Compare Contractors Drawer
 * Side-by-side comparison of 2–3 contractors with trust row.
 */

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Scale, ShieldCheck, Star, X, Info } from "lucide-react";
import { getTrustBand, getContractorTrustLabel } from "@/lib/trustLabels";
import type { MatchEvaluation } from "@/types/matching";

interface CompareDrawerProps {
  matches: MatchEvaluation[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (id: string) => void;
}

const dimensions: { key: string; label: string; invert?: boolean }[] = [
  { key: "recommendation_score", label: "Score URS" },
  { key: "success_probability", label: "Probabilité de succès" },
  { key: "conflict_risk_score", label: "Risque de conflit", invert: true },
  { key: "ccai_score", label: "CCAI" },
  { key: "dna_fit_score", label: "DNA Fit" },
  { key: "project_fit_score", label: "Projet" },
  { key: "property_fit_score", label: "Propriété" },
  { key: "unpro_score_snapshot", label: "UNPRO" },
  { key: "aipp_score_snapshot", label: "AIPP" },
  { key: "budget_fit_score", label: "Budget" },
];

const getCellColor = (val: number, invert?: boolean) => {
  const effective = invert ? 100 - val : val;
  if (effective >= 75) return "text-success font-bold";
  if (effective >= 50) return "text-foreground";
  return "text-warning";
};

/** Get a user-friendly trust band label for comparison — no raw numbers */
function getTrustDisplayForMatch(m: MatchEvaluation): { label: string; color: string } {
  if ((m as any).admin_verified === true) {
    return { label: "Validé par UnPRO", color: "text-success" };
  }
  const band = getTrustBand(m.unpro_score_snapshot);
  if (band) return { label: band.label_fr, color: band.color.split(" ")[0] };
  return { label: "Non évalué", color: "text-muted-foreground" };
}

const CompareDrawer = ({ matches, open, onOpenChange, onRemove }: CompareDrawerProps) => {
  if (matches.length < 2) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Comparer les entrepreneurs
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs text-muted-foreground p-2 w-32">Dimension</th>
                {matches.map((m) => (
                  <th key={m.id} className="p-2 text-center min-w-[140px]">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        {m.logo_url ? (
                          <img src={m.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <span className="font-bold text-sm text-muted-foreground">{(m.business_name ?? "?")[0]}</span>
                        )}
                      </div>
                      <span className="text-xs font-semibold truncate max-w-[120px]">{m.business_name}</span>
                      <div className="flex items-center gap-1">
                        {(m as any).admin_verified === true && <ShieldCheck className="w-3 h-3 text-success" />}
                        {m.rating && (
                          <span className="flex items-center gap-0.5 text-[10px]">
                            <Star className="w-2.5 h-2.5 text-warning fill-warning" />
                            {m.rating}
                          </span>
                        )}
                      </div>
                      <button onClick={() => onRemove(m.contractor_id)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Trust row — bands not raw numbers */}
              <tr className="border-t-2 border-primary/10 bg-muted/20">
                <td className="p-2 text-xs font-semibold text-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-primary" /> Confiance
                </td>
                {matches.map((m) => {
                  const trust = getTrustDisplayForMatch(m);
                  return (
                    <td key={m.id} className="p-2 text-center">
                      <span className={`text-xs font-semibold ${trust.color}`}>{trust.label}</span>
                    </td>
                  );
                })}
              </tr>

              {dimensions.map((dim) => {
                const vals = matches.map((m) => (m as any)[dim.key] ?? 0);
                const best = dim.key === "conflict_risk_score" ? Math.min(...vals) : Math.max(...vals);

                return (
                  <tr key={dim.key} className="border-t border-border/30">
                    <td className="p-2 text-xs text-muted-foreground font-medium">{dim.label}</td>
                    {matches.map((m) => {
                      const val = Math.round((m as any)[dim.key] ?? 0);
                      const isBest = val === Math.round(best);
                      return (
                        <td key={m.id} className="p-2 text-center">
                          <span className={`text-sm ${getCellColor(val, dim.invert)} ${isBest ? "font-bold" : ""}`}>
                            {val}{dim.key.includes("probability") ? "%" : ""}
                          </span>
                          {isBest && matches.length > 1 && (
                            <Badge variant="outline" className="ml-1 text-[8px] px-1 py-0 bg-success/10 text-success border-success/20">
                              ★
                            </Badge>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Explanatory microcopy */}
          <p className="text-[10px] text-muted-foreground mt-4 px-2 flex items-start gap-1">
            <Info className="w-3 h-3 shrink-0 mt-0.5" />
            Les scores sont estimatifs et basés sur les données disponibles. La confiance « Validé par UnPRO » indique un profil revu par notre équipe, sans constituer une certification légale.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CompareDrawer;
