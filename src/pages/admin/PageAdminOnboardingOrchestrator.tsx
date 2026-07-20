import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STATE_LABELS, STATE_COLOR, ONBOARDING_STATES, type OnboardingState, type OnboardingRow } from "@/features/onboardingOrchestrator";
import { OnboardingTimeline } from "@/features/onboardingOrchestrator/OnboardingTimeline";
import { formatQcDateTime } from "@/lib/time/timezone";

interface RowJoined extends OnboardingRow {
  business_name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export default function PageAdminOnboardingOrchestrator() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [rows, setRows] = useState<RowJoined[]>([]);
  const [filter, setFilter] = useState<OnboardingState | "ALL">("ALL");
  const [selected, setSelected] = useState<string | null>(null);
  const [ticking, setTicking] = useState(false);

  async function load() {
    const { data: all } = await supabase
      .from("contractor_onboarding_states" as any)
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(500);
    const list = ((all as any) ?? []) as OnboardingRow[];

    const c: Record<string, number> = {};
    for (const s of ONBOARDING_STATES) c[s] = 0;
    for (const r of list) c[r.state] = (c[r.state] ?? 0) + 1;
    setCounts(c);

    const ids = list.map(r => r.contractor_id);
    let leads: any[] = [];
    if (ids.length) {
      const { data } = await supabase.from("contractor_leads")
        .select("id, business_name, phone, email")
        .in("id", ids);
      leads = (data ?? []);
    }
    const byId = new Map(leads.map(l => [l.id, l]));
    setRows(list.map(r => ({ ...r, ...(byId.get(r.contractor_id) ?? {}) })));
  }

  useEffect(() => { load(); }, []);

  async function forceTick() {
    setTicking(true);
    try {
      await supabase.functions.invoke("onboarding-orchestrator", { body: {} });
      await supabase.functions.invoke("onboarding-self-heal", { body: {} });
      await load();
    } finally { setTicking(false); }
  }

  async function retryOne(contractorId: string) {
    await supabase.from("contractor_onboarding_states" as any)
      .update({ next_action_at: new Date().toISOString(), retry_count: 0, blocked_reason: null, stuck_since: null })
      .eq("contractor_id", contractorId);
    await supabase.functions.invoke("onboarding-orchestrator", { body: {} });
    await load();
  }

  const filtered = filter === "ALL" ? rows : rows.filter(r => r.state === filter);

  return (
    <div className="alex-immersive min-h-screen p-4 md:p-8 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-readable-primary">Onboarding Orchestrator</h1>
          <p className="text-readable-muted text-sm">Autonomous SCRAPED → LIVE pipeline.</p>
        </div>
        <button
          onClick={forceTick} disabled={ticking}
          className="rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 px-4 py-2 text-sm"
        >{ticking ? "Tick…" : "Forcer un tick"}</button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <button onClick={() => setFilter("ALL")}
          className={`rounded-xl glass-strong px-3 py-2 text-left ${filter==="ALL"?"ring-1 ring-emerald-400":""}`}>
          <div className="text-readable-muted text-xs">Total</div>
          <div className="text-readable-primary text-lg">{rows.length}</div>
        </button>
        {ONBOARDING_STATES.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-xl glass-strong px-3 py-2 text-left ${filter===s?"ring-1 ring-emerald-400":""}`}>
            <div className={`text-xs ${STATE_COLOR[s]}`}>{STATE_LABELS[s]}</div>
            <div className="text-readable-primary text-lg">{counts[s] ?? 0}</div>
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl glass-strong overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-readable-muted text-xs">
              <tr><th className="text-left p-2">Entreprise</th><th className="text-left p-2">État</th><th className="text-left p-2">MAJ</th><th className="p-2"></th></tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map(r => (
                <tr key={r.contractor_id} onClick={() => setSelected(r.contractor_id)}
                  className={`cursor-pointer border-t border-white/5 hover:bg-white/5 ${selected===r.contractor_id?"bg-white/10":""}`}>
                  <td className="p-2 text-readable-body truncate max-w-[180px]">{r.business_name ?? r.contractor_id.slice(0,8)}</td>
                  <td className={`p-2 ${STATE_COLOR[r.state]}`}>{STATE_LABELS[r.state]}</td>
                  <td className="p-2 text-readable-muted text-xs">{formatQcDateTime(r.updated_at)}</td>
                  <td className="p-2 text-right">
                    <button onClick={(e) => { e.stopPropagation(); retryOne(r.contractor_id); }}
                      className="text-emerald-300 text-xs hover:underline">Retry</button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={4} className="p-6 text-center text-readable-muted">Aucun entrepreneur dans cet état.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl glass-strong p-4">
          {selected ? (
            <OnboardingTimeline contractorId={selected} />
          ) : (
            <div className="text-readable-muted text-sm">Sélectionne un entrepreneur pour voir sa timeline.</div>
          )}
        </div>
      </div>
    </div>
  );
}
