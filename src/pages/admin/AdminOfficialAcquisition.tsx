/**
 * UNPRO — Acquisition officielle (RBQ/REQ → DataForSEO → Site officiel).
 * /admin/official-acquisition
 *
 * Cockpit d'opération manuelle. Aucun envoi, aucun cron, aucun Google Places.
 * Les actions payantes restent verrouillées tant que les identifiants sont
 * absents ou que le coupe-circuit est actif.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Lock, ShieldCheck, Database, Globe, RefreshCw, Ban, PlayCircle } from "lucide-react";

const CAPS = { usd: 5, calls: 100, items: 500 };

type RunResult = { title: string; payload: unknown } | null;

export default function AdminOfficialAcquisition() {
  const qc = useQueryClient();
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult>(null);
  const [confirmEnable, setConfirmEnable] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["official-acquisition-health"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [registry, circuit, budget, counts, attempts, places] = await Promise.all([
        supabase.from("official_source_registry").select("*").order("source_kind"),
        supabase.from("external_enrichment_circuit").select("*").eq("provider", "dataforseo").maybeSingle(),
        supabase.from("external_enrichment_budget").select("*").eq("provider", "dataforseo").eq("budget_date", today).maybeSingle(),
        supabase.from("official_source_records").select("source_kind, contact_status, enrichment_status").limit(5000),
        supabase.from("dataforseo_enrichment_attempts").select("status").limit(5000),
        supabase.from("places_external_call_budget").select("*").limit(1),
      ]);
      return {
        registry: registry.data ?? [],
        circuit: circuit.data,
        budget: budget.data,
        records: counts.data ?? [],
        attempts: attempts.data ?? [],
        placesLocked: true,
        placesRow: places.data?.[0] ?? null,
      };
    },
  });

  const records = data?.records ?? [];
  const byKind = (kind: string) => records.filter((r) => r.source_kind === kind).length;
  const needsEnrichment = records.filter((r) => r.contact_status === "needs_enrichment").length;
  const attemptCount = (s: string) => (data?.attempts ?? []).filter((a) => a.status === s).length;

  const credentialsConfigured = Boolean(data?.circuit?.notes?.includes("credentials_ok"));
  const killSwitch = data?.circuit?.kill_switch !== false;
  const paidLocked = killSwitch || !credentialsConfigured;

  const costToday = Number(data?.budget?.cost_usd_used ?? 0);
  const callsToday = Number(data?.budget?.calls_used ?? 0);
  const itemsToday = Number(data?.budget?.items_used ?? 0);

  async function invoke(name: string, body: Record<string, unknown>, title: string) {
    setRunning(title);
    try {
      const { data: res, error } = await supabase.functions.invoke(name, { body });
      if (error) throw error;
      setResult({ title, payload: res });
      toast.success(`${title} terminé`);
      refetch();
    } catch (e) {
      toast.error(`${title} : ${e instanceof Error ? e.message : "échec"}`);
    } finally {
      setRunning(null);
    }
  }

  async function enableDataForSeo() {
    const { error } = await supabase
      .from("external_enrichment_circuit")
      .update({ kill_switch: false, enabled_at: new Date().toISOString() })
      .eq("provider", "dataforseo");
    if (error) toast.error("Activation refusée");
    else { toast.success("DataForSEO activé (plafonds actifs)"); qc.invalidateQueries({ queryKey: ["official-acquisition-health"] }); }
    setConfirmEnable(false);
  }

  return (
    <div className="admin-theme min-h-screen p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Acquisition officielle</h1>
        <p className="text-sm text-muted-foreground">
          Registres officiels (RBQ/REQ) comme fondation d'identité, enrichissement ciblé, puis validation par le site officiel.
          Aucun envoi n'est déclenché depuis cette page.
        </p>
        <Link to="/admin/official-site-enrichment" className="text-sm underline">
          Voir la classification des sites officiels
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SourceCard
          icon={<Database className="h-4 w-4" />}
          title="RBQ — Licences actives"
          state="Source d'amorce"
          rows={[
            ["Fiches", byKind("rbq")],
            ["Sans contact", records.filter((r) => r.source_kind === "rbq" && r.contact_status === "needs_enrichment").length],
          ]}
          action={
            <Button size="sm" variant="secondary" disabled={running !== null}
              onClick={() => invoke("rbq-official-ingest", { mode: "dry_run", dataset: "rbq", limit: 300 }, "RBQ — essai à blanc")}>
              <PlayCircle className="h-4 w-4 mr-1" /> Essai à blanc RBQ
            </Button>
          }
        />
        <SourceCard
          icon={<Database className="h-4 w-4" />}
          title="REQ — Registre des entreprises"
          state="Réconciliation d'identité"
          rows={[["Fiches", byKind("req")]]}
          action={
            <Button size="sm" variant="secondary" disabled={running !== null}
              onClick={() => invoke("rbq-official-ingest", { mode: "dry_run", dataset: "req", limit: 100, neqs: [] }, "REQ — réconciliation à blanc")}>
              <PlayCircle className="h-4 w-4 mr-1" /> Réconcilier (à blanc)
            </Button>
          }
        />
        <SourceCard
          icon={<ShieldCheck className="h-4 w-4" />}
          title="DataForSEO"
          state={paidLocked ? "Verrouillé" : "Actif"}
          locked={paidLocked}
          rows={[
            ["À enrichir", needsEnrichment],
            ["Appariés", attemptCount("matched")],
            ["Ambigus", attemptCount("ambiguous")],
            ["Sans résultat", attemptCount("no_match")],
            ["Coût aujourd'hui", `${costToday.toFixed(2)} $ / ${CAPS.usd} $`],
            ["Appels", `${callsToday} / ${CAPS.calls}`],
            ["Éléments", `${itemsToday} / ${CAPS.items}`],
          ]}
          action={
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="secondary" disabled={running !== null}
                onClick={() => invoke("dataforseo-enrich-official", { mode: "dry_run", limit: 25 }, "DataForSEO — test 25 (à blanc)")}>
                Test 25 (à blanc)
              </Button>
              <Button size="sm" disabled={paidLocked || running !== null}
                onClick={() => invoke("dataforseo-enrich-official", { mode: "live", limit: 25 }, "DataForSEO — test 25 (réel)")}>
                {paidLocked ? <Lock className="h-4 w-4 mr-1" /> : null} Test 25 (réel)
              </Button>
              {killSwitch && (
                <Button size="sm" variant="outline" onClick={() => setConfirmEnable(true)} disabled={!credentialsConfigured}>
                  Activer DataForSEO
                </Button>
              )}
            </div>
          }
        />
        <SourceCard
          icon={<Globe className="h-4 w-4" />}
          title="Site officiel"
          state="Validation finale du contact"
          rows={[
            ["En attente de confirmation", records.filter((r) => r.enrichment_status === "pending_website_confirmation").length],
            ["Contact confirmé", records.filter((r) => r.contact_status === "source_confirmed").length],
          ]}
          action={<Badge variant="secondary">robots.txt respecté · 5 pages max</Badge>}
        />
        <SourceCard
          icon={<Ban className="h-4 w-4" />}
          title="Google Places"
          state="Désactivé (verrouillé)"
          locked
          rows={[["Coupe-circuit", "actif"], ["Plafond", "25 appels/jour"]]}
          action={<Badge variant="destructive">Aucun appel autorisé</Badge>}
        />
      </div>

      {!credentialsConfigured && (
        <Card>
          <CardContent className="pt-6 text-sm">
            Identifiants requis côté serveur avant toute exécution payante :{" "}
            <code>DATAFORSEO_LOGIN</code> et <code>DATAFORSEO_PASSWORD</code>.
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">{result.title}</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setResult(null)}>Fermer</Button>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[420px] overflow-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(result.payload, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <Separator />
      <p className="text-xs text-muted-foreground flex items-center gap-2">
        {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
        La découverte n'est pas un consentement : CASL, opt-out, suppression et garde anti-doublon 24 h restent souverains.
      </p>

      <AlertDialog open={confirmEnable} onOpenChange={setConfirmEnable}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activer DataForSEO ?</AlertDialogTitle>
            <AlertDialogDescription>
              Plafonds serveur appliqués : {CAPS.usd} $ US/jour, {CAPS.calls} appels/jour, {CAPS.items} éléments/jour.
              Enrichissement ciblé uniquement, sur des fiches officielles déjà connues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={enableDataForSeo}>Confirmer l'activation</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SourceCard({
  icon, title, state, rows, action, locked,
}: {
  icon: React.ReactNode;
  title: string;
  state: string;
  rows: Array<[string, string | number]>;
  action?: React.ReactNode;
  locked?: boolean;
}) {
  return (
    <Card className={locked ? "opacity-90 border-dashed" : undefined}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon} {title}
        </CardTitle>
        <Badge variant={locked ? "destructive" : "secondary"} className="w-fit">{state}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <dl className="space-y-1 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        {action}
      </CardContent>
    </Card>
  );
}
