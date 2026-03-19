/**
 * UNPRO — Broker Leads Page
 * List of matched leads for the broker with status management.
 */
import MainLayout from "@/layouts/MainLayout";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, DollarSign, Clock, User } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  suggested: "Nouveau",
  contacted: "Contacté",
  accepted: "Accepté",
  rejected: "Refusé",
  converted: "Converti",
};

export default function BrokerLeadsPage() {
  const { user } = useAuth();

  const { data: broker } = useQuery({
    queryKey: ["broker-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("broker_profiles").select("id").eq("profile_id", user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: matches } = useQuery({
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

        {!matches?.length ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Aucun lead assigné pour l'instant.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {matches.map((m: any) => {
              const lead = m.leads;
              return (
                <Card key={m.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{lead?.intent || "Demande"}</h3>
                          <Badge variant={m.status === "suggested" ? "secondary" : "default"}>
                            {STATUS_LABELS[m.status] || m.status}
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
                        <p className="text-xs text-muted-foreground">Score de match: {m.score}/100 • Rang #{m.rank_position}</p>
                      </div>
                      <div className="flex gap-2">
                        {m.status === "suggested" && (
                          <>
                            <Button size="sm" variant="outline">Refuser</Button>
                            <Button size="sm">Accepter</Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
