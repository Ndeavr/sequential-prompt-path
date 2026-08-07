/**
 * UNPRO — Admin: Entitlements Observability
 * Live view of contractor plan state + every blocked feature attempt.
 * Data comes from public.v_contractor_plan_state and public.entitlement_denials.
 */
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldAlert, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPriceCents } from "@/lib/formatPrice";

interface DenialRow {
  id: string;
  created_at: string;
  feature_key: string;
  plan_code: string | null;
  reason: string;
  limit_value: number | null;
  current_usage: number | null;
  surface: string | null;
}

interface PlanStateRow {
  contractor_id: string;
  company_name: string | null;
  plan_code: string | null;
  plan_name: string | null;
  plan_monthly_price_cents: number | null;
  plan_source: string | null;
  trial_ends_at: string | null;
  subscription_status: string | null;
}

export default function EntitlementsPanel() {
  const denials = useQuery({
    queryKey: ["entitlement-denials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entitlement_denials" as any)
        .select("id, created_at, feature_key, plan_code, reason, limit_value, current_usage, surface")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as DenialRow[];
    },
    refetchInterval: 30_000,
  });

  const planState = useQuery({
    queryKey: ["contractor-plan-state"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_contractor_plan_state" as any)
        .select("*")
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as PlanStateRow[];
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-4 h-4 text-amber-300" />
          <h2 className="text-sm font-semibold">Refus d'accès récents</h2>
          <span className="text-xs text-white/40">50 derniers</span>
        </div>

        {denials.isLoading ? (
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
          </div>
        ) : (denials.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-white/50">Aucun blocage enregistré — tous les accès passent.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/45 text-[11px] uppercase tracking-wider">
                  <th className="text-left py-2 pr-4">Quand</th>
                  <th className="text-left py-2 pr-4">Fonctionnalité</th>
                  <th className="text-left py-2 pr-4">Plan</th>
                  <th className="text-left py-2 pr-4">Motif</th>
                  <th className="text-left py-2 pr-4">Usage / Limite</th>
                  <th className="text-left py-2">Surface</th>
                </tr>
              </thead>
              <tbody>
                {denials.data!.map((d) => (
                  <tr key={d.id} className="border-t border-white/5">
                    <td className="py-2 pr-4 text-white/60 whitespace-nowrap">
                      {new Date(d.created_at).toLocaleString("fr-CA", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 pr-4 font-medium">{d.feature_key}</td>
                    <td className="py-2 pr-4 text-white/70">{d.plan_code ?? "—"}</td>
                    <td className="py-2 pr-4 text-amber-300/90">{d.reason}</td>
                    <td className="py-2 pr-4 text-white/70">
                      {d.current_usage ?? "—"} / {d.limit_value === -1 ? "∞" : (d.limit_value ?? "—")}
                    </td>
                    <td className="py-2 text-white/50">{d.surface ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-sky-300" />
          <h2 className="text-sm font-semibold">État des plans entrepreneurs</h2>
        </div>

        {planState.isLoading ? (
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
          </div>
        ) : (planState.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-white/50">Aucun abonnement entrepreneur actif.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/45 text-[11px] uppercase tracking-wider">
                  <th className="text-left py-2 pr-4">Entrepreneur</th>
                  <th className="text-left py-2 pr-4">Plan</th>
                  <th className="text-left py-2 pr-4">Prix</th>
                  <th className="text-left py-2 pr-4">Origine</th>
                  <th className="text-left py-2 pr-4">Essai</th>
                  <th className="text-left py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {planState.data!.map((r) => (
                  <tr key={r.contractor_id} className="border-t border-white/5">
                    <td className="py-2 pr-4 font-medium">{r.company_name ?? "—"}</td>
                    <td className="py-2 pr-4">{r.plan_name ?? r.plan_code ?? "—"}</td>
                    <td className="py-2 pr-4 text-white/70">
                      {typeof r.plan_monthly_price_cents === "number" ? `${formatPriceCents(r.plan_monthly_price_cents)}/mois` : "—"}
                    </td>
                    <td className="py-2 pr-4 text-white/60">{r.plan_source ?? "standard"}</td>
                    <td className="py-2 pr-4 text-white/60">
                      {r.trial_ends_at
                        ? new Date(r.trial_ends_at).toLocaleDateString("fr-CA")
                        : "—"}
                    </td>
                    <td className="py-2 text-white/70">{r.subscription_status ?? "—"}</td>
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
