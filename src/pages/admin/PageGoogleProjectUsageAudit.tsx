/**
 * Admin diagnostic — Google Project Usage Audit
 * Route: /admin/google-project-audit
 *
 * Shows env vars, code-usage scan results (static), live autocomplete probe,
 * key fingerprints, consolidation recommendations, and risk alerts.
 */
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, Download, Copy, Search } from "lucide-react";
import { toast } from "sonner";

// ─── Static code-usage map (curated from repo scan) ─────────────
type Usage = {
  file: string;
  line: number;
  pattern: string;
  type: "places" | "maps" | "geocoding" | "gemini" | "stt" | "oauth" | "other";
  side: "frontend" | "edge";
  suspectedProject: string;
  status: "ok" | "duplicate" | "unknown" | "unsafe" | "removed";
};

const CODE_USAGES: Usage[] = [
  { file: "supabase/functions/_shared/googleMapsConnector.ts", line: 1, pattern: "LOVABLE_API_KEY + GOOGLE_MAPS_API_KEY", type: "places", side: "edge", suspectedProject: "Maps UnPRO (maps-unpro-441820)", status: "ok" },
  { file: "supabase/functions/google-places-autocomplete/index.ts", line: 1, pattern: "placesAutocomplete / placeDetails", type: "places", side: "edge", suspectedProject: "Maps UnPRO", status: "ok" },
  { file: "supabase/functions/business-lookup/index.ts", line: 2, pattern: "placesSearchTextRaw", type: "places", side: "edge", suspectedProject: "Maps UnPRO", status: "ok" },
  { file: "supabase/functions/contractor-activation-enrich/index.ts", line: 88, pattern: "GOOGLE_PLACES_SERVER_KEY || GOOGLE_PLACES_API_KEY", type: "places", side: "edge", suspectedProject: "Maps UnPRO", status: "ok" },
  { file: "supabase/functions/onboarding-import/index.ts", line: 32, pattern: "GOOGLE_PLACES_SERVER_KEY || GOOGLE_PLACES_API_KEY", type: "places", side: "edge", suspectedProject: "Maps UnPRO", status: "ok" },
  { file: "supabase/functions/get-places-key/index.ts", line: 1, pattern: "DEPRECATED — no key exposed", type: "places", side: "edge", suspectedProject: "Maps UnPRO", status: "removed" },
  { file: "supabase/functions/search-google-business/index.ts", line: 40, pattern: "GOOGLE_PLACES_SERVER_KEY || GOOGLE_PLACES_API_KEY", type: "places", side: "edge", suspectedProject: "Maps UnPRO", status: "ok" },
  { file: "supabase/functions/search-gmb-profile/index.ts", line: 157, pattern: "GOOGLE_PLACES_SERVER_KEY || GOOGLE_PLACES_API_KEY", type: "places", side: "edge", suspectedProject: "Maps UnPRO", status: "ok" },
  { file: "supabase/functions/fn-instant-profile-demo/index.ts", line: 68, pattern: "GOOGLE_PLACES_SERVER_KEY || GOOGLE_PLACES_API_KEY", type: "places", side: "edge", suspectedProject: "Maps UnPRO", status: "ok" },
  { file: "supabase/functions/alex-stt/index.ts", line: 52, pattern: "speech.googleapis.com", type: "stt", side: "edge", suspectedProject: "GOOGLE_CLOUD_STT_API_KEY", status: "ok" },
  { file: "supabase/functions/alex-stt-stream/index.ts", line: 83, pattern: "speech.googleapis.com", type: "stt", side: "edge", suspectedProject: "GOOGLE_CLOUD_STT_API_KEY", status: "ok" },
  { file: "supabase/functions/alex-live-token/index.ts", line: 22, pattern: "GEMINI_API_KEY", type: "gemini", side: "edge", suspectedProject: "Gemini (gen-lang-client-0488436653)", status: "ok" },
  { file: "supabase/functions/fn-extract-business-data/index.ts", line: 52, pattern: "GEMINI_API_KEY", type: "gemini", side: "edge", suspectedProject: "Gemini (gen-lang-client-0488436653)", status: "ok" },
  { file: "supabase/functions/calendar-google-oauth-start/index.ts", line: 49, pattern: "googleapis.com/auth/calendar", type: "oauth", side: "edge", suspectedProject: "GOOGLE_OAUTH (separate)", status: "ok" },
  { file: "supabase/functions/calendar-google-oauth-callback/index.ts", line: 5, pattern: "oauth2.googleapis.com/token", type: "oauth", side: "edge", suspectedProject: "GOOGLE_OAUTH (separate)", status: "ok" },
];

