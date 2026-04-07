/**
 * Step 2 — Data Import + Source Management + Conflict Resolution
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Globe, FileText, AlertTriangle, CheckCircle2, Shield, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { ActivationWizardState } from "@/pages/admin/PageAdminEntrepreneurActivation";

interface Props {
  state: ActivationWizardState;
  updateState: (p: Partial<ActivationWizardState>) => void;
  addEvent: (type: string, detail?: string) => void;
}

const SOURCE_TYPES = [
  { value: "manual", label: "Saisie manuelle" },
  { value: "google_business", label: "Google Business Profile" },
  { value: "website", label: "Site web" },
  { value: "rbq", label: "Registre RBQ" },
  { value: "neq", label: "Registre NEQ" },
  { value: "directory", label: "Annuaire en ligne" },
  { value: "referral", label: "Référence" },
];

export default function StepDataImport({ state, updateState, addEvent }: Props) {
  const queryClient = useQueryClient();
  const [newSource, setNewSource] = useState({
    source_type: "manual",
    source_label: "",
    source_url: "",
    notes: "",
    trust_score: 70,
  });

  // Create or get import job
  const createJobMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("admin_company_import_jobs")
        .insert({
          contractor_id: state.contractorId!,
          status: "pending",
          import_mode: "manual",
          started_by_admin_id: (await supabase.auth.getUser()).data.user?.id || "",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      updateState({ importJobId: data.id });
      addEvent("import_job_created", `Job ${data.id}`);
      toast.success("Job d'importation créé");
    },
  });

  const { data: importJob } = useQuery({
    queryKey: ["admin-import-job", state.contractorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_company_import_jobs")
        .select("*")
        .eq("contractor_id", state.contractorId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) updateState({ importJobId: data.id });
      return data;
    },
    enabled: !!state.contractorId,
  });

  const { data: sources } = useQuery({
    queryKey: ["admin-import-sources", state.importJobId],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_company_import_sources")
        .select("*")
        .eq("import_job_id", state.importJobId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!state.importJobId,
  });

  const addSourceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("admin_company_import_sources")
        .insert({
          import_job_id: state.importJobId!,
          source_type: newSource.source_type,
          source_label: newSource.source_label || null,
          source_url: newSource.source_url || null,
          trust_score: newSource.trust_score,
          source_payload_json: { notes: newSource.notes },
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-import-sources"] });
      addEvent("source_added", newSource.source_type);
      toast.success("Source ajoutée");
      setNewSource({ source_type: "manual", source_label: "", source_url: "", notes: "", trust_score: 70 });
    },
  });

  const jobId = state.importJobId || importJob?.id;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Importation des données</h2>
        <p className="text-sm text-muted-foreground">
          Ajoutez des sources de données pour enrichir le profil entrepreneur
        </p>
      </div>

      {/* Create job if needed */}
      {!jobId && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Download className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Aucun job d'importation actif. Créez-en un pour commencer.
            </p>
            <Button onClick={() => createJobMutation.mutate()} disabled={createJobMutation.isPending}>
              <Download className="h-4 w-4 mr-2" />
              Démarrer l'importation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sources list */}
      {jobId && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Sources importées ({sources?.length || 0})
                </span>
                <Badge variant="outline" className="text-xs">Job: {jobId.slice(0, 8)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!sources || sources.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune source ajoutée</p>
              ) : (
                <div className="space-y-2">
                  {sources.map((src: any) => (
                    <div key={src.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${src.trust_score >= 80 ? 'bg-green-500' : src.trust_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="text-sm font-medium">{SOURCE_TYPES.find(t => t.value === src.source_type)?.label || src.source_type}</p>
                          {src.source_label && <p className="text-xs text-muted-foreground">{src.source_label}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          {src.trust_score}%
                        </Badge>
                        {src.source_url && (
                          <a href={src.source_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add source form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ajouter une source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Type de source</Label>
                  <Select value={newSource.source_type} onValueChange={v => setNewSource(p => ({ ...p, source_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOURCE_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Libellé</Label>
                  <Input
                    value={newSource.source_label}
                    onChange={e => setNewSource(p => ({ ...p, source_label: e.target.value }))}
                    placeholder="Ex: Page GMB principale"
                  />
                </div>
                <div>
                  <Label>URL source</Label>
                  <Input
                    value={newSource.source_url}
                    onChange={e => setNewSource(p => ({ ...p, source_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Score de confiance ({newSource.trust_score}%)</Label>
                  <Input
                    type="range"
                    min={0}
                    max={100}
                    value={newSource.trust_score}
                    onChange={e => setNewSource(p => ({ ...p, trust_score: Number(e.target.value) }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={newSource.notes}
                    onChange={e => setNewSource(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Notes sur cette source..."
                    rows={2}
                  />
                </div>
              </div>
              <Button onClick={() => addSourceMutation.mutate()} disabled={addSourceMutation.isPending}>
                Ajouter la source
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
