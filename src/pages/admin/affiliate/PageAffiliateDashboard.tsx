/**
 * UNPRO — Admin Affiliate Dashboard
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CardAffiliatePerformance from "@/components/affiliate/CardAffiliatePerformance";
import WidgetAffiliateLeaderboard from "@/components/affiliate/WidgetAffiliateLeaderboard";
import TableAttributionEvents from "@/components/affiliate/TableAttributionEvents";
import { Users, TrendingUp, DollarSign } from "lucide-react";

const PageAffiliateDashboard = () => {
  const { data: affiliates, isLoading } = useQuery({
    queryKey: ["admin-affiliates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliates" as any)
        .select("*")
        .order("total_conversions", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: attributions } = useQuery({
    queryKey: ["admin-attributions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_attributions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as any[];
    },
  });

  const totalClicks = affiliates?.reduce((s: number, a: any) => s + (a.total_clicks || 0), 0) || 0;
  const totalConversions = affiliates?.reduce((s: number, a: any) => s + (a.total_conversions || 0), 0) || 0;
  const totalRevenue = affiliates?.reduce((s: number, a: any) => s + (a.total_revenue_cents || 0), 0) || 0;
  const convRate = totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 100) : 0;

  const rankings = (affiliates || []).map((a: any) => ({
    name: a.name,
    conversions: a.total_conversions || 0,
    revenueCents: a.total_revenue_cents || 0,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Programme Affiliés</h1>
              <p className="text-sm text-muted-foreground">Suivi des performances et attributions</p>
            </div>
          </div>
        </div>

        {/* Global stats */}
        <CardAffiliatePerformance
          totalClicks={totalClicks}
          totalConversions={totalConversions}
          totalRevenueCents={totalRevenue}
          conversionRate={convRate}
        />

        {/* Leaderboard */}
        <div className="rounded-xl border border-border/30 bg-card p-5">
          <WidgetAffiliateLeaderboard rankings={rankings} />
        </div>

        {/* Recent attributions */}
        <div className="rounded-xl border border-border/30 bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Attributions récentes</h2>
          <TableAttributionEvents events={attributions || []} />
        </div>
      </div>
    </div>
  );
};

export default PageAffiliateDashboard;
