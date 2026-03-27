/**
 * AdminVoiceOptimizerPage — A/B voice experiments, scoring, auto-promote best variants.
 */
import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, Trophy, BarChart3, Play, Pause, Archive, Plus,
  RefreshCw, ChevronRight, TrendingUp, Zap, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

interface Experiment {
  id: string;
  experiment_key: string;
  experiment_name: string;
  description: string | null;
  status: string;
  profile_key: string;
  language: string;
  locale_code: string;
  min_sessions_per_variant: number;
  confidence_threshold: number;
  auto_promote: boolean;
  winner_variant_id: string | null;
  created_at: string;
}

interface Variant {
  id: string;
  experiment_id: string;
  variant_key: string;
  variant_name: string;
  provider_key: string;
  voice_id: string | null;
  speech_rate: number;
  speech_style: string | null;
  traffic_split: number;
  is_control: boolean;
  is_winner: boolean;
}

interface VariantMetrics {
  variant_id: string;
  total_sessions: number;
  avg_clarity: number;
  avg_fluency: number;
  avg_confidence: number;
  avg_overall_score: number;
  conversion_rate: number;
  calendar_open_rate: number;
  avg_interruptions: number;
  fallback_rate: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-green-500/10 text-green-600 border-green-500/30",
  paused: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  completed: "bg-primary/10 text-primary border-primary/30",
  archived: "bg-muted text-muted-foreground",
};

export default function AdminVoiceOptimizerPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  const fetchExperiments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("alex_voice_experiments" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setExperiments(data as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchExperiments(); }, [fetchExperiments]);

  const filtered = experiments.filter(e => {
    if (activeTab === "active") return e.status === "active" || e.status === "draft";
    if (activeTab === "completed") return e.status === "completed";
    return e.status === "archived" || e.status === "paused";
  });

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "active") updates.start_date = new Date().toISOString();
    if (status === "completed") updates.end_date = new Date().toISOString();

    await supabase.from("alex_voice_experiments" as any).update(updates).eq("id", id);
    toast.success(`Expérience ${status}`);
    fetchExperiments();
  };

  return (
    <MainLayout>
      <Helmet><title>Voice Optimizer — Admin UNPRO</title></Helmet>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-primary" />
              Voice Optimizer
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              A/B test des voix Alex. Score automatique. Auto-promotion du gagnant.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchExperiments} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <CreateExperimentDialog
              open={createOpen}
              onOpenChange={setCreateOpen}
              onCreated={fetchExperiments}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Expériences actives", value: experiments.filter(e => e.status === "active").length, icon: Play },
            { label: "Complétées", value: experiments.filter(e => e.status === "completed").length, icon: CheckCircle2 },
            { label: "Total sessions", value: "—", icon: BarChart3 },
            { label: "Taux de promotion", value: "—", icon: Trophy },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active">Actives / Brouillons</TabsTrigger>
            <TabsTrigger value="completed">Complétées</TabsTrigger>
            <TabsTrigger value="archived">Archives</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6 space-y-4">
            {loading ? (
              <div className="flex justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Aucune expérience dans cet onglet.
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence>
                {filtered.map(exp => (
                  <ExperimentCard
                    key={exp.id}
                    experiment={exp}
                    onStatusChange={updateStatus}
                    onViewDetails={() => navigate(`/admin/voice-optimizer/${exp.id}`)}
                  />
                ))}
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

// ─── Experiment Card ───
function ExperimentCard({
  experiment: exp, onStatusChange, onViewDetails,
}: {
  experiment: Experiment;
  onStatusChange: (id: string, status: string) => void;
  onViewDetails: () => void;
}) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [metrics, setMetrics] = useState<VariantMetrics[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    (async () => {
      const [vRes, mRes] = await Promise.all([
        supabase.from("alex_voice_variants" as any).select("*").eq("experiment_id", exp.id),
        supabase.from("alex_voice_variant_metrics" as any).select("*").eq("experiment_id", exp.id),
      ]);
      if (vRes.data) setVariants(vRes.data as any);
      if (mRes.data) setMetrics(mRes.data as any);
    })();
  }, [expanded, exp.id]);

  const getMetrics = (variantId: string) => metrics.find(m => m.variant_id === variantId);

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">{exp.experiment_name}</CardTitle>
              <Badge className={`text-[10px] ${STATUS_COLORS[exp.status] || ""}`}>{exp.status}</Badge>
              {exp.auto_promote && <Badge variant="secondary" className="text-[10px]">Auto-promote</Badge>}
            </div>
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
          </div>
          {exp.description && <CardDescription className="text-xs">{exp.description}</CardDescription>}
          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
            <span>Profil: {exp.profile_key}</span>
            <span>Locale: {exp.locale_code}</span>
            <span>Min sessions: {exp.min_sessions_per_variant}</span>
          </div>
        </CardHeader>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <CardContent className="border-t border-border/30 pt-4 space-y-4">
                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {exp.status === "draft" && (
                    <Button size="sm" onClick={() => onStatusChange(exp.id, "active")} className="gap-1">
                      <Play className="h-3.5 w-3.5" /> Démarrer
                    </Button>
                  )}
                  {exp.status === "active" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => onStatusChange(exp.id, "paused")} className="gap-1">
                        <Pause className="h-3.5 w-3.5" /> Pause
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onStatusChange(exp.id, "completed")} className="gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Terminer
                      </Button>
                    </>
                  )}
                  {exp.status === "paused" && (
                    <Button size="sm" onClick={() => onStatusChange(exp.id, "active")} className="gap-1">
                      <Play className="h-3.5 w-3.5" /> Reprendre
                    </Button>
                  )}
                  {(exp.status === "completed" || exp.status === "paused") && (
                    <Button size="sm" variant="ghost" onClick={() => onStatusChange(exp.id, "archived")} className="gap-1">
                      <Archive className="h-3.5 w-3.5" /> Archiver
                    </Button>
                  )}
                </div>

                {/* Variants */}
                {variants.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {variants.map(v => {
                      const m = getMetrics(v.id);
                      return (
                        <Card key={v.id} className={`${v.is_winner ? "ring-2 ring-primary" : ""}`}>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{v.variant_name}</span>
                                {v.is_control && <Badge variant="outline" className="text-[10px]">Contrôle</Badge>}
                                {v.is_winner && <Badge className="text-[10px] bg-primary"><Trophy className="h-3 w-3 mr-0.5" />Gagnant</Badge>}
                              </div>
                              <span className="text-xs text-muted-foreground">{v.traffic_split}%</span>
                            </div>

                            <div className="text-xs space-y-1 text-muted-foreground">
                              <p>Provider: {v.provider_key} • Voice: {v.voice_id || "default"}</p>
                              <p>Rate: {v.speech_rate}x • Style: {v.speech_style || "—"}</p>
                            </div>

                            {m && (
                              <div className="space-y-2 border-t border-border/30 pt-3">
                                <div className="flex justify-between text-xs">
                                  <span>Sessions: {m.total_sessions}</span>
                                  <span className="font-semibold text-foreground">Score: {m.avg_overall_score.toFixed(1)}</span>
                                </div>
                                <Progress value={Math.min(m.avg_overall_score, 100)} className="h-1.5" />
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                                  <span>Clarté: {m.avg_clarity.toFixed(1)}</span>
                                  <span>Fluidité: {m.avg_fluency.toFixed(1)}</span>
                                  <span>Conversion: {(m.conversion_rate * 100).toFixed(1)}%</span>
                                  <span>Calendrier: {(m.calendar_open_rate * 100).toFixed(1)}%</span>
                                  <span>Interruptions: {m.avg_interruptions.toFixed(1)}</span>
                                  <span>Fallback: {(m.fallback_rate * 100).toFixed(1)}%</span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Aucune variante. Ajoutez des variantes pour démarrer l'expérience.</p>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ─── Create Experiment Dialog ───
function CreateExperimentDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [profileKey, setProfileKey] = useState("homeowner");
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!name || !key) return;
    setCreating(true);
    const { error } = await supabase.from("alex_voice_experiments" as any).insert({
      experiment_key: key,
      experiment_name: name,
      profile_key: profileKey,
      status: "draft",
    });
    if (error) {
      toast.error("Erreur: " + error.message);
    } else {
      toast.success("Expérience créée");
      onOpenChange(false);
      setName(""); setKey("");
      onCreated();
    }
    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Nouvelle expérience</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer une expérience vocale</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Nom</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Test voix FR chaleureuse" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Clé unique</label>
            <Input value={key} onChange={e => setKey(e.target.value)} placeholder="Ex: warm-voice-fr-v1" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Profil cible</label>
            <Select value={profileKey} onValueChange={setProfileKey}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="homeowner">Propriétaire</SelectItem>
                <SelectItem value="entrepreneur">Entrepreneur</SelectItem>
                <SelectItem value="condo_manager">Gestionnaire copro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={create} disabled={creating || !name || !key}>
            {creating ? "Création…" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
