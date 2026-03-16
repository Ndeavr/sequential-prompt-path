import { useParams, Link } from "react-router-dom";
import ContractorLayout from "@/layouts/ContractorLayout";
import { LoadingState, PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLead } from "@/hooks/useLeads";
import { useUpdateAppointmentStatus } from "@/hooks/useAppointments";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, AlertTriangle, CalendarCheck } from "lucide-react";

const levelColors: Record<string, string> = {
  high: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  requested: "Demandé", under_review: "En révision", accepted: "Accepté",
  declined: "Refusé", scheduled: "Planifié", completed: "Terminé", cancelled: "Annulé",
};

const ProLeadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: lead, isLoading } = useLead(id);
  const updateStatus = useUpdateAppointmentStatus();

  if (isLoading) return <ContractorLayout><LoadingState /></ContractorLayout>;
  if (!lead) return <ContractorLayout><PageHeader title="Rendez-vous introuvable" /><Button asChild variant="outline"><Link to="/pro/leads"><ArrowLeft className="h-4 w-4 mr-1" />Retour</Link></Button></ContractorLayout>;

  const appt = (lead as any).appointments;
  const level = lead.score >= 60 ? "high" : lead.score >= 35 ? "medium" : "low";
  const factors = Array.isArray(lead.score_factors) ? (lead.score_factors as any[]) : [];
  const strengths = factors.filter((f) => f.points > 0);
  const missing = factors.filter((f) => f.points === 0);

  const handleStatus = async (status: string) => {
    if (!appt?.id) return;
    try {
      await updateStatus.mutateAsync({ id: appt.id, status });
      toast.success("Statut mis à jour.");
    } catch { toast.error("Erreur."); }
  };

  return (
    <ContractorLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link to="/pro/leads"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Détail du rendez-vous garanti</h1>
            <p className="text-sm text-muted-foreground">
              {lead.project_category || "Projet"} · {lead.city || "Ville non précisée"}
            </p>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${levelColors[level]}`}>
            <CalendarCheck className="h-4 w-4" />
            {lead.score}/100
          </div>
        </div>

        {/* Project summary */}
        <Card>
          <CardHeader><CardTitle className="text-base">Résumé du projet</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-muted-foreground">Catégorie</p><p className="font-medium">{lead.project_category || "Non précisée"}</p></div>
            <div><p className="text-muted-foreground">Budget</p><p className="font-medium">{lead.budget_range || "Non précisé"}</p></div>
            <div><p className="text-muted-foreground">Échéancier</p><p className="font-medium">{lead.timeline || "Non précisé"}</p></div>
            <div><p className="text-muted-foreground">Urgence</p><p className="font-medium">{lead.urgency_level || "Normal"}</p></div>
            <div><p className="text-muted-foreground">Ville</p><p className="font-medium">{lead.city || "—"}</p></div>
            <div><p className="text-muted-foreground">Propriété liée</p><p className="font-medium">{lead.property_linked ? "Oui" : "Non"}</p></div>
            {appt?.preferred_date && <div><p className="text-muted-foreground">Date souhaitée</p><p className="font-medium">{new Date(appt.preferred_date).toLocaleDateString("fr-CA")}</p></div>}
            {appt?.preferred_time_window && <div><p className="text-muted-foreground">Plage horaire</p><p className="font-medium">{appt.preferred_time_window}</p></div>}
            {appt?.notes && <div className="col-span-2"><p className="text-muted-foreground">Notes du propriétaire</p><p>{appt.notes}</p></div>}
          </CardContent>
        </Card>

        {/* Score explanation */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="flex items-center gap-2 font-semibold text-base mb-3 text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5" /> Pourquoi ce rendez-vous est pertinent
              </h3>
              {strengths.length > 0 ? (
                <ul className="space-y-2">
                  {strengths.map((f: any, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{f.label}</span>
                      <span className="text-xs ml-1">(+{f.points} pts)</span>
                      <p className="text-xs">{f.reason}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">Aucun signal fort identifié.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="flex items-center gap-2 font-semibold text-base mb-3 text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="h-5 w-5" /> Informations manquantes
              </h3>
              {missing.length > 0 ? (
                <ul className="space-y-2">
                  {missing.map((f: any, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{f.label}</span>
                      <p className="text-xs">{f.reason}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">Toutes les informations importantes sont présentes.</p>}
            </CardContent>
          </Card>
        </div>

        {/* Trust indicators */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-base mb-3">Indicateurs de confiance</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant={lead.property_linked ? "default" : "outline"}>Propriété {lead.property_linked ? "✓" : "✗"}</Badge>
              <Badge variant={lead.quote_uploaded ? "default" : "outline"}>Soumission {lead.quote_uploaded ? "✓" : "✗"}</Badge>
              <Badge variant={lead.documents_uploaded ? "default" : "outline"}>Documents {lead.documents_uploaded ? "✓" : "✗"}</Badge>
              <Badge variant={(lead.homeowner_profile_completeness ?? 0) >= 60 ? "default" : "outline"}>
                Profil {lead.homeowner_profile_completeness ?? 0}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Actions */}
        <Card>
          <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Statut actuel :</span>
              <Badge variant="outline">{statusLabels[appt?.status] ?? appt?.status}</Badge>
            </div>
            {appt && ["requested", "under_review", "accepted"].includes(appt.status) && (
              <div className="flex flex-wrap gap-2">
                {appt.status === "requested" && (
                  <Button size="sm" variant="outline" onClick={() => handleStatus("under_review")}>En révision</Button>
                )}
                {["requested", "under_review"].includes(appt.status) && (
                  <>
                    <Button size="sm" onClick={() => handleStatus("accepted")}>Accepter</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleStatus("declined")}>Refuser</Button>
                  </>
                )}
                {appt.status === "accepted" && (
                  <Button size="sm" onClick={() => handleStatus("scheduled")}>Planifier</Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ContractorLayout>
  );
};

export default ProLeadDetail;
