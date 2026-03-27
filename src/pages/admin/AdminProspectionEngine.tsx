/**
 * UNPRO — Prospection Engine Dashboard
 * Campaign management, prospect overview, analytics.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Rocket, Plus, Users, Target, Mail, BarChart3, Play, Pause,
  TrendingUp, MousePointer, Eye, CheckCircle2, Search, Zap,
} from "lucide-react";

const STATUS_BADGES: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400",
  ready: "bg-blue-500/20 text-blue-400",
  running: "bg-emerald-500/20 text-emerald-400",
  paused: "bg-amber-500/20 text-amber-400",
  completed: "bg-green-600/20 text-green-300",
  failed: "bg-red-500/20 text-red-400",
};

const CATEGORIES = [
  "toiture", "isolation", "pavage", "plomberie", "électricité",
  "rénovation", "paysagement", "fenêtres", "notaire", "chauffage",
  "climatisation", "peinture", "menuiserie", "excavation", "maçonnerie",
];

const AdminProspectionEngine = () => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "", target_category: "", target_city: "", target_count: 100,
    outreach_channel: "email", default_promo_code: "SIGNATURE26",
  });

  // Fetch campaigns
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["prospection-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospection_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch aggregate stats
  const { data: stats } = useQuery({
    queryKey: ["prospection-stats"],
    queryFn: async () => {
      const { data: prospects } = await supabase.from("prospects").select("status, aipp_pre_score");
      if (!prospects) return { total: 0, scored: 0, contacted: 0, converted: 0, avgScore: 0 };
      return {
        total: prospects.length,
        scored: prospects.filter((p: any) => p.aipp_pre_score > 0).length,
        contacted: prospects.filter((p: any) => ["contacted", "opened", "clicked", "started_onboarding", "converted"].includes(p.status)).length,
        converted: prospects.filter((p: any) => p.status === "converted").length,
        avgScore: prospects.filter((p: any) => p.aipp_pre_score > 0).length > 0
          ? Math.round(prospects.filter((p: any) => p.aipp_pre_score > 0).reduce((s: number, p: any) => s + Number(p.aipp_pre_score), 0) / prospects.filter((p: any) => p.aipp_pre_score > 0).length)
          : 0,
      };
    },
  });

  // Create campaign
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("prospection_campaigns").insert({
        name: newCampaign.name,
        target_category: newCampaign.target_category,
        target_city: newCampaign.target_city,
        target_count: newCampaign.target_count,
        outreach_channel: newCampaign.outreach_channel,
        default_promo_code: newCampaign.default_promo_code,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campagne créée");
      queryClient.invalidateQueries({ queryKey: ["prospection-campaigns"] });
      setShowCreate(false);
      setNewCampaign({ name: "", target_category: "", target_city: "", target_count: 100, outreach_channel: "email", default_promo_code: "SIGNATURE26" });
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });

  return (
    <AdminLayout>
      <PageHeader
        title="Moteur de Prospection"
        description="Acquisition autonome d'entrepreneurs — scrape, score, outreach, conversion"
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Prospects", value: stats?.total ?? 0, icon: Users, color: "text-primary" },
          { label: "Scorés", value: stats?.scored ?? 0, icon: Target, color: "text-violet-400" },
          { label: "Contactés", value: stats?.contacted ?? 0, icon: Mail, color: "text-amber-400" },
          { label: "Convertis", value: stats?.converted ?? 0, icon: CheckCircle2, color: "text-green-400" },
          { label: "Score moy.", value: stats?.avgScore ?? "—", icon: TrendingUp, color: "text-emerald-400" },
        ].map((s) => (
          <Card key={s.label} className="bg-card/60 backdrop-blur border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nouvelle campagne</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Créer une campagne de prospection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nom de la campagne</Label>
                <Input
                  placeholder="Ex: Couvreurs Laval 100"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Catégorie cible</Label>
                  <Select value={newCampaign.target_category} onValueChange={(v) => setNewCampaign((p) => ({ ...p, target_category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ville cible</Label>
                  <Input
                    placeholder="Ex: Laval"
                    value={newCampaign.target_city}
                    onChange={(e) => setNewCampaign((p) => ({ ...p, target_city: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nombre de prospects</Label>
                  <Input
                    type="number"
                    value={newCampaign.target_count}
                    onChange={(e) => setNewCampaign((p) => ({ ...p, target_count: parseInt(e.target.value) || 100 }))}
                  />
                </div>
                <div>
                  <Label>Canal outreach</Label>
                  <Select value={newCampaign.outreach_channel} onValueChange={(v) => setNewCampaign((p) => ({ ...p, outreach_channel: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="both">Email + SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Code promo par défaut</Label>
                <Input
                  value={newCampaign.default_promo_code}
                  onChange={(e) => setNewCampaign((p) => ({ ...p, default_promo_code: e.target.value }))}
                />
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => createMutation.mutate()}
                disabled={!newCampaign.name || createMutation.isPending}
              >
                <Rocket className="h-4 w-4" />
                Créer la campagne
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Link to="/admin/prospection/prospects">
          <Button variant="outline" className="gap-2"><Users className="h-4 w-4" />Tous les prospects</Button>
        </Link>
        <Link to="/admin/prospection/analytics">
          <Button variant="outline" className="gap-2"><BarChart3 className="h-4 w-4" />Analytics</Button>
        </Link>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Campagnes actives
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Campagne</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Catégorie</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Ville</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Cible</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Statut</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Canal</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(campaigns ?? []).map((c: any) => (
                <tr key={c.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("fr-CA")}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{c.target_category ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.target_city ?? "—"}</td>
                  <td className="p-3 text-center font-mono">{c.target_count}</td>
                  <td className="p-3 text-center">
                    <Badge className={`text-xs ${STATUS_BADGES[c.status] ?? STATUS_BADGES.draft}`}>
                      {c.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-center text-muted-foreground">{c.outreach_channel}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Link to={`/admin/prospection/campaigns/${c.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button>
                      </Link>
                      {c.status === "draft" && (
                        <Button variant="ghost" size="sm" className="text-green-400">
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {c.status === "running" && (
                        <Button variant="ghost" size="sm" className="text-amber-400">
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(!campaigns || campaigns.length === 0) && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    {isLoading ? "Chargement..." : "Aucune campagne. Créez-en une pour commencer."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminProspectionEngine;
