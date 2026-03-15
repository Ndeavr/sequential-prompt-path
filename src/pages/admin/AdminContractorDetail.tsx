import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useAdminContractor, useAdminContractorDocuments, useUpdateContractorVerification, useAdminContractorSubscription } from "@/hooks/useAdmin";
import { useContractorVerificationSnapshot, useContractorVerificationHistory, useContractorMergeSuggestions } from "@/hooks/useContractorVerificationIntegration";
import { VerificationSnapshotCard, LatestVerificationInsights, MergeSuggestionsPanel, VerificationHistoryTable } from "@/components/verification";
import { getPlanById } from "@/config/contractorPlans";
import { getContractorCompleteness } from "@/services/contractorCompletenessService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, Eye, EyeOff, ExternalLink } from "lucide-react";

const statusLabels: Record<string, string> = {
  unverified: "Non vérifié",
  pending: "En attente",
  verified: "Vérifié",
  rejected: "Rejeté",
};

const AdminContractorDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: contractor, isLoading, refetch } = useAdminContractor(id);
  const { data: docs } = useAdminContractorDocuments(contractor?.user_id);
  const { data: subscription } = useAdminContractorSubscription(contractor?.id);
  const { data: verificationSnapshot, isLoading: snapshotLoading } = useContractorVerificationSnapshot(contractor?.id);
  const { data: verificationHistory = [] } = useContractorVerificationHistory(contractor?.id);
  const { data: mergeSuggestions = [], isLoading: suggestionsLoading } = useContractorMergeSuggestions(contractor?.id);
  const updateVerification = useUpdateContractorVerification();
  const [newStatus, setNewStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [recalculating, setRecalculating] = useState(false);

  if (isLoading) return <AdminLayout><LoadingState /></AdminLayout>;
  if (!contractor) return <AdminLayout><PageHeader title="Entrepreneur introuvable" /><Button asChild variant="outline"><Link to="/admin/contractors"><ArrowLeft className="h-4 w-4 mr-1" />Retour</Link></Button></AdminLayout>;

  const completeness = getContractorCompleteness(contractor);
  const isPublished = contractor.verification_status === "verified";

  const handleVerification = async () => {
    if (!newStatus) { toast.error("Sélectionnez un statut."); return; }
    try {
      await updateVerification.mutateAsync({
        contractorId: contractor.id,
        verification_status: newStatus,
        admin_note: adminNote || undefined,
      });
      toast.success("Statut mis à jour !");
      setAdminNote("");
    } catch {
      toast.error("Erreur lors de la mise à jour.");
    }
  };

  const handleTogglePublish = async () => {
    const nextStatus = isPublished ? "pending" : "verified";
    try {
      await updateVerification.mutateAsync({
        contractorId: contractor.id,
        verification_status: nextStatus,
        admin_note: `${isPublished ? "Dépublié" : "Publié"} par admin`,
      });
      toast.success(isPublished ? "Profil dépublié" : "Profil publié !");
    } catch {
      toast.error("Erreur lors du changement.");
    }
  };

  const handleRecalculateAIPP = async () => {
    setRecalculating(true);
    try {
      const { error } = await supabase.functions.invoke("compute-contractor-score", {
        body: { contractor_id: contractor.id },
      });
      if (error) throw error;
      toast.success("Score AIPP recalculé !");
      refetch();
    } catch {
      toast.error("Erreur lors du recalcul AIPP.");
    } finally {
      setRecalculating(false);
    }
  };

  const fields = [
    { label: "Entreprise", value: contractor.business_name },
    { label: "Spécialité", value: contractor.specialty },
    { label: "Ville", value: contractor.city },
    { label: "Province", value: contractor.province },
    { label: "Adresse", value: contractor.address },
    { label: "Code postal", value: contractor.postal_code },
    { label: "Téléphone", value: contractor.phone },
    { label: "Courriel", value: contractor.email },
    { label: "Site web", value: contractor.website },
    { label: "Licence", value: contractor.license_number },
    { label: "Assurance", value: contractor.insurance_info },
    { label: "Expérience", value: contractor.years_experience ? `${contractor.years_experience} ans` : null },
    { label: "Description", value: contractor.description },
    { label: "Score AIPP", value: contractor.aipp_score },
    { label: "Avis", value: contractor.review_count },
    { label: "Note", value: contractor.rating },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link to="/admin/contractors"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{contractor.business_name}</h1>
            <p className="text-muted-foreground text-sm">{contractor.city || ""} · Créé le {new Date(contractor.created_at).toLocaleDateString("fr-CA")}</p>
          </div>
          <Badge variant={contractor.verification_status === "verified" ? "default" : contractor.verification_status === "rejected" ? "destructive" : "outline"}>
            {statusLabels[contractor.verification_status ?? "unverified"]}
          </Badge>
        </div>

        {/* Quick actions bar */}
        <div className="flex flex-wrap gap-2">
          <Button variant={isPublished ? "destructive" : "default"} size="sm" onClick={handleTogglePublish} disabled={updateVerification.isPending} className="gap-1.5">
            {isPublished ? <><EyeOff className="h-3.5 w-3.5" /> Dépublier</> : <><Eye className="h-3.5 w-3.5" /> Publier</>}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRecalculateAIPP} disabled={recalculating} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? "animate-spin" : ""}`} /> Recalculer AIPP
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link to={`/contractors/${contractor.id}`} target="_blank">
              <ExternalLink className="h-3.5 w-3.5" /> Voir page publique
            </Link>
          </Button>
        </div>

        {/* Profile info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Profil de l'entreprise</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {fields.map((f) => (
                <div key={f.label}>
                  <p className="text-muted-foreground">{f.label}</p>
                  <p className="font-medium">{f.value || <span className="text-muted-foreground italic">Non renseigné</span>}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Completeness */}
        <Card>
          <CardHeader><CardTitle className="text-base">Complétude du profil</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Progress value={completeness.percentage} className="flex-1" />
              <span className="text-sm font-semibold">{completeness.percentage}%</span>
            </div>
            {completeness.missing.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Éléments manquants :</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {completeness.missing.map((m) => (
                    <li key={m} className="flex items-center gap-1"><XCircle className="h-3 w-3 text-destructive" /> {m}</li>
                  ))}
                </ul>
              </div>
            )}
            {completeness.completed.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Éléments complétés :</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {completeness.completed.map((c) => (
                    <li key={c} className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-success" /> {c}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verification Snapshot */}
        <VerificationSnapshotCard snapshot={verificationSnapshot as any} isLoading={snapshotLoading} />

        {/* Verification Insights */}
        {verificationSnapshot && (
          <LatestVerificationInsights
            strengths={Array.isArray(verificationSnapshot.strengths) ? verificationSnapshot.strengths as string[] : []}
            risks={Array.isArray(verificationSnapshot.risks) ? verificationSnapshot.risks as string[] : []}
            inconsistencies={Array.isArray(verificationSnapshot.inconsistencies) ? verificationSnapshot.inconsistencies as string[] : []}
            missingProofs={Array.isArray(verificationSnapshot.missing_proofs) ? verificationSnapshot.missing_proofs as string[] : []}
          />
        )}

        {/* Merge Suggestions */}
        <MergeSuggestionsPanel
          suggestions={mergeSuggestions as any}
          contractorId={contractor.id}
          isLoading={suggestionsLoading}
        />

        {/* Verification History */}
        <VerificationHistoryTable runs={verificationHistory as any} />

        {/* Documents */}
        <Card>
          <CardHeader><CardTitle className="text-base">Documents ({docs?.length ?? 0})</CardTitle></CardHeader>
          <CardContent>
            {docs?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Bucket</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.file_name}</TableCell>
                      <TableCell className="text-muted-foreground">{d.file_type || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{d.bucket}</TableCell>
                      <TableCell className="text-muted-foreground">{d.file_size ? `${(d.file_size / 1024).toFixed(0)} Ko` : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(d.created_at).toLocaleDateString("fr-CA")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun document téléversé.</p>
            )}
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader><CardTitle className="text-base">Abonnement</CardTitle></CardHeader>
          <CardContent>
            {subscription ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Plan</p><p className="font-medium">{getPlanById(subscription.plan_id)?.name ?? subscription.plan_id}</p></div>
                <div><p className="text-muted-foreground">Statut</p><p className="font-medium">{subscription.status}</p></div>
                <div><p className="text-muted-foreground">Facturation</p><p className="font-medium">{(subscription as any).billing_interval === "year" ? "Annuel" : "Mensuel"}</p></div>
                <div>
                  <p className="text-muted-foreground">Période</p>
                  <p className="font-medium">
                    {subscription.current_period_start
                      ? `${new Date(subscription.current_period_start).toLocaleDateString("fr-CA")} — ${new Date(subscription.current_period_end!).toLocaleDateString("fr-CA")}`
                      : "—"}
                  </p>
                </div>
                <div><p className="text-muted-foreground">Annulation prévue</p><p className="font-medium">{subscription.cancel_at_period_end ? "Oui" : "Non"}</p></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun abonnement actif.</p>
            )}
          </CardContent>
        </Card>

        {contractor.admin_note && (
          <Card>
            <CardHeader><CardTitle className="text-base">Note admin existante</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{contractor.admin_note}</p></CardContent>
          </Card>
        )}

        <Separator />

        {/* Verification controls */}
        <Card>
          <CardHeader><CardTitle className="text-base">Actions de vérification</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nouveau statut</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="Choisir un statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="verified">Vérifié</SelectItem>
                  <SelectItem value="rejected">Rejeté</SelectItem>
                  <SelectItem value="unverified">Non vérifié</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note interne (optionnelle)</Label>
              <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Raison du changement de statut…" rows={3} />
            </div>
            <Button onClick={handleVerification} disabled={!newStatus || updateVerification.isPending}>
              {updateVerification.isPending ? "Mise à jour…" : "Mettre à jour le statut"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminContractorDetail;
