/**
 * UNPRO — AI visibility weakness card for concierge drawer.
 * Reads aipp_score + heuristics to list specific gaps the operator can quote.
 */
import { AlertTriangle, Check } from "lucide-react";
import type { ConciergeTarget } from "@/hooks/useConcierge";

export default function WeaknessCard({ prospect }: { prospect: ConciergeTarget }) {
  const aipp = prospect.aipp_score ?? 0;
  const items: { ok: boolean; label: string }[] = [
    { ok: (prospect.review_rating ?? 0) >= 4.4, label: `Avis ${prospect.review_rating ?? 0}★ (${prospect.review_count ?? 0})` },
    { ok: !!prospect.website_url, label: prospect.website_url ? "Site web actif" : "Aucun site détecté" },
    { ok: aipp >= 70, label: aipp >= 70 ? "Visibilité IA solide" : `Score IA faible (${Math.round(aipp)}/100)` },
    { ok: false, label: "Schema.org structuré · manquant" },
    { ok: false, label: "Positionnement sémantique · générique" },
    { ok: false, label: "Présence GEO/AEO · absente" },
    { ok: false, label: "Couche d'intelligence propriétaire · aucune" },
  ];

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4 space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <div className="text-xs uppercase tracking-widest text-amber-300/80">Lacunes de visibilité IA</div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2">
            {it.ok ? (
              <Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <span className="h-3.5 w-3.5 rounded-full border border-amber-400/60 mt-0.5 shrink-0" />
            )}
            <span className={it.ok ? "text-foreground/80" : "text-foreground"}>{it.label}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground pt-1">
        UNPRO structure votre entreprise pour que les systèmes IA la comprennent et la recommandent.
      </p>
    </div>
  );
}
