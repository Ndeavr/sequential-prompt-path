/**
 * Step 5 — Plan Selection + Payment Bypass (100% discount)
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Check, Zap, Crown, Shield, Star, Rocket, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { ActivationWizardState } from "@/pages/admin/PageAdminEntrepreneurActivation";

interface Props {
  state: ActivationWizardState;
  updateState: (p: Partial<ActivationWizardState>) => void;
  addEvent: (type: string, detail?: string) => void;
}

const PLAN_ICONS: Record<string, typeof Zap> = {
  recrue: Zap,
  pro: Star,
  premium: Shield,
  elite: Crown,
  signature: Rocket,
};

export default function StepPlanAssignment({ state, updateState, addEvent }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(state.planCode);
  const [bypassEnabled, setBypassEnabled] = useState(false);
  const [bypassReason, setBypassReason] = useState("");

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-plan-catalog"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plan_catalog")
        .select("*")
        .eq("is_active", true)
        .order("monthly_price", { ascending: true });
      return data || [];
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlan) throw new Error("No plan selected");
      const user = (await supabase.auth.getUser()).data.user;

      // Create subscription record
      const { data: sub, error: subErr } = await supabase
        .from("contractor_subscriptions")
        .upsert({
          contractor_id: state.contractorId!,
          plan_id: selectedPlan,
          status: bypassEnabled ? "active" : "pending",
          billing_interval: "monthly",
        }, { onConflict: "contractor_id" })
        .select()
        .single();
      if (subErr) throw subErr;

      // If bypass, create activation override
      if (bypassEnabled) {
        await supabase.from("admin_activation_overrides").insert({
          contractor_id: state.contractorId!,
          subscription_id: sub.id,
          override_type: "full_discount",
          override_value: 100,
          reason: bypassReason,
          created_by_admin_id: user?.id || "",
        });
      }

      // Update contractor activation_status
      await supabase
        .from("contractors")
        .update({ activation_status: bypassEnabled ? "active_bypassed" : "pending_payment" })
        .eq("id", state.contractorId!);

      // Log event
      await supabase.from("admin_activation_events").insert({
        contractor_id: state.contractorId!,
        admin_user_id: user?.id || "",
        event_type: bypassEnabled ? "plan_assigned_with_bypass" : "plan_assigned",
        event_payload_json: {
          plan_code: selectedPlan,
          bypass: bypassEnabled,
          bypass_reason: bypassReason,
          subscription_id: sub.id,
        },
      });
    },
    onSuccess: () => {
      updateState({ planAssigned: true, planCode: selectedPlan, bypassApplied: bypassEnabled });
      addEvent("plan_assigned", `Plan: ${selectedPlan}${bypassEnabled ? " (bypass 100%)" : ""}`);
      toast.success(`Plan ${selectedPlan} assigné${bypassEnabled ? " avec rabais 100%" : ""}`);
    },
    onError: (e: any) => toast.error("Erreur: " + e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Sélection du plan</h2>
        <p className="text-sm text-muted-foreground">Assignez un plan entrepreneur et configurez le paiement</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse"><CardContent className="pt-6 h-48" /></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(plans || []).map((plan) => {
            const Icon = PLAN_ICONS[plan.code] || Star;
            const isSelected = selectedPlan === plan.code;
            const monthlyPrice = plan.monthly_price ? (plan.monthly_price / 100).toFixed(0) : "N/A";
            const features: string[] = Array.isArray(plan.features_json) ? plan.features_json as string[] : [];

            return (
              <button key={plan.id} onClick={() => setSelectedPlan(plan.code)} className="text-left">
                <Card className={`h-full transition-all ${isSelected ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/30"}`}>
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{plan.name}</p>
                          {plan.badge && <Badge variant="outline" className="text-[10px]">{plan.badge}</Badge>}
                        </div>
                      </div>
                      {isSelected && <Check className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                      <span className="text-2xl font-bold">{monthlyPrice}$</span>
                      <span className="text-xs text-muted-foreground">/mois</span>
                    </div>
                    {plan.appointments_range_min != null && (
                      <p className="text-xs text-muted-foreground">
                        {plan.appointments_range_min} à {plan.appointments_range_max} rendez-vous/mois
                      </p>
                    )}
                    {features.length > 0 && (
                      <ul className="space-y-1">
                        {features.slice(0, 4).map((f, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                            <Check className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      {selectedPlan && (
        <Card className={bypassEnabled ? "border-yellow-500/50 bg-yellow-50/30 dark:bg-yellow-950/10" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Bypass paiement — Rabais 100%
              </CardTitle>
              <Switch checked={bypassEnabled} onCheckedChange={setBypassEnabled} />
            </div>
          </CardHeader>
          {bypassEnabled && (
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-100/50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  Le rabais 100% active la souscription sans encaissement Stripe. Cette action est journalisée et révocable.
                </p>
              </div>
              <div>
                <Label>Raison du rabais 100% *</Label>
                <Textarea value={bypassReason} onChange={e => setBypassReason(e.target.value)} placeholder="Ex: Activation partenaire fondateur..." rows={2} />
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <Button onClick={() => assignMutation.mutate()} disabled={!selectedPlan || assignMutation.isPending || (bypassEnabled && !bypassReason)} className="w-full sm:w-auto">
        <CreditCard className="h-4 w-4 mr-2" />
        {bypassEnabled ? "Assigner plan + Bypass 100%" : "Assigner le plan"}
      </Button>
    </div>
  );
}
