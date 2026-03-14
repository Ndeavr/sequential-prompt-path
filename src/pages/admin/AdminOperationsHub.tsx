/**
 * UNPRO — Admin Operations Hub
 * Unified operational review page for claims, verifications, contributions,
 * certifications, agent monitoring, and observability.
 */
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldCheck, Home, Wrench, Award, BarChart3, Eye,
  FileCheck, AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";

function useOperationsData() {
  return useQuery({
    queryKey: ["admin-operations"],
    queryFn: async () => {
      const [
        claimsRes, verificationsRes, contributionsRes,
        certificationsRes, eventsRes, agentJobsRes,
      ] = await Promise.all([
        supabase.from("properties").select("id, address, city, claim_status, claimed_by, claimed_at").in("claim_status", ["claim_pending"]).order("claimed_at", { ascending: false }).limit(50),
        supabase.from("contractors").select("id, business_name, city, verification_status, created_at").in("verification_status", ["pending", "unverified"]).order("created_at", { ascending: false }).limit(50),
        supabase.from("contractor_contributions").select("id, work_type, work_description, status, property_id, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(50),
        supabase.from("certification_reviews").select("id, property_id, certification_status, passport_completion_pct, created_at").in("certification_status", ["in_review", "eligible"]).order("created_at", { ascending: false }).limit(50),
        supabase.from("platform_events").select("event_type, event_category, created_at, metadata").order("created_at", { ascending: false }).limit(100),
        supabase.from("agent_tasks").select("id, task_title, agent_name, status, urgency, impact_score, proposed_at").in("status", ["proposed", "approved"]).order("impact_score", { ascending: false }).limit(50),
      ]);

      return {
        claims: claimsRes.data ?? [],
        verifications: verificationsRes.data ?? [],
        contributions: contributionsRes.data ?? [],
        certifications: certificationsRes.data ?? [],
        events: eventsRes.data ?? [],
        agentJobs: agentJobsRes.data ?? [],
      };
    },
    staleTime: 30_000,
  });
}

function useEventAnalytics() {
  return useQuery({
    queryKey: ["admin-event-analytics"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase
        .from("platform_events")
        .select("event_type, event_category")
        .gte("created_at", since);

      const counts: Record<string, number> = {};
      (data || []).forEach(e => {
        counts[e.event_type] = (counts[e.event_type] || 0) + 1;
      });

      return counts;
    },
    staleTime: 60_000,
  });
}

const AdminOperationsHub = () => {
  const { data, isLoading } = useOperationsData();
  const { data: analytics } = useEventAnalytics();

  if (isLoading) return <AdminLayout><LoadingState /></AdminLayout>;

  const urgencyColor = (u: string) => {
    switch (u) {
      case "critical": return "destructive";
      case "high": return "default";
      default: return "secondary";
    }
  };

  return (
    <AdminLayout>
      <PageHeader title="Centre d'opérations" description="Suivi opérationnel et observabilité" />

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Home className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{data?.claims.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Réclamations</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{data?.verifications.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Vérifications</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Wrench className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{data?.contributions.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Contributions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{data?.certifications.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Certifications</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="claims" className="w-full">
        <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 h-9 rounded-xl">
          <TabsTrigger value="claims" className="text-xs">Réclamations</TabsTrigger>
          <TabsTrigger value="verifications" className="text-xs">Vérifications</TabsTrigger>
          <TabsTrigger value="contributions" className="text-xs">Contributions</TabsTrigger>
          <TabsTrigger value="certifications" className="text-xs">Certifications</TabsTrigger>
          <TabsTrigger value="agents" className="text-xs">Agents</TabsTrigger>
          <TabsTrigger value="events" className="text-xs">Événements</TabsTrigger>
        </TabsList>

        {/* Claims */}
        <TabsContent value="claims" className="mt-4 space-y-2">
          {data?.claims.length === 0 && <p className="text-sm text-muted-foreground">Aucune réclamation en attente.</p>}
          {data?.claims.map((c: any) => (
            <Card key={c.id} className="border-border/40">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.address}</p>
                  <p className="text-xs text-muted-foreground">{c.city} · {new Date(c.claimed_at).toLocaleDateString("fr-CA")}</p>
                </div>
                <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Verifications */}
        <TabsContent value="verifications" className="mt-4 space-y-2">
          {data?.verifications.length === 0 && <p className="text-sm text-muted-foreground">Aucune vérification en attente.</p>}
          {data?.verifications.map((v: any) => (
            <Card key={v.id} className="border-border/40">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{v.business_name}</p>
                  <p className="text-xs text-muted-foreground">{v.city}</p>
                </div>
                <Badge variant="outline">{v.verification_status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Contributions */}
        <TabsContent value="contributions" className="mt-4 space-y-2">
          {data?.contributions.length === 0 && <p className="text-sm text-muted-foreground">Aucune contribution en attente.</p>}
          {data?.contributions.map((c: any) => (
            <Card key={c.id} className="border-border/40">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.work_type}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.work_description}</p>
                </div>
                <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Pending</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Certifications */}
        <TabsContent value="certifications" className="mt-4 space-y-2">
          {data?.certifications.length === 0 && <p className="text-sm text-muted-foreground">Aucune certification en attente.</p>}
          {data?.certifications.map((c: any) => (
            <Card key={c.id} className="border-border/40">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Propriété {c.property_id?.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">Complétion: {c.passport_completion_pct}%</p>
                </div>
                <Badge variant={c.certification_status === "in_review" ? "default" : "outline"}>
                  {c.certification_status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Agent Jobs */}
        <TabsContent value="agents" className="mt-4 space-y-2">
          {data?.agentJobs.length === 0 && <p className="text-sm text-muted-foreground">Aucun job agent en cours.</p>}
          {data?.agentJobs.map((j: any) => (
            <Card key={j.id} className="border-border/40">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{j.task_title}</p>
                  <p className="text-xs text-muted-foreground">{j.agent_name} · Impact: {j.impact_score}</p>
                </div>
                <div className="flex gap-1">
                  <Badge variant={urgencyColor(j.urgency) as any}>{j.urgency}</Badge>
                  <Badge variant="outline">{j.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Events / Observability */}
        <TabsContent value="events" className="mt-4 space-y-4">
          {/* Analytics summary */}
          {analytics && Object.keys(analytics).length > 0 && (
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Événements — 7 derniers jours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(analytics)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 12)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                        <span className="text-muted-foreground truncate">{type.replace(/_/g, " ")}</span>
                        <span className="font-medium text-foreground ml-2">{count}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent events */}
          <div className="space-y-1">
            {data?.events.slice(0, 20).map((e: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-xs py-1.5 border-b border-border/20">
                <span className="text-muted-foreground w-14 shrink-0">
                  {new Date(e.created_at).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5">{e.event_category}</Badge>
                <span className="text-foreground truncate">{e.event_type.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminOperationsHub;
