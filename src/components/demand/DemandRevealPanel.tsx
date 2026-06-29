/**
 * UNPRO — DemandRevealPanel
 * Shown in contractor demand-first onboarding. Reveals live (city × category) demand
 * BEFORE any commitment. Aggregates only — no PII.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, DollarSign } from "lucide-react";

type Selection = { city: string; category: string };

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

function pressureBadge(score: number) {
  if (score > 1_000_000) return { label: "Élevée", className: "bg-red-500/15 text-red-300 border-red-500/30" };
  if (score > 100_000) return { label: "Moyenne", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  return { label: "Faible", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
}

export function DemandRevealPanel({ selections }: { selections: Selection[] }) {
  const { data, isLoading } = useQuery({
    queryKey: ["demand-reveal", selections],
    enabled: selections.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        selections.map(async ({ city, category }) => {
          const { data } = await supabase
            .from("market_demand")
            .select("homeowner_count, estimated_revenue, pressure_score")
            .eq("city", city)
            .eq("category", category.toLowerCase())
            .maybeSingle();
          return { city, category, ...(data ?? { homeowner_count: 0, estimated_revenue: 0, pressure_score: 0 }) };
        })
      );
      return results;
    },
  });

  if (selections.length === 0) return null;

  const totalHomeowners = data?.reduce((s, r) => s + (r.homeowner_count ?? 0), 0) ?? 0;
  const totalRevenue = data?.reduce((s, r) => s + Number(r.estimated_revenue ?? 0), 0) ?? 0;

  return (
    <Card className="p-6 space-y-4 glass-strong">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-readable-muted">Demande disponible</p>
          <h3 className="text-xl font-semibold text-readable-primary">
            {totalHomeowners} propriétaires · {fmtMoney(totalRevenue)} de demande estimée
          </h3>
        </div>
        <TrendingUp className="h-6 w-6 text-emerald-400" />
      </div>

      <div className="grid gap-3">
        {isLoading && <p className="text-readable-muted text-sm">Chargement…</p>}
        {data?.map((row) => {
          const p = pressureBadge(Number(row.pressure_score ?? 0));
          return (
            <div key={`${row.city}-${row.category}`} className="flex items-center justify-between rounded-xl bg-white/5 p-4">
              <div>
                <p className="font-medium text-readable-primary capitalize">
                  {row.category} · {row.city}
                </p>
                <div className="mt-1 flex items-center gap-4 text-xs text-readable-muted">
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{row.homeowner_count ?? 0}</span>
                  <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3" />{fmtMoney(Number(row.estimated_revenue ?? 0))}</span>
                </div>
              </div>
              <Badge variant="outline" className={p.className}>Pression {p.label}</Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
