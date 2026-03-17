import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, DollarSign, Users, Zap, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { toast } from "sonner";

const AdminMarketEngine = () => {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const { data: opportunities } = useQuery({
    queryKey: ["market-opportunities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("market_opportunities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: pricing } = useQuery({
    queryKey: ["dynamic-pricing"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dynamic_pricing")
        .select("*")
        .eq("is_active", true)
        .order("final_price_cents", { ascending: false });
      return data || [];
    },
  });

  const { data: allocations } = useQuery({
    queryKey: ["opportunity-allocations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("opportunity_allocations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: budgets } = useQuery({
    queryKey: ["contractor-budgets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contractor_budgets")
        .select("*")
        .order("remaining_budget_cents", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const openOpps = opportunities?.filter((o: any) => o.status === "open").length || 0;
  const allocatedOpps = opportunities?.filter((o: any) => o.status === "allocated").length || 0;
  const avgPrice = pricing?.length
    ? Math.round(pricing.reduce((s: number, p: any) => s + p.final_price_cents, 0) / pricing.length)
    : 0;
  const totalBudget = budgets?.reduce((s: number, b: any) => s + (b.remaining_budget_cents || 0), 0) || 0;

  const handleRefreshPricing = async () => {
    toast.info("Recalcul du pricing en cours…");
    // Trigger pricing refresh for top cities
    const cities = [...new Set(pricing?.map((p: any) => p.city) || [])];
    for (const city of cities.slice(0, 5)) {
      await supabase.functions.invoke("market-allocator", {
        body: { action: "update_pricing", city, problem_type: "general" },
      });
    }
    toast.success("Pricing mis à jour");
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Market Engine
          </h1>
          <p className="text-muted-foreground mt-1">Allocation dynamique & pricing en temps réel</p>
        </div>
        <Button onClick={handleRefreshPricing} variant="outline">
          <Zap className="h-4 w-4 mr-2" />
          Rafraîchir pricing
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Opportunités ouvertes</p>
                <p className="text-3xl font-bold text-foreground">{openOpps}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Allouées</p>
                <p className="text-3xl font-bold text-foreground">{allocatedOpps}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prix moyen</p>
                <p className="text-3xl font-bold text-foreground">${(avgPrice / 100).toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Budget total actif</p>
                <p className="text-3xl font-bold text-foreground">${(totalBudget / 100).toFixed(0)}</p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pricing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pricing">Pricing dynamique</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunités</TabsTrigger>
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pricing?.map((p: any) => (
              <Card key={p.id} className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span>{p.city} — {p.problem_type}</span>
                    <Badge variant={p.demand_multiplier > 1.3 ? "destructive" : "secondary"}>
                      {p.demand_multiplier > 1.3 ? "🔥 Haute demande" : "Normal"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prix final</span>
                    <span className="font-bold text-foreground">${(p.final_price_cents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Demande</span>
                    <span className="flex items-center gap-1">
                      {p.demand_multiplier > 1 ? <ArrowUpRight className="h-3 w-3 text-red-500" /> : <ArrowDownRight className="h-3 w-3 text-green-500" />}
                      ×{p.demand_multiplier?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Offre</span>
                    <span className="flex items-center gap-1">
                      {p.supply_multiplier < 1 ? <ArrowDownRight className="h-3 w-3 text-red-500" /> : <ArrowUpRight className="h-3 w-3 text-green-500" />}
                      ×{p.supply_multiplier?.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!pricing?.length && (
              <Card className="col-span-full bg-card border-border">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Aucune règle de pricing active. Le système se calibrera automatiquement.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          <div className="space-y-3">
            {opportunities?.map((o: any) => (
              <Card key={o.id} className="bg-card border-border">
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{o.problem_type} — {o.city}</p>
                    <p className="text-sm text-muted-foreground">
                      Valeur: ${((o.estimated_value_cents || 0) / 100).toFixed(0)} • Urgence: {o.urgency}
                    </p>
                  </div>
                  <Badge variant={o.status === "open" ? "default" : o.status === "allocated" ? "secondary" : "outline"}>
                    {o.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
            {!opportunities?.length && (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Aucune opportunité en cours
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="allocations" className="space-y-4">
          <div className="space-y-3">
            {allocations?.map((a: any) => (
              <Card key={a.id} className="bg-card border-border">
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Score: {a.allocation_score?.toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground">
                      Mode: {a.allocation_mode} • Prix: ${((a.price_charged_cents || 0) / 100).toFixed(2)}
                    </p>
                  </div>
                  <Badge variant={a.status === "allocated" ? "default" : "outline"}>
                    {a.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets?.map((b: any) => (
              <Card key={b.id} className="bg-card border-border">
                <CardContent className="py-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-medium text-foreground">Entrepreneur</p>
                    {b.boost_active && <Badge className="bg-purple-600">⚡ Boost</Badge>}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Budget mensuel</span>
                    <span>${((b.monthly_budget_cents || 0) / 100).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Restant</span>
                    <span className="font-bold">${((b.remaining_budget_cents || 0) / 100).toFixed(0)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminMarketEngine;
