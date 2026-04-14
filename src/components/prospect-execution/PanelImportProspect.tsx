import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Globe, Loader2, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PanelImportProspect({ onRunStarted }: { onRunStarted?: (runId: string) => void }) {
  const [domain, setDomain] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLaunch = async () => {
    if (!domain.trim()) {
      toast.error("Entrez un domaine");
      return;
    }
    setLoading(true);
    try {
      // Normalize domain
      const normalized = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase().trim();

      // Create prospect record
      const { data: prospect, error: pErr } = await supabase
        .from("prospect_records")
        .insert({ domain: normalized, company_name: normalized, category_primary: category || null, lead_source: "manual_admin", status: "new" })
        .select("id")
        .single();
      if (pErr) throw pErr;

      // Create execution run
      const { data: run, error: rErr } = await supabase
        .from("prospect_execution_runs")
        .insert({ prospect_id: prospect.id, run_type: "full_pipeline", triggered_by: "admin_manual", status: "queued" })
        .select("id")
        .single();
      if (rErr) throw rErr;

      // Create import run
      await supabase
        .from("prospect_import_runs")
        .insert({ input_type: "domain", input_value: domain.trim(), normalized_domain: normalized, source_label: "manual_admin", notes: notes || null, linked_prospect_id: prospect.id, status: "queued" });

      // Create pipeline steps
      const steps = [
        { key: "import", label: "Import prospect", order: 1 },
        { key: "normalize", label: "Normalisation domaine", order: 2 },
        { key: "extract", label: "Extraction site web", order: 3 },
        { key: "enrich", label: "Enrichissement données", order: 4 },
        { key: "aipp_score", label: "Génération score AIPP", order: 5 },
        { key: "plan_session", label: "Session de plan commercial", order: 6 },
        { key: "email_generate", label: "Génération courriel", order: 7 },
        { key: "email_approve", label: "Approbation courriel", order: 8 },
        { key: "email_queue", label: "Mise en file d'envoi", order: 9 },
        { key: "email_send", label: "Envoi courriel", order: 10 },
      ];

      await supabase.from("prospect_execution_steps").insert(
        steps.map((s) => ({
          run_id: run.id,
          step_key: s.key,
          step_label: s.label,
          step_order: s.order,
          status: "queued",
        }))
      );

      toast.success("Pipeline lancé !");
      onRunStarted?.(run.id);

      // Trigger edge function
      supabase.functions.invoke("execute-prospect-pipeline", { body: { run_id: run.id, prospect_id: prospect.id } });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du lancement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Import Prospect
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="isroyal.ca" value={domain} onChange={(e) => setDomain(e.target.value)} />
        <Input placeholder="Catégorie (ex: isolation)" value={category} onChange={(e) => setCategory(e.target.value)} />
        <Input placeholder="Notes internes (optionnel)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button onClick={handleLaunch} disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          Lancer le pipeline
        </Button>
      </CardContent>
    </Card>
  );
}
