/**
 * UNPRO — Priority Queue Table
 * Top-scored prospects (0-100) ready for outreach.
 */
import { Flame } from "lucide-react";
import type { PriorityProspectRow } from "@/hooks/useOutreachCommandCenter";

interface Props {
  rows: PriorityProspectRow[];
  isLoading?: boolean;
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-blue-500";
  return (
    <div className="w-24 h-1.5 bg-muted/20 rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(100, score)}%` }} />
    </div>
  );
}

export default function PriorityQueueTable({ rows, isLoading }: Props) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card/20 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-semibold text-readable">Priority Queue</h3>
        <span className="text-xs text-readable-muted ml-auto">Top {rows.length} prospects</span>
      </div>

      {isLoading ? (
        <div className="text-sm text-readable-muted">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-readable-muted">
          Aucun prospect scoré. Lancer <span className="font-mono">compute-prospect-priority</span>.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/20 text-readable-muted">
                <th className="text-left px-2 py-2 font-medium">#</th>
                <th className="text-left px-2 py-2 font-medium">Entreprise</th>
                <th className="text-left px-2 py-2 font-medium">Ville</th>
                <th className="text-left px-2 py-2 font-medium">Catégorie</th>
                <th className="px-2 py-2 font-medium text-right">Reviews</th>
                <th className="px-2 py-2 font-medium text-right">Web</th>
                <th className="px-2 py-2 font-medium text-right">Resp.</th>
                <th className="px-2 py-2 font-medium text-right">Terr.</th>
                <th className="px-2 py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b border-border/10 hover:bg-muted/10">
                  <td className="px-2 py-2 tabular-nums text-readable-muted">{i + 1}</td>
                  <td className="px-2 py-2 text-readable font-medium truncate max-w-[220px]">
                    {r.business_name ?? "—"}
                  </td>
                  <td className="px-2 py-2 text-readable-muted">{r.city ?? "—"}</td>
                  <td className="px-2 py-2 text-readable-muted">{r.category_slug ?? "—"}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-readable">+{r.google_reviews_score}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-readable">+{r.website_score}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-readable">+{r.response_score}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-readable">+{r.territory_score}</td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <ScoreBar score={r.total_score} />
                      <span className="font-bold tabular-nums text-readable w-8 text-right">{r.total_score}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
