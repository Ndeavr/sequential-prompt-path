/**
 * UNPRO — Admin Verification Run Detail
 * Full detail with scores, evidence, contractor review panel, admin actions.
 */
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import {
  useAdminVerificationRun,
  useAdminVerificationEvidence,
  useAdminNotifications,
  useUpdateRunReviewStatus,
  useAdminVerifyContractor,
  useLogAdminAction,
} from "@/hooks/useAdminVerification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle,
  ArrowLeft, Eye, FileText, Image, Phone, Globe, MapPin, Building2,
} from "lucide-react";
import { ContractorVerificationScore, UnproTrustScoreCard } from "@/components/verification";
import { toast } from "sonner";

export default function AdminVerificationRunDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: run, isLoading } = useAdminVerificationRun(id);
  const { data: evidence } = useAdminVerificationEvidence(id);
  const { data: notifications } = useAdminNotifications();
  const updateStatus = useUpdateRunReviewStatus();
  const verifyContractor = useAdminVerifyContractor();
  const logAction = useLogAdminAction();

  const [verifyScore, setVerifyScore] = useState("");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<string | null>(null);

  if (isLoading) return <AdminLayout><LoadingState /></AdminLayout>;
  if (!run) return <AdminLayout><EmptyState message="Vérification non trouvée." /></AdminLayout>;

  const contractor = run.contractors as any;
  const runNotifications = (notifications ?? []).filter((n: any) => n.verification_run_id === id);
  const rawFindings = run.raw_findings_json as any ?? {};
  const inconsistencies = (run.inconsistencies_json as any[]) ?? [];
  const missingProofs = (run.missing_proofs_json as any[]) ?? [];
  const recommendedInputs = (run.recommended_next_inputs_json as any[]) ?? [];

  const handleReviewAction = async (status: string) => {
    try {
      await updateStatus.mutateAsync({ runId: id!, status });
      toast.success(`Statut mis à jour : ${status}`);
      setConfirmDialog(null);
    } catch {
      toast.error("Erreur lors de la mise à jour.");
    }
  };

  const handleVerifyContractor = async () => {
    if (!contractor?.id) return;
    try {
      await verifyContractor.mutateAsync({
        contractorId: contractor.id,
        adminVerified: true,
        internalVerifiedScore: verifyScore ? parseInt(verifyScore) : undefined,
        verificationNotes: verifyNotes || undefined,
      });
      toast.success("Entrepreneur vérifié par l'admin.");
    } catch {
      toast.error("Erreur de vérification.");
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <Link to="/admin/verification" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour aux vérifications
        </Link>
        <PageHeader
          title="Détail de vérification"
          description={`Run ${id?.slice(0, 8)}… — ${new Date(run.created_at).toLocaleString("fr-CA")}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Inputs */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Entrées utilisateur</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {[
                { label: "Téléphone", value: run.input_phone, icon: Phone },
                { label: "Entreprise", value: run.input_business_name, icon: Building2 },
                { label: "RBQ", value: run.input_rbq, icon: FileText },
                { label: "NEQ", value: run.input_neq, icon: FileText },
                { label: "Site web", value: run.input_website, icon: Globe },
                { label: "Ville", value: run.input_city, icon: MapPin },
              ].map((f) => (
                <div key={f.label} className="text-sm">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                    <f.icon className="h-3 w-3" /> {f.label}
                  </span>
                  <span className={f.value ? "text-foreground font-medium" : "text-muted-foreground/50 italic"}>
                    {f.value || "Non fourni"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Scores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="flex items-center justify-center p-6">
              <ContractorVerificationScore score={run.identity_confidence_score ?? 0} />
            </Card>
            <UnproTrustScoreCard score={run.public_trust_score ?? 0} />
          </div>

          {/* Findings summary */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Résumé des constatations</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Résolution :</span>
                <Badge variant="outline" className="text-xs">
                  {run.identity_resolution_status || "—"}
                </Badge>
              </div>
              {run.matched_by && (
                <div className="text-xs text-muted-foreground">Correspondance via : <span className="text-foreground font-medium">{run.matched_by}</span></div>
              )}
              {run.live_risk_delta != null && (
                <div className={`text-xs font-semibold ${run.live_risk_delta < -10 ? "text-destructive" : "text-muted-foreground"}`}>
                  Delta de risque : {run.live_risk_delta > 0 ? "+" : ""}{run.live_risk_delta} pts
                </div>
              )}

              {inconsistencies.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1"><XCircle className="h-3 w-3" /> Incohérences</p>
                  <ul className="space-y-1">{inconsistencies.map((i, idx) => <li key={idx} className="text-xs text-foreground">— {typeof i === 'string' ? i : JSON.stringify(i)}</li>)}</ul>
                </div>
              )}

              {missingProofs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Preuves manquantes</p>
                  <ul className="space-y-1">{missingProofs.map((p, idx) => <li key={idx} className="text-xs text-foreground">→ {typeof p === 'string' ? p : JSON.stringify(p)}</li>)}</ul>
                </div>
              )}

              {recommendedInputs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Entrées recommandées</p>
                  <div className="flex flex-wrap gap-1.5">{recommendedInputs.map((n, idx) => <Badge key={idx} variant="outline" className="text-[10px]">{typeof n === 'string' ? n : JSON.stringify(n)}</Badge>)}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evidence */}
          {evidence && evidence.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Preuves téléversées ({evidence.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {evidence.map((ev: any) => (
                  <div key={ev.id} className="rounded-xl border border-border/40 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium">{ev.file_type || "Document"}</span>
                      <span className="text-[10px] text-muted-foreground">{ev.mime_type}</span>
                    </div>
                    {ev.analysis_summary && <p className="text-xs text-muted-foreground">{ev.analysis_summary}</p>}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {ev.extracted_business_name && <div><span className="text-muted-foreground">Entreprise : </span>{ev.extracted_business_name}</div>}
                      {ev.extracted_phone && <div><span className="text-muted-foreground">Tél : </span>{ev.extracted_phone}</div>}
                      {ev.extracted_rbq && <div><span className="text-muted-foreground">RBQ : </span>{ev.extracted_rbq}</div>}
                      {ev.extracted_website && <div><span className="text-muted-foreground">Web : </span>{ev.extracted_website}</div>}
                      {ev.extracted_city && <div><span className="text-muted-foreground">Ville : </span>{ev.extracted_city}</div>}
                      {ev.visual_consistency_score != null && <div><span className="text-muted-foreground">Cohérence : </span>{ev.visual_consistency_score}/100</div>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Notifications for this run */}
          {runNotifications.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Alertes liées ({runNotifications.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {runNotifications.map((n: any) => (
                  <div key={n.id} className={`rounded-lg border p-3 text-xs ${
                    n.severity === "critical" ? "border-destructive/30 bg-destructive/5" :
                    n.severity === "high" ? "border-warning/30 bg-warning/5" :
                    "border-border/40"
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{n.title}</span>
                      <Badge variant="outline" className="text-[9px]">{n.severity}</Badge>
                    </div>
                    <p className="text-muted-foreground">{n.body}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Review Panel */}
        <div className="space-y-5">
          {/* Linked contractor */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Entrepreneur lié</CardTitle></CardHeader>
            <CardContent>
              {contractor ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{contractor.business_name}</span>
                    {contractor.admin_verified && (
                      <Badge className="bg-success/10 text-success border-success/20 text-[10px]" variant="outline">
                        <ShieldCheck className="h-3 w-3 mr-1" /> Vérifié
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    {contractor.phone && <div>Tél : {contractor.phone}</div>}
                    {contractor.city && <div>Ville : {contractor.city}</div>}
                    {contractor.rbq_number && <div>RBQ : {contractor.rbq_number}</div>}
                    {contractor.verification_status && <div>Statut : {contractor.verification_status}</div>}
                    {contractor.internal_verified_score != null && <div>Score interne : {contractor.internal_verified_score}/100</div>}
                  </div>
                  <Link to={`/admin/contractors/${contractor.id}`}>
                    <Button variant="outline" size="sm" className="w-full mt-2 text-xs gap-1">
                      <Eye className="h-3 w-3" /> Voir profil complet
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Aucun entrepreneur lié à cette vérification.</p>
              )}
            </CardContent>
          </Card>

          {/* Review Actions */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Actions de revue</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-muted-foreground mb-2">
                Statut actuel : <Badge variant="outline" className="text-[10px] ml-1">{run.admin_review_status}</Badge>
              </div>

              {[
                { status: "reviewed", label: "Marquer comme revu", variant: "default" as const },
                { status: "needs_followup", label: "Suivi requis", variant: "outline" as const },
                { status: "ambiguous_confirmed", label: "Ambiguïté confirmée", variant: "outline" as const },
                { status: "insufficient_data", label: "Données insuffisantes", variant: "outline" as const },
                { status: "divergence_confirmed", label: "Divergence confirmée", variant: "outline" as const },
              ].map((action) => (
                <Dialog key={action.status} open={confirmDialog === action.status} onOpenChange={(o) => setConfirmDialog(o ? action.status : null)}>
                  <DialogTrigger asChild>
                    <Button variant={action.variant} size="sm" className="w-full text-xs">
                      {action.label}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Confirmer : {action.label}</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Cette action sera enregistrée dans le journal d'audit.</p>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setConfirmDialog(null)}>Annuler</Button>
                      <Button onClick={() => handleReviewAction(action.status)} disabled={updateStatus.isPending}>
                        Confirmer
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ))}
            </CardContent>
          </Card>

          {/* Verify Contractor */}
          {contractor && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Vérification admin</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Score interne vérifié</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="0-100"
                    value={verifyScore}
                    onChange={(e) => setVerifyScore(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Notes de vérification</label>
                  <Textarea
                    placeholder="Notes internes…"
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleVerifyContractor}
                  disabled={verifyContractor.isPending}
                  className="w-full gap-1.5"
                  size="sm"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {contractor.admin_verified ? "Mettre à jour la vérification" : "Marquer comme vérifié"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
