import { useState, lazy, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/layouts/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Network, FileText, Zap, AlertTriangle, Copy, Loader2,
  Bug, TrendingUp, Globe, Brain, HelpCircle, Tag, MapPin, BookOpen,
  Rocket, Upload,
} from "lucide-react";
import {
  fetchGraphStats, fetchGraphProblems, fetchBlueprints,
  fetchQuickWins, fetchQualityIssues, updateBlueprintStatus,
  generateGraphPrompt,
  type GraphStats, type GraphProblem, type GraphBlueprint,
} from "@/services/homeGraphService";

const MassiveBlueprintPanel = lazy(() => import("@/components/homeGraph/MassiveBlueprintPanel"));
const JsonImportPipeline = lazy(() => import("@/components/homeGraph/JsonImportPipeline"));
import {
  fetchGraphStats, fetchGraphProblems, fetchBlueprints,
  fetchQuickWins, fetchQualityIssues, updateBlueprintStatus,
  generateGraphPrompt,
  type GraphStats, type GraphProblem, type GraphBlueprint,
} from "@/services/homeGraphService";

// ─── Stats Cards ─────────────────────────────────────────────────

const statItems = [
  { key: "problems", label: "Problèmes", icon: Bug, color: "text-destructive" },
  { key: "symptoms", label: "Symptômes", icon: AlertTriangle, color: "text-amber-500" },
  { key: "causes", label: "Causes", icon: Brain, color: "text-orange-500" },
  { key: "solutions", label: "Solutions", icon: Zap, color: "text-emerald-500" },
  { key: "professions", label: "Professions", icon: Globe, color: "text-blue-500" },
  { key: "valueTags", label: "Tags", icon: Tag, color: "text-purple-500" },
  { key: "geoAreas", label: "Zones géo", icon: MapPin, color: "text-primary" },
  { key: "questions", label: "FAQ", icon: HelpCircle, color: "text-cyan-500" },
  { key: "blueprints", label: "Blueprints", icon: FileText, color: "text-primary" },
  { key: "blueprintsPublished", label: "Publiés", icon: BookOpen, color: "text-emerald-500" },
  { key: "blueprintsPending", label: "En attente", icon: FileText, color: "text-amber-500" },
  { key: "blueprintsQueued", label: "En queue", icon: Zap, color: "text-blue-500" },
] as const;

