import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Rocket, Activity, CheckCircle2, AlertCircle } from "lucide-react";

const TRADES = [
  "Isolation",
  "Toiture",
  "Peinture",
  "HVAC / Chauffage climatisation",
  "Électricien",
  "Plombier",
  "Fenêtres et portes",
  "Paysagement / Clôtures",
  "Excavation / Drain français",
  "Rénovation cuisine et salle de bain",
];

const SUGGESTED_CITIES = ["Laval", "Terrebonne", "Montréal", "Longueuil", "Mascouche", "Repentigny", "Blainville"];

type Run = {
  run_id: string;
  trade: string;
  cities: string[];
  run_status: string;
  current_stage: string | null;
  last_step: string | null;
  next_action: string | null;
  block_reason: string | null;
  alert_admin: boolean;
  dry_run: boolean;
  target_count: number;
  target_limit: number;
  stats: Record<string, number>;
  scraped_count: number;
  deduplicated_count: number;
  enriched_count: number;
  scored_count: number;
  personalized_count: number;
  sent_count: number;
  clicked_count: number;
  paid_count: number;
  pending_count: number;
  failed_count: number;
  error_message: string | null;
  created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
  activated: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
  waiting_approval: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  dry_run_completed: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  blocked: "bg-red-500/15 text-red-400 border-red-500/40",
  failed: "bg-red-500/15 text-red-400 border-red-500/40",
  queued: "bg-blue-500/15 text-blue-400 border-blue-500/40",
  scraping: "bg-blue-500/15 text-blue-400 border-blue-500/40",
  enriching: "bg-blue-500/15 text-blue-400 border-blue-500/40",
};


export default function PageAdminAutopilotMvp() {
  const [trade, setTrade] = useState(TRADES[0]);
  const [cities, setCities] = useState<string[]>(["Laval", "Terrebonne"]);
  const [limit, setLimit] = useState(30);
  const [dryRun, setDryRun] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [newCity, setNewCity] = useState("");

  const fetchRuns = async () => {
    const { data, error } = await supabase
      .from("v_autopilot_pipeline" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      console.error(error);
      return;
    }
    setRuns((data ?? []) as unknown as Run[]);
  };

  useEffect(() => {
    fetchRuns();
    const ch = supabase
      .channel("autopilot-runs")
      .on("postgres_changes", { event: "*", schema: "public", table: "autopilot_runs" }, () => fetchRuns())
      .subscribe();
    const t = setInterval(fetchRuns, 5000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(t);
    };
  }, []);

  const launch = async () => {
    if (cities.length === 0) {
      toast.error("Sélectionne au moins une ville");
      return;
    }
    setLaunching(true);
    try {
      const { data, error } = await supabase.functions.invoke("autopilot-mvp", {
        body: { trade, cities, limit, dry_run: dryRun },
      });
      if (error) throw error;
      toast.success(`Run lancé · ${data?.stats?.scraped ?? 0} prospects scrappés`);
      fetchRuns();
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors du lancement");
    } finally {
      setLaunching(false);
    }
  };

  const toggleCity = (c: string) => {
    setCities((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const addCustomCity = () => {
    const c = newCity.trim();
    if (!c || cities.includes(c)) return;
    setCities([...cities, c]);
    setNewCity("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 lg:p-10">
      <Helmet>
        <title>Autopilot MVP · UNPRO Admin</title>
        <meta name="description" content="Orchestrateur unique acquisition entrepreneur" />
      </Helmet>

      <div className="max-w-7xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Autopilot MVP</h1>
          <p className="text-muted-foreground">
            Scrape → Enrich → Score → Personalize → Approval gate. Tout en un clic.
          </p>
        </header>

        {/* Launcher */}
        <Card className="p-6 bg-card/60 backdrop-blur border-border/50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Métier</Label>
                <Select value={trade} onValueChange={setTrade}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Villes ({cities.length})</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {SUGGESTED_CITIES.map((c) => (
                    <Badge
                      key={c}
                      variant={cities.includes(c) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleCity(c)}
                    >
                      {c}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ajouter une ville…"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomCity()}
                  />
                  <Button variant="secondary" onClick={addCustomCity}>Ajouter</Button>
                </div>
                {cities.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cities.map((c) => (
                      <Badge key={c} variant="secondary" className="cursor-pointer" onClick={() => toggleCity(c)}>
                        {c} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Nombre de prospects : {limit}</Label>
                <Slider
                  value={[limit]}
                  onValueChange={([v]) => setLimit(v)}
                  min={10}
                  max={200}
                  step={10}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40">
                <div>
                  <Label className="text-base">Mode dry-run</Label>
                  <p className="text-xs text-muted-foreground">
                    Scrape + enrich + score + personalize, sans envoyer d'email.
                  </p>
                </div>
                <Switch checked={dryRun} onCheckedChange={setDryRun} />
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={launch}
                disabled={launching || cities.length === 0}
              >
                {launching ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Lancement…</>
                ) : (
                  <><Rocket className="mr-2 h-4 w-4" /> Lancer l'autopilot</>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Runs */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" /> Derniers runs
          </h2>
          {runs.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Aucun run pour l'instant. Lance ton premier batch.
            </Card>
          ) : (
            <div className="grid gap-3">
              {runs.map((r) => (
                <Card key={r.id} className="p-4 bg-card/40 border-border/50">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {r.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : r.status === "failed" ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                        )}
                        {r.trade} · {r.cities.join(", ")}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(r.created_at).toLocaleString("fr-CA")}
                        {r.dry_run && " · DRY-RUN"}
                        {r.current_stage && ` · ${r.current_stage}`}
                      </div>
                      {r.error_message && (
                        <div className="text-xs text-red-400 mt-1">⚠ {r.error_message}</div>
                      )}
                    </div>
                    <Badge variant={r.status === "completed" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>
                      {r.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-7 gap-3 mt-4 text-center">
                    <Stat label="Cible" value={r.target_limit} />
                    <Stat label="Scrapés" value={r.scraped_count ?? r.stats?.scraped ?? 0} />
                    <Stat label="Enrichis" value={r.enriched_count ?? r.stats?.enriched ?? 0} />
                    <Stat label="Scorés" value={r.stats?.scored ?? 0} />
                    <Stat label="Personnalisés" value={r.stats?.personalized ?? 0} />
                    <Stat label="En attente" value={r.stats?.approval_queued ?? 0} />
                    <Stat label="Clics" value={r.clicked_count ?? 0} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/30 p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
