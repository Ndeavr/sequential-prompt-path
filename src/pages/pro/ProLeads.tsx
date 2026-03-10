import { useState } from "react";
import { Link } from "react-router-dom";
import ContractorLayout from "@/layouts/ContractorLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContractorLeads } from "@/hooks/useLeads";
import { useUpdateAppointmentStatus } from "@/hooks/useAppointments";
import { toast } from "sonner";
import { Eye, TrendingUp } from "lucide-react";

const levelColors: Record<string, string> = {
  high: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const levelLabels: Record<string, string> = { high: "Élevé", medium: "Moyen", low: "Faible" };

const urgencyLabels: Record<string, string> = { normal: "Normal", soon: "Bientôt", urgent: "Urgent" };

const statusLabels: Record<string, string> = {
  requested: "Demandé", under_review: "En révision", accepted: "Accepté",
  declined: "Refusé", scheduled: "Planifié", completed: "Terminé", cancelled: "Annulé",
};

const ProLeads = () => {
  const { data: leads, isLoading } = useContractorLeads();
  const updateStatus = useUpdateAppointmentStatus();
  const [qualityFilter, setQualityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");

  const getLevel = (score: number) => score >= 60 ? "high" : score >= 35 ? "medium" : "low";

  const filtered = (leads ?? []).filter((l) => {
    if (qualityFilter === "high") return l.score >= 60;
    if (qualityFilter === "medium") return l.score >= 35 && l.score < 60;
    if (qualityFilter === "low") return l.score < 35;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "score") return b.score - a.score;
    if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "date") {
      const da = (a as any).appointments?.preferred_date || "";
      const db = (b as any).appointments?.preferred_date || "";
      return da.localeCompare(db);
    }
    return 0;
  });

  const handleStatus = async (appointmentId: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id: appointmentId, status });
      toast.success("Statut mis à jour.");
    } catch { toast.error("Erreur."); }
  };

  return (
    <ContractorLayout>
      <PageHeader title="Leads qualifiés" description="Demandes de rendez-vous classées par qualité" />

      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={qualityFilter} onValueChange={setQualityFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Qualité" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="high">Qualité élevée</SelectItem>
            <SelectItem value="medium">Qualité moyenne</SelectItem>
            <SelectItem value="low">Qualité faible</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Trier par" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Meilleur score</SelectItem>
            <SelectItem value="newest">Plus récent</SelectItem>
            <SelectItem value="date">Date de RDV</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <LoadingState /> : !sorted.length ? (
        <EmptyState message="Aucun lead pour le moment." />
      ) : (
        <div className="space-y-3">
          {sorted.map((lead: any) => {
            const appt = lead.appointments;
            const level = getLevel(lead.score);
            return (
              <Card key={lead.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Score badge */}
                    <div className="flex items-center gap-2 sm:w-20">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${levelColors[level]}`}>
                        <TrendingUp className="h-3 w-3" />
                        {lead.score}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {lead.project_category && <Badge variant="outline">{lead.project_category}</Badge>}
                        {lead.city && <span className="text-muted-foreground">{lead.city}</span>}
                        {lead.urgency_level && lead.urgency_level !== "normal" && (
                          <Badge variant="destructive" className="text-xs">{urgencyLabels[lead.urgency_level] ?? lead.urgency_level}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {lead.budget_range && <span>Budget: {lead.budget_range}</span>}
                        {lead.timeline && <span>Échéancier: {lead.timeline}</span>}
                        {appt?.preferred_date && <span>RDV: {new Date(appt.preferred_date).toLocaleDateString("fr-CA")}</span>}
                        <span>Reçu: {new Date(lead.created_at).toLocaleDateString("fr-CA")}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {lead.property_linked && <Badge variant="secondary" className="text-xs">Propriété liée</Badge>}
                        {lead.quote_uploaded && <Badge variant="secondary" className="text-xs">Soumission</Badge>}
                        {lead.documents_uploaded && <Badge variant="secondary" className="text-xs">Documents</Badge>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{statusLabels[appt?.status] ?? appt?.status}</Badge>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/pro/leads/${lead.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                      {appt && ["requested", "under_review"].includes(appt.status) && (
                        <Select onValueChange={(v) => handleStatus(appt.id, v)}>
                          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Action…" /></SelectTrigger>
                          <SelectContent>
                            {appt.status === "requested" && <SelectItem value="under_review">En révision</SelectItem>}
                            <SelectItem value="accepted">Accepter</SelectItem>
                            <SelectItem value="declined">Refuser</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </ContractorLayout>
  );
};

export default ProLeads;
