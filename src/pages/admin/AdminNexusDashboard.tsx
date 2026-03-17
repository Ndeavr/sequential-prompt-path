import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Fingerprint, Star, TrendingUp, RefreshCw, Shield, Award } from "lucide-react";
import { toast } from "sonner";

const AdminNexusDashboard = () => {
  const { data: profiles, refetch } = useQuery({
    queryKey: ["nexus-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("nexus_profiles")
        .select("*")
        .eq("is_active", true)
        .order("global_score", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const { data: levels } = useQuery({
    queryKey: ["nexus-levels"],
    queryFn: async () => {
      const { data } = await supabase
        .from("nexus_levels")
        .select("*")
        .order("min_score", { ascending: true });
      return data || [];
    },
  });

  const { data: recentEvents } = useQuery({
    queryKey: ["nexus-events-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("nexus_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const { data: recentSignals } = useQuery({
    queryKey: ["nexus-signals-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("nexus_signals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const contractorProfiles = profiles?.filter((p: any) => p.role === "contractor") || [];
  const homeownerProfiles = profiles?.filter((p: any) => p.role === "homeowner") || [];
  const avgContractorScore = contractorProfiles.length
    ? Math.round(contractorProfiles.reduce((s: number, p: any) => s + p.global_score, 0) / contractorProfiles.length)
    : 0;
  const avgHomeownerScore = homeownerProfiles.length
    ? Math.round(homeownerProfiles.reduce((s: number, p: any) => s + p.global_score, 0) / homeownerProfiles.length)
    : 0;

  const handleBatchRecalculate = async () => {
    toast.info("Recalcul de tous les scores Nexus…");
    await supabase.functions.invoke("nexus-scorer", {
      body: { action: "batch_recalculate" },
    });
    refetch();
    toast.success("Scores recalculés");
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      Bronze: "text-orange-400",
      Silver: "text-slate-400",
      Gold: "text-yellow-400",
      Elite: "text-indigo-400",
      Signature: "text-purple-400",
      Nouveau: "text-slate-500",
      Actif: "text-blue-400",
      Optimisé: "text-emerald-400",
      Premium: "text-purple-400",
    };
    return colors[level] || "text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Fingerprint className="h-8 w-8 text-primary" />
            Nexus Identity
          </h1>
          <p className="text-muted-foreground mt-1">Système de réputation & scoring global</p>
        </div>
        <Button onClick={handleBatchRecalculate} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Recalculer tout
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Profils Nexus</p>
                <p className="text-3xl font-bold text-foreground">{profiles?.length || 0}</p>
              </div>
              <Fingerprint className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Score moyen (Entrepreneurs)</p>
                <p className="text-3xl font-bold text-foreground">{avgContractorScore}</p>
              </div>
              <Shield className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Score moyen (Propriétaires)</p>
                <p className="text-3xl font-bold text-foreground">{avgHomeownerScore}</p>
              </div>
              <Star className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Signaux (30j)</p>
                <p className="text-3xl font-bold text-foreground">{recentSignals?.length || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contractors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contractors">Entrepreneurs</TabsTrigger>
          <TabsTrigger value="homeowners">Propriétaires</TabsTrigger>
          <TabsTrigger value="levels">Niveaux</TabsTrigger>
          <TabsTrigger value="events">Événements récents</TabsTrigger>
        </TabsList>

        <TabsContent value="contractors" className="space-y-3">
          {contractorProfiles.map((p: any) => (
            <Card key={p.id} className="bg-card border-border">
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Award className={`h-5 w-5 ${getLevelColor(p.level)}`} />
                    <span className={`font-semibold ${getLevelColor(p.level)}`}>{p.level}</span>
                  </div>
                  <Badge variant="outline">{p.global_score}/100</Badge>
                </div>
                <Progress value={p.global_score} className="h-2" />
                {p.breakdown_json && Object.keys(p.breakdown_json).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(p.breakdown_json).map(([key, val]: any) => (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {key}: {typeof val === 'number' ? val.toFixed(1) : val}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {!contractorProfiles.length && (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucun profil entrepreneur Nexus. Les scores se calculeront automatiquement.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="homeowners" className="space-y-3">
          {homeownerProfiles.map((p: any) => (
            <Card key={p.id} className="bg-card border-border">
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Star className={`h-5 w-5 ${getLevelColor(p.level)}`} />
                    <span className={`font-semibold ${getLevelColor(p.level)}`}>{p.level}</span>
                  </div>
                  <Badge variant="outline">{p.global_score}/100</Badge>
                </div>
                <Progress value={p.global_score} className="h-2" />
              </CardContent>
            </Card>
          ))}
          {!homeownerProfiles.length && (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucun profil propriétaire Nexus.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="levels" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" /> Entrepreneurs
              </h3>
              <div className="space-y-2">
                {levels?.filter((l: any) => l.role === "contractor").map((l: any) => (
                  <Card key={l.id} className="bg-card border-border">
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.badge_color }} />
                        <span className="font-medium text-foreground">{l.level_name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">≥ {l.min_score} pts</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Star className="h-4 w-4" /> Propriétaires
              </h3>
              <div className="space-y-2">
                {levels?.filter((l: any) => l.role === "homeowner").map((l: any) => (
                  <Card key={l.id} className="bg-card border-border">
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.badge_color }} />
                        <span className="font-medium text-foreground">{l.level_name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">≥ {l.min_score} pts</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-3">
          {recentEvents?.map((e: any) => (
            <Card key={e.id} className="bg-card border-border">
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{e.event_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("fr-CA")}
                  </p>
                </div>
                <Badge variant={e.delta_score > 0 ? "default" : "destructive"}>
                  {e.delta_score > 0 ? "+" : ""}{e.delta_score}
                </Badge>
              </CardContent>
            </Card>
          ))}
          {!recentEvents?.length && (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucun événement récent
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminNexusDashboard;
