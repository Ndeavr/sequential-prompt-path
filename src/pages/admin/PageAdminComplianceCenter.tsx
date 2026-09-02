/**
 * UNPRO — Admin Compliance Center
 * Cockpit for the Professional Compliance Engine: professions, regulators,
 * credential states, monetization status and rules awaiting legal review.
 * Only admins reach this route (AdminProtectedRoute) and only admins can
 * write (RLS on `profession_compliance_rules`). Every write is audited.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck, AlertTriangle, ExternalLink, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useComplianceRules } from "@/hooks/useProfessionCompliance";
import {
  COMPENSATION_LABELS,
  COMPENSATION_TYPES,
  DECISION_LABELS,
  type CompensationType,
  type ProfessionComplianceRule,
} from "@/lib/compliance/professionCompliance";

const DECISIONS = ["ALLOWED", "RESTRICTED", "PENDING_REVIEW", "PROHIBITED"] as const;

function decisionTone(value: string) {
  if (value === "ALLOWED") return "bg-success/10 text-success border-success/30";
  if (value === "PROHIBITED") return "bg-destructive/10 text-destructive border-destructive/30";
  if (value.startsWith("RESTRICTED")) return "bg-orange-500/10 text-orange-600 border-orange-500/30";
  return "bg-amber-500/10 text-amber-600 border-amber-500/30";
}

function useComplianceCounts() {
  return useQuery({
    queryKey: ["compliance-credential-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_credentials")
        .select("profession_code, verification_state, credential_status, expires_at");
      if (error) throw error;
      const today = new Date().toISOString().slice(0, 10);
      const byProfession: Record<
        string,
        { total: number; verified: number; pending: number; expired: number }
      > = {};
      for (const row of data ?? []) {
        const key = (row as any).profession_code ?? "non_declare";
        byProfession[key] ??= { total: 0, verified: 0, pending: 0, expired: 0 };
        const bucket = byProfession[key];
        bucket.total += 1;
        const expired =
          (row as any).credential_status === "EXPIRED" ||
          (!!(row as any).expires_at && (row as any).expires_at < today);
        if (expired) bucket.expired += 1;
        else if ((row as any).verification_state === "VERIFIED") bucket.verified += 1;
        else bucket.pending += 1;
      }
      return byProfession;
    },
    staleTime: 30_000,
  });
}

function useBlockedCommissions() {
  return useQuery({
    queryKey: ["compliance-blocked-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_commissions")
        .select("id, affiliate_id, profession_code, compliance_status, compliance_reason, status, created_at")
        .neq("compliance_status", "ALLOWED")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export default function PageAdminComplianceCenter() {
  const { data: rules, isLoading } = useComplianceRules();
  const { data: counts } = useComplianceCounts();
  const { data: blocked } = useBlockedCommissions();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const needsReview = useMemo(
    () => (rules ?? []).filter((r) => r.legal_review_status !== "REVIEWED"),
    [rules],
  );

  async function updateCompensation(
    rule: ProfessionComplianceRule,
    type: CompensationType,
    value: string,
  ) {
    setBusy(`${rule.id}:${type}`);
    const next = { ...(rule.compensation_rules ?? {}), [type]: value };
    const { error } = await supabase
      .from("profession_compliance_rules")
      .update({ compensation_rules: next } as never)
      .eq("id", rule.id);
    setBusy(null);
    if (error) {
      toast.error("Modification refusée : " + error.message);
      return;
    }
    toast.success("Règle mise à jour et journalisée.");
    qc.invalidateQueries({ queryKey: ["compliance-rules"] });
  }

  async function markReviewed(rule: ProfessionComplianceRule) {
    setBusy(rule.id);
    const { error } = await supabase
      .from("profession_compliance_rules")
      .update({
        legal_review_status: "REVIEWED",
        legal_reviewed_at: new Date().toISOString(),
        source_last_verified_at: new Date().toISOString(),
      } as never)
      .eq("id", rule.id);
    setBusy(null);
    if (error) {
      toast.error("Modification refusée : " + error.message);
      return;
    }
    toast.success("Règle marquée comme révisée.");
    qc.invalidateQueries({ queryKey: ["compliance-rules"] });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement des règles de conformité…
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 pb-24 md:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground md:text-2xl">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Conformité professionnelle
        </h1>
        <p className="text-sm text-muted-foreground">
          Règles par profession : organisme, titres, portée de Clara, jumelage, publicité et rémunération.
          Toute règle absente ou ambiguë bloque l'action (échec fermé).
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Professions", value: rules?.length ?? 0 },
          { label: "En révision juridique", value: needsReview.length },
          {
            label: "Titres vérifiés",
            value: Object.values(counts ?? {}).reduce((a, b) => a + b.verified, 0),
          },
          { label: "Commissions bloquées", value: blocked?.length ?? 0 },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-3">
            <div className="text-2xl font-semibold text-foreground">{kpi.value}</div>
            <div className="text-xs text-muted-foreground">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Rules */}
      <div className="space-y-3">
        {(rules ?? []).map((rule) => {
          const c = counts?.[rule.profession_code];
          const open = selected === rule.id;
          return (
            <div key={rule.id} className="rounded-xl border border-border bg-card">
              <button
                type="button"
                onClick={() => setSelected(open ? null : rule.id)}
                className="flex w-full flex-wrap items-center gap-2 p-4 text-left"
              >
                <span className="font-medium text-foreground">{rule.profession_label_fr}</span>
                {rule.regulator_code && (
                  <Badge variant="outline" className="text-[10px]">{rule.regulator_code}</Badge>
                )}
                <Badge variant="outline" className={`text-[10px] ${decisionTone(rule.legal_review_status)}`}>
                  {rule.legal_review_status === "REVIEWED" ? "Révisé" : "Révision requise"}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {c ? `${c.verified} vérifiés · ${c.pending} en attente · ${c.expired} expirés` : "Aucun titre"}
                </span>
              </button>

              {open && (
                <div className="space-y-4 border-t border-border p-4">
                  <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                    <div>Type : {rule.profession_type}</div>
                    <div>Organisme : {rule.regulator_name ?? "—"}</div>
                    <div>Titre exigé : {rule.credential_required ? (rule.credential_type ?? "oui") : "non"}</div>
                    <div>
                      Vérification automatisée :{" "}
                      {rule.automated_verification_available ? "disponible" : "révision manuelle"}
                    </div>
                    <div>Jumelage : {rule.matching_allowed ? "autorisé" : "en révision"}</div>
                    <div>Rendez-vous : {rule.appointment_allowed ? "autorisé" : "en révision"}</div>
                    <div>Publicité : {rule.advertising_allowed ? "autorisée" : "en révision"}</div>
                    <div>
                      Référence payante :{" "}
                      {DECISION_LABELS[rule.paid_referral_status] ?? rule.paid_referral_status}
                    </div>
                    <div>
                      Transfert réglementé : {rule.requires_regulated_handoff ? "obligatoire" : "non requis"}
                    </div>
                    <div>
                      Source vérifiée :{" "}
                      {rule.source_last_verified_at
                        ? new Date(rule.source_last_verified_at).toLocaleDateString("fr-CA")
                        : "jamais"}
                    </div>
                  </div>

                  {rule.source_url && (
                    <a
                      href={rule.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {rule.source_reference ?? rule.source_url} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  <div>
                    <h3 className="mb-2 text-sm font-medium text-foreground">Rémunération autorisée</h3>
                    <div className="grid gap-2 md:grid-cols-2">
                      {COMPENSATION_TYPES.map((type) => {
                        const value = rule.compensation_rules?.[type] ?? "PENDING_REVIEW";
                        return (
                          <div
                            key={type}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                          >
                            <span className="text-xs text-foreground">{COMPENSATION_LABELS[type]}</span>
                            <select
                              value={DECISIONS.includes(value as never) ? value : "PENDING_REVIEW"}
                              disabled={busy === `${rule.id}:${type}`}
                              onChange={(e) => updateCompensation(rule, type, e.target.value)}
                              className={`rounded-md border px-2 py-1 text-[11px] ${decisionTone(value)}`}
                            >
                              {DECISIONS.map((d) => (
                                <option key={d} value={d}>{DECISION_LABELS[d]}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {rule.prohibited_claims?.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Affirmations interdites : {rule.prohibited_claims.join(" · ")}
                    </p>
                  )}

                  {rule.legal_review_status !== "REVIEWED" && (
                    <Button size="sm" disabled={busy === rule.id} onClick={() => markReviewed(rule)}>
                      {busy === rule.id ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-3 w-3" />
                      )}
                      Marquer comme révisé
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Blocked commissions */}
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Commissions en attente de validation réglementaire
        </h2>
        {(blocked?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune commission bloquée.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-2">Profession</th>
                  <th className="p-2">Statut</th>
                  <th className="p-2">Motif</th>
                  <th className="p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {(blocked ?? []).map((b: any) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="p-2">{b.profession_code ?? "—"}</td>
                    <td className="p-2">
                      {DECISION_LABELS[b.compliance_status] ?? b.compliance_status}
                    </td>
                    <td className="p-2 text-muted-foreground">{b.compliance_reason ?? "—"}</td>
                    <td className="p-2 text-muted-foreground">
                      {new Date(b.created_at).toLocaleDateString("fr-CA")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
