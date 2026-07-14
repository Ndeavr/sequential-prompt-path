import { useState } from "react";
import { Helmet } from "react-helmet-async";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useFunnelDebugLeads } from "@/hooks/useFunnelDebug";
import LeadStepsRow, { STEP_LABELS } from "@/components/admin/funnel/LeadStepsRow";
import TestFunnelModal from "@/components/admin/funnel/TestFunnelModal";
import { Play, RefreshCw } from "lucide-react";

export default function AdminFunnelDebug() {
  const [showTest, setShowTest] = useState(false);
  const { data, isLoading, refetch, isFetching } = useFunnelDebugLeads(30, 200);

  return (
    <DashboardLayout>
      <Helmet><title>Funnel Debug — UNPRO</title></Helmet>
      <div className="admin-theme min-h-screen p-4 md:p-6 space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Funnel Debug</h1>
            <p className="text-sm text-muted-foreground">
              Par lead · 13 étapes · fenêtre 30 jours · rafraîchi 15s
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button size="sm" onClick={() => setShowTest(true)}>
              <Play className="w-4 h-4 mr-1" />
              Tester le funnel complet
            </Button>
          </div>
        </header>

        {data && (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Leads" value={data.totals.leads} />
            <Stat label="Payés" value={data.totals.paid} accent="emerald" />
            <Stat label="Activés" value={data.totals.activated} accent="blue" />
          </div>
        )}

        <div className="rounded-2xl border border-border/30 bg-card/40 overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Chargement…</div>
          ) : !data?.leads.length ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Aucun lead sur la période.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-background/50 sticky top-0">
                <tr>
                  <th className="p-2 text-left font-semibold sticky left-0 bg-background/50">Lead</th>
                  {data.steps.map((s) => (
                    <th key={s} className="p-2 font-semibold text-[10px] whitespace-nowrap">
                      {STEP_LABELS[s] ?? s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.leads.map((l) => (
                  <LeadStepsRow key={l.lead_id} lead={l} steps={data.steps} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data?.leads.length ? (
          <div className="rounded-xl border border-border/30 bg-card/30 p-4">
            <div className="text-sm font-semibold mb-2">Ruptures dominantes</div>
            <BreakSummary leads={data.leads} />
          </div>
        ) : null}

        {showTest && <TestFunnelModal onClose={() => setShowTest(false)} />}
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "emerald" | "blue" }) {
  const color = accent === "emerald" ? "text-emerald-400" : accent === "blue" ? "text-blue-400" : "text-foreground";
  return (
    <div className="rounded-xl border border-border/30 bg-card/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function BreakSummary({ leads }: { leads: any[] }) {
  const counts = new Map<string, number>();
  for (const l of leads) {
    if (!l.first_break) continue;
    counts.set(l.first_break.step, (counts.get(l.first_break.step) ?? 0) + 1);
  }
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!rows.length) return <div className="text-xs text-muted-foreground">Aucune rupture — tous les leads progressent.</div>;
  return (
    <ul className="space-y-1">
      {rows.map(([step, n]) => (
        <li key={step} className="flex justify-between text-xs">
          <span className="font-mono">{STEP_LABELS[step] ?? step}</span>
          <span className="text-red-400 font-semibold">{n} leads bloqués</span>
        </li>
      ))}
    </ul>
  );
}