function StatsGrid({ stats }: { stats: GraphStats | undefined }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {statItems.map(({ key, label, icon: Icon, color }) => (
        <Card key={key} className="border-border/40">
          <CardContent className="p-3 flex items-center gap-2">
            <Icon className={`h-4 w-4 shrink-0 ${color}`} />
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none">{stats?.[key] ?? "—"}</p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Blueprint Status Badge ─────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    queued: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    generated: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    skipped: "bg-muted text-muted-foreground border-border",
    archived: "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={`text-[10px] ${colors[status] ?? ""}`}>{status}</Badge>;
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    problem_city: "bg-destructive/10 text-destructive border-destructive/20",
    solution_city: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    profession_city: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    faq_city: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    cluster_hub: "bg-primary/10 text-primary border-primary/20",
  };
  return <Badge variant="outline" className={`text-[10px] ${colors[type] ?? ""}`}>{type.replace(/_/g, " ")}</Badge>;
}

// ─── Main Page ───────────────────────────────────────────────────

export default function AdminHomeGraph() {
  const qc = useQueryClient();
  const [bpStatus, setBpStatus] = useState("all");
  const [bpType, setBpType] = useState("all");

  const { data: stats } = useQuery<GraphStats>({
    queryKey: ["graph-stats"],
    queryFn: fetchGraphStats,
    staleTime: 30_000,
  });

  const { data: problems = [], isLoading: loadingProblems } = useQuery<GraphProblem[]>({
    queryKey: ["graph-problems"],
    queryFn: () => fetchGraphProblems(200),
    staleTime: 30_000,
  });

  const { data: blueprints = [], isLoading: loadingBP } = useQuery<GraphBlueprint[]>({
    queryKey: ["graph-blueprints", bpStatus, bpType],
    queryFn: () => fetchBlueprints(200, bpStatus, bpType),
    staleTime: 15_000,
  });

  const { data: quickWins = [] } = useQuery<GraphBlueprint[]>({
    queryKey: ["graph-quick-wins"],
    queryFn: () => fetchQuickWins(20),
    staleTime: 30_000,
  });

  const { data: quality } = useQuery({
    queryKey: ["graph-quality"],
    queryFn: fetchQualityIssues,
    staleTime: 60_000,
  });

  const handleQueue = async (id: string) => {
    try {
      await updateBlueprintStatus(id, "queued");
      qc.invalidateQueries({ queryKey: ["graph-blueprints"] });
      qc.invalidateQueries({ queryKey: ["graph-quick-wins"] });
      toast.success("Blueprint ajouté à la queue");
    } catch { toast.error("Erreur"); }
  };

  const copyPrompt = (type: "problems" | "causes" | "solutions" | "faq") => {
    navigator.clipboard.writeText(generateGraphPrompt(type));
    toast.success("Prompt copié !");
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            Home Problem Graph
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Graphe de connaissance · Blueprints SEO · Quick Wins · Qualité
          </p>
        </div>

        <StatsGrid stats={stats} />

        <Tabs defaultValue="explorer" className="w-full">
          <TabsList className="w-full grid grid-cols-5 h-9 rounded-xl">
            <TabsTrigger value="explorer" className="text-xs gap-1 rounded-lg">
              <Network className="h-3.5 w-3.5" /><span className="hidden sm:inline">Graphe</span>
            </TabsTrigger>
            <TabsTrigger value="blueprints" className="text-xs gap-1 rounded-lg">
              <FileText className="h-3.5 w-3.5" /><span className="hidden sm:inline">Blueprints</span>
            </TabsTrigger>
            <TabsTrigger value="quickwins" className="text-xs gap-1 rounded-lg">
              <Zap className="h-3.5 w-3.5" /><span className="hidden sm:inline">Quick Wins</span>
            </TabsTrigger>
            <TabsTrigger value="quality" className="text-xs gap-1 rounded-lg">
              <AlertTriangle className="h-3.5 w-3.5" /><span className="hidden sm:inline">Qualité</span>
            </TabsTrigger>
            <TabsTrigger value="prompts" className="text-xs gap-1 rounded-lg">
              <Copy className="h-3.5 w-3.5" /><span className="hidden sm:inline">Prompts</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Explorer ── */}
          <TabsContent value="explorer" className="mt-4">
            {loadingProblems ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">Problème</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Sévérité</TableHead>
                      <TableHead className="text-xs text-center hidden md:table-cell">Demande</TableHead>
                      <TableHead className="text-xs text-center hidden md:table-cell">Rentab.</TableHead>
                      <TableHead className="text-xs text-center hidden lg:table-cell">SEO</TableHead>
                      <TableHead className="text-xs text-center">Priorité</TableHead>
                      <TableHead className="text-xs text-center hidden sm:table-cell">Actif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {problems.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="p-2">
                          <p className="text-sm font-medium leading-tight">{p.name_fr}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{p.slug}</p>
                        </TableCell>
                        <TableCell className="p-2 hidden sm:table-cell">
                          <Badge variant="outline" className={`text-[10px] ${
                            p.severity_level === "critical" ? "text-destructive border-destructive/20" :
                            p.severity_level === "high" ? "text-orange-500 border-orange-500/20" :
                            p.severity_level === "medium" ? "text-amber-500 border-amber-500/20" :
                            "text-muted-foreground border-border"
                          }`}>{p.severity_level ?? "—"}</Badge>
                        </TableCell>
                        <TableCell className="p-2 text-center hidden md:table-cell text-xs font-mono">{p.demand_score ?? 0}</TableCell>
                        <TableCell className="p-2 text-center hidden md:table-cell text-xs font-mono">{p.profitability_score ?? 0}</TableCell>
                        <TableCell className="p-2 text-center hidden lg:table-cell text-xs font-mono">{p.seo_priority_score ?? 0}</TableCell>
                        <TableCell className="p-2 text-center">
                          <span className={`text-sm font-bold ${
                            (p.total_priority_score ?? 0) >= 70 ? "text-emerald-500" :
                            (p.total_priority_score ?? 0) >= 40 ? "text-amber-500" : "text-muted-foreground"
                          }`}>{p.total_priority_score ?? 0}</span>
                        </TableCell>
                        <TableCell className="p-2 text-center hidden sm:table-cell">
                          <span className={`text-xs ${p.is_active ? "text-emerald-500" : "text-muted-foreground"}`}>
                            {p.is_active ? "✓" : "—"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {problems.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">Aucun problème. Lancez le seed pour initialiser.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ── Blueprints ── */}
          <TabsContent value="blueprints" className="mt-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Select value={bpStatus} onValueChange={setBpStatus}>
                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
              <Select value={bpType} onValueChange={setBpType}>
                <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  <SelectItem value="problem_city">Problem × City</SelectItem>
                  <SelectItem value="solution_city">Solution × City</SelectItem>
                  <SelectItem value="profession_city">Profession × City</SelectItem>
                  <SelectItem value="faq_city">FAQ × City</SelectItem>
                  <SelectItem value="cluster_hub">Cluster Hub</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loadingBP ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">Slug</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Type</TableHead>
                      <TableHead className="text-xs text-center">Priorité</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Statut</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blueprints.map(bp => (
                      <TableRow key={bp.id}>
                        <TableCell className="p-2">
                          <p className="text-sm font-medium leading-tight truncate max-w-[200px]">{bp.title_fr ?? bp.canonical_slug}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">{bp.canonical_slug}</p>
                        </TableCell>
                        <TableCell className="p-2 hidden sm:table-cell"><TypeBadge type={bp.blueprint_type} /></TableCell>
                        <TableCell className="p-2 text-center">
                          <span className="text-sm font-bold font-mono">{bp.priority_score}</span>
                        </TableCell>
                        <TableCell className="p-2 hidden md:table-cell"><StatusBadge status={bp.generation_status} /></TableCell>
                        <TableCell className="p-2 text-right">
                          {bp.generation_status === "pending" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleQueue(bp.id)}>
                              Queue
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {blueprints.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">Aucun blueprint</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ── Quick Wins ── */}
          <TabsContent value="quickwins" className="mt-4">
            <div className="space-y-2">
              {quickWins.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Aucun quick win disponible</p>
              ) : quickWins.map(qw => (
                <Card key={qw.id} className="border-border/40">
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{qw.title_fr ?? qw.canonical_slug}</p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{qw.canonical_slug}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-emerald-500">{qw.priority_score}</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleQueue(qw.id)}>
                        <Zap className="h-3 w-3 mr-1" /> Queue
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Quality ── */}
          <TabsContent value="quality" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Problèmes sans solution", value: quality?.problemsWithoutSolutions ?? 0, color: "text-destructive" },
                { label: "Solutions sans profession", value: quality?.solutionsWithoutProfessions ?? 0, color: "text-orange-500" },
                { label: "Problèmes sans zone géo", value: quality?.problemsWithoutGeo ?? 0, color: "text-amber-500" },
                { label: "Blueprints dupliqués", value: quality?.duplicateBlueprints ?? 0, color: "text-muted-foreground" },
              ].map(item => (
                <Card key={item.label} className="border-border/40">
                  <CardContent className="p-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Prompt Export ── */}
          <TabsContent value="prompts" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { type: "problems" as const, label: "Problèmes maison", desc: "Générer 25 problèmes avec scores" },
                { type: "causes" as const, label: "Causes", desc: "Générer 30 causes liées aux problèmes" },
                { type: "solutions" as const, label: "Solutions", desc: "Générer 30 solutions avec coûts" },
                { type: "faq" as const, label: "FAQ propriétaires", desc: "Générer 25 questions/réponses" },
              ].map(p => (
                <Card key={p.type} className="border-border/40">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm">{p.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-xs text-muted-foreground mb-3">{p.desc}</p>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => copyPrompt(p.type)}>
                      <Copy className="h-3 w-3 mr-1" /> Copier prompt ChatGPT
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
