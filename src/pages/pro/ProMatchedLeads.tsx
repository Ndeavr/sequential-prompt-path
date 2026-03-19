/**
 * UNPRO — Matched Leads Page (Contractor)
 * Shows leads distributed via the matching engine with accept/decline + booking.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import ContractorLayout from "@/layouts/ContractorLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import LeadDecisionCard from "@/components/contractor/LeadDecisionCard";
import BookAppointmentCard from "@/components/contractor/BookAppointmentCard";
import { ArrowLeft, MapPin, Briefcase, DollarSign, Clock, Trophy } from "lucide-react";

const URGENCY_LABELS: Record<string, string> = {
  urgent: "Urgent",
  high: "Haute priorité",
  medium: "Priorité moyenne",
  low: "Basse priorité",
};

function formatCurrency(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);
}

export default function ProMatchedLeads() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["pro-matched-leads", user?.id],
    queryFn: async () => {
      // Get contractor id
      const { data: contractor } = await supabase
        .from("contractors")
        .select("id")
        .eq("user_id", user!.id)
        .single();
      if (!contractor) return [];

      const { data, error } = await supabase
        .from("matches")
        .select(`
          id, score, rank_position, status, response_status, reasons, created_at,
          leads (
            id, project_category, specialty_needed, city, budget_min, budget_max,
            urgency, matching_status, status, created_at
          )
        `)
        .eq("contractor_id", contractor.id)
        .eq("match_type", "contractor")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["pro-matched-leads"] });
  }

  return (
    <ContractorLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Leads matchés"
            description="Projets attribués via le moteur de matching UNPRO"
          />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/pro/leads">
              <ArrowLeft className="h-4 w-4 mr-1" /> Tous les leads
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : matches.length === 0 ? (
          <EmptyState message="Aucun lead matché pour le moment. Les projets compatibles apparaîtront ici automatiquement." />
        ) : (
          <div className="space-y-4">
            {matches.map((match: any) => {
              const lead = match.leads;
              if (!lead) return null;

              return (
                <div
                  key={match.id}
                  className="rounded-2xl border border-border/40 bg-card overflow-hidden"
                >
                  {/* Rank banner */}
                  <div
                    className={`px-4 py-2.5 flex items-center justify-between ${
                      match.rank_position === 1 ? "bg-primary/10" : "bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {match.rank_position === 1 && <Trophy className="h-4 w-4 text-primary" />}
                      <span className="text-xs font-medium text-foreground">
                        Rang #{match.rank_position ?? "—"} • Score {Math.round(match.score)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          match.response_status === "accepted"
                            ? "default"
                            : match.response_status === "declined"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {match.response_status === "accepted"
                          ? "Accepté"
                          : match.response_status === "declined"
                          ? "Décliné"
                          : match.response_status === "pending"
                          ? "En attente"
                          : match.response_status ?? "—"}
                      </Badge>
                      {lead.matching_status === "booked" && (
                        <Badge variant="default" className="text-[10px] bg-emerald-600">
                          Rendez-vous planifié
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Lead info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-start gap-2">
                        <Briefcase className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Projet</p>
                          <p className="font-medium text-foreground">{lead.project_category ?? "—"}</p>
                          {lead.specialty_needed && (
                            <p className="text-[10px] text-muted-foreground">{lead.specialty_needed}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ville</p>
                          <p className="font-medium text-foreground">{lead.city ?? "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <DollarSign className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Budget</p>
                          <p className="font-medium text-foreground">
                            {lead.budget_min != null && lead.budget_max != null
                              ? `${formatCurrency(lead.budget_min)} — ${formatCurrency(lead.budget_max)}`
                              : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Urgence</p>
                          <p className="font-medium text-foreground">
                            {URGENCY_LABELS[lead.urgency ?? ""] ?? "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Match reasons */}
                    {match.reasons && Array.isArray(match.reasons) && match.reasons.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                          Pourquoi ce match
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(match.reasons as string[]).map((r: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              ✓ {r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Decision + Booking */}
                    <div className="space-y-3 pt-2 border-t border-border/20">
                      <LeadDecisionCard
                        matchId={match.id}
                        responseStatus={match.response_status}
                        onDecision={refresh}
                      />
                      <BookAppointmentCard
                        matchId={match.id}
                        responseStatus={match.response_status}
                        projectCategory={lead.project_category}
                        onBooked={refresh}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ContractorLayout>
  );
}
