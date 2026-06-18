/**
 * UNPRO — Admin Navigation Usage Analytics
 * Shows top 10 most-used pages + pages recommended for hiding (<5 visits / 30d).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, EyeOff, BarChart3 } from "lucide-react";
import { adminNavGroups } from "@/config/adminNav";

interface PageStat { path: string; visits: number; last_visited: string }

const HIDDEN_KEY = "admin.nav.hidden";

function getHidden(): string[] {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]"); }
  catch { return []; }
}
function setHidden(paths: string[]) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(paths));
}

export default function AdminNavAnalytics() {
  const [stats, setStats] = useState<PageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHiddenState] = useState<string[]>(getHidden());

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_admin_page_stats", { days: 30 });
      setStats(((data as any[]) ?? []).map(d => ({
        path: d.path, visits: Number(d.visits), last_visited: d.last_visited,
      })));
      setLoading(false);
    })();
  }, []);

  // All known admin paths
  const allPaths = new Set<string>();
  adminNavGroups.forEach(g => g.items.forEach(i => allPaths.add(i.to)));
  stats.forEach(s => allPaths.add(s.path));

  const visitMap = new Map(stats.map(s => [s.path, s]));
  const top10 = [...stats].sort((a, b) => b.visits - a.visits).slice(0, 10);
  const lowUsage = [...allPaths]
    .map(p => ({ path: p, visits: visitMap.get(p)?.visits ?? 0 }))
    .filter(p => p.visits < 5 && !hidden.includes(p.path))
    .sort((a, b) => a.visits - b.visits)
    .slice(0, 30);

  function hidePath(path: string) {
    const next = Array.from(new Set([...hidden, path]));
    setHidden(next);
    setHiddenState(next);
    window.dispatchEvent(new Event("admin.nav.hidden.changed"));
  }
  function unhidePath(path: string) {
    const next = hidden.filter(p => p !== path);
    setHidden(next);
    setHiddenState(next);
    window.dispatchEvent(new Event("admin.nav.hidden.changed"));
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Navigation Usage</h1>
          <p className="text-sm text-muted-foreground">Last 30 days · Auto-recommend hiding rarely-used pages</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-emerald-500" /> Top 10 most-used pages
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
            top10.length === 0 ? <p className="text-sm text-muted-foreground">No visits tracked yet.</p> :
            <ul className="divide-y divide-border/40">
              {top10.map((s, i) => (
                <li key={s.path} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-muted-foreground w-6">{i + 1}</span>
                    <code className="text-xs truncate">{s.path}</code>
                  </div>
                  <Badge variant="secondary">{s.visits} visits</Badge>
                </li>
              ))}
            </ul>
          }
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <EyeOff className="h-4 w-4 text-amber-500" /> Recommended to hide (under 5 visits)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowUsage.length === 0 ? <p className="text-sm text-muted-foreground">Nothing to hide.</p> :
            <ul className="divide-y divide-border/40">
              {lowUsage.map(s => (
                <li key={s.path} className="flex items-center justify-between py-2 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <code className="text-xs truncate">{s.path}</code>
                    <Badge variant="outline" className="text-[10px]">{s.visits} visits</Badge>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => hidePath(s.path)}>
                    Hide
                  </Button>
                </li>
              ))}
            </ul>
          }
        </CardContent>
      </Card>

      {hidden.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Currently hidden ({hidden.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border/40">
              {hidden.map(p => (
                <li key={p} className="flex items-center justify-between py-2">
                  <code className="text-xs">{p}</code>
                  <Button size="sm" variant="ghost" onClick={() => unhidePath(p)}>Restore</Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
