/**
 * /admin/edge-function-health — Phase 2.
 * Table of edge functions with expandable rows (payload + stack).
 */
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import DashboardLayout from "@/layouts/DashboardLayout";
import { loadEdgeFunctionOutcomes, loadEdgeOutcomeDetail } from "@/services/systemHealthService";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("fr-CA");
}

function ExpandedRow({ operation }: { operation: string }) {
  const q = useQuery({ queryKey: ["ef-detail", operation], queryFn: () => loadEdgeOutcomeDetail(operation, 10) });
  return (
    <tr className="bg-muted/20">
      <td colSpan={6} className="p-4">
        {q.isLoading ? <div className="text-xs">Chargement…</div> : (
          <div className="space-y-2 text-xs">
            <div className="font-semibold">10 dernières exécutions</div>
            <div className="rounded border border-border/40 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/30"><tr><th className="p-2 text-left">When</th><th className="p-2">OK</th><th className="p-2 text-left">Failure code</th><th className="p-2 text-right">Duration</th><th className="p-2 text-left">Payload</th></tr></thead>
                <tbody>
                  {(q.data ?? []).map((r: any) => (
                    <tr key={r.id} className="border-t border-border/20 align-top">
                      <td className="p-2 whitespace-nowrap text-muted-foreground">{fmt(r.created_at)}</td>
                      <td className="p-2 text-center">{r.success ? "✅" : "❌"}</td>
                      <td className="p-2 font-mono text-destructive">{r.failure_code ?? ""}</td>
                      <td className="p-2 text-right tabular-nums">{r.duration_ms ?? "—"} ms</td>
                      <td className="p-2"><pre className="whitespace-pre-wrap max-w-[40rem] text-[10px]">{JSON.stringify(r.payload ?? r.details ?? {}, null, 2)}</pre></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function PageEdgeFunctionHealth() {
  const q = useQuery({ queryKey: ["ef-outcomes"], queryFn: () => loadEdgeFunctionOutcomes(200), refetchInterval: 30_000 });
  const [open, setOpen] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <Helmet><title>Edge Function Health — UNPRO</title></Helmet>
      <div className="admin-theme min-h-screen p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Edge Function Health</h1>
          <p className="text-sm text-muted-foreground">24 h — cliquer une ligne pour ouvrir les 10 dernières exécutions.</p>
        </header>
        <div className="rounded-2xl border border-border/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase">
              <tr>
                <th className="p-2 text-left">Function</th>
                <th className="p-2 text-left">Last run</th>
                <th className="p-2 text-right">Success</th>
                <th className="p-2 text-right">Fail</th>
                <th className="p-2 text-right">Duration</th>
                <th className="p-2 text-left">Last error</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).length === 0 && <tr><td colSpan={6} className="p-4 text-center text-xs text-muted-foreground">Aucune exécution enregistrée dans platform_operation_outcomes.</td></tr>}
              {(q.data ?? []).map((r) => (
                <>
                  <tr
                    key={r.operation}
                    onClick={() => setOpen(open === r.operation ? null : r.operation)}
                    className={`border-t border-border/20 cursor-pointer hover:bg-muted/20 ${open === r.operation ? "bg-muted/30" : ""}`}
                  >
                    <td className="p-2 font-mono text-xs">{r.operation}</td>
                    <td className="p-2 text-xs text-muted-foreground">{fmt(r.last_run)}</td>
                    <td className="p-2 text-right tabular-nums text-emerald-500">{r.success_count}</td>
                    <td className="p-2 text-right tabular-nums text-destructive">{r.fail_count}</td>
                    <td className="p-2 text-right tabular-nums">{r.last_duration_ms ?? "—"} ms</td>
                    <td className="p-2 text-xs text-destructive">{r.last_error ?? ""}</td>
                  </tr>
                  {open === r.operation && <ExpandedRow key={`${r.operation}-detail`} operation={r.operation} />}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
