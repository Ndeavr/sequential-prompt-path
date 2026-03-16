import { useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Brain, Rocket, Home, Shield, Target, DollarSign, Lock, Bot, Globe,
  CheckCircle2, AlertTriangle, Circle, Copy, Loader2, Sparkles,
  BarChart3, TrendingUp, Zap, Layers,
} from "lucide-react";
import {
  auditAllEngines, computeUosStats, generateModulePrompt,
  type UosEngine, type EngineComponent, type UosStats,
} from "@/services/uosService";

// ─── Icon mapping ───────────────────────────────────────────────

const engineIcons: Record<string, typeof Brain> = {
  brain: Brain, rocket: Rocket, home: Home, shield: Shield,
  target: Target, dollar: DollarSign, lock: Lock, bot: Bot, globe: Globe,
};

const statusIcons: Record<string, typeof CheckCircle2> = {
  done: CheckCircle2, partial: AlertTriangle, todo: Circle,
};

const statusColors: Record<string, string> = {
  done: "text-emerald-500", partial: "text-amber-500", todo: "text-muted-foreground",
};

const categoryLabels: Record<string, string> = {
  table: "Table DB", page: "Page", edge_function: "Edge Function",
  service: "Service", agent: "Agent IA", api: "API",
};

// ─── Main Page ──────────────────────────────────────────────────

