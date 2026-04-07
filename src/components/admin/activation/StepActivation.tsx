/**
 * Step 6 — Readiness Checklist + Publish + Appointment Activation
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertTriangle, Rocket, Globe, Calendar, Shield, User, Camera, CreditCard, BarChart3, FileCheck } from "lucide-react";
import { toast } from "sonner";
import type { ActivationWizardState } from "@/pages/admin/PageAdminEntrepreneurActivation";

interface Props {
  state: ActivationWizardState;
  updateState: (p: Partial<ActivationWizardState>) => void;
  addEvent: (type: string, detail?: string) => void;
}

interface ChecklistItem {
  code: string;
  label: string;
  icon: typeof User;
  blocking: boolean;
  check: (c: any, state: ActivationWizardState) => boolean;
}

const CHECKLIST: ChecklistItem[] = [
  { code: "linked_account", label: "Compte utilisateur lié", icon: User, blocking: true, check: (c) => !!c?.user_id },
  { code: "public_profile", label: "Profil publié", icon: Globe, blocking: true, check: (c) => !!c?.business_name && !!c?.slug },
  { code: "services", label: "Services assignés", icon: FileCheck, blocking: true, check: (c) => !!c?.specialty },
  { code: "service_areas", label: "Zones de service", icon: Calendar, blocking: true, check: (c) => !!c?.city },
  { code: "active_plan", label: "Plan actif", icon: CreditCard, blocking: true, check: (_, s) => s.planAssigned },
  { code: "score", label: "Score AIPP présent", icon: BarChart3, blocking: true, check: (_, s) => s.scoreComputed },
  { code: "core_identity", label: "Coordonnées minimales", icon: Shield, blocking: true, check: (c) => !!c?.email || !!c?.phone },
  { code: "media_minimum", label: "Photo / Logo minimum", icon: Camera, blocking: false, check: (c) => !!c?.logo_url },
  { code: "payment_override", label: "Paiement ou bypass actif", icon: CreditCard, blocking: true, check: (_, s) => s.planAssigned },
];

export default function StepActivation({ state, updateState, addEvent }: Props) {
  const [forceActivation, setForceActivation] = useState(false);
  const [forceReason, setForceReason] = useState("");

  const { data: contractor } = useQuery({
    queryKey: ["admin-contractor-full", state.contractorId],
    queryFn: async () => {
      const { data } = await supabase.from("contractors").select("*").eq("id", state.contractorId!).single();
      return data;
    },
    enabled: !!state.contractorId,
  });

  const checklistResults = useMemo(() => {
    return CHECKLIST.map(item => ({ ...item, passed: item.check(contractor, state) }));
  }, [contractor, state]);

  const passedCount = checklistResults.filter(i => i.passed).length;
  const blockingFailed = checklistResults.filter(i => i.blocking && !i.passed);
  const allBlockingPassed = blockingFailed.length === 0;
  const canActivate = allBlockingPassed || forceActivation;
  const readinessPercent = Math.round((passedCount / CHECKLIST.length) * 100);

  const activateMutation = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;

      // Update contractor flags
      await supabase.from("contractors").update({
        activation_status: "active",
        booking_enabled: true,
        booking_page_published: true,
      }).eq("id", state.contractorId!);

      // Create readiness record
      await supabase.from("admin_appointment_readiness").upsert({
        contractor_id: state.contractorId!,
        checklist_score: readinessPercent,
        has_linked_account: checklistResults.find(i => i.code === "linked_account")?.passed || false,
        has_services: checklistResults.find(i => i.code === "services")?.passed || false,
        has_service_areas: checklistResults.find(i => i.code === "service_areas")?.passed || false,
        has_active_plan: state.planAssigned,
        has_score: state.scoreComputed,
        has_core_identity: checklistResults.find(i => i.code === "core_identity")?.passed || false,
        has_media_minimum: checklistResults.find(i => i.code === "media_minimum")?.passed || false,
        has_public_profile: checklistResults.find(i => i.code === "public_profile")?.passed || false,
        has_activation_override_or_payment: state.planAssigned,
        ready_status: forceActivation ? "forced_ready" : "ready",
        forced_by_admin_id: forceActivation ? user?.id : null,
        forced_reason: forceActivation ? forceReason : null,
      }, { onConflict: "contractor_id" });

      // Log events
      await supabase.from("admin_activation_events").insert([
        {
          contractor_id: state.contractorId!,
          admin_user_id: user?.id || "",
          event_type: "profile_published",
          event_payload_json: { readiness: readinessPercent },
        },
        {
          contractor_id: state.contractorId!,
          admin_user_id: user?.id || "",
          event_type: "appointments_activated",
          event_payload_json: {
            forced: forceActivation,
            forced_reason: forceReason,
            checklist: checklistResults.map(i => ({ code: i.code, passed: i.passed })),
          },
        },
      ]);
    },
    onSuccess: () => {
      updateState({ activated: true, published: true, readinessReady: true });
      addEvent("activated", `Readiness: ${readinessPercent}%${forceActivation ? " (forcé)" : ""}`);
      toast.success("Entrepreneur activé — prêt à recevoir des rendez-vous !");
    },
  });

  const readinessColor = readinessPercent >= 80 ? "text-green-600" : readinessPercent >= 50 ? "text-yellow-600" : "text-destructive";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-1">Activation & Readiness</h2>
          <p className="text-sm text-muted-foreground">Vérifiez la checklist et activez l'entrepreneur</p>
        </div>
        <div className={`text-2xl font-bold ${readinessColor}`}>{readinessPercent}%</div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <Progress value={readinessPercent} className="flex-1" />
            <Badge variant={allBlockingPassed ? "default" : "destructive"}>{passedCount}/{CHECKLIST.length}</Badge>
          </div>

          <div className="space-y-2">
            {checklistResults.map(item => {
              const Icon = item.icon;
              const bgClass = item.passed
                ? "bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900"
                : item.blocking
                ? "bg-destructive/5 border-destructive/20"
                : "bg-yellow-50/50 dark:bg-yellow-950/10 border-yellow-200 dark:border-yellow-900";
              return (
                <div key={item.code} className={`flex items-center justify-between p-3 rounded-lg border ${bgClass}`}>
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${item.passed ? "text-green-600" : item.blocking ? "text-destructive" : "text-yellow-500"}`} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.blocking && !item.passed && <Badge variant="destructive" className="text-[10px]">Bloquant</Badge>}
                    {item.passed ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {!allBlockingPassed && (
        <Card className="border-yellow-500/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Forcer l'activation
              </CardTitle>
              <Switch checked={forceActivation} onCheckedChange={setForceActivation} />
            </div>
          </CardHeader>
          {forceActivation && (
            <CardContent>
              <Label>Raison de l'activation forcée *</Label>
              <Textarea value={forceReason} onChange={e => setForceReason(e.target.value)} placeholder="Justification..." rows={2} />
            </CardContent>
          )}
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => activateMutation.mutate()}
          disabled={!canActivate || activateMutation.isPending || (forceActivation && !forceReason)}
          className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
          size="lg"
        >
          <Rocket className="h-5 w-5 mr-2" />
          {state.activated ? "Déjà activé ✓" : forceActivation ? "Forcer l'activation" : "Activer l'entrepreneur"}
        </Button>
        {state.activated && (
          <Badge className="bg-green-100 text-green-800 text-sm self-center">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Prêt à recevoir des rendez-vous
          </Badge>
        )}
      </div>
    </div>
  );
}
