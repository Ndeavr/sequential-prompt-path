/**
 * HomeownerUsageGuardrailTable — Observabilité admin du garde-fou quotidien propriétaires.
 * Source : v_homeowner_usage_admin (security_invoker, admin RLS).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge } from "lucide-react";

interface Row {
  user_id: string;
  plan_code: string;
  usage_day: string;
  analyses_today: number;
  designs_today: number;
  analyses_daily_limit: number;
  designs_daily_limit: number;
  analyses_month: number;
  designs_month: number;
  analyses_month_limit: number | null;
  designs_month_limit: number | null;
  analyses_daily_blocked: boolean;
  designs_daily_blocked: boolean;
}

const fmtMonth = (used: number, limit: number | null) =>
  limit === null ? `${used} / illimité` : `${used} / ${limit}`;

export default function HomeownerUsageGuardrailTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-homeowner-usage-guardrail"],
    staleTime: 30_000,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await (supabase.from("v_homeowner_usage_admin") as any)
        .select("*")
        .order("designs_today", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Gauge className="h-4 w-4 text-primary" />
          Utilisation raisonnable — aujourd'hui
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        ) : !data?.length ? (
          <p className="text-xs text-muted-foreground">Aucune consommation enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Utilisateur</th>
                  <th className="py-2 pr-3 font-medium">Forfait</th>
                  <th className="py-2 pr-3 font-medium">Analyses / jour</th>
                  <th className="py-2 pr-3 font-medium">Designs / jour</th>
                  <th className="py-2 pr-3 font-medium">Analyses / mois</th>
                  <th className="py-2 pr-3 font-medium">Designs / mois</th>
                  <th className="py-2 font-medium">Limite atteinte</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.user_id} className="border-t border-border/40">
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">
                      {r.user_id.slice(0, 8)}…
                    </td>
                    <td className="py-2 pr-3 text-xs text-foreground">{r.plan_code}</td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {r.analyses_today} / {r.analyses_daily_limit}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {r.designs_today} / {r.designs_daily_limit}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {fmtMonth(r.analyses_month, r.analyses_month_limit)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {fmtMonth(r.designs_month, r.designs_month_limit)}
                    </td>
                    <td className="py-2">
                      {r.analyses_daily_blocked || r.designs_daily_blocked ? (
                        <Badge variant="destructive" className="text-[10px]">Oui</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Non</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
