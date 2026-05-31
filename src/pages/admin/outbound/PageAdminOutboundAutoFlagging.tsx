import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Flag, ShieldAlert, RefreshCw } from "lucide-react";

type FlagRow = {
  id: string;
  target_id: string;
  flag_type: string;
  severity: string;
  badge_signals: string[];
  priority_score_boost: number;
  reason: string | null;
  created_at: string;
  resolved_at: string | null;
};

export default function PageAdminOutboundAutoFlagging() {
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [stats, setStats] = useState({ total: 0, last24h: 0, critical: 0 });
  const [lastResult, setLastResult] = useState<any>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("outbound_priority_flags")
      .select("id, target_id, flag_type, severity, badge_signals, priority_score_boost, reason, created_at, resolved_at")
      .order("created_at", { ascending: false })
      .limit(100);
    const rows = (data ?? []) as FlagRow[];
    setFlags(rows);
    const since = Date.now() - 24 * 3600 * 1000;
    setStats({
      total: rows.length,
      last24h: rows.filter((r) => new Date(r.created_at).getTime() > since).length,
      critical: rows.filter((r) => r.severity === "critical").length,
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function runScan(dryRun: boolean) {
    setRunning(true);
    setLastResult(null);
    const { data, error } = await supabase.functions.invoke("sniper-auto-flag-badges", {
      body: { limit: 200, dry_run: dryRun },
    });
    setRunning(false);
    if (error) {
      toast.error(`Scan échoué: ${error.message}`);
      return;
    }
    setLastResult(data);
    toast.success(
      dryRun
        ? `Dry-run: ${data?.summary?.scanned ?? 0} cibles détectées`
        : `Auto-flag terminé: ${data?.summary?.flagged ?? 0} cibles flaggées`,
    );
    if (!dryRun) load();
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-primary" />
              Auto-flagging prioritaire
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Détecte automatiquement les entrepreneurs qui affichent des badges marketing
              (Choix du consommateur, CAA, HomeStars, Houzz, RBQ Excellence…) et les route
              vers la séquence <strong>Badges 2026 — AI Domination</strong> avec un boost
              prioritaire de +25.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => runScan(true)} disabled={running}>
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="ml-2">Dry-run</span>
            </Button>
            <Button onClick={() => runScan(false)} disabled={running}>
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
              <span className="ml-2">Lancer auto-flag</span>
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Total flagués</div>
            <div className="text-3xl font-bold mt-1">{stats.total}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Dernières 24h</div>
            <div className="text-3xl font-bold mt-1">{stats.last24h}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Critiques</div>
            <div className="text-3xl font-bold mt-1 text-destructive">{stats.critical}</div>
          </Card>
        </div>

        {lastResult && (
          <Card className="p-5 bg-muted/30">
            <div className="text-sm font-mono whitespace-pre-wrap">
              {JSON.stringify(lastResult.summary, null, 2)}
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-semibold">Historique des drapeaux prioritaires</h2>
          </div>
          {loading ? (
            <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : flags.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              Aucun drapeau pour le moment. Lance un scan pour détecter les badges.
            </div>
          ) : (
            <div className="divide-y">
              {flags.map((f) => (
                <div key={f.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={f.severity === "critical" ? "destructive" : "secondary"}>
                        {f.severity}
                      </Badge>
                      <Badge variant="outline">+{f.priority_score_boost}</Badge>
                      {(f.badge_signals ?? []).map((b) => (
                        <Badge key={b} variant="outline" className="font-mono text-xs">{b}</Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{f.reason}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(f.created_at).toLocaleString("fr-CA")} · target {f.target_id.slice(0, 8)}
                    </div>
                  </div>
                  {f.resolved_at && <Badge>résolu</Badge>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
