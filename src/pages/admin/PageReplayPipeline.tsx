/**
 * /admin/replay-pipeline — Phase 3.
 * Select a prospect, replay through SCRAPE→ENRICH→SCORE→SMS→CLICK→ONBOARD→STRIPE→ACTIVATION.
 * Shows exact failure node with reason + payload. Never generic "Failed".
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { replayPipeline, searchProspects } from "@/services/systemHealthService";

const STEPS = ["SCRAPE", "ENRICH", "SCORE", "SMS", "CLICK", "ONBOARD", "STRIPE", "ACTIVATION"] as const;

function StepBadge({ status }: { status: "ok" | "fail" | "skip" }) {
  const map = { ok: "bg-emerald-500/15 text-emerald-500", fail: "bg-destructive/15 text-destructive", skip: "bg-muted/40 text-muted-foreground" } as const;
  const label = { ok: "OK", fail: "ÉCHEC", skip: "SKIP" }[status];
  return <span className={`text-[10px] uppercase rounded-full px-2 py-0.5 font-semibold ${map[status]}`}>{label}</span>;
}

export default function PageReplayPipeline() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["replay-search", q], queryFn: () => searchProspects(q, 15) });
  const [result, setResult] = useState<any>(null);
  const replay = useMutation({
    mutationFn: (id: string) => replayPipeline({ prospect_id: id }),
    onSuccess: (d) => setResult(d),
    onError: (e: any) => setResult({ error: String(e?.message ?? e) }),
  });

  return (
    <DashboardLayout>
      <Helmet><title>Replay Pipeline — UNPRO</title></Helmet>
      <div className="admin-theme min-h-screen p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Pipeline Replay</h1>
          <p className="text-sm text-muted-foreground">Sélectionne un prospect, on rejoue chaque étape en lecture seule et on te dit exactement où ça casse.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <input placeholder="Nom, ville, phone, id…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm" />
            <div className="rounded-2xl border border-border/40 overflow-hidden max-h-[600px] overflow-y-auto">
              {(list.data ?? []).map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => { setSelected(p.id); replay.mutate(p.id); }}
                  className={`block w-full text-left px-3 py-2 border-t border-border/20 text-xs hover:bg-muted/20 ${selected === p.id ? "bg-muted/30" : ""}`}
                >
                  <div className="font-semibold">{p.business_name ?? "—"}</div>
                  <div className="text-muted-foreground">{p.city ?? "—"} · {p.phone ?? "aucun tél."}</div>
                </button>
              ))}
              {(list.data ?? []).length === 0 && <div className="p-4 text-xs text-muted-foreground">Aucun résultat.</div>}
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            {!result && <div className="text-sm text-muted-foreground">Sélectionne un prospect pour lancer le replay.</div>}
            {result?.error && <div className="text-sm text-destructive">Erreur : {result.error}</div>}
            {result?.nodes && (
              <>
                {result.failed_at ? (
                  <div className="rounded-2xl border-2 border-destructive bg-destructive/10 p-4">
                    <div className="text-destructive font-bold">🔴 Échec à l'étape : <span className="font-mono">{result.failed_at}</span></div>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 p-4">
                    <div className="text-emerald-500 font-bold">✅ Pipeline complet — aucun échec bloquant</div>
                  </div>
                )}
                <div className="space-y-2">
                  {STEPS.map((s) => {
                    const node = result.nodes.find((n: any) => n.step === s);
                    if (!node) return null;
                    return (
                      <div key={s} className="rounded-xl border border-border/40 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-mono text-sm">{s}</div>
                          <StepBadge status={node.status} />
                        </div>
                        <div className="text-xs">{node.reason}</div>
                        <details className="text-[10px]">
                          <summary className="cursor-pointer text-muted-foreground">Payload</summary>
                          <pre className="whitespace-pre-wrap mt-2 bg-muted/20 p-2 rounded">{JSON.stringify(node.payload, null, 2)}</pre>
                        </details>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
