/**
 * AdminWarProspecting — UNPRO War Room
 * Premium glassmorphism prospecting dashboard with realtime updates.
 * Route: /admin/war-prospecting
 */
import { useMemo, useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState, StatCard } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Rocket, CheckCircle2, XCircle, Mail, Eye, Target, TrendingUp, Users, Send } from "lucide-react";
import { useWarProspects, useWarStats, type WarProspectStatus, type WarCategory, type WarProspect } from "@/hooks/useWarProspects";

const TABS: { value: WarProspectStatus; label: string; icon: any }[] = [
  { value: "pending", label: "En attente", icon: Eye },
  { value: "approved", label: "Approuvés", icon: CheckCircle2 },
  { value: "rejected", label: "Rejetés", icon: XCircle },
  { value: "emailed", label: "Envoyés", icon: Send },
  { value: "replied", label: "Réponses", icon: Mail },
];

const CATEGORIES: { value: WarCategory | "all"; label: string }[] = [
  { value: "all", label: "Toutes catégories" },
  { value: "toiture", label: "Toiture" },
  { value: "asphalte", label: "Asphalte" },
  { value: "gazon", label: "Gazon" },
  { value: "peinture", label: "Peinture" },
];

const scoreColor = (s: number) =>
  s >= 75 ? "text-emerald-400" : s >= 50 ? "text-amber-400" : "text-rose-400";

const categoryBadge = (c: string) => {
  const map: Record<string, string> = {
    toiture: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    asphalte: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
    gazon: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    peinture: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  };
  return map[c] || "bg-muted text-muted-foreground";
};

export default function AdminWarProspecting() {
  const [tab, setTab] = useState<WarProspectStatus>("pending");
  const [cat, setCat] = useState<WarCategory | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewProspect, setPreviewProspect] = useState<WarProspect | null>(null);

  const { list, updateStatus, generateEmail, runPipeline, launchCampaign } = useWarProspects(
    tab,
    cat === "all" ? undefined : cat,
  );
  const { data: stats } = useWarStats();

  const prospects = list.data || [];
  const allSelected = prospects.length > 0 && prospects.every((p) => selected.has(p.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(prospects.map((p) => p.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const bulkApprove = () => {
    if (!selected.size) return;
    updateStatus.mutate({ ids: Array.from(selected), status: "approved" });
    setSelected(new Set());
  };
  const bulkReject = () => {
    if (!selected.size) return;
    updateStatus.mutate({ ids: Array.from(selected), status: "rejected" });
    setSelected(new Set());
  };

  const openPreview = async (p: WarProspect) => {
    if (!p.email_preview) {
      await generateEmail.mutateAsync(p.id);
      // refetch happens via realtime; pull latest
      const fresh = list.data?.find((x) => x.id === p.id);
      setPreviewProspect(fresh || p);
    } else {
      setPreviewProspect(p);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="WAR Prospecting"
        description="Prospects Laval — Toiture · Asphalte · Gazon · Peinture"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard title="Total" value={stats?.total ?? 0} icon={<Users className="h-4 w-4" />} />
        <StatCard title="En attente" value={stats?.counts.pending ?? 0} icon={<Eye className="h-4 w-4" />} />
        <StatCard title="Approuvés" value={stats?.counts.approved ?? 0} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard title="Envoyés" value={stats?.counts.emailed ?? 0} icon={<Send className="h-4 w-4" />} />
        <StatCard title="Réponses" value={stats?.counts.replied ?? 0} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl border border-border/50 bg-card/40 backdrop-blur-md">
        <Button
          onClick={() => runPipeline.mutate()}
          disabled={runPipeline.isPending}
          className="gap-2 bg-gradient-to-r from-primary to-primary/80"
        >
          <Sparkles className="h-4 w-4" />
          {runPipeline.isPending ? "Recherche..." : "Lancer recherche IA"}
        </Button>
        <Button
          onClick={() => launchCampaign.mutate(undefined)}
          disabled={launchCampaign.isPending || !stats?.counts.approved}
          variant="default"
          className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500"
        >
          <Rocket className="h-4 w-4" />
          Lancer campagne ({stats?.counts.approved ?? 0})
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Select value={cat} onValueChange={(v) => setCat(v as any)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v as WarProspectStatus); setSelected(new Set()); }}>
        <TabsList className="grid grid-cols-5 w-full mb-4">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-2">
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
              <Badge variant="secondary" className="ml-1 text-[10px] h-5">{stats?.counts[t.value] ?? 0}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-primary/10 border border-primary/30">
            <span className="text-sm font-medium">{selected.size} sélectionné(s)</span>
            <Button size="sm" onClick={bulkApprove} className="ml-auto gap-1 bg-emerald-600 hover:bg-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" /> Approuver
            </Button>
            <Button size="sm" variant="destructive" onClick={bulkReject} className="gap-1">
              <XCircle className="h-3.5 w-3.5" /> Rejeter
            </Button>
          </div>
        )}

        {/* Table */}
        {list.isLoading ? <LoadingState /> :
          !prospects.length ? <EmptyState message="Aucun prospect dans cet onglet." /> : (
            <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                    </TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="hidden md:table-cell">Site</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prospects.map((p) => (
                    <TableRow key={p.id} className="hover:bg-primary/5">
                      <TableCell>
                        <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleOne(p.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{p.company_name}</div>
                        {p.rating && (
                          <div className="text-xs text-muted-foreground">★ {p.rating} · {p.reviews_count} avis</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={categoryBadge(p.category)}>{p.category}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs max-w-[180px] truncate">
                        {p.website || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {p.email || <span className="text-rose-400/70">manquant</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold text-lg ${scoreColor(p.lead_score)}`}>{p.lead_score}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {tab === "pending" && (
                            <>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-400 hover:bg-emerald-500/10"
                                onClick={() => updateStatus.mutate({ ids: [p.id], status: "approved" })}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-400 hover:bg-rose-500/10"
                                onClick={() => updateStatus.mutate({ ids: [p.id], status: "rejected" })}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openPreview(p)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </Tabs>

      {/* Email preview modal */}
      <Dialog open={!!previewProspect} onOpenChange={(o) => !o && setPreviewProspect(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> Aperçu courriel — {previewProspect?.company_name}
            </DialogTitle>
          </DialogHeader>
          {previewProspect && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm p-3 rounded-lg bg-muted/30">
                <div><span className="text-muted-foreground">À:</span> <span className="font-medium">{previewProspect.email || "manquant"}</span></div>
                <div><span className="text-muted-foreground">Score:</span> <span className={`font-bold ${scoreColor(previewProspect.lead_score)}`}>{previewProspect.lead_score}/100</span></div>
              </div>
              {previewProspect.email_subject && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Sujet</div>
                  <div className="font-semibold">{previewProspect.email_subject}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Contenu</div>
                <div className="p-4 rounded-lg border border-border/50 bg-card/60 whitespace-pre-wrap text-sm leading-relaxed">
                  {previewProspect.email_preview || "Aucun aperçu généré. Cliquez sur Régénérer."}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => generateEmail.mutate(previewProspect.id)}>
                  <Sparkles className="h-4 w-4 mr-2" /> Régénérer
                </Button>
                {previewProspect.status === "pending" && (
                  <Button onClick={() => { updateStatus.mutate({ ids: [previewProspect.id], status: "approved" }); setPreviewProspect(null); }}
                    className="bg-emerald-600 hover:bg-emerald-500">
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Approuver
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
