import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { 
  ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, AlertTriangle, 
  Rocket, Play, SkipForward, Eye, ArrowRight, Zap, Target, Shield,
  BarChart3, Layers, Bot, Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RoadmapModule {
  id: string;
  module_slug: string;
  module_name: string;
  phase_slug: string;
  phase_order: number;
  module_order: number;
  module_description: string;
  build_status: string;
  dependency_status: string;
  implementation_confidence: string;
  is_required: boolean;
  approval_required: boolean;
}

interface RoadmapDependency {
  id: string;
  module_slug: string;
  depends_on_module_slug: string;
  dependency_type: string;
}

const PHASE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  foundation: { label: "Phase 1 — Foundation", icon: Shield, color: "text-emerald-400" },
  activation: { label: "Phase 2 — Activation", icon: Zap, color: "text-blue-400" },
  acquisition: { label: "Phase 3 — Acquisition", icon: Target, color: "text-violet-400" },
  automation: { label: "Phase 4 — Automation", icon: Bot, color: "text-amber-400" },
  scale: { label: "Phase 5 — Scale", icon: Globe, color: "text-rose-400" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  implemented: { label: "Implémenté", variant: "default", icon: CheckCircle2 },
  partial: { label: "Partiel", variant: "secondary", icon: Clock },
  pending: { label: "En attente", variant: "outline", icon: Circle },
  building: { label: "En cours", variant: "default", icon: Play },
  blocked: { label: "Bloqué", variant: "destructive", icon: AlertTriangle },
  recommended: { label: "Recommandé", variant: "default", icon: Rocket },
  skipped: { label: "Ignoré", variant: "outline", icon: SkipForward },
  approved: { label: "Approuvé", variant: "default", icon: CheckCircle2 },
  awaiting_approval: { label: "En attente d'approbation", variant: "secondary", icon: Eye },
  needs_review: { label: "À revoir", variant: "destructive", icon: AlertTriangle },
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "text-emerald-400",
  medium: "text-amber-400",
  low: "text-rose-400",
  unknown: "text-muted-foreground",
};

export default function AdminRoadmapExecution() {
  const queryClient = useQueryClient();
  const [openPhases, setOpenPhases] = useState<Record<string, boolean>>({ foundation: true, activation: true });
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ["roadmap-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_modules")
        .select("*")
        .order("phase_order", { ascending: true })
        .order("module_order", { ascending: true });
      if (error) throw error;
      return data as RoadmapModule[];
    },
  });

  const { data: dependencies = [] } = useQuery({
    queryKey: ["roadmap-dependencies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roadmap_module_dependencies").select("*");
      if (error) throw error;
      return data as RoadmapDependency[];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["roadmap-decisions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_execution_decisions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ slug, status }: { slug: string; status: string }) => {
      const { error } = await supabase
        .from("roadmap_modules")
        .update({ build_status: status })
        .eq("module_slug", slug);
      if (error) throw error;
      // Log decision
      await supabase.from("roadmap_execution_decisions").insert({
        module_slug: slug,
        decision_type: status === "implemented" ? "mark_implemented" : status === "skipped" ? "skip" : "status_change",
        decision_reason: `Status changed to ${status}`,
      });
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      queryClient.invalidateQueries({ queryKey: ["roadmap-modules"] });
      queryClient.invalidateQueries({ queryKey: ["roadmap-decisions"] });
    },
  });

  // Compute stats
  const totalModules = modules.length;
  const implementedCount = modules.filter(m => m.build_status === "implemented").length;
  const partialCount = modules.filter(m => m.build_status === "partial").length;
  const progressPct = totalModules > 0 ? Math.round(((implementedCount + partialCount * 0.5) / totalModules) * 100) : 0;

  // Find next recommended module
  const nextModule = modules.find(m => {
    if (m.build_status === "implemented" || m.build_status === "skipped") return false;
    const deps = dependencies.filter(d => d.module_slug === m.module_slug);
    const allDepsSatisfied = deps.every(d => {
      const depModule = modules.find(mm => mm.module_slug === d.depends_on_module_slug);
      return depModule && (depModule.build_status === "implemented" || depModule.build_status === "partial");
    });
    return allDepsSatisfied;
  });

  // Group by phase
  const phases = Object.entries(
    modules.reduce<Record<string, RoadmapModule[]>>((acc, m) => {
      (acc[m.phase_slug] = acc[m.phase_slug] || []).push(m);
      return acc;
    }, {})
  );

  const getModuleDeps = (slug: string) => dependencies.filter(d => d.module_slug === slug);

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    return (
      <Badge variant={cfg.variant} className="gap-1 text-xs">
        <Icon className="h-3 w-3" />
        {cfg.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted/30 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold">Roadmap Execution Agent</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Orchestration autonome de la roadmap UNPRO — {implementedCount}/{totalModules} modules complétés
          </p>
        </div>

        {/* Progress bar */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progression globale</span>
              <span className="font-bold text-primary">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
            <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-400" />{implementedCount} complétés</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-400" />{partialCount} partiels</span>
              <span className="flex items-center gap-1"><Circle className="h-3 w-3 text-muted-foreground" />{totalModules - implementedCount - partialCount} restants</span>
            </div>
          </CardContent>
        </Card>

        {/* Next recommended module */}
        {nextModule && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-primary/40 bg-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Prochain module recommandé</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h3 className="font-semibold text-sm">{nextModule.module_name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{nextModule.module_description}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">{PHASE_META[nextModule.phase_slug]?.label}</Badge>
                  <StatusBadge status={nextModule.build_status} />
                  <span className={`${CONFIDENCE_COLORS[nextModule.implementation_confidence]}`}>
                    Confiance: {nextModule.implementation_confidence}
                  </span>
                </div>
                {/* Dependencies */}
                <div className="text-xs space-y-1">
                  <span className="font-medium">Dépendances:</span>
                  {getModuleDeps(nextModule.module_slug).map(d => {
                    const depMod = modules.find(m => m.module_slug === d.depends_on_module_slug);
                    return (
                      <div key={d.id} className="flex items-center gap-1 ml-2">
                        {depMod?.build_status === "implemented" ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Clock className="h-3 w-3 text-amber-400" />
                        )}
                        <span>{depMod?.module_name || d.depends_on_module_slug}</span>
                      </div>
                    );
                  })}
                  {getModuleDeps(nextModule.module_slug).length === 0 && (
                    <span className="ml-2 text-muted-foreground">Aucune dépendance</span>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({ slug: nextModule.module_slug, status: "approved" })}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => updateStatusMutation.mutate({ slug: nextModule.module_slug, status: "implemented" })}
                  >
                    Marquer implémenté
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ slug: nextModule.module_slug, status: "skipped" })}
                  >
                    <SkipForward className="h-3.5 w-3.5 mr-1" />
                    Skip
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Phases accordion */}
        <div className="space-y-3">
          {phases.map(([phaseSlug, phaseModules]) => {
            const meta = PHASE_META[phaseSlug] || { label: phaseSlug, icon: Layers, color: "text-muted-foreground" };
            const PhaseIcon = meta.icon;
            const doneCount = phaseModules.filter(m => m.build_status === "implemented").length;
            const isOpen = openPhases[phaseSlug] ?? false;

            return (
              <Collapsible
                key={phaseSlug}
                open={isOpen}
                onOpenChange={(v) => setOpenPhases(prev => ({ ...prev, [phaseSlug]: v }))}
              >
                <CollapsibleTrigger asChild>
                  <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <PhaseIcon className={`h-5 w-5 ${meta.color}`} />
                        <div>
                          <span className="font-semibold text-sm">{meta.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {doneCount}/{phaseModules.length}
                          </span>
                        </div>
                      </div>
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </CardContent>
                  </Card>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 mt-2 ml-2 md:ml-4">
                    <AnimatePresence>
                      {phaseModules.map((m, idx) => (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                        >
                          <Card
                            className={`transition-all ${
                              selectedModule === m.module_slug ? "border-primary/60 bg-primary/5" : ""
                            } ${nextModule?.module_slug === m.module_slug ? "ring-1 ring-primary/30" : ""}`}
                            onClick={() => setSelectedModule(selectedModule === m.module_slug ? null : m.module_slug)}
                          >
                            <CardContent className="p-3 cursor-pointer">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-muted-foreground font-mono">#{m.module_order}</span>
                                    <span className="font-medium text-sm truncate">{m.module_name}</span>
                                    {nextModule?.module_slug === m.module_slug && (
                                      <Badge variant="default" className="text-[10px] gap-0.5">
                                        <ArrowRight className="h-2.5 w-2.5" /> Suivant
                                      </Badge>
                                    )}
                                  </div>
                                  {selectedModule === m.module_slug && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      className="mt-2 space-y-2"
                                    >
                                      <p className="text-xs text-muted-foreground">{m.module_description}</p>
                                      <div className="flex gap-2 flex-wrap text-xs">
                                        <span className={CONFIDENCE_COLORS[m.implementation_confidence]}>
                                          Confiance: {m.implementation_confidence}
                                        </span>
                                        <span>Dépendances: {m.dependency_status}</span>
                                      </div>
                                      {getModuleDeps(m.module_slug).length > 0 && (
                                        <div className="text-xs space-y-0.5">
                                          <span className="font-medium">Dépend de:</span>
                                          {getModuleDeps(m.module_slug).map(d => (
                                            <div key={d.id} className="ml-2 flex items-center gap-1">
                                              {modules.find(mm => mm.module_slug === d.depends_on_module_slug)?.build_status === "implemented"
                                                ? <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                                : <Clock className="h-3 w-3 text-amber-400" />}
                                              <span>{d.depends_on_module_slug}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      <div className="flex gap-1.5 pt-1">
                                        {m.build_status !== "implemented" && (
                                          <Button size="sm" variant="outline" className="text-xs h-7"
                                            onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ slug: m.module_slug, status: "implemented" }); }}>
                                            ✓ Implémenté
                                          </Button>
                                        )}
                                        {m.build_status !== "partial" && m.build_status !== "implemented" && (
                                          <Button size="sm" variant="outline" className="text-xs h-7"
                                            onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ slug: m.module_slug, status: "partial" }); }}>
                                            ◐ Partiel
                                          </Button>
                                        )}
                                        {m.build_status !== "skipped" && m.build_status !== "implemented" && (
                                          <Button size="sm" variant="ghost" className="text-xs h-7"
                                            onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ slug: m.module_slug, status: "skipped" }); }}>
                                            Skip
                                          </Button>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                                <StatusBadge status={m.build_status} />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

        {/* Recent decisions */}
        {history.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Historique des décisions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between text-xs border-b border-border/30 pb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{d.decision_type}</Badge>
                      <span className="font-mono text-muted-foreground">{d.module_slug}</span>
                    </div>
                    <span className="text-muted-foreground">{new Date(d.created_at).toLocaleDateString("fr-CA")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
