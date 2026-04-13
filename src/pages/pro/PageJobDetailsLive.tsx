/**
 * UNPRO — Job Details Live Page
 * Full structured view of a handoff job ticket with timeline and actions.
 */
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ContractorLayout from "@/layouts/ContractorLayout";
import { LoadingState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft, Check, X, MessageSquare, Clock, DollarSign, MapPin,
  AlertTriangle, TrendingUp, Wrench, Calendar, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

const stageMap: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  new: { icon: FileText, label: "Nouveau", color: "text-blue-400" },
  handoff_created: { icon: TrendingUp, label: "Structuré", color: "text-primary" },
  matched: { icon: Wrench, label: "Assigné", color: "text-amber-400" },
  accepted: { icon: Check, label: "Accepté", color: "text-green-400" },
  declined: { icon: X, label: "Refusé", color: "text-destructive" },
  info_requested: { icon: MessageSquare, label: "Info demandée", color: "text-orange-400" },
  completed: { icon: Check, label: "Terminé", color: "text-green-500" },
};

const PageJobDetailsLive = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: contractor } = useQuery({
    queryKey: ["my-contractor-id", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("contractors").select("id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["job-details", id],
    queryFn: async () => {
      // Handoff
      const { data: handoff } = await supabase
        .from("project_handoff")
        .select("*")
        .eq("request_id", id!)
        .maybeSingle();

      // Lead score
      const { data: score } = await supabase
        .from("lead_scores")
        .select("*")
        .eq("request_id", id!)
        .maybeSingle();

      // Match
      const { data: match } = await supabase
        .from("contractor_matches")
        .select("*")
        .eq("request_id", id!)
        .eq("contractor_id", contractor!.id)
        .maybeSingle();

      // Status logs
      const { data: logs } = await supabase
        .from("job_status_logs")
        .select("*")
        .eq("request_id", id!)
        .order("created_at", { ascending: true });

      return { handoff, score, match, logs: logs || [] };
    },
    enabled: !!id && !!contractor?.id,
  });

  const updateMatch = useMutation({
    mutationFn: async (status: string) => {
      if (!data?.match?.id) return;
      await supabase
        .from("contractor_matches")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", data.match.id);
      // Log
      await supabase.from("job_status_logs").insert({
        request_id: id!, status, actor: "contractor", actor_id: user?.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-details", id] });
      qc.invalidateQueries({ queryKey: ["contractor-inbox"] });
    },
  });

  if (isLoading) return <ContractorLayout><LoadingState /></ContractorLayout>;
  if (!data?.handoff) {
    return (
      <ContractorLayout>
        <div className="dark max-w-lg mx-auto p-4 text-center text-muted-foreground">
          <p>Job introuvable</p>
          <Button variant="ghost" onClick={() => navigate("/pro/inbox")} className="mt-3">
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour
          </Button>
        </div>
      </ContractorLayout>
    );
  }

  const h = data.handoff;
  const isPending = data.match?.status === "pending";

  return (
    <ContractorLayout>
      <div className="dark max-w-lg mx-auto space-y-4 pb-20 px-4">
        {/* Back */}
        <button onClick={() => navigate("/pro/inbox")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour à l'inbox
        </button>

        {/* Header */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{h.title}</CardTitle>
                {h.category && <p className="text-xs text-muted-foreground mt-0.5">{h.category}{h.sub_category ? ` / ${h.sub_category}` : ""}</p>}
              </div>
              <div className="flex gap-1.5">
                {data.score && (
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border",
                    data.score.label === "ELITE" ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black" :
                    data.score.label === "HIGH" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                    "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  )}>
                    <TrendingUp className="w-3 h-3" /> {data.score.score}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {h.summary && <p className="text-sm text-muted-foreground">{h.summary}</p>}

            <div className="grid grid-cols-2 gap-2 text-xs">
              {h.location_city && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" /> {h.location_city}
                </div>
              )}
              {h.estimated_duration && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" /> {h.estimated_duration}
                </div>
              )}
              {(h.estimated_budget_min || h.estimated_budget_max) && (
                <div className="flex items-center gap-1.5 text-green-400">
                  <DollarSign className="w-3.5 h-3.5" />
                  {h.estimated_budget_min?.toLocaleString()}$
                  {h.estimated_budget_max ? ` – ${h.estimated_budget_max.toLocaleString()}$` : "+"}
                </div>
              )}
              {h.urgency_level && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className={cn(
                    h.urgency_level === "critical" ? "text-red-400" :
                    h.urgency_level === "high" ? "text-orange-400" : "text-muted-foreground"
                  )}>
                    {h.urgency_level === "critical" ? "Urgent" : h.urgency_level === "high" ? "Élevé" : "Normal"}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Missing info */}
        {Array.isArray(h.missing_fields) && h.missing_fields.length > 0 && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="py-3 px-4">
              <p className="text-xs font-semibold text-amber-400 mb-1.5">Informations manquantes</p>
              <ul className="space-y-1">
                {(h.missing_fields as string[]).map((f: string, i: number) => (
                  <li key={i} className="text-xs text-amber-400/70 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Score breakdown */}
        {data.score?.scoring_breakdown && typeof data.score.scoring_breakdown === "object" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Détail du score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(data.score.scoring_breakdown as Record<string, number>).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${val}%` }} />
                      </div>
                      <span className="w-8 text-right font-mono">{val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        {data.logs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Historique</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.logs.map((log: any) => {
                  const s = stageMap[log.status] || stageMap.new;
                  const Icon = s.icon;
                  return (
                    <div key={log.id} className="flex items-start gap-2.5">
                      <div className={cn("mt-0.5 shrink-0", s.color)}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{s.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("fr-CA")} · {log.actor}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {isPending && (
          <div className="flex gap-2 sticky bottom-20 bg-background/80 backdrop-blur-sm py-3 -mx-4 px-4">
            <Button className="flex-1" onClick={() => { updateMatch.mutate("accepted"); toast.success("Accepté !"); }}>
              <Check className="w-4 h-4 mr-1.5" /> Accepter
            </Button>
            <Button variant="outline" onClick={() => { updateMatch.mutate("info_requested"); toast.info("Demande envoyée"); }}>
              <MessageSquare className="w-4 h-4 mr-1" /> Info
            </Button>
            <Button variant="ghost" className="text-destructive" onClick={() => { updateMatch.mutate("declined"); toast("Refusé"); navigate("/pro/inbox"); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </ContractorLayout>
  );
};

export default PageJobDetailsLive;
