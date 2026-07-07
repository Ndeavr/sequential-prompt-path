/**
 * Memory Health — admin cockpit for the Compatibility Memory Engine.
 */
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import DashboardLayout from "@/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

export default function PageMemoryHealth() {
  const events = useQuery({
    queryKey: ["memory-events-recent"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("homeowner_memory_events")
        .select("id, user_id, scope, confidence, extracted, question, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const bank = useQuery({
    queryKey: ["question-bank"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("adaptive_question_bank")
        .select("*")
        .order("information_gain", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const coverage = useQuery({
    queryKey: ["dna-coverage"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("homeowner_compat_dna")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  return (
    <DashboardLayout>
      <Helmet><title>Memory Health — Admin UNPRO</title></Helmet>
      <div className="admin-theme min-h-screen p-6 space-y-8">
        <header>
          <h1 className="text-2xl font-semibold">Compatibility Memory — Health</h1>
          <p className="text-sm text-muted-foreground">Observability of long-term homeowner memory and adaptive questioning.</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border/40 p-5 bg-card/40">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Homeowners with DNA</div>
            <div className="text-3xl font-semibold mt-2 tabular-nums">{coverage.data ?? "…"}</div>
          </div>
          <div className="rounded-2xl border border-border/40 p-5 bg-card/40">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Question bank size</div>
            <div className="text-3xl font-semibold mt-2 tabular-nums">{bank.data?.length ?? "…"}</div>
          </div>
          <div className="rounded-2xl border border-border/40 p-5 bg-card/40">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Recent events (50 max)</div>
            <div className="text-3xl font-semibold mt-2 tabular-nums">{events.data?.length ?? "…"}</div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Question bank — information gain ranking</h2>
          <div className="rounded-2xl border border-border/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider">
                <tr><th className="text-left p-3">Dimension</th><th className="text-left p-3">Question FR</th><th className="text-right p-3">Gain</th></tr>
              </thead>
              <tbody>
                {(bank.data ?? []).map((q: any) => (
                  <tr key={q.id} className="border-t border-border/20">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{q.dimension}</td>
                    <td className="p-3">{q.question_fr}</td>
                    <td className="p-3 text-right tabular-nums">{Number(q.information_gain).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Recent extractions</h2>
          <div className="rounded-2xl border border-border/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left p-3">When</th>
                  <th className="text-left p-3">Scope</th>
                  <th className="text-left p-3">Question</th>
                  <th className="text-left p-3">Extracted</th>
                  <th className="text-right p-3">Conf.</th>
                </tr>
              </thead>
              <tbody>
                {(events.data ?? []).map((e: any) => (
                  <tr key={e.id} className="border-t border-border/20 align-top">
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(e.created_at).toLocaleString("fr-CA")}</td>
                    <td className="p-3"><span className={`text-xs rounded-full px-2 py-0.5 ${e.scope === "long_term" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{e.scope}</span></td>
                    <td className="p-3 text-xs">{e.question}</td>
                    <td className="p-3 text-xs font-mono">{JSON.stringify(e.extracted)}</td>
                    <td className="p-3 text-right tabular-nums">{Number(e.confidence).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
