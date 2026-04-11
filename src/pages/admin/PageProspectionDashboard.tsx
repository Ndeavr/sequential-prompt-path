/**
 * UNPRO — Autonomous Prospection Engine Dashboard
 * Launch jobs, monitor agents, explore leads, track quality.
 */
import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, StatCard, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Rocket, Plus, Search, Users, Target, Zap, Activity,
  Globe, Phone, Mail, Star, ExternalLink, Play, Clock,
  CheckCircle2, AlertTriangle, Database, Filter, ArrowUpDown,
  Eye, TrendingUp, MapPin, Building2, BarChart3, Bot,
  Power, PowerOff, RefreshCw, Trash2,
} from "lucide-react";

const CATEGORIES = [
  "toiture", "isolation", "pavage", "plomberie", "électricité",
  "rénovation", "paysagement", "fenêtres", "chauffage",
  "climatisation", "peinture", "menuiserie", "excavation", "maçonnerie",
];

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  HIGH: { bg: "bg-red-500/15", text: "text-red-400", label: "🔴 HIGH" },
  MEDIUM: { bg: "bg-amber-500/15", text: "text-amber-400", label: "🟡 MEDIUM" },
  LOW: { bg: "bg-muted/40", text: "text-muted-foreground", label: "⚪ LOW" },
};

const JOB_STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted/50 text-muted-foreground",
  running: "bg-emerald-500/15 text-emerald-400",
  completed: "bg-green-500/15 text-green-400",
  failed: "bg-red-500/15 text-red-400",
};

/* ─── Hooks ─── */
const useProspectionStats = () =>
  useQuery({
    queryKey: ["prospection-engine-stats"],
    queryFn: async () => {
      const [jobsRes, leadsRes, queriesRes, rawRes] = await Promise.all([
        supabase.from("prospection_jobs").select("job_status, leads_generated_count"),
        supabase.from("contractor_leads").select("priority_level, priority_score, source_type").eq("source_type", "prospection_engine"),
        supabase.from("prospection_queries").select("id"),
        supabase.from("prospection_results_raw").select("id"),
      ]);
      const jobs = jobsRes.data ?? [];
      const leads = leadsRes.data ?? [];
      return {
        totalJobs: jobs.length,
        activeJobs: jobs.filter((j: any) => j.job_status === "running").length,
        totalLeads: leads.length,
        highLeads: leads.filter((l: any) => l.priority_level === "HIGH").length,
        mediumLeads: leads.filter((l: any) => l.priority_level === "MEDIUM").length,
        lowLeads: leads.filter((l: any) => l.priority_level === "LOW").length,
        avgScore: leads.length > 0
          ? Math.round(leads.reduce((s: number, l: any) => s + (Number(l.priority_score) || 0), 0) / leads.length)
          : 0,
        totalQueries: queriesRes.data?.length ?? 0,
        totalRawResults: rawRes.data?.length ?? 0,
        leadsGenerated: jobs.reduce((s: number, j: any) => s + (j.leads_generated_count || 0), 0),
      };
    },
  });

