import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Target, Users, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface PlanComparison {
  code: string;
  name: string;
  appointments_per_month: number;
  estimated_revenue: number;
  fits_goal: boolean;
  price_monthly: number;
}

interface PlanResult {
  required_appointments: number;
  recommended_plan: string;
  estimated_revenue: number;
  potential_revenue: number;
  revenue_gap: number;
  plans_comparison: PlanComparison[];
}

interface Props {
  onPlanSelected?: (planCode: string) => void;
  initialValues?: {
    targetRevenue?: number;
    averageJobValue?: number;
    closeRate?: number;
    appointmentCapacity?: number;
  };
}

export default function PanelPlanCapacityProjection({ onPlanSelected, initialValues }: Props) {
  const [targetRevenue, setTargetRevenue] = useState(initialValues?.targetRevenue || 10000);
  const [averageJobValue, setAverageJobValue] = useState(initialValues?.averageJobValue || 5000);
  const [closeRate, setCloseRate] = useState(initialValues?.closeRate || 30);
  const [appointmentCapacity, setAppointmentCapacity] = useState(initialValues?.appointmentCapacity || 15);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const compute = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("compute-plan-recommendation", {
        body: {
          target_revenue: targetRevenue,
          average_job_value: averageJobValue,
          close_rate: closeRate / 100,
          appointment_capacity: appointmentCapacity,
        },
      });
      if (!error && data) {
        setResult(data as PlanResult);
        setSelectedPlan(data.recommended_plan);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [targetRevenue, averageJobValue, closeRate, appointmentCapacity]);

  // Auto-compute on mount and when values change (debounced)
  useEffect(() => {
    const t = setTimeout(compute, 500);
    return () => clearTimeout(t);
  }, [compute]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-4">
      {/* Sliders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Vos objectifs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Objectif revenu mensuel
              </label>
              <span className="text-sm font-bold text-foreground">{formatCurrency(targetRevenue)}</span>
            </div>
            <Slider
              value={[targetRevenue]}
              onValueChange={([v]) => setTargetRevenue(v)}
              min={2000}
              max={100000}
              step={1000}
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Valeur moyenne contrat
              </label>
              <span className="text-sm font-bold text-foreground">{formatCurrency(averageJobValue)}</span>
            </div>
            <Slider
              value={[averageJobValue]}
              onValueChange={([v]) => setAverageJobValue(v)}
              min={500}
              max={50000}
              step={500}
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">Taux de fermeture</label>
              <span className="text-sm font-bold text-foreground">{closeRate}%</span>
            </div>
            <Slider
              value={[closeRate]}
              onValueChange={([v]) => setCloseRate(v)}
              min={10}
              max={80}
              step={5}
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> Capacité rendez-vous / mois
              </label>
              <span className="text-sm font-bold text-foreground">{appointmentCapacity}</span>
            </div>
            <Slider
              value={[appointmentCapacity]}
              onValueChange={([v]) => setAppointmentCapacity(v)}
              min={3}
              max={60}
              step={1}
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      {result && !loading && (
        <>
          {/* Summary */}
          <Card className="border-primary/30">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">RDV requis</p>
                  <p className="text-xl font-bold text-foreground">{result.required_appointments}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Revenu estimé</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(result.estimated_revenue)}</p>
                </div>
              </div>
              {result.revenue_gap > 0 && (
                <p className="text-xs text-amber-400 text-center mt-2">
                  Manque à gagner : {formatCurrency(result.revenue_gap)}/mois
                </p>
              )}
            </CardContent>
          </Card>

          {/* Plans comparison */}
          <div className="space-y-2">
            {result.plans_comparison.map((plan) => {
              const isRecommended = plan.code === result.recommended_plan;
              const isSelected = plan.code === selectedPlan;
              return (
                <button
                  key={plan.code}
                  type="button"
                  onClick={() => setSelectedPlan(plan.code)}
                  className={cn(
                    "w-full text-left rounded-xl border p-3.5 transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border/60 hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      <span className="font-bold text-sm text-foreground">{plan.name}</span>
                      {isRecommended && (
                        <Badge className="text-[9px] px-1.5 py-0">Recommandé</Badge>
                      )}
                    </div>
                    <span className="text-sm font-bold text-foreground">{plan.price_monthly}$/mo</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                    <span>{plan.appointments_per_month} RDV/mois</span>
                    <span className={plan.fits_goal ? "text-emerald-400" : "text-muted-foreground"}>
                      {formatCurrency(plan.estimated_revenue)} estimés
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <Button
            className="w-full h-12 font-bold text-base"
            disabled={!selectedPlan}
            onClick={() => selectedPlan && onPlanSelected?.(selectedPlan)}
          >
            Activer mes rendez-vous <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
