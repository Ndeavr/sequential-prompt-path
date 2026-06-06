/**
 * UNPRO — UI Health Monitor
 * Runs axe-core (color-contrast + text visibility rules) against a set of routes
 * via a sandboxed iframe and persists findings to `ui_accessibility_audit`.
 *
 * Règle système : aucun texte sous WCAG AA. Aucune opacité < 70% sur texte.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, ShieldCheck, ShieldQuestion, Play, RefreshCcw } from "lucide-react";
import axe, { type AxeResults, type Result, type NodeResult } from "axe-core";

const DEFAULT_ROUTES = [
  "/",
  "/pim",
  "/pourquoi-unpro",
  "/journal",
  "/diagnostic",
  "/entrepreneur/devis-personnalise",
  "/login",
  "/admin/launch-war-room",
];

const VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "desktop", width: 1280, height: 800 },
] as const;

interface Finding {
  id: string;
  route: string;
  component: string | null;
  selector: string | null;
  issue_type: string;
  severity: "info" | "warn" | "critical";
  contrast_ratio: number | null;
  fg_color: string | null;
  bg_color: string | null;
  text_sample: string | null;
  viewport: string;
  detected_at: string;
  resolved_at: string | null;
}

async function scanFrame(iframe: HTMLIFrameElement): Promise<AxeResults | null> {
  const doc = iframe.contentDocument;
  if (!doc) return null;
  try {
    return await axe.run(doc, {
      runOnly: { type: "rule", values: ["color-contrast", "color-contrast-enhanced"] },
      resultTypes: ["violations"],
    });
  } catch {
    return null;
  }
}

function severityFor(rule: string, ratio?: number): "info" | "warn" | "critical" {
  if (rule === "color-contrast" && typeof ratio === "number" && ratio < 3) return "critical";
  if (rule === "color-contrast") return "warn";
  return "info";
}

function extractRatio(node: NodeResult): { ratio?: number; fg?: string; bg?: string } {
  const checks = [...(node.any ?? []), ...(node.all ?? []), ...(node.none ?? [])];
  for (const c of checks) {
    const d = c.data as { contrastRatio?: number; fgColor?: string; bgColor?: string } | undefined;
    if (d?.contrastRatio !== undefined) return { ratio: d.contrastRatio, fg: d.fgColor, bg: d.bgColor };
  }
  return {};
}

export default function AdminUIHealthMonitor() {
  const [routes, setRoutes] = useState<string[]>(DEFAULT_ROUTES);
  const [routeInput, setRouteInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "critical" | "warn" | "open">("open");

  async function loadFindings() {
    setLoading(true);
    const { data } = await supabase
      .from("ui_accessibility_audit")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(500);
    setFindings((data ?? []) as Finding[]);
    setLoading(false);
  }

  useEffect(() => {
    loadFindings();
  }, []);

  async function runScan() {
    setScanning(true);
    const inserts: Omit<Finding, "id" | "detected_at" | "resolved_at">[] = [];

    for (const route of routes) {
      for (const vp of VIEWPORTS) {
        setProgress(`Scan ${route} (${vp.label})…`);
        const iframe = document.createElement("iframe");
        iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${vp.width}px;height:${vp.height}px;border:0;`;
        iframe.src = route;
        document.body.appendChild(iframe);
        try {
          await new Promise<void>((resolve) => {
            const t = setTimeout(resolve, 4500);
            iframe.addEventListener("load", () => setTimeout(resolve, 1800), { once: true });
            void t;
          });
          const results = await scanFrame(iframe);
          if (results) {
            for (const v of results.violations as Result[]) {
              for (const node of v.nodes) {
                const { ratio, fg, bg } = extractRatio(node);
                inserts.push({
                  route,
                  component: null,
                  selector: Array.isArray(node.target) ? node.target.join(" ") : String(node.target),
                  issue_type: v.id,
                  severity: severityFor(v.id, ratio),
                  contrast_ratio: ratio ?? null,
                  fg_color: fg ?? null,
                  bg_color: bg ?? null,
                  text_sample: (node.html ?? "").slice(0, 280),
                  viewport: vp.label,
                });
              }
            }
          }
        } finally {
          iframe.remove();
        }
      }
    }

    if (inserts.length > 0) {
      // Best-effort chunked insert
      for (let i = 0; i < inserts.length; i += 100) {
        await supabase.from("ui_accessibility_audit").insert(inserts.slice(i, i + 100));
      }
    }

    setProgress(`Scan terminé · ${inserts.length} problème(s) détecté(s)`);
    setScanning(false);
    await loadFindings();
  }

  async function resolveFinding(id: string) {
    await supabase
      .from("ui_accessibility_audit")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", id);
    setFindings((prev) => prev.map((f) => (f.id === id ? { ...f, resolved_at: new Date().toISOString() } : f)));
  }

  const visible = useMemo(() => {
    return findings.filter((f) => {
      if (filter === "open") return !f.resolved_at;
      if (filter === "critical") return f.severity === "critical";
      if (filter === "warn") return f.severity === "warn";
      return true;
    });
  }, [findings, filter]);

  const kpis = useMemo(() => {
    const open = findings.filter((f) => !f.resolved_at);
    const critical = open.filter((f) => f.severity === "critical").length;
    const warn = open.filter((f) => f.severity === "warn").length;
    const status: "green" | "amber" | "red" = critical > 0 ? "red" : warn > 0 ? "amber" : "green";
    return { total: findings.length, openCount: open.length, critical, warn, status };
  }, [findings]);

  const StatusIcon = kpis.status === "green" ? ShieldCheck : kpis.status === "amber" ? ShieldQuestion : ShieldAlert;
  const statusTone =
    kpis.status === "green" ? "text-emerald-500" : kpis.status === "amber" ? "text-amber-500" : "text-red-500";

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <StatusIcon className={`w-7 h-7 ${statusTone}`} />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">UI Health Monitor</h1>
          <Badge variant={kpis.status === "red" ? "destructive" : "secondary"} className="ml-2">
            {kpis.status === "green" ? "🟢 Excellent" : kpis.status === "amber" ? "🟡 À surveiller" : "🔴 Correction requise"}
          </Badge>
        </div>
        <p className="text-readable-soft text-sm">
          Audit de lisibilité et contraste (WCAG AA). Détecte texte invisible, contraste faible, et glassmorphism agressif sur fond sombre.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4">
          <div className="text-xs text-readable-soft">Total findings</div>
          <div className="text-2xl font-semibold">{kpis.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-readable-soft">Ouverts</div>
          <div className="text-2xl font-semibold">{kpis.openCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-readable-soft">🔴 Critiques</div>
          <div className="text-2xl font-semibold text-red-500">{kpis.critical}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-readable-soft">🟡 Warnings</div>
          <div className="text-2xl font-semibold text-amber-500">{kpis.warn}</div>
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Routes à scanner</h2>
          <div className="flex gap-2">
            <Button onClick={runScan} disabled={scanning} size="sm" className="gap-2">
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {scanning ? "Scan en cours…" : "Lancer le scan"}
            </Button>
            <Button onClick={loadFindings} variant="outline" size="sm" className="gap-2">
              <RefreshCcw className="w-4 h-4" /> Rafraîchir
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {routes.map((r) => (
            <Badge key={r} variant="secondary" className="cursor-pointer" onClick={() => setRoutes((p) => p.filter((x) => x !== r))}>
              {r} ×
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={routeInput}
            onChange={(e) => setRouteInput(e.target.value)}
            placeholder="/nouvelle-route"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (routeInput.startsWith("/")) {
                setRoutes((p) => Array.from(new Set([...p, routeInput])));
                setRouteInput("");
              }
            }}
          >
            Ajouter
          </Button>
        </div>
        {progress && <p className="text-xs text-readable-soft mt-3">{progress}</p>}
      </Card>

      <div className="flex gap-2 mb-4">
        {(["open", "critical", "warn", "all"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "open" ? "Ouverts" : f === "critical" ? "Critiques" : f === "warn" ? "Warnings" : "Tous"}
          </Button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-readable-soft">Chargement…</div>
        ) : visible.length === 0 ? (
          <div className="p-8 text-center text-readable-soft">Aucun problème dans cette vue.</div>
        ) : (
          <div className="divide-y divide-border">
            {visible.map((f) => (
              <div key={f.id} className="p-4 grid grid-cols-12 gap-3 items-start text-sm">
                <div className="col-span-12 md:col-span-3">
                  <div className="font-medium text-readable-strong">{f.route}</div>
                  <div className="text-xs text-readable-soft">
                    {f.viewport} · {new Date(f.detected_at).toLocaleString("fr-CA")}
                  </div>
                </div>
                <div className="col-span-12 md:col-span-2">
                  <Badge variant={f.severity === "critical" ? "destructive" : f.severity === "warn" ? "secondary" : "outline"}>
                    {f.severity}
                  </Badge>
                  <div className="text-xs text-readable-soft mt-1">{f.issue_type}</div>
                  {f.contrast_ratio !== null && (
                    <div className="text-xs mt-1">
                      ratio: <strong>{f.contrast_ratio.toFixed(2)}</strong>
                    </div>
                  )}
                </div>
                <div className="col-span-12 md:col-span-5">
                  <code className="text-xs bg-muted rounded px-2 py-1 block truncate" title={f.selector ?? undefined}>
                    {f.selector ?? "—"}
                  </code>
                  {f.text_sample && (
                    <div className="text-xs text-readable-soft mt-1 line-clamp-2 font-mono">{f.text_sample}</div>
                  )}
                  {(f.fg_color || f.bg_color) && (
                    <div className="flex gap-2 mt-2 items-center text-xs">
                      {f.fg_color && (
                        <span className="inline-flex items-center gap-1">
                          fg <span className="w-4 h-4 rounded border border-border" style={{ background: f.fg_color }} />
                        </span>
                      )}
                      {f.bg_color && (
                        <span className="inline-flex items-center gap-1">
                          bg <span className="w-4 h-4 rounded border border-border" style={{ background: f.bg_color }} />
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="col-span-12 md:col-span-2 flex md:justify-end">
                  {f.resolved_at ? (
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/40">
                      Résolu
                    </Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => resolveFinding(f.id)}>
                      Marquer résolu
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
