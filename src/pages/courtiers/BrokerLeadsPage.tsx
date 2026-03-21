/**
 * UNPRO — Broker Leads Page
 * List of matched leads with live accept/decline functionality.
 */
import MainLayout from "@/layouts/MainLayout";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { MapPin, DollarSign, Clock, User, Check, X, Loader2 } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  suggested: "Nouveau",
  primary: "Prioritaire",
  contacted: "Contacté",
  accepted: "Accepté",
  declined: "Refusé",
  converted: "Converti",
};

export default function BrokerLeadsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: broker } = useQuery({
    queryKey: ["broker-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("broker_profiles").select("id").eq("profile_id", user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: matches, isLoading } = useQuery({
    queryKey: ["broker-matches", broker?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*, leads(*)")
        .eq("broker_id", broker!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!broker?.id,
  });

  return (
    <MainLayout>
      <Helmet><title>Mes leads | UNPRO Courtier</title></Helmet>
      <div className="max-w-4xl mx-auto px-5 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Mes leads</h1>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground p-8">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
          </div>
        ) : !matches?.length ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Aucun lead assigné pour l'instant.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {matches.map((m: any) => (
              <BrokerLeadCard key={m.id} match={m} onUpdate={() => qc.invalidateQueries({ queryKey: ["broker-matches"] })} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function BrokerLeadCard({ match, onUpdate }: { match: any; onUpdate: () => void }) {
  const lead = match.leads;
  const [loading, setLoading] = useState<"accepted" | "declined" | null>(null);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  async function respond(decision: "accepted" | "declined") {
    setLoading(decision);
    const { data, error } = await supabase.functions.invoke("broker-respond-to-lead", {
      body: { matchId: match.id, decision, declineReason: decision === "declined" ? declineReason : undefined },
    });
    if (error || !data?.ok) {
      toast.error(error?.message || data?.error || "Action impossible");
    } else {
      toast.success(decision === "accepted" ? "Lead accepté!" : "Lead décliné");
      onUpdate();
    }
    setLoading(null);
    setShowDecline(false);
  }

  const isPending = match.response_status === "pending" || match.response_status === "promoted";

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{lead?.intent || "Demande"}</h3>
              <Badge variant={isPending ? "secondary" : match.response_status === "accepted" ? "default" : "outline"}>
                {STATUS_LABELS[match.response_status] || match.response_status}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {lead?.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{lead.city}</span>}
              {lead?.project_category && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{lead.project_category}</span>}
              {(lead?.budget_min || lead?.budget_max) && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  {lead.budget_min?.toLocaleString()}$ - {lead.budget_max?.toLocaleString()}$
                </span>
              )}
              {lead?.urgency && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{lead.urgency}</span>}
            </div>
            <p className="text-xs text-muted-foreground">Score: {match.score}/100 • Rang #{match.rank_position}</p>
          </div>

          {isPending && (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => setShowDecline(v => !v)} disabled={loading !== null}>
                <X className="h-3.5 w-3.5 mr-1" /> Refuser
              </Button>
              <Button size="sm" onClick={() => respond("accepted")} disabled={loading !== null}>
                {loading === "accepted" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                Accepter
              </Button>
            </div>
          )}
        </div>

        {showDecline && (
          <div className="space-y-2 pt-2 border-t border-border">
            <Textarea
              placeholder="Raison du refus (optionnel)..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={2}
            />
            <Button size="sm" variant="destructive" onClick={() => respond("declined")} disabled={loading !== null}>
              {loading === "declined" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Confirmer le refus
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