export default function AdminUOS() {
  const [selectedEngine, setSelectedEngine] = useState<UosEngine | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<EngineComponent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: engines = [], isLoading } = useQuery({
    queryKey: ["uos-engines"],
    queryFn: auditAllEngines,
    staleTime: 60_000,
  });

  const stats = computeUosStats(engines);

  const openDetail = (engine: UosEngine) => {
    setSelectedEngine(engine);
    setSelectedComponent(null);
    setDrawerOpen(true);
  };

  const copyPrompt = (engine: UosEngine, component: EngineComponent) => {
    navigator.clipboard.writeText(generateModulePrompt(engine, component));
    toast.success("Prompt ChatGPT copié !");
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            UNPRO Operating System
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            9 moteurs · Audit temps réel · Mode Licorne
          </p>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Card className="border-border/40">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.totalEngines}</p>
              <p className="text-[10px] text-muted-foreground">Moteurs</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-emerald-500">{stats.completedComponents}</p>
              <p className="text-[10px] text-muted-foreground">Complétés ✓</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-500">{stats.partialComponents}</p>
              <p className="text-[10px] text-muted-foreground">Partiels ⚠</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{stats.todoComponents}</p>
              <p className="text-[10px] text-muted-foreground">À faire ○</p>
            </CardContent>
          </Card>
          <Card className="border-primary/30 bg-primary/5 col-span-2 sm:col-span-1">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{stats.overallPct}%</p>
              <p className="text-[10px] text-muted-foreground">Progression</p>
            </CardContent>
          </Card>
        </div>

        <Progress value={stats.overallPct} className="h-2" />

        {/* Loading */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="engines" className="w-full">
            <TabsList className="grid grid-cols-3 h-9 rounded-xl w-full">
              <TabsTrigger value="engines" className="text-xs gap-1 rounded-lg">
                <Layers className="h-3.5 w-3.5" /> Moteurs
              </TabsTrigger>
              <TabsTrigger value="audit" className="text-xs gap-1 rounded-lg">
                <BarChart3 className="h-3.5 w-3.5" /> Audit
              </TabsTrigger>
              <TabsTrigger value="unicorn" className="text-xs gap-1 rounded-lg">
                <Sparkles className="h-3.5 w-3.5" /> Licorne
              </TabsTrigger>
            </TabsList>

            {/* ── Engines Grid ── */}
            <TabsContent value="engines" className="mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {engines.map(engine => {
                  const Icon = engineIcons[engine.icon] ?? Layers;
                  const done = engine.components.filter(c => c.status === "done").length;
                  const total = engine.components.length;
                  return (
                    <Card
                      key={engine.key}
                      className="border-border/40 cursor-pointer hover:border-primary/40 transition-colors"
                      onClick={() => openDetail(engine)}
                    >
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            {engine.name}
                          </span>
                          <Badge variant="outline" className={`text-[10px] ${
                            engine.completionPct >= 80 ? "text-emerald-500 border-emerald-500/20" :
                            engine.completionPct >= 40 ? "text-amber-500 border-amber-500/20" :
                            "text-muted-foreground border-border"
                          }`}>
                            {engine.completionPct}%
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-2">
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{engine.mission}</p>
                        <Progress value={engine.completionPct} className="h-1.5" />
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{done}/{total} composants</span>
                          <span>{engine.agents.length} agents</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* ── Audit Tree ── */}
            <TabsContent value="audit" className="mt-4 space-y-3">
              {engines.map(engine => {
                const Icon = engineIcons[engine.icon] ?? Layers;
                return (
                  <Card key={engine.key} className="border-border/40">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        {engine.name}
                        <Badge variant="outline" className="text-[10px] ml-auto">{engine.completionPct}%</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <div className="space-y-1">
                        {engine.components.map(comp => {
                          const SIcon = statusIcons[comp.status];
                          return (
                            <div
                              key={comp.id}
                              className={`flex items-center gap-2 text-xs py-1 px-2 rounded-lg ${
                                comp.status === "todo" ? "hover:bg-muted/50 cursor-pointer" : ""
                              }`}
                              onClick={() => {
                                if (comp.status === "todo") {
                                  setSelectedEngine(engine);
                                  setSelectedComponent(comp);
                                  setDrawerOpen(true);
                                }
                              }}
                            >
                              <SIcon className={`h-3 w-3 shrink-0 ${statusColors[comp.status]}`} />
                              <span className={comp.status === "done" ? "text-foreground" : "text-muted-foreground"}>
                                {comp.label}
                              </span>
                              <Badge variant="secondary" className="text-[9px] ml-auto">{categoryLabels[comp.category]}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            {/* ── Unicorn Mode ── */}
            <TabsContent value="unicorn" className="mt-4 space-y-3">
              {engines
                .filter(e => e.unicornTips?.length)
                .map(engine => {
                  const Icon = engineIcons[engine.icon] ?? Layers;
                  return (
                    <Card key={engine.key} className="border-primary/20 bg-primary/5">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">{engine.name}</span>
                          <Sparkles className="h-3 w-3 text-amber-500 ml-auto" />
                        </div>
                        {engine.unicornTips!.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Zap className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}

              {/* Todo quick-wins: components with highest impact */}
              <Card className="border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    Quick Wins — Modules simples à implémenter
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {engines
                    .flatMap(e => e.components.filter(c => c.status === "todo").map(c => ({ engine: e, component: c })))
                    .slice(0, 8)
                    .map(({ engine, component }) => (
                      <div
                        key={component.id}
                        className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          setSelectedEngine(engine);
                          setSelectedComponent(component);
                          setDrawerOpen(true);
                        }}
                      >
                        <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">{component.label}</span>
                        <Badge variant="secondary" className="text-[9px] ml-auto">{engine.name}</Badge>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Detail Drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
            {selectedEngine && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-base">
                    {(() => { const I = engineIcons[selectedEngine.icon] ?? Layers; return <I className="h-5 w-5 text-primary" />; })()}
                    {selectedEngine.name}
                  </SheetTitle>
                  <SheetDescription className="text-xs">{selectedEngine.mission}</SheetDescription>
                </SheetHeader>

                <div className="mt-4 space-y-4">
                  {/* Completion */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-bold">{selectedEngine.completionPct}%</span>
                    </div>
                    <Progress value={selectedEngine.completionPct} className="h-2" />
                  </div>

                  {/* Objectives */}
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Objectifs</p>
                    <div className="space-y-1">
                      {selectedEngine.objectives.map((o, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Target className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                          <span>{o}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Agents */}
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Agents IA</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedEngine.agents.map((a, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{a}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Components */}
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">Composants</p>
                    <div className="space-y-1">
                      {selectedEngine.components.map(comp => {
                        const SIcon = statusIcons[comp.status];
                        const isTodo = comp.status === "todo";
                        return (
                          <div key={comp.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg bg-muted/20">
                            <SIcon className={`h-3 w-3 shrink-0 ${statusColors[comp.status]}`} />
                            <span className={isTodo ? "text-muted-foreground" : "text-foreground"}>{comp.label}</span>
                            <Badge variant="secondary" className="text-[9px] ml-auto">{categoryLabels[comp.category]}</Badge>
                            {isTodo && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={(e) => { e.stopPropagation(); copyPrompt(selectedEngine, comp); }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected component prompt preview */}
                  {selectedComponent && (
                    <Card className="border-primary/30 bg-primary/5">
                      <CardContent className="p-3 space-y-2">
                        <p className="text-xs font-medium text-foreground">
                          Ce qui manque pour "{selectedComponent.label}" :
                        </p>
                        <div className="text-[11px] text-muted-foreground space-y-1">
                          <p>• Type : {categoryLabels[selectedComponent.category]}</p>
                          <p>• Moteur : {selectedEngine.name}</p>
                          <p>• Statut : {selectedComponent.status}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs w-full"
                          onClick={() => copyPrompt(selectedEngine, selectedComponent)}
                        >
                          <Copy className="h-3 w-3 mr-1" /> Copier prompt ChatGPT
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Auto Actions */}
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Actions automatiques</p>
                    <div className="space-y-1">
                      {selectedEngine.autoActions.map((a, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Bot className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                          <span>{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Unicorn tips */}
                  {selectedEngine.unicornTips?.length ? (
                    <Card className="border-amber-500/20 bg-amber-500/5">
                      <CardContent className="p-3 space-y-2">
                        <p className="text-xs font-medium text-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-amber-500" /> Mode Licorne
                        </p>
                        {selectedEngine.unicornTips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                            <Zap className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AdminLayout>
  );
}
