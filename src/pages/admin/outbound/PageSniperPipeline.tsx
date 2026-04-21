import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Target, Mail, Phone, Send, Loader2, Play, RefreshCw,
  CheckCircle2, AlertTriangle, Zap, TrendingUp, Crosshair,
  Clock, XCircle, Activity
} from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "outline" },
  running: { label: "En cours…", variant: "secondary" },
  done: { label: "Enrichi", variant: "default" },
  failed: { label: "Échoué", variant: "destructive" },
};

const OUTREACH_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "—", variant: "outline" },
  queued: { label: "En file", variant: "secondary" },
  sent: { label: "Envoyé", variant: "default" },
  delivered: { label: "Livré", variant: "default" },
  opened: { label: "Ouvert", variant: "default" },
  replied: { label: "Répondu ✓", variant: "default" },
  booked: { label: "Booké 🎯", variant: "default" },
};

export default function PageSniperPipeline() {
  const qc = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);

  // Live pipeline data
  const { data: prospects, isLoading, refetch } = useQuery({
    queryKey: ["sniper-pipeline"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contractors_prospects")
        .select("id, business_name, city, category, phone, email, website, domain, enrichment_status, enriched_at, emails_found, email_confidence, verified_email, sms_queue_status, outreach_status, aipp_score")
        .ilike("city", "laval")
        .ilike("category", "%insul%")
        .order("aipp_score", { ascending: false })
        .limit(50);
      return (data || []) as any[];
    },
    refetchInterval: 5000,
  });

  // Pipeline KPIs
  const pending = prospects?.filter((p: any) => p.enrichment_status === "pending").length || 0;
  const processing = prospects?.filter((p: any) => p.enrichment_status === "running").length || 0;
  const enriched = prospects?.filter((p: any) => p.enrichment_status === "done").length || 0;
  const failed = prospects?.filter((p: any) => p.enrichment_status === "failed").length || 0;
  const total = prospects?.length || 0;
  const emailsFound = prospects?.filter((p: any) => p.verified_email).length || 0;
  const smsReady = prospects?.filter((p: any) => p.sms_queue_status === "queued").length || 0;
  const queued = prospects?.filter((p: any) => p.outreach_status === "queued").length || 0;
  const sent = prospects?.filter((p: any) => ["sent", "delivered"].includes(p.outreach_status)).length || 0;
  const replied = prospects?.filter((p: any) => p.outreach_status === "replied").length || 0;
  const booked = prospects?.filter((p: any) => p.outreach_status === "booked").length || 0;

  const enrichmentProgress = total > 0 ? Math.round((enriched / total) * 100) : 0;
  const outreachReady = emailsFound >= 10;

  // Discover new prospects
  const discover = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("enrich-prospect", {
        body: { mode: "discover", city: "Laval", category: "Insulation", limit: 25 },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`${data.newProspects} nouveaux prospects découverts`);
      qc.invalidateQueries({ queryKey: ["sniper-pipeline"] });
    },
    onError: () => toast.error("Erreur lors de la découverte"),
  });

  // Enrich single
  const enrichOne = useMutation({
    mutationFn: async (id: string) => {
      setLoading(id);
      const res = await supabase.functions.invoke("enrich-prospect", {
        body: { mode: "enrich_one", prospect_id: id },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (data) => {
      setLoading(null);
      toast.success(data.result?.email ? `Email trouvé: ${data.result.email}` : "Aucun email trouvé");
      qc.invalidateQueries({ queryKey: ["sniper-pipeline"] });
    },
    onError: () => { setLoading(null); toast.error("Erreur"); },
  });

  return (
    <AdminLayout>
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Crosshair className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Pipeline Sniper — Laval × Isolation</h1>
              <p className="text-sm text-muted-foreground">
                Cron actif : 3 prospects / minute • Enrichissement → Outreach → Revenue
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Rafraîchir
            </Button>
            <Button size="sm" variant="outline" onClick={() => discover.mutate()} disabled={discover.isPending}>
              {discover.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Target className="h-4 w-4 mr-1" />}
              Découvrir +25
            </Button>
          </div>
        </div>

        {/* Enrichment Progress Bar */}
        <Card>
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary animate-pulse" />
                <span className="font-medium">Enrichissement progressif</span>
              </div>
              <span className="text-muted-foreground">{enriched}/{total} ({enrichmentProgress}%)</span>
            </div>
            <Progress value={enrichmentProgress} className="h-2" />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {pending} en attente</span>
              <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> {processing} en cours</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> {enriched} enrichis</span>
              <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" /> {failed} échoués</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {[
            { label: "Prospects", value: total, icon: Target, color: "text-blue-400" },
            { label: "Emails", value: emailsFound, icon: Mail, color: "text-green-400" },
            { label: "SMS prêts", value: smsReady, icon: Phone, color: "text-amber-400" },
            { label: "En file", value: queued, icon: Send, color: "text-purple-400" },
            { label: "Envoyés", value: sent, icon: CheckCircle2, color: "text-cyan-400" },
            { label: "Réponses", value: replied, icon: Zap, color: "text-yellow-400" },
            { label: "Bookés", value: booked, icon: Crosshair, color: "text-red-400" },
            { label: "Échecs", value: failed, icon: XCircle, color: "text-red-400" },
          ].map(k => (
            <Card key={k.label} className="text-center">
              <CardContent className="py-3 px-2">
                <k.icon className={`h-4 w-4 mx-auto mb-1 ${k.color}`} />
                <div className="text-lg font-bold">{k.value}</div>
                <div className="text-[10px] text-muted-foreground">{k.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Auto-outreach threshold */}
        {outreachReady ? (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="py-3 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">🎯 Auto-outreach débloqué — {emailsFound} emails vérifiés</span>
            </CardContent>
          </Card>
        ) : total > 0 ? (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="py-3 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-medium">
                {10 - emailsFound} emails manquants pour auto-outreach ({emailsFound}/10)
                {pending > 0 && ` • ${pending} prospects en file d'enrichissement`}
              </span>
            </CardContent>
          </Card>
        ) : null}

        {/* Prospects Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Prospects ({total})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Entreprise</TableHead>
                      <TableHead className="text-xs">AIPP</TableHead>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">Conf.</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                      <TableHead className="text-xs">SMS</TableHead>
                      <TableHead className="text-xs">Outreach</TableHead>
                      <TableHead className="text-xs w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(prospects || []).map((p: any) => {
                      const enrBadge = STATUS_BADGE[p.enrichment_status] || STATUS_BADGE.pending;
                      const outBadge = OUTREACH_BADGE[p.outreach_status] || OUTREACH_BADGE.pending;
                      return (
                        <TableRow key={p.id} className={p.enrichment_status === "running" ? "bg-primary/5" : ""}>
                          <TableCell>
                            <div className="font-medium text-xs">{p.business_name}</div>
                            {p.website && <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{p.domain || p.website}</div>}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-mono">{p.aipp_score || "—"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs truncate max-w-[160px] block">
                              {p.verified_email || p.email || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {p.email_confidence > 0 ? (
                              <span className={`text-xs font-mono ${p.email_confidence >= 80 ? "text-green-400" : p.email_confidence >= 50 ? "text-amber-400" : "text-red-400"}`}>
                                {p.email_confidence}%
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={enrBadge.variant} className="text-[10px]">
                              {p.enrichment_status === "running" && <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />}
                              {enrBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {p.sms_queue_status === "queued" ? (
                              <Badge variant="secondary" className="text-[10px]">SMS 📱</Badge>
                            ) : p.sms_queue_status === "sent" ? (
                              <Badge variant="default" className="text-[10px]">Envoyé</Badge>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={outBadge.variant} className="text-[10px]">{outBadge.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              disabled={loading === p.id || p.enrichment_status === "running"}
                              onClick={() => enrichOne.mutate(p.id)}
                            >
                              {loading === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
