/**
 * AgentHealthTable — 24h success rate per launch agent from v_launch_agent_health.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface AgentHealthRow {
  agent: string;
  runs_24h: number;
  success_24h: number;
  failures_24h: number;
  success_pct: number;
  last_run_at: string | null;
  last_error: string | null;
}

export function AgentHealthTable({ rows }: { rows: AgentHealthRow[] }) {
  if (!rows?.length) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Santé des agents (24h)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-readable-muted uppercase tracking-wide">
              <tr className="border-b border-border/40">
                <th className="text-left px-3 py-2 font-medium">Agent</th>
                <th className="text-right px-3 py-2 font-medium">Runs</th>
                <th className="text-right px-3 py-2 font-medium">Succès</th>
                <th className="text-right px-3 py-2 font-medium">%</th>
                <th className="text-left px-3 py-2 font-medium">Dernière erreur</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const unhealthy = r.runs_24h > 0 && r.success_pct < 50;
                return (
                  <tr key={r.agent} className={`border-b border-border/20 ${unhealthy ? "bg-red-500/5" : ""}`}>
                    <td className="px-3 py-2 font-mono text-[11px] text-blue-300">{r.agent}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.runs_24h}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.success_24h}/{r.runs_24h}</td>
                    <td className="px-3 py-2 text-right">
                      <Badge variant="outline" className={
                        r.runs_24h === 0 ? "bg-muted/20" :
                        r.success_pct >= 80 ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" :
                        r.success_pct >= 50 ? "bg-amber-500/15 text-amber-300 border-amber-500/30" :
                        "bg-red-500/15 text-red-300 border-red-500/30"
                      }>
                        {r.runs_24h === 0 ? "—" : `${Math.round(r.success_pct)}%`}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-readable-muted font-mono text-[10px] max-w-[400px] truncate">
                      {r.last_error?.split("\n")[0] ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