const useProspectionJobs = () =>
  useQuery({
    queryKey: ["prospection-engine-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospection_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

const useProspectionLeads = (filter: string) =>
  useQuery({
    queryKey: ["prospection-engine-leads", filter],
    queryFn: async () => {
      let q = supabase
        .from("contractor_leads")
        .select("id, company_name, phone, email, website_url, city, category_primary, priority_score, priority_level, source_type, created_at")
        .eq("source_type", "prospection_engine")
        .order("priority_score", { ascending: false })
        .limit(100);
      if (filter && filter !== "all") {
        q = q.eq("priority_level", filter);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

const useAgentRules = () =>
  useQuery({
    queryKey: ["prospection-agent-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospection_agent_rules")
        .select("*")
        .order("priority", { ascending: true });
      if (error) throw error;
      return data;
    },
  });


const PageProspectionDashboard = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useProspectionStats();
  const { data: jobs } = useProspectionJobs();
  const { data: agentRules } = useAgentRules();
  const [priorityFilter, setPriorityFilter] = useState("all");
  const { data: leads, isLoading: leadsLoading } = useProspectionLeads(priorityFilter);

  // Agent trigger
  const triggerAgentMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fn-prospection-agent");
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Agent exécuté — ${data?.results?.length ?? 0} règles traitées`);
      queryClient.invalidateQueries({ queryKey: ["prospection-agent-rules"] });
      queryClient.invalidateQueries({ queryKey: ["prospection-engine-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["prospection-engine-stats"] });
    },
    onError: (e) => toast.error("Erreur agent: " + e.message),
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("prospection_agent_rules")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospection-agent-rules"] });
      toast.success("Règle mise à jour");
    },
  });

  // Job creation state
  const [showCreate, setShowCreate] = useState(false);
  const [newJob, setNewJob] = useState({ name: "", category: "", cities: "", radius: 25 });

  const createJobMutation = useMutation({
    mutationFn: async () => {
      const cities = newJob.cities.split(",").map((c) => c.trim()).filter(Boolean);
      // 1. Create job
      const { data: job, error } = await supabase
        .from("prospection_jobs")
        .insert({
          job_name: newJob.name || `${newJob.category} — ${cities.join(", ")}`,
          target_category: newJob.category,
          target_cities_json: cities,
          radius_km: newJob.radius,
          languages_json: ["fr", "en"],
          job_status: "pending",
          created_by_user_id: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      // 2. Call edge function to start
      const { error: fnErr } = await supabase.functions.invoke("fn-start-prospection-job", {
        body: { job_id: job.id },
      });
      if (fnErr) throw fnErr;
      return job;
    },
    onSuccess: () => {
      toast.success("Job de prospection lancé !");
      queryClient.invalidateQueries({ queryKey: ["prospection-engine-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["prospection-engine-stats"] });
      setShowCreate(false);
      setNewJob({ name: "", category: "", cities: "", radius: 25 });
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });

  if (statsLoading) return <AdminLayout><LoadingState /></AdminLayout>;

  return (
    <AdminLayout>
      <PageHeader
        title="Moteur de Prospection Autonome"
        description="Trouvez, enrichissez et scorez des entrepreneurs à grande échelle"
        badge="ENGINE"
        action={
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Nouveau job</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-primary" />
                  Lancer une prospection
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Nom du job (optionnel)</Label>
                  <Input
                    placeholder="Ex: Couvreurs Rive-Sud Q2"
                    value={newJob.name}
                    onChange={(e) => setNewJob((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Catégorie métier</Label>
                  <Select value={newJob.category} onValueChange={(v) => setNewJob((p) => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un métier" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Villes (séparées par virgule)</Label>
                  <Input
                    placeholder="Laval, Terrebonne, Mascouche"
                    value={newJob.cities}
                    onChange={(e) => setNewJob((p) => ({ ...p, cities: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Rayon (km)</Label>
                  <Input
                    type="number"
                    value={newJob.radius}
                    onChange={(e) => setNewJob((p) => ({ ...p, radius: parseInt(e.target.value) || 25 }))}
                  />
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={() => createJobMutation.mutate()}
                  disabled={!newJob.category || !newJob.cities || createJobMutation.isPending}
                >
                  <Rocket className="h-4 w-4" />
                  {createJobMutation.isPending ? "Lancement..." : "Lancer la prospection"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
        <StatCard title="Leads générés" value={stats?.totalLeads ?? 0} icon={<Users className="h-4 w-4" />} />
        <StatCard title="🔴 HIGH" value={stats?.highLeads ?? 0} icon={<Target className="h-4 w-4" />} description="Action immédiate" />
        <StatCard title="🟡 MEDIUM" value={stats?.mediumLeads ?? 0} icon={<Mail className="h-4 w-4" />} description="Nurture" />
        <StatCard title="Score moyen" value={stats?.avgScore ?? 0} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="Jobs actifs" value={stats?.activeJobs ?? 0} icon={<Activity className="h-4 w-4" />} description={`${stats?.totalJobs ?? 0} total`} />
      </div>

      {/* ── Pipeline Visual ── */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Requêtes générées", value: stats?.totalQueries ?? 0, icon: Search },
          { label: "Résultats scrapés", value: stats?.totalRawResults ?? 0, icon: Database },
          { label: "Leads extraits", value: stats?.leadsGenerated ?? 0, icon: CheckCircle2 },
        ].map((s) => (
          <Card key={s.label} className="border-border/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold font-display">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads" className="gap-1.5"><Users className="h-3.5 w-3.5" />Leads</TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Jobs</TabsTrigger>
          <TabsTrigger value="agent" className="gap-1.5"><Bot className="h-3.5 w-3.5" />Agent</TabsTrigger>
        </TabsList>

        {/* ── Leads Tab ── */}
        <TabsContent value="leads" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {["all", "HIGH", "MEDIUM", "LOW"].map((f) => (
              <Button
                key={f}
                variant={priorityFilter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setPriorityFilter(f)}
                className="text-xs"
              >
                {f === "all" ? "Tous" : PRIORITY_STYLES[f]?.label ?? f}
              </Button>
            ))}
          </div>

          {/* Leads Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Entreprise</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Ville</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Catégorie</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Score</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Priorité</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {(leads ?? []).map((lead: any) => {
                    const pStyle = PRIORITY_STYLES[lead.priority_level] ?? PRIORITY_STYLES.LOW;
                    return (
                      <tr key={lead.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="font-medium truncate max-w-[200px]">{lead.company_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(lead.created_at).toLocaleDateString("fr-CA")}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground hidden sm:table-cell">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{lead.city || "—"}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">{lead.category_primary || "—"}</td>
                        <td className="p-3 text-center">
                          <span className="font-mono font-bold">{Math.round(lead.priority_score ?? 0)}</span>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={`text-xs ${pStyle.bg} ${pStyle.text} border-0`}>
                            {pStyle.label}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`}>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Phone className="h-3.5 w-3.5" /></Button>
                              </a>
                            )}
                            {lead.email && (
                              <a href={`mailto:${lead.email}`}>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Mail className="h-3.5 w-3.5" /></Button>
                              </a>
                            )}
                            {lead.website_url && (
                              <a href={lead.website_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Globe className="h-3.5 w-3.5" /></Button>
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {(!leads || leads.length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        {leadsLoading ? "Chargement..." : "Aucun lead. Lancez un job pour commencer."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Jobs Tab ── */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Jobs de prospection
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Job</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Catégorie</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Villes</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Leads</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Statut</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(jobs ?? []).map((job: any) => (
                    <tr key={job.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="font-medium truncate max-w-[200px]">{job.job_name}</div>
                      </td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell">{job.target_category}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">
                        <span className="truncate max-w-[150px] inline-block">
                          {Array.isArray(job.target_cities_json) ? job.target_cities_json.join(", ") : "—"}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold">{job.leads_generated_count ?? 0}</td>
                      <td className="p-3 text-center">
                        <Badge className={`text-xs border-0 ${JOB_STATUS_STYLES[job.job_status] ?? JOB_STATUS_STYLES.pending}`}>
                          {job.job_status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right text-muted-foreground text-xs">
                        {new Date(job.created_at).toLocaleDateString("fr-CA")}
                      </td>
                    </tr>
                  ))}
                  {(!jobs || jobs.length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        Aucun job de prospection lancé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default PageProspectionDashboard;
