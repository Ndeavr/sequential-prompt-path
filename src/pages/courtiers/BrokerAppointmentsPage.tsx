/**
 * UNPRO — Broker Appointments Page
 * List appointments for the broker with status management.
 */
import MainLayout from "@/layouts/MainLayout";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "En attente", variant: "secondary" },
  confirmed: { label: "Confirmé", variant: "default" },
  reschedule_requested: { label: "Replanification demandée", variant: "outline" },
  cancelled: { label: "Annulé", variant: "destructive" },
  completed: { label: "Complété", variant: "default" },
};

export default function BrokerAppointmentsPage() {
  const { user } = useAuth();

  const { data: broker } = useQuery({
    queryKey: ["broker-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("broker_profiles").select("id").eq("profile_id", user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["broker-appointments", broker?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("broker_id", broker!.id)
        .order("scheduled_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!broker?.id,
  });

  return (
    <MainLayout>
      <Helmet><title>Mes rendez-vous | UNPRO Courtier</title></Helmet>
      <div className="max-w-4xl mx-auto px-5 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Mes rendez-vous</h1>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground p-8">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
          </div>
        ) : !appointments?.length ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Aucun rendez-vous planifié.</p>
              <p className="text-xs text-muted-foreground mt-1">Acceptez un lead pour planifier votre premier rendez-vous.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {appointments.map((apt: any) => {
              const s = STATUS_MAP[apt.status] || { label: apt.status, variant: "outline" as const };
              const lead = apt.leads;
              return (
                <Card key={apt.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {apt.appointment_type || lead?.intent || "Rendez-vous"}
                          </h3>
                          <Badge variant={s.variant}>{s.label}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          {apt.scheduled_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(new Date(apt.scheduled_at), "d MMM yyyy à HH:mm", { locale: fr })}
                            </span>
                          )}
                          {lead?.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {lead.city}
                            </span>
                          )}
                          {lead?.project_category && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" /> {lead.project_category}
                            </span>
                          )}
                        </div>
                        {apt.notes && <p className="text-xs text-muted-foreground">{apt.notes}</p>}
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
