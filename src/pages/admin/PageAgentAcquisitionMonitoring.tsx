import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { useAutonomousAcquisition } from "@/hooks/useAutonomousAcquisition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Bot, Play, RefreshCw, Loader2, CheckCircle2, XCircle,
  AlertTriangle, Zap, TrendingUp, Users, Target, Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Sub-components ---

function StatsCards({ stats }: { stats?: { total_leads: number; enriched: number } }) {
  const total = stats?.total_leads || 0;
  const enriched = stats?.enriched || 0;
  const rate = total > 0 ? Math.round((enriched / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Leads créés", value: total, icon: Users, color: "text-blue-400" },
        { label: "Enrichis", value: enriched, icon: Target, color: "text-green-400" },
        { label: "Taux enrichissement", value: `${rate}%`, icon: TrendingUp, color: "text-amber-400" },
        { label: "Pipeline actif", value: total > 0 ? "ON" : "OFF", icon: Activity, color: total > 0 ? "text-green-400" : "text-muted-foreground" },
      ].map((s) => (
        <Card key={s.label} className="bg-card/50 border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PipelineSteps({ steps }: { steps: any[] }) {
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-3 p-2 rounded-lg bg-card/30 border border-border/30"
        >
          {s.status === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-red-400 shrink-0" />
          )}
          <span className="text-sm font-medium text-foreground capitalize">{s.step.replace(/_/g, " ")}</span>
          {s.data && (
            <span className="text-xs text-muted-foreground ml-auto truncate max-w-[120px]">
              {typeof s.data === "object" ? JSON.stringify(s.data).slice(0, 50) : String(s.data)}
            </span>
          )}
          {s.error && <span className="text-xs text-red-400 ml-auto truncate max-w-[150px]">{s.error}</span>}
        </motion.div>
      ))}
    </div>
  );
}

function TaskList({ tasks }: { tasks: any[] }) {
  if (!tasks?.length) return <p className="text-sm text-muted-foreground p-4">Aucune tâche d'acquisition.</p>;

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {tasks.map((t) => (
        <div key={t.id} className="p-3 rounded-lg bg-card/30 border border-border/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-foreground">{t.task_title}</span>
            <Badge variant={t.status === "completed" ? "default" : t.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">
              {t.status}
            </Badge>
          </div>
          {t.executed_at && (
            <span className="text-[10px] text-muted-foreground">{new Date(t.executed_at).toLocaleString("fr-CA")}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function LogFeed({ logs }: { logs: any[] }) {
  if (!logs?.length) return <p className="text-sm text-muted-foreground p-4">Aucun log.</p>;

  return (
    <div className="space-y-1.5 max-h-[400px] overflow-y-auto font-mono text-xs">
      {logs.map((l) => (
        <div key={l.id} className="flex gap-2 p-1.5 rounded bg-card/20">
          <span className="text-muted-foreground shrink-0">{new Date(l.created_at).toLocaleTimeString("fr-CA")}</span>
          <Badge variant="outline" className="text-[9px] shrink-0">{l.log_type}</Badge>
          <span className="text-foreground/80 truncate">{l.message}</span>
        </div>
      ))}
    </div>
  );
}

// --- Main Page ---

const PageAgentAcquisitionMonitoring = () => {
  const { status, isLoading, lastResult, runPipeline, retryFailed, subscribeRealtime } = useAutonomousAcquisition();
  const [businessName, setBusinessName] = useState("Isolation Solution Royal");
  const [domain, setDomain] = useState("isroyal.ca");
  const [city, setCity] = useState("Montréal");
  const [category, setCategory] = useState("isolation");

  useEffect(() => {
    const unsub = subscribeRealtime();
    return unsub;
  }, [subscribeRealtime]);

  const handleRun = () => {
    if (!businessName) return toast.error("Nom d'entreprise requis");
    runPipeline.mutate(
      { business_name: businessName, domain, city, category },
      {
        onSuccess: (r) => toast.success(r.success ? "Pipeline complété ✅" : "Pipeline partiel ⚠️"),
        onError: (e) => toast.error(`Erreur: ${e.message}`),
      }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Acquisition Autonome
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pipeline full-auto: scrape → enrich → score → outreach → convert
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => retryFailed.mutate()}
              disabled={retryFailed.isPending}
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${retryFailed.isPending ? "animate-spin" : ""}`} />
              Retry échoués
            </Button>
          </div>
        </div>

        {/* Stats */}
        <StatsCards stats={status?.stats} />

        {/* Pipeline Input */}
        <Card className="bg-card/50 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Lancer un pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Nom entreprise"
                className="text-sm"
              />
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Domaine (ex: site.ca)"
                className="text-sm"
              />
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ville"
                className="text-sm"
              />
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Catégorie"
                className="text-sm"
              />
            </div>
            <Button
              onClick={handleRun}
              disabled={runPipeline.isPending}
              className="w-full gap-2 rounded-xl"
              size="sm"
            >
              {runPipeline.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {runPipeline.isPending ? "Exécution du pipeline..." : "Exécuter le pipeline complet"}
            </Button>
          </CardContent>
        </Card>

        {/* Last Result */}
        <AnimatePresence>
          {lastResult && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className={`border ${lastResult.success ? "border-green-500/30 bg-green-950/10" : "border-amber-500/30 bg-amber-950/10"}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {lastResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    )}
                    Résultat — Score AIPP: {lastResult.aipp_score || "N/A"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lastResult.aipp_score != null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Score AIPP</span>
                        <span className="font-bold text-foreground">{lastResult.aipp_score}/100</span>
                      </div>
                      <Progress value={lastResult.aipp_score} className="h-2" />
                    </div>
                  )}
                  {lastResult.landing_url && (
                    <p className="text-xs text-muted-foreground">
                      Landing: <a href={lastResult.landing_url} className="text-primary underline">{lastResult.landing_url}</a>
                    </p>
                  )}
                  <PipelineSteps steps={lastResult.steps} />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs: Tasks & Logs */}
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-9 rounded-xl">
            <TabsTrigger value="tasks" className="text-xs rounded-lg">Tâches</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs rounded-lg">Logs temps réel</TabsTrigger>
          </TabsList>
          <TabsContent value="tasks" className="mt-3">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <TaskList tasks={status?.tasks || []} />
            )}
          </TabsContent>
          <TabsContent value="logs" className="mt-3">
            <LogFeed logs={status?.logs || []} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default PageAgentAcquisitionMonitoring;
