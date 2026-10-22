/** Résultat d'un import brouillon : badge par ligne + prochaine action. Aucune donnée d'autrui. */
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, type StageResult, type StageRow } from "./stageImport";

const TONE = {
  new: "border-emerald-500/40 text-emerald-600",
  exists: "border-border text-muted-foreground",
  review: "border-amber-500/40 text-amber-600",
} as const;

export function StageResultList({ rows, results }: { rows: StageRow[]; results: StageResult[] }) {
  const count = (s: string) => results.filter((r) => r.status === s).length;
  return (
    <div className="space-y-3" data-testid="stage-results">
      <p className="text-sm text-foreground">
        Enregistré dans « Mes imports » : {count("new")} nouveau{count("new") > 1 ? "x" : ""}, {results.length - count("new") - count("invalid") - count("review")} déjà connu{results.length > 1 ? "s" : ""}, {count("review") + count("invalid")} à examiner.
      </p>
      <ul className="space-y-2 max-h-[55vh] overflow-y-auto">
        {results.map((r) => {
          const row = rows[r.row_index - 1] ?? {};
          const s = STATUS_LABEL[r.status] ?? STATUS_LABEL.review;
          return (
            <li key={r.row_index} className="rounded-xl border border-border/40 p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate">{row.company_name || "—"}</span>
                <Badge variant="outline" className={TONE[s.tone]}>{s.label}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">Prochaine action : {r.next_action}</p>
              <p className="text-[10px] text-muted-foreground">Provenance : déclarée par vous · RBQ et consentement : en attente</p>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-muted-foreground">Aucun prospect n'est réservé ni contacté par un import. Si un suivi est déjà réservé, demandez une révision avec preuve à l'équipe UNPRO.</p>
    </div>
  );
}
