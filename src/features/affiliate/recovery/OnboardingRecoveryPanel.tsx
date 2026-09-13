/**
 * Admin — « Onboardings incomplets prometteurs »
 * Vue focalisée sur les candidats réels de contractor_leads évalués par la
 * fonction affiliate-onboarding-recovery. Simulation par défaut, routage interne
 * seulement (aucun SMS, courriel ou notification).
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, PlayCircle } from "lucide-react";

interface RecoveryResult {
  lead_id?: string;
  prospect_id?: string;
  cohort?: string;
  business_name?: string | null;
  current_stage?: string | null;
  contact_permissions?: {
    can_call: boolean;
    can_sms: boolean;
    can_email: boolean;
    research_only: boolean;
    reasons: { call: string | null; sms: string | null; email: string | null };
  } | null;
  company_name?: string | null;
  city?: string | null;
  category?: string | null;
  status: "routed" | "would_route" | "unassigned_admin_review" | "skipped" | "future_eligible";
  inactivity_hours?: number | null;
  interesting_reasons?: string[];
  match_reasons?: string[];
  skip_reasons?: string[];
  proposed_affiliate?: string | null;
  rejected_affiliates?: Array<{ affiliate_id: string; reason: string }>;
}

interface RecoveryResponse {
  ok: boolean;
  dry_run: boolean;
  rule_version: string;
  disabled?: boolean;
  config: {
    inactivity_hours: number;
    fit_score_min: number;
    priority_score_min: number;
    crm_eligible_stages?: string[];
    crm_future_stages?: string[];
  };
  learning: { applied: boolean; sample: number; terminal_outcomes: number; min_sample: number; max_boost: number };
  totals: {
    inspected: number; routed: number; unassigned: number; skipped: number;
    crm_inspected?: number; crm_routed?: number; crm_unassigned?: number;
    crm_skipped?: number; crm_future_eligible?: number;
  };
  results: RecoveryResult[];
  crm_results?: RecoveryResult[];
  error?: string;
}

const STATUS_LABEL: Record<RecoveryResult["status"], { label: string; tone: string }> = {
  routed: { label: "Routé", tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  would_route: { label: "Serait routé", tone: "bg-primary/10 text-primary border-primary/30" },
  unassigned_admin_review: { label: "Non assigné — revue admin", tone: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  skipped: { label: "Écarté", tone: "bg-muted text-muted-foreground border-border/40" },
  future_eligible: { label: "Étape non routée en v1", tone: "bg-sky-500/10 text-sky-600 border-sky-500/30" },
};

function renderList(rows: RecoveryResult[], title: string) {
  const visible = rows.filter((r) => r.status !== "skipped");
  if (visible.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {visible.map((r) => {
          const s = STATUS_LABEL[r.status];
          return (
            <li key={r.lead_id ?? r.prospect_id} className="rounded-xl border border-border/40 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{r.company_name ?? r.business_name ?? "Sans nom"}</p>
                  <p className="text-xs text-muted-foreground">
                    {[r.category, r.city, r.current_stage].filter(Boolean).join(" · ")}
                    {typeof r.inactivity_hours === "number" ? ` · inactif ${Math.round(r.inactivity_hours)} h` : ""}
                  </p>
                </div>
                <Badge variant="outline" className={s.tone}>{s.label}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Affilié : {r.proposed_affiliate ?? "aucun appariement défendable"}
              </p>
              {r.interesting_reasons?.length ? (
                <p className="text-xs text-muted-foreground">Motif : {r.interesting_reasons.join(" · ")}</p>
              ) : null}
              {r.match_reasons?.length ? (
                <p className="text-xs text-muted-foreground">Appariement : {r.match_reasons.join(" · ")}</p>
              ) : null}
              {r.skip_reasons?.length ? (
                <p className="text-xs text-muted-foreground">Non routé : {r.skip_reasons.join(", ")}</p>
              ) : null}
              {r.contact_permissions?.research_only ? (
                <p className="text-xs text-amber-600">
                  Recherche seulement — aucun envoi permis ({r.contact_permissions.reasons.sms ?? r.contact_permissions.reasons.email})
                </p>
              ) : null}
              {r.status === "unassigned_admin_review" && r.rejected_affiliates?.length ? (
                <p className="text-xs text-muted-foreground">
                  Rejets : {r.rejected_affiliates.map((x) => x.reason).join(", ")}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function OnboardingRecoveryPanel() {
  const [data, setData] = useState<RecoveryResponse | null>(null);
  const [loading, setLoading] = useState<"dry" | "live" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(dryRun: boolean) {
    setLoading(dryRun ? "dry" : "live");
    setError(null);
    try {
      const { data: res, error: fnError } = await supabase.functions.invoke("affiliate-onboarding-recovery", {
        body: { dry_run: dryRun },
      });
      if (fnError) throw fnError;
      const payload = res as RecoveryResponse;
      if (payload?.error) throw new Error(payload.error);
      setData(payload);
      if (payload.disabled) toast.info("Règle désactivée dans optimization_rules.");
      else toast.success(dryRun ? "Simulation terminée" : `Routage terminé — ${payload.totals.routed} assigné(s)`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur inconnue";
      setError(message);
      toast.error("Analyse impossible", { description: message });
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card className="border-border/40">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-base">Onboardings incomplets prometteurs</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => run(true)} disabled={loading !== null} className="gap-1.5">
            {loading === "dry" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Simulation
          </Button>
          <Button size="sm" onClick={() => run(false)} disabled={loading !== null} className="gap-1.5">
            {loading === "live" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Router réellement
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!data && !error && (
          <p className="text-sm text-muted-foreground">
            Lancez une simulation pour voir les inscriptions commencées puis abandonnées, et l'affilié proposé.
          </p>
        )}
        {data && (
          <>
            <p className="text-xs text-muted-foreground">
              Règle {data.rule_version} · inactivité ≥ {data.config.inactivity_hours} h · fit ≥ {data.config.fit_score_min} ·
              priorité ≥ {data.config.priority_score_min} · {data.dry_run ? "simulation" : "exécution réelle"}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.learning.applied
                ? `Ordonnancement ajusté par les résultats observés (échantillon ${data.learning.sample}, plafond ±${data.learning.max_boost}).`
                : `Ordonnancement déterministe v1 : échantillon réel ${data.learning.sample}/${data.learning.min_sample}, pas encore d'ajustement appris.`}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Inspectés {data.totals.inspected}</Badge>
              <Badge variant="outline">Routés {data.totals.routed}</Badge>
              <Badge variant="outline">Non assignés {data.totals.unassigned}</Badge>
              <Badge variant="outline">Écartés {data.totals.skipped}</Badge>
              {typeof data.totals.crm_inspected === "number" && (
                <>
                  <Badge variant="outline">CRM inspectés {data.totals.crm_inspected}</Badge>
                  <Badge variant="outline">CRM routés {data.totals.crm_routed ?? 0}</Badge>
                  <Badge variant="outline">CRM non assignés {data.totals.crm_unassigned ?? 0}</Badge>
                  <Badge variant="outline">CRM étapes non routées {data.totals.crm_future_eligible ?? 0}</Badge>
                </>
              )}
            </div>
            {data.config.crm_eligible_stages?.length ? (
              <p className="text-xs text-muted-foreground">
                Étapes CRM routées : {data.config.crm_eligible_stages.join(", ")} · observées sans routage :{" "}
                {(data.config.crm_future_stages ?? []).join(", ") || "aucune"}
              </p>
            ) : null}
            {renderList(data.results, "Inscriptions incomplètes (Mode Action)")}
            {renderList(data.crm_results ?? [], "Prospects vérifiés du CRM (file manuelle)")}
            {[...data.results, ...(data.crm_results ?? [])].filter((r) => r.status !== "skipped").length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun onboarding incomplet éligible en ce moment.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
