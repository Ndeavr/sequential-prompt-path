// PageMissionControl — admin cockpit to launch & monitor outbound missions.
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Rocket, RefreshCw } from "lucide-react";

type Mission = {
  id: string; name: string; trade_slug: string; cities: string[];
  status: string; target_count: number; success: boolean;
  scraped_count: number; enriched_count: number; scored_count: number;
  sent_count: number; opened_count: number; clicked_count: number;
  replied_count: number; paid_count: number;
  first_payment_at: string | null;
};

const DEFAULT_MISSION = {
  name: "Isolation entretoits — Wave 1",
  trade_slug: "isolation entretoit",
  cities: ["Laval", "Terrebonne", "Longueuil", "Montréal"],
  target_count: 30,
};

export default function PageMissionControl() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const { data } = await supabase.from("outbound_missions")
      .select("*").order("created_at", { ascending: false }).limit(20);
    setMissions((data ?? []) as Mission[]);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    const ch = supabase.channel("mission-control")
      .on("postgres_changes", { event: "*", schema: "public", table: "outbound_missions" },
          () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function createMission() {
    setBusy("create");
    const { data, error } = await supabase.from("outbound_missions").insert(DEFAULT_MISSION).select().single();
    setBusy(null);
    if (error) { alert(error.message); return; }
    await runPhase(data.id, "scrape,enrich,generate,send");
  }

  async function runPhase(missionId: string, phasesCsv: string) {
    setBusy(missionId);
    const phases = phasesCsv.split(",");
    const { data, error } = await supabase.functions.invoke("mission-orchestrator", {
      body: { mission_id: missionId, phases },
    });
    setBusy(null);
    if (error) alert(error.message);
    else console.log("mission run", data);
    refresh();
  }

  return (
    <>
      <Helmet><title>Mission Control — UNPRO</title></Helmet>
      <main className="min-h-screen bg-[#050816] text-white px-5 py-8">
        <div className="max-w-5xl mx-auto">
          <header className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Mission Control</h1>
              <p className="text-white/60 text-sm mt-1">Pipeline outbound autonome — exécution réelle, paiement réel.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={refresh} className="border-white/10 bg-white/5">
                <RefreshCw className="w-4 h-4 mr-2" /> Rafraîchir
              </Button>
              <Button onClick={createMission} disabled={busy === "create"} className="bg-amber-400 text-[#060B14] hover:bg-amber-300">
                {busy === "create" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                Lancer mission Isolation × 4 villes
              </Button>
            </div>
          </header>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
          ) : missions.length === 0 ? (
            <Card className="bg-white/[0.03] border-white/10">
              <CardContent className="p-10 text-center text-white/60">
                Aucune mission. Cliquez « Lancer mission » pour démarrer le pipeline réel.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {missions.map((m) => (
                <Card key={m.id} className={`bg-white/[0.03] border-white/10 ${m.success ? "ring-2 ring-emerald-400/40" : ""}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-lg font-semibold">{m.name}</h2>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">{m.status}</span>
                          {m.success && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300">MISSION SUCCESS</span>}
                        </div>
                        <p className="text-xs text-white/50">{m.trade_slug} • {m.cities.join(", ")} • cible {m.target_count}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-white/10 bg-white/5"
                          disabled={busy === m.id}
                          onClick={() => runPhase(m.id, "scrape,enrich,generate,send")}>
                          {busy === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Run full pipeline"}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
                      {[
                        ["Scrapés", m.scraped_count],
                        ["Enrichis", m.enriched_count],
                        ["Scorés", m.scored_count],
                        ["Envoyés", m.sent_count],
                        ["Ouverts", m.opened_count],
                        ["Payés", m.paid_count],
                      ].map(([label, val]) => (
                        <div key={label as string} className="rounded-xl bg-white/[0.03] border border-white/5 py-3">
                          <div className="text-2xl font-semibold">{val as number}</div>
                          <div className="text-[10px] uppercase tracking-wider text-white/50 mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
