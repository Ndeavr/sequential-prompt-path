import AdminLayout from "@/layouts/AdminLayout";
import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Play, Loader2, CheckCircle2, XCircle, ExternalLink, Mail, FileText } from "lucide-react";
import { toast } from "sonner";

type StepKey = "import" | "enrich" | "score" | "landing" | "email";
type StepState = "idle" | "running" | "success" | "error";

interface Step {
  key: StepKey;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { key: "import", label: "1. Import manuel", description: "Crée un prospect dans contractor_prospects" },
  { key: "enrich", label: "2. Enrichissement", description: "Firecrawl scrape + extraction (acq-enrich-contractor)" },
  { key: "score", label: "3. Score AIPP", description: "Calcul déterministe (acq-generate-score)" },
  { key: "landing", label: "4. Page landing", description: "Génération acq_aipp_pages publique" },
  { key: "email", label: "5. Email draft", description: "Render + sauvegarde acq_invites (mode draft)" },
];

interface RunResult {
  state: StepState;
  duration_ms?: number;
  data?: any;
  error?: string;
}

export default function PageOutboundTestCenter() {
  const [businessName, setBusinessName] = useState("Isolation Test Demo");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("test@example.com");
  const [city, setCity] = useState("Montréal");
  const [trade, setTrade] = useState("isolation");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<StepKey, RunResult>>({
    import: { state: "idle" }, enrich: { state: "idle" }, score: { state: "idle" },
    landing: { state: "idle" }, email: { state: "idle" },
  });
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [pageSlug, setPageSlug] = useState<string | null>(null);

  function reset() {
    setResults({
      import: { state: "idle" }, enrich: { state: "idle" }, score: { state: "idle" },
      landing: { state: "idle" }, email: { state: "idle" },
    });
    setProspectId(null); setContractorId(null); setPageSlug(null);
  }

  async function logPipeline(status: string, message: string, payload: any) {
    try {
      await supabase.from("pipeline_logs").insert({
        log_type: status === "error" ? "error" : "info",
        source_module: "outbound_test_center",
        status, message, payload,
      });
    } catch {}
  }

  async function runStep<T>(key: StepKey, fn: () => Promise<T>): Promise<T | null> {
    setResults((r) => ({ ...r, [key]: { state: "running" } }));
    const t0 = performance.now();
    try {
      const data = await fn();
      const duration_ms = Math.round(performance.now() - t0);
      setResults((r) => ({ ...r, [key]: { state: "success", duration_ms, data } }));
      await logPipeline("success", `Test ${key} OK`, { duration_ms, key });
      return data;
    } catch (e: any) {
      const duration_ms = Math.round(performance.now() - t0);
      const error = e?.message || String(e);
      setResults((r) => ({ ...r, [key]: { state: "error", duration_ms, error } }));
      await logPipeline("error", `Test ${key} échec: ${error}`, { duration_ms, key, error });
      return null;
    }
  }

  async function runFullChain() {
    if (running) return;
    setRunning(true);
    reset();

    try {
      // STEP 1 — Import (insert into contractor_prospects)
      const imported = await runStep("import", async () => {
        const { data, error } = await supabase.from("contractor_prospects").insert({
          business_name: businessName,
          website_url: website || null,
          email: email || null,
          city, province: "QC", trade,
          category_slug: trade,
          source: "test_center",
          discovery_method: "manual_test",
          enrichment_status: "pending",
        }).select("id").single();
        if (error) throw error;
        setProspectId(data.id);
        return { prospect_id: data.id };
      });
      if (!imported) return;

      // STEP 2 — Enrich (calls acq-enrich-contractor which also runs score + creates page + invite)
      const enriched = await runStep("enrich", async () => {
        const { data, error } = await supabase.functions.invoke("acq-enrich-contractor", {
          body: { website: website || null, email, company_name: businessName },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        if (!data?.contractor_id) throw new Error("no contractor_id returned");
        setContractorId(data.contractor_id);
        setPageSlug(data.page_slug);
        // Update prospect status
        await supabase.from("contractor_prospects").update({
          enrichment_status: "enriched",
        }).eq("id", imported.prospect_id);
        return data;
      });
      if (!enriched) return;

      // STEP 3 — Score (verify score row created)
      await runStep("score", async () => {
        const { data, error } = await supabase
          .from("acq_aipp_scores" as any)
          .select("aipp_score, visibility, trust, content, conversion, availability")
          .eq("contractor_id", enriched.contractor_id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) throw new Error("score not found in acq_aipp_scores");
        return data;
      });

      // STEP 4 — Landing page (verify acq_aipp_pages row)
      await runStep("landing", async () => {
        const { data, error } = await supabase
          .from("acq_aipp_pages")
          .select("page_slug, public_token, page_status")
          .eq("contractor_id", enriched.contractor_id)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) throw new Error("landing page not generated");
        return data;
      });

      // STEP 5 — Email draft
      await runStep("email", async () => {
        const { data, error } = await supabase.functions.invoke("acq-send-invite", {
          body: { contractor_id: enriched.contractor_id, draft_only: true, base_url: window.location.origin },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        return data;
      });

      toast.success("Chaîne complète exécutée avec succès");
    } finally {
      setRunning(false);
    }
  }

  const renderStepIcon = (state: StepState) => {
    if (state === "running") return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    if (state === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (state === "error") return <XCircle className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />;
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10"><FlaskConical className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold font-display">Test Center</h1>
              <p className="text-xs text-muted-foreground">Chaîne réelle: import → enrich → score → landing → email draft</p>
            </div>
          </div>
          <Link to="/admin/outbound" className="text-xs text-muted-foreground hover:text-primary">← Control Tower</Link>
        </div>

        {/* Input form */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Prospect à tester</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nom entreprise *</Label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Site web (optionnel)</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="h-9" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Ville</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Métier</Label>
                <Input value={trade} onChange={(e) => setTrade(e.target.value)} className="h-9" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Run button */}
        <div className="flex gap-2">
          <Button onClick={runFullChain} disabled={running || !businessName} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Exécution..." : "Lancer la chaîne complète"}
          </Button>
          <Button variant="outline" onClick={reset} disabled={running}>Réinitialiser</Button>
        </div>

        {/* Steps timeline */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Étapes (live)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {STEPS.map((step) => {
              const r = results[step.key];
              return (
                <div key={step.key} className="flex items-start gap-3 p-3 rounded-lg border bg-card/40">
                  <div className="mt-0.5">{renderStepIcon(r.state)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{step.label}</p>
                      {r.duration_ms != null && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">{r.duration_ms}ms</Badge>
                      )}
                      {r.state === "success" && <Badge className="text-[10px] h-4 px-1.5 bg-emerald-500/20 text-emerald-500 border-emerald-500/30">OK</Badge>}
                      {r.state === "error" && <Badge variant="destructive" className="text-[10px] h-4 px-1.5">ERREUR</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                    {r.error && <p className="text-xs text-red-400 mt-1">⚠ {r.error}</p>}
                    {r.data && r.state === "success" && (
                      <pre className="text-[10px] bg-muted/50 p-2 rounded mt-2 overflow-auto max-h-32">{JSON.stringify(r.data, null, 2)}</pre>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Outputs */}
        {(prospectId || contractorId || pageSlug) && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Liens générés</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {prospectId && (
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Prospect:</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{prospectId}</code>
                </div>
              )}
              {contractorId && (
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Contractor:</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{contractorId}</code>
                </div>
              )}
              {pageSlug && (
                <div className="flex items-center gap-2"><ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <a href={`/aipp/${pageSlug}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    Voir la landing /aipp/{pageSlug}
                  </a>
                </div>
              )}
              {results.email.state === "success" && results.email.data?.subject && (
                <div className="border-t pt-2 mt-2">
                  <div className="flex items-center gap-2 mb-1"><Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Email draft:</span>
                  </div>
                  <p className="text-xs font-medium">{results.email.data.subject}</p>
                  <pre className="text-[10px] bg-muted/50 p-2 rounded mt-1 max-h-40 overflow-auto whitespace-pre-wrap">{results.email.data.body}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
