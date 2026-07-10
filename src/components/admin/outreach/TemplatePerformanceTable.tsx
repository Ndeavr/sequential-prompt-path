/**
 * UNPRO — Template Performance Table
 * A/B/C SMS variants with sent → activated funnel + winner badge.
 */
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TemplatePerformanceRow } from "@/hooks/useOutreachCommandCenter";

interface Props {
  rows: TemplatePerformanceRow[];
  isLoading?: boolean;
}

const VARIANT_COPY: Record<string, string> = {
  war_room_variant_a: "Votre entreprise mérite-t-elle d'être recommandée par l'IA d'UNPRO?",
  war_room_variant_b: "L'IA d'UNPRO recommande des entrepreneurs selon leur expertise…",
  war_room_variant_c: "Toujours à chercher des clients?",
};

export default function TemplatePerformanceTable({ rows, isLoading }: Props) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card/20 backdrop-blur-sm p-5">
      <h3 className="text-sm font-semibold text-readable mb-3">A/B/C Test — SMS Templates</h3>

      {isLoading ? (
        <div className="text-sm text-readable-muted">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-readable-muted">Aucune donnée de template.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/20 text-readable-muted">
                <th className="text-left px-2 py-2 font-medium">Variant</th>
                <th className="text-left px-2 py-2 font-medium">Aperçu</th>
                <th className="px-2 py-2 font-medium text-right">Sent</th>
                <th className="px-2 py-2 font-medium text-right">Delivered</th>
                <th className="px-2 py-2 font-medium text-right">Clicked</th>
                <th className="px-2 py-2 font-medium text-right">Registered</th>
                <th className="px-2 py-2 font-medium text-right">Activated</th>
                <th className="px-2 py-2 font-medium text-right">Activation %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.template_key} className="border-b border-border/10 hover:bg-muted/10">
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-readable">{r.variant}</span>
                      {r.is_winner && (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 gap-1">
                          <Trophy className="w-3 h-3" /> Gagnant
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-readable-muted max-w-[300px] truncate">
                    {VARIANT_COPY[r.template_key] ?? r.template_key}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-readable">{r.sent_count}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-readable">{r.delivered_count}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-readable">{r.clicked_count}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-readable">{r.registered_count}</td>
                  <td className="px-2 py-2 text-right tabular-nums font-bold text-emerald-300">
                    {r.activated_count}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-readable">
                    {r.activation_rate}%
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
