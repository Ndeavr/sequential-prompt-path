/**
 * UNPRO — Contractor Intelligent Inbox
 * Displays structured job tickets from Alex conversations with lead scoring and quick actions.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ContractorLayout from "@/layouts/ContractorLayout";
import { LoadingState, EmptyState, PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Check, X, MessageSquare, Clock, DollarSign, MapPin, Zap,
  AlertTriangle, TrendingUp, ChevronRight, Inbox
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// ── Badge Components ──
const BadgeLeadScore = ({ score, label }: { score: number; label: string }) => {
  const colorMap: Record<string, string> = {
    ELITE: "bg-gradient-to-r from-amber-500 to-yellow-400 text-black",
    HIGH: "bg-green-500/20 text-green-400 border-green-500/30",
    MEDIUM: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    LOW: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border", colorMap[label] || colorMap.LOW)}>
      <TrendingUp className="w-3 h-3" /> {score}
    </span>
  );
};

const BadgeUrgency = ({ level }: { level: string }) => {
  const map: Record<string, { cls: string; label: string }> = {
    critical: { cls: "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse", label: "🔴 Urgent" },
    high: { cls: "bg-orange-500/20 text-orange-400 border-orange-500/30", label: "🟠 Élevé" },
    normal: { cls: "bg-blue-500/15 text-blue-400 border-blue-500/30", label: "🔵 Normal" },
    low: { cls: "bg-muted text-muted-foreground", label: "⚪ Faible" },
  };
  const m = map[level] || map.normal;
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border", m.cls)}>{m.label}</span>;
};

// ── Card Job Ticket ──
interface JobTicket {
  id: string;
  request_id: string;
  title: string;
  summary: string | null;
  category: string | null;
  urgency_level: string;
  estimated_budget_min: number | null;
  estimated_budget_max: number | null;
  estimated_duration: string | null;
  location_city: string | null;
  missing_fields: any;
  match_status: string;
  match_score: number;
  match_id: string;
  lead_score: number;
  lead_label: string;
  created_at: string;
}

const CardJobTicketIntelligent = ({
  ticket, onAccept, onDecline, onRequestInfo, onViewDetails
}: {
  ticket: JobTicket;
  onAccept: () => void;
  onDecline: () => void;
  onRequestInfo: () => void;
  onViewDetails: () => void;
}) => {
  const budgetText = ticket.estimated_budget_min && ticket.estimated_budget_max
    ? `${ticket.estimated_budget_min.toLocaleString()}$ – ${ticket.estimated_budget_max.toLocaleString()}$`
    : ticket.estimated_budget_min ? `${ticket.estimated_budget_min.toLocaleString()}$+` : null;

  const missingCount = Array.isArray(ticket.missing_fields) ? ticket.missing_fields.length : 0;
  const isNew = ticket.match_status === "pending";
  const timeAgo = getTimeAgo(ticket.created_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }}
      layout
    >
      <Card className={cn(
        "relative overflow-hidden transition-all",
        isNew && "ring-1 ring-primary/40 shadow-lg shadow-primary/5",
        ticket.urgency_level === "critical" && "ring-1 ring-red-500/40"
      )}>
        {isNew && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        )}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm truncate">{ticket.title}</CardTitle>
              {ticket.category && (
                <p className="text-xs text-muted-foreground mt-0.5">{ticket.category}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <BadgeLeadScore score={ticket.lead_score} label={ticket.lead_label} />
              <BadgeUrgency level={ticket.urgency_level} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {ticket.summary && (
            <p className="text-xs text-muted-foreground line-clamp-2">{ticket.summary}</p>
          )}

          {/* Quick stats */}
          <div className="flex flex-wrap gap-2 text-xs">
            {budgetText && (
              <span className="inline-flex items-center gap-1 text-green-400">
                <DollarSign className="w-3 h-3" /> {budgetText}
              </span>
            )}
            {ticket.location_city && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-3 h-3" /> {ticket.location_city}
              </span>
            )}
            {ticket.estimated_duration && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" /> {ticket.estimated_duration}
              </span>
            )}
            <span className="text-muted-foreground/60">{timeAgo}</span>
          </div>

          {/* Missing info nudge */}
          {missingCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400/80 bg-amber-500/10 rounded-lg px-2.5 py-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>{missingCount} info{missingCount > 1 ? "s" : ""} manquante{missingCount > 1 ? "s" : ""}</span>
            </div>
          )}

          {/* Actions */}
          {isNew ? (
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1 h-9 text-xs font-semibold" onClick={onAccept}>
                <Check className="w-3.5 h-3.5 mr-1" /> Accepter
              </Button>
              <Button size="sm" variant="outline" className="h-9 text-xs" onClick={onRequestInfo}>
                <MessageSquare className="w-3.5 h-3.5 mr-1" /> Info
              </Button>
              <Button size="sm" variant="ghost" className="h-9 text-xs text-destructive" onClick={onDecline}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="w-full h-9 text-xs" onClick={onViewDetails}>
              Voir détails <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  return `il y a ${Math.floor(hrs / 24)}j`;
}

// ── Main Page ──
const PageContractorInbox = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "declined">("all");

  // Get contractor ID
  const { data: contractor } = useQuery({
    queryKey: ["my-contractor-id", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("contractors")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Get matches with handoff + score data
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["contractor-inbox", contractor?.id, filter],
    queryFn: async () => {
      let q = supabase
        .from("contractor_matches")
        .select(`
          id, request_id, match_score, rank, status, created_at,
          project_handoff!inner(title, summary, category, urgency_level, estimated_budget_min, estimated_budget_max, estimated_duration, location_city, missing_fields),
          lead_scores(score, label)
        `)
        .eq("contractor_id", contractor!.id)
        .order("created_at", { ascending: false });

      if (filter !== "all") q = q.eq("status", filter);

      const { data, error } = await q.limit(50);
      if (error) throw error;

      return (data || []).map((m: any) => ({
        id: m.id,
        request_id: m.request_id,
        match_id: m.id,
        match_status: m.status,
        match_score: m.match_score,
        title: m.project_handoff?.title || "Nouveau projet",
        summary: m.project_handoff?.summary,
        category: m.project_handoff?.category,
        urgency_level: m.project_handoff?.urgency_level || "normal",
        estimated_budget_min: m.project_handoff?.estimated_budget_min,
        estimated_budget_max: m.project_handoff?.estimated_budget_max,
        estimated_duration: m.project_handoff?.estimated_duration,
        location_city: m.project_handoff?.location_city,
        missing_fields: m.project_handoff?.missing_fields,
        lead_score: m.lead_scores?.[0]?.score ?? 0,
        lead_label: m.lead_scores?.[0]?.label ?? "LOW",
        created_at: m.created_at,
      })) as JobTicket[];
    },
    enabled: !!contractor?.id,
  });

  const updateMatch = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("contractor_matches")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contractor-inbox"] }),
  });

  const handleAccept = (ticket: JobTicket) => {
    updateMatch.mutate({ id: ticket.match_id, status: "accepted" });
    toast.success("Job accepté !");
  };

  const handleDecline = (ticket: JobTicket) => {
    updateMatch.mutate({ id: ticket.match_id, status: "declined" });
    toast("Job refusé");
  };

  const handleRequestInfo = (ticket: JobTicket) => {
    toast.info("Demande d'information envoyée au client");
  };

  const pendingCount = tickets?.filter(t => t.match_status === "pending").length ?? 0;

  if (isLoading) return <ContractorLayout><LoadingState /></ContractorLayout>;

  const filters: { key: typeof filter; label: string }[] = [
    { key: "all", label: "Tous" },
    { key: "pending", label: `Nouveaux${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
    { key: "accepted", label: "Acceptés" },
    { key: "declined", label: "Refusés" },
  ];

  return (
    <ContractorLayout>
      <div className="dark max-w-lg mx-auto space-y-4 pb-20 px-4">
        <PageHeader title="Inbox intelligent" description="Jobs structurés par Alex, prêts à accepter" />

        {/* Revenue prediction widget */}
        {tickets && tickets.length > 0 && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Revenu potentiel</p>
                  <p className="text-lg font-bold text-primary">
                    {tickets
                      .filter(t => t.match_status === "pending")
                      .reduce((sum, t) => sum + (t.estimated_budget_min || 0), 0)
                      .toLocaleString()}$
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Jobs en attente</p>
                  <p className="text-lg font-bold">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Ticket list */}
        {!tickets || tickets.length === 0 ? (
          <EmptyState
            icon={<Inbox className="w-10 h-10 text-muted-foreground/50" />}
            title="Aucun job pour le moment"
            description="Les demandes structurées par Alex apparaîtront ici."
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {tickets.map(ticket => (
                <CardJobTicketIntelligent
                  key={ticket.id}
                  ticket={ticket}
                  onAccept={() => handleAccept(ticket)}
                  onDecline={() => handleDecline(ticket)}
                  onRequestInfo={() => handleRequestInfo(ticket)}
                  onViewDetails={() => navigate(`/pro/inbox/${ticket.request_id}`)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </ContractorLayout>
  );
};

export default PageContractorInbox;
