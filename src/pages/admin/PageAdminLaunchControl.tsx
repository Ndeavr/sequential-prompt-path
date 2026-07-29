/**
 * UNPRO — Launch Control Center
 * ONE mission: get the first $1 paying contractors today.
 * All numbers come from real production views (no mock data).
 *   - v_launch_funnel        : today counters (America/Toronto)
 *   - v_pipeline_funnel_counts : all-time stage totals
 *   - v_first_dollar_tracker : active run + next blocker
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFirstDollarTracker } from "@/hooks/useAcquisitionFunnel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Rocket, Phone, MessageSquare, CheckCircle2, Mail, MousePointerClick,
  UserPlus, ShieldCheck, CreditCard, DollarSign, Sparkles, AlertCircle,
} from "lucide-react";

type LaunchRow = {
  sms_sent_today: number | null;
  email_sent_today: number | null;
  checkouts_today: number | null;
  payments_today: number | null;
  activations_today: number | null;
};

type PipelineRow = {
  scraped: number; contactable: number; sent: number; delivered: number;
  clicked: number; onboarding_started: number; onboarding_completed: number;
  payment_started: number; paid: number; activated: number;
};

function useLaunchToday() {
  const [row, setRow] = useState<LaunchRow | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await (supabase as any).from("v_launch_funnel").select("*").maybeSingle();
      if (alive) setRow(data ?? null);
    };
    load();
    const t = setInterval(load, 10_000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return row;
}

function usePipelineCounts() {
  const [row, setRow] = useState<PipelineRow | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await (supabase as any).from("v_pipeline_funnel_counts").select("*").maybeSingle();
      if (alive) setRow(data ?? null);
    };
    load();
    const t = setInterval(load, 10_000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return row;
}

interface KpiProps {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "danger" | "primary";
  hint?: string;
}
function Kpi({ label, value, icon: Icon, tone = "default", hint }: KpiProps) {
  const toneCls =
    tone === "success" ? "text-emerald-400" :
    tone === "warning" ? "text-amber-400" :
    tone === "danger" ? "text-red-400" :
    tone === "primary" ? "text-primary" :
    "text-foreground";
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{label}</p>
            <p className={`text-xl font-bold tabular-nums mt-0.5 ${toneCls}`}>{value.toLocaleString("fr-CA")}</p>
            {hint && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
          </div>
          <Icon className={`h-4 w-4 shrink-0 ${toneCls}`} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PageAdminLaunchControl() {
  const today = useLaunchToday();
  const pipe = usePipelineCounts();
  const { data: tracker } = useFirstDollarTracker();

  const paidToday = today?.payments_today ?? 0;
  const activatedToday = today?.activations_today ?? 0;
  const goal = 2;
  const remaining = Math.max(0, goal - paidToday);

  return (
    <div className="min-h-screen bg-background p-4 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Launch Control</h1>
          <Badge variant="outline" className="ml-auto text-[10px]">refresh 10s</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Une seule mission aujourd'hui : premiers contrats à 1&nbsp;$.
        </p>
      </div>

      {/* Revenue wall */}
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenu aujourd'hui</p>
            <p className="text-3xl font-bold text-primary tabular-nums">${paidToday}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Objectif ${goal} · {remaining === 0 ? "🎉 atteint" : `${remaining} contrat${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Activés aujourd'hui</p>
            <p className="text-3xl font-bold tabular-nums">{activatedToday}</p>
          </div>
        </CardContent>
      </Card>

      {/* Today counters */}
      <div>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Aujourd'hui</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          <Kpi label="SMS envoyés" value={today?.sms_sent_today ?? 0} icon={MessageSquare} tone="primary" />
          <Kpi label="Emails envoyés" value={today?.email_sent_today ?? 0} icon={Mail} />
          <Kpi label="Checkouts" value={today?.checkouts_today ?? 0} icon={CreditCard} />
          <Kpi label="Paiements $1" value={paidToday} icon={DollarSign} tone={paidToday > 0 ? "success" : "default"} />
          <Kpi label="Activations" value={activatedToday} icon={Sparkles} tone={activatedToday > 0 ? "success" : "default"} />
        </div>
      </div>

      {/* All-time pipeline */}
      <div>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Pipeline total</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          <Kpi label="Scrapés" value={pipe?.scraped ?? 0} icon={Rocket} />
          <Kpi label="Contactables" value={pipe?.contactable ?? 0} icon={Phone} />
          <Kpi label="SMS livrés" value={pipe?.delivered ?? 0} icon={CheckCircle2} tone={(pipe?.delivered ?? 0) === 0 && (pipe?.sent ?? 0) > 0 ? "warning" : "default"} hint={(pipe?.delivered ?? 0) === 0 && (pipe?.sent ?? 0) > 0 ? "callback KO" : undefined} />
          <Kpi label="Clics" value={pipe?.clicked ?? 0} icon={MousePointerClick} />
          <Kpi label="Inscrits" value={pipe?.onboarding_completed ?? 0} icon={UserPlus} />
          <Kpi label="Checkouts" value={pipe?.payment_started ?? 0} icon={CreditCard} />
          <Kpi label="Payés $1" value={pipe?.paid ?? 0} icon={DollarSign} tone={(pipe?.paid ?? 0) > 0 ? "success" : "default"} />
          <Kpi label="Activés" value={pipe?.activated ?? 0} icon={ShieldCheck} tone={(pipe?.activated ?? 0) > 0 ? "success" : "default"} />
        </div>
      </div>

      {/* Active run */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Lancement actif</h2>
          </div>
          {tracker?.active_business_name ? (
            <>
              <div className="text-sm">
                <span className="font-semibold">{tracker.active_business_name}</span>
                <span className="text-muted-foreground"> · prospect {tracker.active_prospect_id?.slice(0, 8)}…</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                <div className={tracker.first_sms_sent_at ? "text-emerald-400" : "text-muted-foreground"}>
                  {tracker.first_sms_sent_at ? "✓" : "○"} SMS envoyé
                </div>
                <div className={tracker.first_delivery_at ? "text-emerald-400" : "text-muted-foreground"}>
                  {tracker.first_delivery_at ? "✓" : "○"} Livré
                </div>
                <div className={tracker.first_click_at ? "text-emerald-400" : "text-muted-foreground"}>
                  {tracker.first_click_at ? "✓" : "○"} Cliqué
                </div>
                <div className={tracker.first_activation_at ? "text-emerald-400" : "text-muted-foreground"}>
                  {tracker.first_activation_at ? "✓" : "○"} Inscription
                </div>
                <div className={tracker.first_paid_at ? "text-emerald-400" : "text-muted-foreground"}>
                  {tracker.first_paid_at ? "✓" : "○"} Payé $1
                </div>
                <div className={tracker.first_contractor_activation_at ? "text-emerald-400" : "text-muted-foreground"}>
                  {tracker.first_contractor_activation_at ? "✓" : "○"} Activé
                </div>
              </div>
              <div className="pt-2 border-t border-border/40 space-y-1">
                <p className="text-[11px]">
                  <span className="text-muted-foreground">Prochaine action conversion : </span>
                  <span className="font-medium">{tracker.next_missing_milestone}</span>
                </p>
                {tracker.telemetry_warning && (
                  <p className="text-[11px] flex items-center gap-1 text-amber-400">
                    <AlertCircle className="h-3 w-3" /> {tracker.telemetry_warning}
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Aucun lancement actif. Lancer une campagne ci-dessous.</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Button asChild size="lg" className="h-12">
          <Link to="/admin/acquisition-pipeline">
            <Rocket className="h-4 w-4 mr-2" /> Lancer une campagne
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12">
          <Link to="/admin/first-dollar">
            <DollarSign className="h-4 w-4 mr-2" /> First Dollar tracker
          </Link>
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Données live · vues Postgres · aucun mock.
      </p>
    </div>
  );
}
