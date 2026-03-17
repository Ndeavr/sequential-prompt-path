/**
 * UNPRO — Contractor Emergency Settings Panel
 * /pro/emergency-settings — Auto-accept rules, capacity, availability
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Shield, Zap, Clock, MapPin, Pause, Play, CloudLightning, CheckCircle, Settings, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const CATEGORIES = [
  { key: "fuite_eau", label: "💧 Fuite d'eau" },
  { key: "toiture", label: "🏠 Toiture" },
  { key: "chauffage", label: "🔥 Chauffage" },
  { key: "electricite", label: "⚡ Électricité" },
  { key: "plomberie", label: "🔧 Plomberie" },
  { key: "infiltration", label: "💦 Infiltration" },
  { key: "structure", label: "🧱 Structure" },
  { key: "autre", label: "📋 Autre" },
];

const SEVERITIES = [
  { key: "urgent", label: "Urgent", color: "bg-warning" },
  { key: "high", label: "Élevé", color: "bg-orange-500" },
  { key: "critical", label: "Critique", color: "bg-destructive" },
];

const PRESETS = [
  {
    key: "conservative",
    label: "🛡️ Conservateur",
    desc: "Petit rayon, heures d'affaires, max 1 urgence",
    config: { max_radius_km: 8, severities: ["urgent", "high"], max_active: 1 },
  },
  {
    key: "fast_local",
    label: "⚡ Rapide local",
    desc: "Rayon moyen, urgent/élevé, max 2 actives",
    config: { max_radius_km: 15, severities: ["urgent", "high"], max_active: 2 },
  },
  {
    key: "guard_247",
    label: "🔒 Garde 24/7",
    desc: "Large rayon, après-heures, storm mode",
    config: { max_radius_km: 25, severities: ["urgent", "high", "critical"], max_active: 3 },
  },
  {
    key: "storm_specialist",
    label: "🌩️ Spécialiste tempête",
    desc: "Catégories storm, rayon élargi, parallèle",
    config: { max_radius_km: 30, severities: ["urgent", "high", "critical"], max_active: 4 },
  },
];

const AVAILABILITY_OPTIONS = [
  { key: "available", label: "Disponible", icon: "🟢", color: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" },
  { key: "limited", label: "Limité", icon: "🟡", color: "text-amber-500 border-amber-500/30 bg-amber-500/10" },
  { key: "unavailable", label: "Indisponible", icon: "🔴", color: "text-destructive border-destructive/30 bg-destructive/10" },
  { key: "emergency_only", label: "Urgences seulement", icon: "🚨", color: "text-orange-500 border-orange-500/30 bg-orange-500/10" },
];

export default function ProEmergencySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Fetch contractor
  const { data: contractor } = useQuery({
    queryKey: ["my-contractor"],
    queryFn: async () => {
      const { data } = await supabase.from("contractors").select("id").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch auto-accept settings
  const { data: autoAccept, isLoading: loadingAA } = useQuery({
    queryKey: ["auto-accept-settings", contractor?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("contractor_auto_accept_settings")
        .select("*")
        .eq("contractor_id", contractor!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!contractor?.id,
  });

  // Fetch capacity state
  const { data: capacity, isLoading: loadingCap } = useQuery({
    queryKey: ["capacity-state", contractor?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("contractor_capacity_state")
        .select("*")
        .eq("contractor_id", contractor!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!contractor?.id,
  });

  // Local state
  const [aaEnabled, setAaEnabled] = useState(false);
  const [aaCategories, setAaCategories] = useState<string[]>([]);
  const [aaExcluded, setAaExcluded] = useState<string[]>([]);
  const [aaSeverities, setAaSeverities] = useState<string[]>(["urgent", "high", "critical"]);
  const [aaRadius, setAaRadius] = useState(15);
  const [aaRequiresPhoto, setAaRequiresPhoto] = useState(false);
  const [aaRequiresCallback, setAaRequiresCallback] = useState(false);
  const [aaConfidence, setAaConfidence] = useState(0.6);
  const [aaStormMode, setAaStormMode] = useState("both");

  const [capStatus, setCapStatus] = useState("available");
  const [capMaxActive, setCapMaxActive] = useState(2);
  const [capMaxPending, setCapMaxPending] = useState(3);
  const [capDailyLimit, setCapDailyLimit] = useState(5);
  const [capAfterHours, setCapAfterHours] = useState(2);
  const [capOvernightLimit, setCapOvernightLimit] = useState(1);
  const [capWeekendLimit, setCapWeekendLimit] = useState(3);
  const [capRadius, setCapRadius] = useState(15);
  const [capOvernightMode, setCapOvernightMode] = useState(false);
  const [capStormAccept, setCapStormAccept] = useState(false);
  const [capStormBoost, setCapStormBoost] = useState(0);

  // Sync from DB
  useEffect(() => {
    if (autoAccept) {
      setAaEnabled(autoAccept.enabled);
      setAaCategories((autoAccept.categories as string[]) || []);
      setAaExcluded((autoAccept.excluded_types as string[]) || []);
      setAaSeverities((autoAccept.severities as string[]) || ["urgent", "high", "critical"]);
      setAaRadius(Number(autoAccept.max_radius_km) || 15);
      setAaRequiresPhoto(autoAccept.requires_photo || false);
      setAaRequiresCallback(autoAccept.requires_callback || false);
      setAaConfidence(Number(autoAccept.confidence_threshold) || 0.6);
      setAaStormMode(autoAccept.storm_mode || "both");
    }
  }, [autoAccept]);

  useEffect(() => {
    if (capacity) {
      setCapStatus(capacity.availability_status);
      setCapMaxActive(capacity.max_active_emergencies || 2);
      setCapMaxPending(capacity.max_pending_accepted || 3);
      setCapDailyLimit(capacity.daily_emergency_limit || 5);
      setCapAfterHours(capacity.after_hours_limit || 2);
      setCapOvernightLimit(capacity.overnight_limit || 1);
      setCapWeekendLimit(capacity.weekend_limit || 3);
      setCapRadius(Number(capacity.emergency_radius_km) || 15);
      setCapOvernightMode(capacity.overnight_mode || false);
      setCapStormAccept(capacity.storm_accept || false);
      setCapStormBoost(capacity.storm_capacity_boost || 0);
    }
  }, [capacity]);

  // Save auto-accept
  const saveAA = useMutation({
    mutationFn: async () => {
      const payload = {
        contractor_id: contractor!.id,
        enabled: aaEnabled,
        categories: aaCategories,
        excluded_types: aaExcluded,
        severities: aaSeverities,
        max_radius_km: aaRadius,
        requires_photo: aaRequiresPhoto,
        requires_callback: aaRequiresCallback,
        confidence_threshold: aaConfidence,
        storm_mode: aaStormMode,
      };
      const { error } = await supabase.from("contractor_auto_accept_settings").upsert(payload, { onConflict: "contractor_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Règles sauvegardées ✅" });
      qc.invalidateQueries({ queryKey: ["auto-accept-settings"] });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // Save capacity
  const saveCap = useMutation({
    mutationFn: async () => {
      const payload = {
        contractor_id: contractor!.id,
        availability_status: capStatus,
        max_active_emergencies: capMaxActive,
        max_pending_accepted: capMaxPending,
        daily_emergency_limit: capDailyLimit,
        after_hours_limit: capAfterHours,
        overnight_limit: capOvernightLimit,
        weekend_limit: capWeekendLimit,
        emergency_radius_km: capRadius,
        overnight_mode: capOvernightMode,
        storm_accept: capStormAccept,
        storm_capacity_boost: capStormBoost,
      };
      const { error } = await supabase.from("contractor_capacity_state").upsert(payload, { onConflict: "contractor_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Capacité mise à jour ✅" });
      qc.invalidateQueries({ queryKey: ["capacity-state"] });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // Pause
  const pauseUntil = useMutation({
    mutationFn: async (hours: number) => {
      const until = new Date(Date.now() + hours * 3600000).toISOString();
      const { error } = await supabase.from("contractor_capacity_state").upsert(
        { contractor_id: contractor!.id, paused_until: until, availability_status: "unavailable" },
        { onConflict: "contractor_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Pause activée ⏸️" });
      qc.invalidateQueries({ queryKey: ["capacity-state"] });
    },
  });

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setAaRadius(preset.config.max_radius_km);
    setAaSeverities(preset.config.severities);
    setCapMaxActive(preset.config.max_active);
    setAaEnabled(true);
    toast({ title: `Preset "${preset.label}" appliqué` });
  };

  const toggleCategory = (key: string) => {
    setAaCategories(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]);
  };

  const toggleExcluded = (key: string) => {
    setAaExcluded(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]);
  };

  const toggleSeverity = (key: string) => {
    setAaSeverities(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);
  };

  if (!contractor) return <div className="p-6 text-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-destructive" />
          <div>
            <h1 className="text-lg font-bold text-foreground">Urgences — Paramètres</h1>
            <p className="text-xs text-muted-foreground">Auto-accept, capacité, disponibilité</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        <Tabs defaultValue="availability">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="availability" className="text-xs">Dispo</TabsTrigger>
            <TabsTrigger value="capacity" className="text-xs">Capacité</TabsTrigger>
            <TabsTrigger value="rules" className="text-xs">Auto-accept</TabsTrigger>
            <TabsTrigger value="storm" className="text-xs">Storm</TabsTrigger>
          </TabsList>

          {/* ─── AVAILABILITY ─── */}
          <TabsContent value="availability" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Statut actuel
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {AVAILABILITY_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setCapStatus(opt.key)}
                    className={`p-3 rounded-lg border-2 text-left transition-all active:scale-[0.98] ${
                      capStatus === opt.key ? opt.color + " border-current" : "border-border bg-card"
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <p className="text-xs font-medium mt-1">{opt.label}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Live counts */}
            {capacity && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">État temps réel</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Actives", value: capacity.active_count, max: capMaxActive },
                    { label: "En attente", value: capacity.pending_count, max: capMaxPending },
                    { label: "Aujourd'hui", value: capacity.completed_today, max: capDailyLimit },
                  ].map(s => (
                    <div key={s.label} className="p-2 rounded-lg bg-muted/50">
                      <p className={`text-xl font-bold ${(s.value || 0) >= s.max ? "text-destructive" : "text-foreground"}`}>
                        {s.value || 0}<span className="text-xs text-muted-foreground">/{s.max}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Pause */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Pause className="w-4 h-4" />
                  Pause / Vacation
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => pauseUntil.mutate(1)}>⏸️ 1 heure</Button>
                <Button size="sm" variant="outline" onClick={() => pauseUntil.mutate(12)}>🌙 Jusqu'à demain</Button>
                <Button size="sm" variant="outline" onClick={() => pauseUntil.mutate(24)}>📅 24 heures</Button>
                <div className="flex items-center gap-2 w-full mt-2">
                  <Label className="text-xs">Mode nuit</Label>
                  <Switch checked={capOvernightMode} onCheckedChange={setCapOvernightMode} />
                </div>
              </CardContent>
            </Card>

            <Button onClick={() => saveCap.mutate()} className="w-full" disabled={saveCap.isPending}>
              Sauvegarder disponibilité
            </Button>
          </TabsContent>

          {/* ─── CAPACITY ─── */}
          <TabsContent value="capacity" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" />
                  Limites de capacité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Max urgences actives", value: capMaxActive, set: setCapMaxActive, min: 1, max: 10 },
                  { label: "Max acceptées non terminées", value: capMaxPending, set: setCapMaxPending, min: 1, max: 15 },
                  { label: "Limite quotidienne", value: capDailyLimit, set: setCapDailyLimit, min: 1, max: 20 },
                  { label: "Limite soir / après-heures", value: capAfterHours, set: setCapAfterHours, min: 0, max: 10 },
                  { label: "Limite nuit", value: capOvernightLimit, set: setCapOvernightLimit, min: 0, max: 5 },
                  { label: "Limite fin de semaine", value: capWeekendLimit, set: setCapWeekendLimit, min: 0, max: 10 },
                ].map(field => (
                  <div key={field.label}>
                    <div className="flex justify-between items-center mb-1">
                      <Label className="text-xs">{field.label}</Label>
                      <Badge variant="outline" className="text-xs">{field.value}</Badge>
                    </div>
                    <Slider
                      value={[field.value]}
                      onValueChange={([v]) => field.set(v)}
                      min={field.min}
                      max={field.max}
                      step={1}
                    />
                  </div>
                ))}

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs">Rayon urgence (km)</Label>
                    <Badge variant="outline" className="text-xs">{capRadius} km</Badge>
                  </div>
                  <Slider value={[capRadius]} onValueChange={([v]) => setCapRadius(v)} min={1} max={50} step={1} />
                </div>
              </CardContent>
            </Card>

            <Button onClick={() => saveCap.mutate()} className="w-full" disabled={saveCap.isPending}>
              Sauvegarder capacité
            </Button>
          </TabsContent>

          {/* ─── AUTO-ACCEPT RULES ─── */}
          <TabsContent value="rules" className="space-y-4 mt-4">
            {/* Master toggle */}
            <Card className={aaEnabled ? "border-primary/30" : ""}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Zap className={`w-5 h-5 ${aaEnabled ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-semibold">Auto-accept</p>
                    <p className="text-xs text-muted-foreground">Accepter automatiquement les urgences éligibles</p>
                  </div>
                </div>
                <Switch checked={aaEnabled} onCheckedChange={setAaEnabled} />
              </CardContent>
            </Card>

            {autoAccept?.admin_disabled && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs text-destructive">
                <Shield className="w-4 h-4 inline mr-1" />
                Auto-accept désactivé par l'administration.
                {autoAccept.admin_disabled_reason && <span className="block mt-1 text-muted-foreground">{autoAccept.admin_disabled_reason}</span>}
              </div>
            )}

            {aaEnabled && (
              <>
                {/* Presets */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Presets rapides</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                    {PRESETS.map(p => (
                      <button
                        key={p.key}
                        onClick={() => applyPreset(p)}
                        className="p-3 rounded-lg border border-border bg-card text-left hover:border-primary/40 transition-all active:scale-[0.98]"
                      >
                        <p className="text-sm font-medium">{p.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{p.desc}</p>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Categories */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Catégories acceptées</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {CATEGORIES.map(c => (
                      <button
                        key={c.key}
                        onClick={() => toggleCategory(c.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          aaCategories.includes(c.key)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                    <p className="text-[10px] text-muted-foreground w-full mt-1">
                      {aaCategories.length === 0 ? "Toutes les catégories acceptées" : `${aaCategories.length} sélectionnée(s)`}
                    </p>
                  </CardContent>
                </Card>

                {/* Excluded */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-destructive">Catégories exclues</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {CATEGORIES.map(c => (
                      <button
                        key={c.key}
                        onClick={() => toggleExcluded(c.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          aaExcluded.includes(c.key)
                            ? "bg-destructive text-destructive-foreground border-destructive"
                            : "bg-card text-foreground border-border"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Severities */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Gravités acceptées</CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    {SEVERITIES.map(s => (
                      <button
                        key={s.key}
                        onClick={() => toggleSeverity(s.key)}
                        className={`flex-1 p-2 rounded-lg border text-center text-xs font-medium transition-all ${
                          aaSeverities.includes(s.key)
                            ? s.color + " text-white border-transparent"
                            : "bg-card text-foreground border-border"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Radius */}
                <Card>
                  <CardContent className="py-4">
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> Rayon max</Label>
                      <Badge variant="outline" className="text-xs">{aaRadius} km</Badge>
                    </div>
                    <Slider value={[aaRadius]} onValueChange={([v]) => setAaRadius(v)} min={1} max={50} step={1} />
                  </CardContent>
                </Card>

                {/* Extra conditions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Conditions supplémentaires</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Photo requise</Label>
                      <Switch checked={aaRequiresPhoto} onCheckedChange={setAaRequiresPhoto} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Rappel demandé requis</Label>
                      <Switch checked={aaRequiresCallback} onCheckedChange={setAaRequiresCallback} />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <Label className="text-xs">Seuil de confiance IA</Label>
                        <Badge variant="outline" className="text-xs">{Math.round(aaConfidence * 100)}%</Badge>
                      </div>
                      <Slider value={[aaConfidence * 100]} onValueChange={([v]) => setAaConfidence(v / 100)} min={30} max={100} step={5} />
                    </div>
                    <div>
                      <Label className="text-xs">Storm mode</Label>
                      <Select value={aaStormMode} onValueChange={setAaStormMode}>
                        <SelectTrigger className="mt-1 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both">Toujours</SelectItem>
                          <SelectItem value="active_only">Storm actif seulement</SelectItem>
                          <SelectItem value="inactive_only">Hors storm seulement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            <Button onClick={() => saveAA.mutate()} className="w-full" disabled={saveAA.isPending}>
              {aaEnabled ? "Sauvegarder les règles" : "Sauvegarder (désactivé)"}
            </Button>
          </TabsContent>

          {/* ─── STORM MODE ─── */}
          <TabsContent value="storm" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CloudLightning className="w-4 h-4 text-primary" />
                  Préférences Storm Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Accepter urgences storm</Label>
                  <Switch checked={capStormAccept} onCheckedChange={setCapStormAccept} />
                </div>
                {capStormAccept && (
                  <>
                    <div>
                      <Label className="text-xs">Catégories storm</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {CATEGORIES.map(c => (
                          <button
                            key={c.key}
                            onClick={() => {
                              /* toggle storm categories - reuse capacity storm_categories */
                            }}
                            className="px-2 py-1 rounded-full text-[10px] border bg-card"
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <Label className="text-xs">Boost capacité storm</Label>
                        <Badge variant="outline" className="text-xs">+{capStormBoost}</Badge>
                      </div>
                      <Slider value={[capStormBoost]} onValueChange={([v]) => setCapStormBoost(v)} min={0} max={5} step={1} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Button onClick={() => saveCap.mutate()} className="w-full" disabled={saveCap.isPending}>
              Sauvegarder storm
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
