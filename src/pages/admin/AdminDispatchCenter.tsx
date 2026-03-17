/**
 * UNPRO — Admin Dispatch Center
 * /admin/dispatch-center — Real-time emergency operations control room
 */
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Clock, CheckCircle, XCircle, RefreshCw, Pause, Play, Zap, Users, TrendingUp, CloudLightning, MapPin, BarChart3, Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-primary",
  triage: "bg-accent",
  ready: "bg-warning",
  sent: "bg-secondary",
  timeout: "bg-destructive/70",
  accepted: "bg-success",
  refused: "bg-destructive",
  rerouted: "bg-warning",
  closed: "bg-muted",
  escalated: "bg-destructive",
};

const SEVERITY_ICONS: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

export default function AdminDispatchCenter() {
  const { toast } = useToast();
  const [tab, setTab] = useState("queue");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dispatchPaused, setDispatchPaused] = useState(false);

  // Fetch emergency requests
  const { data: requests = [], refetch: refetchRequests } = useQuery({
    queryKey: ["dispatch-requests", statusFilter],
    queryFn: async () => {
      let q = supabase.from("emergency_requests").select("*").order("created_at", { ascending: false }).limit(100);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  // Fetch matches
  const { data: matches = [] } = useQuery({
    queryKey: ["dispatch-matches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("emergency_matches").select("*, contractors(business_name, city)").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  // Fetch storm sessions
  const { data: stormSessions = [] } = useQuery({
    queryKey: ["storm-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("storm_mode_sessions").select("*").eq("status", "active");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch dispatch rules
  const { data: dispatchRules = [], refetch: refetchRules } = useQuery({
    queryKey: ["dispatch-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dispatch_rules").select("*").order("category");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch demand metrics
  const { data: demandMetrics = [] } = useQuery({
    queryKey: ["demand-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("demand_spike_metrics").select("*").order("calculated_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  // KPIs
  const activeCount = requests.filter(r => !["closed", "accepted"].includes(r.status)).length;
  const criticalCount = requests.filter(r => r.severity === "critical" && r.status !== "closed").length;
  const waitingCount = requests.filter(r => ["new", "ready"].includes(r.status)).length;
  const acceptedToday = requests.filter(r => r.status === "accepted" && new Date(r.created_at).toDateString() === new Date().toDateString()).length;
  const slaBreaches = requests.filter(r => r.sla_status === "breached").length;

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("dispatch-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_requests" }, () => refetchRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetchRequests]);

  // Storm mode controls
  const [stormForm, setStormForm] = useState({ name: "", scope_type: "province", severity_level: "elevated", categories: "", scope_values: "", admin_note: "" });

  const activateStorm = async () => {
    const { error } = await supabase.from("storm_mode_sessions").insert({
      name: stormForm.name || "Storm Mode",
      activation_type: "manual",
      scope_type: stormForm.scope_type,
      scope_values: stormForm.scope_values.split(",").map(s => s.trim()).filter(Boolean),
      severity_level: stormForm.severity_level,
      categories: stormForm.categories.split(",").map(s => s.trim()).filter(Boolean),
      admin_note: stormForm.admin_note,
    });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Storm Mode activé ⚡" });
  };

  const deactivateStorm = async (id: string) => {
    await supabase.from("storm_mode_sessions").update({ status: "ended" }).eq("id", id);
    toast({ title: "Storm Mode désactivé" });
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Centre de Dispatch
          </h1>
          <p className="text-sm text-muted-foreground">Opérations d'urgence en temps réel</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => refetchRequests()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Actualiser
          </Button>
          <Button size="sm" variant={dispatchPaused ? "default" : "outline"} onClick={() => setDispatchPaused(!dispatchPaused)}>
            {dispatchPaused ? <Play className="w-4 h-4 mr-1" /> : <Pause className="w-4 h-4 mr-1" />}
            {dispatchPaused ? "Reprendre" : "Pause"}
          </Button>
        </div>
      </div>

      {/* Storm Mode Banner */}
      {stormSessions.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CloudLightning className="w-5 h-5 text-destructive" />
            <span className="text-sm font-semibold text-destructive">
              Storm Mode actif — {stormSessions.map(s => s.name).join(", ")}
            </span>
          </div>
          <div className="flex gap-2">
            {stormSessions.map(s => (
              <Button key={s.id} size="sm" variant="destructive" onClick={() => deactivateStorm(s.id)}>Désactiver</Button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: "Actives", value: activeCount, icon: AlertTriangle, color: "text-warning" },
          { label: "Critiques", value: criticalCount, icon: AlertTriangle, color: "text-destructive" },
          { label: "En attente", value: waitingCount, icon: Clock, color: "text-primary" },
          { label: "Acceptées", value: acceptedToday, icon: CheckCircle, color: "text-success" },
          { label: "SLA violés", value: slaBreaches, icon: XCircle, color: "text-destructive" },
          { label: "Contractors", value: matches.length, icon: Users, color: "text-secondary" },
          { label: "Storm", value: stormSessions.length, icon: CloudLightning, color: "text-destructive" },
        ].map((kpi, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="queue" className="text-xs sm:text-sm">📋 Queue</TabsTrigger>
          <TabsTrigger value="contractors" className="text-xs sm:text-sm">👷 Contractors</TabsTrigger>
          <TabsTrigger value="storm" className="text-xs sm:text-sm">⛈️ Storm</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs sm:text-sm">📊 Analytics</TabsTrigger>
          <TabsTrigger value="rules" className="text-xs sm:text-sm">⚙️ Rules</TabsTrigger>
        </TabsList>

        {/* QUEUE TAB */}
        <TabsContent value="queue">
          <div className="flex gap-2 mb-4 flex-wrap">
            {["all", "new", "ready", "sent", "accepted", "refused", "escalated", "closed"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card text-foreground border-border"}`}>
                {s === "all" ? "Tous" : s}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">⚡</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="hidden sm:table-cell">Ville</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden md:table-cell">Intent</TableHead>
                  <TableHead className="hidden md:table-cell">📷</TableHead>
                  <TableHead className="hidden lg:table-cell">Dispatch</TableHead>
                  <TableHead>Créé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(req => (
                  <TableRow key={req.id} className={req.severity === "critical" ? "bg-destructive/5" : ""}>
                    <TableCell>{SEVERITY_ICONS[req.severity] || "⚪"}</TableCell>
                    <TableCell className="font-medium text-sm">{req.category}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{req.address?.split(",").pop()?.trim() || "—"}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${STATUS_COLORS[req.status] || "bg-muted"} text-white`}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{req.intent_score}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{req.photo_urls?.length || 0}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      #{req.current_dispatch_index || 0} · {req.dispatch_mode}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(req.created_at), "HH:mm", { locale: fr })}
                    </TableCell>
                  </TableRow>
                ))}
                {requests.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Aucune urgence</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* CONTRACTORS TAB */}
        <TabsContent value="contractors">
          <Card>
            <CardHeader><CardTitle className="text-lg">Performance Contractors (Urgences)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entrepreneur</TableHead>
                      <TableHead>Ville</TableHead>
                      <TableHead>Envoyées</TableHead>
                      <TableHead>Acceptées</TableHead>
                      <TableHead>Refusées</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const grouped = new Map<string, { name: string; city: string; sent: number; accepted: number; refused: number }>();
                      matches.forEach((m: any) => {
                        const cid = m.contractor_id;
                        if (!grouped.has(cid)) grouped.set(cid, { name: m.contractors?.business_name || cid.slice(0, 8), city: m.contractors?.city || "—", sent: 0, accepted: 0, refused: 0 });
                        const g = grouped.get(cid)!;
                        g.sent++;
                        if (m.status === "accepted") g.accepted++;
                        if (m.status === "refused") g.refused++;
                      });
                      return Array.from(grouped.values()).map((g, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{g.name}</TableCell>
                          <TableCell className="text-muted-foreground">{g.city}</TableCell>
                          <TableCell>{g.sent}</TableCell>
                          <TableCell className="text-success">{g.accepted}</TableCell>
                          <TableCell className="text-destructive">{g.refused}</TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STORM TAB */}
        <TabsContent value="storm">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Activate Storm */}
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CloudLightning className="w-5 h-5" /> Activer Storm Mode</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Nom</Label><Input value={stormForm.name} onChange={e => setStormForm(p => ({ ...p, name: e.target.value }))} placeholder="Tempête hivernale Laval" /></div>
                <div><Label>Portée</Label>
                  <Select value={stormForm.scope_type} onValueChange={v => setStormForm(p => ({ ...p, scope_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="province">Province</SelectItem>
                      <SelectItem value="region">Région</SelectItem>
                      <SelectItem value="city">Ville</SelectItem>
                      <SelectItem value="category">Catégorie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Villes/Régions (virgules)</Label><Input value={stormForm.scope_values} onChange={e => setStormForm(p => ({ ...p, scope_values: e.target.value }))} placeholder="Laval, Montréal" /></div>
                <div><Label>Sévérité</Label>
                  <Select value={stormForm.severity_level} onValueChange={v => setStormForm(p => ({ ...p, severity_level: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="elevated">Élevé</SelectItem>
                      <SelectItem value="high">Haut</SelectItem>
                      <SelectItem value="critical">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Catégories (virgules)</Label><Input value={stormForm.categories} onChange={e => setStormForm(p => ({ ...p, categories: e.target.value }))} placeholder="toiture, infiltration" /></div>
                <div><Label>Note admin</Label><Textarea value={stormForm.admin_note} onChange={e => setStormForm(p => ({ ...p, admin_note: e.target.value }))} rows={2} /></div>
                <Button onClick={activateStorm} className="w-full bg-destructive hover:bg-destructive/90"><CloudLightning className="w-4 h-4 mr-2" /> Activer Storm Mode</Button>
              </CardContent>
            </Card>

            {/* Demand Metrics */}
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Demande / Offre</CardTitle></CardHeader>
              <CardContent>
                {demandMetrics.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Aucune donnée de demande</p>
                ) : (
                  <div className="space-y-3">
                    {demandMetrics.slice(0, 8).map(m => (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">{m.city} · {m.category}</p>
                          <p className="text-xs text-muted-foreground">{m.request_count_hour} req/h · {m.available_contractors} pros</p>
                        </div>
                        <Badge variant={m.shortage_state === "severe_shortage" ? "destructive" : m.shortage_state === "shortage" ? "secondary" : "outline"}>
                          {m.shortage_state}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Total urgences", value: requests.length },
              { title: "Critiques", value: criticalCount },
              { title: "Taux d'acceptation", value: matches.length ? `${Math.round((matches.filter((m: any) => m.status === "accepted").length / matches.length) * 100)}%` : "—" },
              { title: "SLA violés", value: slaBreaches },
              { title: "Photos uploadées", value: requests.reduce((sum, r) => sum + (r.photo_urls?.length || 0), 0) },
              { title: "Storm actifs", value: stormSessions.length },
            ].map((stat, i) => (
              <Card key={i} className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </Card>
            ))}
          </div>
          <Card className="mt-4 p-6">
            <h3 className="font-semibold mb-3">Raisons de refus</h3>
            <div className="space-y-2">
              {(() => {
                const reasons = new Map<string, number>();
                matches.filter((m: any) => m.refusal_reason).forEach((m: any) => reasons.set(m.refusal_reason, (reasons.get(m.refusal_reason) || 0) + 1));
                return Array.from(reasons.entries()).sort((a, b) => b[1] - a[1]).map(([reason, count]) => (
                  <div key={reason} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{reason}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ));
              })()}
              {matches.filter((m: any) => m.refusal_reason).length === 0 && <p className="text-sm text-muted-foreground">Aucun refus</p>}
            </div>
          </Card>
        </TabsContent>

        {/* RULES TAB */}
        <TabsContent value="rules">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Settings className="w-5 h-5" /> Règles de Dispatch</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {dispatchRules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{rule.rule_key}</p>
                      <p className="text-xs text-muted-foreground">{rule.description_fr || rule.category || "—"}</p>
                    </div>
                    <Badge variant={rule.is_active ? "default" : "outline"}>{rule.is_active ? "Actif" : "Inactif"}</Badge>
                  </div>
                ))}
                {dispatchRules.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune règle configurée</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CloudLightning className="w-5 h-5" /> Règles Storm Auto</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">Configurer les seuils d'activation automatique du Storm Mode</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
