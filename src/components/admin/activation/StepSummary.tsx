/**
 * Step 7 — Summary + Audit Trail + Rollback
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Undo2, Building2, Download, User, BarChart3, CreditCard, Rocket, ClipboardCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { ActivationWizardState } from "@/pages/admin/PageAdminEntrepreneurActivation";

interface Props {
  state: ActivationWizardState;
  updateState: (p: Partial<ActivationWizardState>) => void;
  addEvent: (type: string, detail?: string) => void;
}

export default function StepSummary({ state, updateState, addEvent }: Props) {
  // Fetch audit trail
  const { data: events } = useQuery({
    queryKey: ["admin-activation-events", state.contractorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_activation_events")
        .select("*")
        .eq("contractor_id", state.contractorId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!state.contractorId,
  });

  const rollbackMutation = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;

      // Deactivate contractor
      await supabase
        .from("contractors")
        .update({
          is_accepting_appointments: false,
          is_discoverable: false,
          is_published: false,
        })
        .eq("id", state.contractorId!);

      // Deactivate override
      await supabase
        .from("admin_activation_overrides")
        .update({ is_active: false })
        .eq("contractor_id", state.contractorId!);

      // Update readiness
      await supabase
        .from("admin_appointment_readiness")
        .update({ ready_status: "not_ready" })
        .eq("contractor_id", state.contractorId!);

      // Log
      await supabase.from("admin_activation_events").insert({
        contractor_id: state.contractorId!,
        admin_user_id: user?.id || "",
        event_type: "rollback_performed",
        event_payload_json: { reason: "Admin rollback" },
      });
    },
    onSuccess: () => {
      updateState({ activated: false, published: false, readinessReady: false });
      addEvent("rollback", "Activation annulée");
      toast.success("Rollback effectué — activation annulée");
    },
  });

  const summaryItems = [
    { label: "Entreprise sélectionnée", done: !!state.contractorId, icon: Building2 },
    { label: "Données importées", done: !!state.importJobId, icon: Download },
    { label: "Profil complété", done: state.profileComplete, icon: User },
    { label: "Score AIPP calculé", done: state.scoreComputed, icon: BarChart3 },
    { label: "Plan assigné", done: state.planAssigned, icon: CreditCard },
    { label: "Bypass 100% appliqué", done: state.bypassApplied, icon: CreditCard },
    { label: "Entrepreneur activé", done: state.activated, icon: Rocket },
    { label: "Profil publié", done: state.published, icon: ClipboardCheck },
    { label: "Rendez-vous activés", done: state.readinessReady, icon: CheckCircle2 },
  ];

  const getEventIcon = (type: string) => {
    if (type.includes("rollback")) return <Undo2 className="h-3.5 w-3.5 text-red-500" />;
    if (type.includes("activated") || type.includes("published")) return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    if (type.includes("override") || type.includes("bypass")) return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />;
    return <Clock className="h-3.5 w-3.5 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Résumé d'activation</h2>
        <p className="text-sm text-muted-foreground">
          Vue complète de l'activation et historique des événements
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Summary checklist */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">État de l'activation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summaryItems.map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center justify-between p-2.5 rounded-lg border">
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${item.done ? "text-green-600" : "text-muted-foreground"}`} />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Audit trail */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Historique d'activation</CardTitle>
          </CardHeader>
          <CardContent>
            {(!events || events.length === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun événement</p>
            ) : (
              <div className="space-y-3">
                {events.map((evt: any) => (
                  <div key={evt.id} className="flex items-start gap-3 relative">
                    <div className="mt-0.5 shrink-0">
                      {getEventIcon(evt.event_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{evt.event_type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(evt.created_at).toLocaleString("fr-CA")}
                      </p>
                      {evt.event_payload_json && typeof evt.event_payload_json === "object" && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(evt.event_payload_json as Record<string, any>).slice(0, 3).map(([k, v]) => (
                            <Badge key={k} variant="outline" className="text-[10px]">
                              {k}: {typeof v === "string" ? v : JSON.stringify(v).slice(0, 20)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Local events */}
      {state.events.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Événements de cette session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {state.events.map((evt, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(evt.timestamp).toLocaleTimeString("fr-CA")}</span>
                  <span className="font-medium text-foreground">{evt.type}</span>
                  {evt.detail && <span>— {evt.detail}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rollback */}
      {state.activated && (
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Rollback d'activation</p>
                <p className="text-xs text-muted-foreground">
                  Désactive le profil, le plan et la readiness
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => rollbackMutation.mutate()}
                disabled={rollbackMutation.isPending}
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Rollback
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