const KNOWN_PROJECTS = [
  { id: "maps-unpro-441820", name: "Maps UnPRO", recommendation: "PRODUCTION — keep as primary for Maps/Places/Geocoding", action: "Keep" },
  { id: "gen-lang-client-0488436653", name: "Gemini Project", recommendation: "AI only — keep isolated from Maps/Places", action: "Investigate" },
  { id: "gen-lang-client-0068351085", name: "Unpro (legacy)", recommendation: "Likely duplicate — migrate or disable", action: "Investigate" },
  { id: "silver-ripple-441114-a9", name: "My First Project", recommendation: "Default GCP project — no app usage", action: "Disable" },
];

type EnvRow = {
  name: string;
  masked: string | null;
  fingerprint: string | null;
  side: "server";
  present: boolean;
  risk: string;
  feature: string;
};

export default function PageGoogleProjectUsageAudit() {
  const [loading, setLoading] = useState(false);
  const [envRows, setEnvRows] = useState<EnvRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [probeInput, setProbeInput] = useState("1234 rue Sainte-Catherine, Montréal");
  const [probeResult, setProbeResult] = useState<any>(null);
  const [probing, setProbing] = useState(false);

  const refresh = async (probe = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-project-audit", {
        body: probe ? { action: "probe", input: probeInput } : { action: "scan" },
      });
      if (error) throw error;
      setEnvRows(data?.env_summary ?? []);
      setGeneratedAt(data?.generated_at ?? null);
      if (probe) setProbeResult(data?.live_probe ?? null);
    } catch (e: any) {
      toast.error(`Audit failed: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
      setProbing(false);
    }
  };

  useEffect(() => { refresh(false); /* eslint-disable-next-line */ }, []);

  const runProbe = async () => {
    setProbing(true);
    await refresh(true);
  };

  const alerts = useMemo(() => {
    const out: { level: "high" | "med" | "info"; msg: string }[] = [];
    const placesPresent = envRows.find((r) => r.name === "GOOGLE_PLACES_API_KEY")?.present;
    const mapsPresent = envRows.find((r) => r.name === "GOOGLE_MAPS_API_KEY")?.present;
    if (mapsPresent && placesPresent) out.push({ level: "med", msg: "Multiple Google Maps-family keys detected (GOOGLE_MAPS_API_KEY + GOOGLE_PLACES_API_KEY). Consolidate to a single restricted key per surface." });
    if (!placesPresent) out.push({ level: "high", msg: "GOOGLE_PLACES_API_KEY missing in Edge Function secrets — autocomplete will fail." });
    const gemini = envRows.find((r) => r.name === "GEMINI_API_KEY");
    if (gemini?.present && /AIza/i.test(gemini.masked ?? "") && envRows.some((r) => r.name === "GOOGLE_PLACES_API_KEY" && r.masked === gemini.masked)) {
      out.push({ level: "high", msg: "Gemini key appears identical to Places key — projects are likely conflated. Split into separate restricted keys." });
    }
    if (envRows.some((r) => /VITE_/i.test(r.name) && r.present)) out.push({ level: "high", msg: "VITE_* Google key present — exposed to the browser. Ensure it has HTTP-referrer restrictions." });
    return out;
  }, [envRows]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ generatedAt, envRows, codeUsages: CODE_USAGES, knownProjects: KNOWN_PROJECTS, probeResult, alerts }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `google-project-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyChecklist = async () => {
    const lines = [
      "UNPRO — Google Project Consolidation Checklist",
      `Generated: ${new Date().toISOString()}`,
      "",
      "Preferred production project: Maps UnPRO (maps-unpro-441820)",
      "",
      ...KNOWN_PROJECTS.map((p) => `- [${p.action.toUpperCase()}] ${p.name} (${p.id}) — ${p.recommendation}`),
      "",
      "Risk alerts:",
      ...alerts.map((a) => `- (${a.level.toUpperCase()}) ${a.msg}`),
    ].join("\n");
    await navigator.clipboard.writeText(lines);
    toast.success("Checklist copied");
  };

  const riskBadge = (status: string) => {
    const map: Record<string, string> = {
      ok: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      duplicate: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      unknown: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
      unsafe: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      removed: "bg-slate-500/10 text-slate-400 border-slate-500/30",
      missing: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      oauth_secret: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    };
    return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <Helmet><title>Google Project Audit · Admin</title></Helmet>

      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Google Project Usage Audit</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Diagnostic interne — clés, projets, consommation, et recommandations de consolidation.
          </p>
          {generatedAt && <p className="text-xs text-muted-foreground mt-1">Last scan: {new Date(generatedAt).toLocaleString()}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => refresh(false)} disabled={loading} size="sm" variant="outline">
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh scan
          </Button>
          <Button onClick={exportJson} size="sm" variant="outline"><Download className="h-4 w-4 mr-1" /> Export JSON</Button>
          <Button onClick={copyChecklist} size="sm" variant="outline"><Copy className="h-4 w-4 mr-1" /> Copy checklist</Button>
        </div>
      </header>

      {/* 6. Risk Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((a, i) => (
            <Alert key={i} variant={a.level === "high" ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="capitalize">{a.level} risk</AlertTitle>
              <AlertDescription>{a.msg}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* 1. Env vars */}
      <Card className="mb-6">
        <CardHeader><CardTitle>1. Google Environment Variables (Edge runtime)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Variable</TableHead><TableHead>Masked</TableHead><TableHead>Format</TableHead>
              <TableHead>Side</TableHead><TableHead>Feature</TableHead><TableHead>Risk</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {envRows.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-mono text-xs">{r.name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.masked ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-xs">{r.fingerprint ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.side}</TableCell>
                  <TableCell className="text-xs">{r.feature}</TableCell>
                  <TableCell>{r.present ? riskBadge(r.risk) : riskBadge("missing")}</TableCell>
                </TableRow>
              ))}
              {envRows.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground text-sm">No data — run scan.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 2. Code usage */}
      <Card className="mb-6">
        <CardHeader><CardTitle>2. Code Usage Scanner (static)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>File</TableHead><TableHead>Line</TableHead><TableHead>Pattern</TableHead>
              <TableHead>Type</TableHead><TableHead>Side</TableHead><TableHead>Suspected Project</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {CODE_USAGES.map((u, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{u.file}</TableCell>
                  <TableCell className="text-xs">{u.line}</TableCell>
                  <TableCell className="font-mono text-xs">{u.pattern}</TableCell>
                  <TableCell className="text-xs">{u.type}</TableCell>
                  <TableCell className="text-xs">{u.side}</TableCell>
                  <TableCell className="text-xs">{u.suspectedProject}</TableCell>
                  <TableCell>{riskBadge(u.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 3. Live probe */}
      <Card className="mb-6">
        <CardHeader><CardTitle>3. Live Autocomplete Test</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={probeInput} onChange={(e) => setProbeInput(e.target.value)} placeholder="Test address autocomplete" />
            <Button onClick={runProbe} disabled={probing}><Search className="h-4 w-4 mr-1" /> Test</Button>
          </div>
          {probeResult && (
            <pre className="text-xs bg-muted/30 p-3 rounded overflow-auto">{JSON.stringify(probeResult, null, 2)}</pre>
          )}
        </CardContent>
      </Card>

      {/* 4. Fingerprints — already covered by env table; re-summarized here */}
      <Card className="mb-6">
        <CardHeader><CardTitle>4. Google Key Fingerprints</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Key</TableHead><TableHead>Masked</TableHead><TableHead>Format</TableHead>
              <TableHead>Frontend?</TableHead><TableHead>Backend?</TableHead><TableHead>Feature</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {envRows.filter((r) => r.present).map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-mono text-xs">{r.name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.masked}</TableCell>
                  <TableCell className="text-xs">{r.fingerprint}</TableCell>
                  <TableCell className="text-xs">{/^VITE_|^NEXT_PUBLIC_/i.test(r.name) ? "yes" : "no"}</TableCell>
                  <TableCell className="text-xs">yes</TableCell>
                  <TableCell className="text-xs">{r.feature}</TableCell>
                  <TableCell>{riskBadge(r.risk)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 5. Consolidation Recommendation */}
      <Card className="mb-6">
        <CardHeader><CardTitle>5. Consolidation Recommendation</CardTitle></CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertTitle>Preferred production project</AlertTitle>
            <AlertDescription>Maps UnPRO — <code className="font-mono">maps-unpro-441820</code></AlertDescription>
          </Alert>
          <Table>
            <TableHeader><TableRow><TableHead>Project</TableHead><TableHead>ID</TableHead><TableHead>Action</TableHead><TableHead>Recommendation</TableHead></TableRow></TableHeader>
            <TableBody>
              {KNOWN_PROJECTS.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{p.name}</TableCell>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell>
                  <TableCell><Badge variant="outline">{p.action}</Badge></TableCell>
                  <TableCell className="text-xs">{p.recommendation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
