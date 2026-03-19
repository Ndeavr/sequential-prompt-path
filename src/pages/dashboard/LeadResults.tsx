/**
 * UNPRO — Lead Matching Results Page
 * Shows ranked contractor matches for a homeowner's lead.
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/layouts/DashboardLayout";
import { LoadingState, ErrorState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, MapPin, Briefcase, Star, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/types/property";

interface LeadData {
  id: string;
  project_category: string | null;
  specialty_needed: string | null;
  city: string | null;
  budget_min: number | null;
  budget_max: number | null;
  urgency: string | null;
  matching_status: string | null;
  created_at: string | null;
}

interface MatchData {
  id: string;
  score: number;
  rank_position: number | null;
  status: string | null;
  response_status: string | null;
  reasons: string[] | null;
  contractor_id: string | null;
  contractors: {
    id: string;
    business_name: string | null;
    city: string | null;
    specialty: string | null;
    years_experience: number | null;
    description: string | null;
    logo_url: string | null;
    slug: string | null;
  } | null;
}

const URGENCY_LABELS: Record<string, string> = {
  urgent: "Urgent",
  high: "Haute priorité",
  medium: "Priorité moyenne",
  low: "Basse priorité",
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  pending: { label: "En attente", icon: Clock, color: "text-amber-500" },
  accepted: { label: "Accepté", icon: CheckCircle2, color: "text-emerald-500" },
  declined: { label: "Décliné", icon: AlertCircle, color: "text-destructive" },
  expired: { label: "Expiré", icon: Clock, color: "text-muted-foreground" },
  promoted: { label: "Promu", icon: CheckCircle2, color: "text-primary" },
};

export default function LeadResults() {
  const { id } = useParams<{ id: string }>();

  const { data: lead, isLoading: leadLoading, error: leadError } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, project_category, specialty_needed, city, budget_min, budget_max, urgency, matching_status, created_at")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as LeadData;
    },
    enabled: !!id,
  });

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ["lead-matches", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id, score, rank_position, status, response_status, reasons, contractor_id,
          contractors:contractor_id (
            id, business_name, city, specialty, years_experience, description, logo_url, slug
          )
        `)
        .eq("lead_id", id!)
        .eq("match_type", "contractor")
        .order("rank_position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as MatchData[];
    },
    enabled: !!id,
  });

  const isLoading = leadLoading || matchesLoading;

  if (isLoading) return <DashboardLayout><LoadingState /></DashboardLayout>;
  if (leadError || !lead) return <DashboardLayout><ErrorState message="Lead introuvable." /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-3">
              <Link to="/dashboard/properties">
                <ArrowLeft className="h-4 w-4 mr-1" /> Mes propriétés
              </Link>
            </Button>
            <h1 className="text-xl font-bold text-foreground">Résultats de matching</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Entrepreneurs suggérés pour votre projet
            </p>
          </div>
          <Badge variant={lead.matching_status === "matched" ? "default" : "secondary"} className="text-xs">
            {lead.matching_status === "matched" ? "Matchés" : lead.matching_status === "empty" ? "Aucun match" : "En cours"}
          </Badge>
        </div>

        {/* Lead summary */}
        <div className="rounded-2xl border border-border/40 bg-card p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Catégorie</p>
              <p className="font-medium text-foreground mt-0.5">{lead.project_category ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Spécialité</p>
              <p className="font-medium text-foreground mt-0.5">{lead.specialty_needed ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Budget</p>
              <p className="font-medium text-foreground mt-0.5">
                {lead.budget_min != null && lead.budget_max != null
                  ? `${formatCurrency(lead.budget_min)} — ${formatCurrency(lead.budget_max)}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Urgence</p>
              <p className="font-medium text-foreground mt-0.5">{URGENCY_LABELS[lead.urgency ?? ""] ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Matches */}
        {matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/40 bg-card p-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-medium text-foreground">Aucun entrepreneur trouvé</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Aucun profil compatible n'a été trouvé pour le moment. Vous pouvez élargir vos critères ou réessayer plus tard.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match, idx) => {
              const c = match.contractors;
              const statusCfg = STATUS_CONFIG[match.response_status ?? "pending"] ?? STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;

              return (
                <div key={match.id} className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                  {/* Rank banner */}
                  <div className={`px-4 py-2 flex items-center justify-between ${idx === 0 ? "bg-primary/10" : "bg-muted/20"}`}>
                    <div className="flex items-center gap-2">
                      {idx === 0 && <Trophy className="h-4 w-4 text-primary" />}
                      <span className="text-xs font-medium text-foreground">
                        #{match.rank_position ?? idx + 1} — Score {Math.round(match.score)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`h-3.5 w-3.5 ${statusCfg.color}`} />
                      <span className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</span>
                    </div>
                  </div>

                  <div className="p-4">
                    {/* Contractor info */}
                    <div className="flex items-start gap-3 mb-4">
                      {c?.logo_url ? (
                        <img src={c.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover border border-border/30" />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-muted/30 flex items-center justify-center">
                          <Briefcase className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {c?.business_name ?? "Entrepreneur"}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {c?.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {c.city}
                            </span>
                          )}
                          {c?.specialty && (
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3" /> {c.specialty}
                            </span>
                          )}
                          {c?.years_experience && (
                            <span>{c.years_experience} ans</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {c?.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{c.description}</p>
                    )}

                    {/* Reasons */}
                    {match.reasons && match.reasons.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Pourquoi ce match</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(match.reasons as string[]).map((r, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              ✓ {r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {c?.slug ? (
                        <Button size="sm" variant="default" className="flex-1 text-xs" asChild>
                          <Link to={`/pro/${c.slug}`}>Voir le profil</Link>
                        </Button>
                      ) : c?.id ? (
                        <Button size="sm" variant="default" className="flex-1 text-xs" asChild>
                          <Link to={`/contractors/${c.id}`}>Voir le profil</Link>
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" className="flex-1 text-xs" asChild>
                        <Link to={`/dashboard/book/${c?.id ?? ""}`}>Demander un rendez-vous</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}