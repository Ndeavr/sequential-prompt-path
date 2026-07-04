/**
 * UNPRO — /admin/content-audit
 * Content Quality Gate cockpit: article images, contrast, category rules.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Image as ImageIcon, Sparkles } from "lucide-react";

type Cat = { id: string; slug: string; label: string };
type Rule = {
  id: string;
  category_id: string;
  allowed_tags: string[];
  blocked_tags: string[];
  required_tags: string[];
  min_confidence: number;
};
type LibImg = {
  id: string;
  category_id: string;
  url: string;
  status: "pending" | "approved" | "rejected" | "manual";
  confidence: number;
  detected_tags: string[];
  violates_blocked: string[];
  rejected_reason: string | null;
  created_at: string;
};
type ArtImg = {
  id: string;
  article_id: string;
  article_url: string | null;
  category_id: string | null;
  image_id: string | null;
  status: string;
  contrast_score: number | null;
  readability_status: string | null;
  last_audited_at: string | null;
};

export default function PageAdminContentAudit() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"articles" | "library" | "rules">("articles");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: categories = [] } = useQuery({
    queryKey: ["cq-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("content_image_categories" as any).select("id, slug, label").order("label");
      return ((data ?? []) as unknown) as Cat[];
    },
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["cq-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("content_image_rules" as any).select("*");
      return ((data ?? []) as unknown) as Rule[];
    },
  });

  const { data: library = [] } = useQuery({
    queryKey: ["cq-library", categoryFilter, statusFilter],
    queryFn: async () => {
      let q = supabase.from("content_image_library" as any).select("*").order("created_at", { ascending: false }).limit(200);
      if (categoryFilter !== "all") q = q.eq("category_id", categoryFilter);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q;
      return ((data ?? []) as unknown) as LibImg[];
    },
  });

  const { data: articles = [] } = useQuery({
    queryKey: ["cq-articles", categoryFilter, statusFilter],
    queryFn: async () => {
      let q = supabase.from("content_article_images" as any).select("*").order("last_audited_at", { ascending: false, nullsFirst: true }).limit(300);
      if (categoryFilter !== "all") q = q.eq("category_id", categoryFilter);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q;
      return ((data ?? []) as unknown) as ArtImg[];
    },
  });

  const catBySlug = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  const regenerate = useMutation({
    mutationFn: async ({ article_id, category_slug }: { article_id?: string; category_slug: string }) => {
      const { data, error } = await supabase.functions.invoke("content-image-generate", {
        body: { article_id, category_slug },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(data?.validation?.verdict === "approved" ? "Nouvelle image approuvée" : "Image générée — vérifiez la validation");
      qc.invalidateQueries({ queryKey: ["cq-library"] });
      qc.invalidateQueries({ queryKey: ["cq-articles"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de la régénération"),
  });

  const revalidate = useMutation({
    mutationFn: async (img: LibImg) => {
      const cat = catBySlug[img.category_id];
      const { data, error } = await supabase.functions.invoke("content-image-validate", {
        body: { image_url: img.url, image_id: img.id, category_slug: cat?.slug },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Ré-évaluation terminée");
      qc.invalidateQueries({ queryKey: ["cq-library"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec"),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status, table }: { id: string; status: string; table: "content_image_library" | "content_article_images" }) => {
      const { error } = await supabase.from(table as any).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["cq-library"] });
      qc.invalidateQueries({ queryKey: ["cq-articles"] });
    },
  });

  const kpis = useMemo(() => {
    const total = articles.length;
    const approved = articles.filter((a) => a.status === "approved" || a.status === "manual").length;
    const rejected = articles.filter((a) => a.status === "rejected").length;
    const pending = articles.filter((a) => a.status === "pending").length;
    return { total, approved, rejected, pending };
  }, [articles]);

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" /> Content Quality Gate
            </h1>
            <p className="text-sm text-muted-foreground">Audit lisibilité + gouvernance des images par catégorie.</p>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Articles suivis" value={kpis.total} tone="default" />
          <Kpi label="Approuvés" value={kpis.approved} tone="ok" />
          <Kpi label="À corriger" value={kpis.rejected} tone="bad" />
          <Kpi label="En attente" value={kpis.pending} tone="warn" />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {(["articles", "library", "rules"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-sm rounded-md ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t === "articles" ? "Articles" : t === "library" ? "Bibliothèque" : "Règles"}
              </button>
            ))}
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {tab !== "rules" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
                <SelectItem value="manual">Manuel</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {tab === "articles" && (
          <Card>
            <CardHeader><CardTitle>Articles</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Contraste</TableHead>
                    <TableHead>Audité</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun article suivi.</TableCell></TableRow>
                  )}
                  {articles.map((a) => {
                    const cat = a.category_id ? catBySlug[a.category_id] : null;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="max-w-xs truncate">
                          <a href={a.article_url ?? "#"} target="_blank" rel="noreferrer" className="underline text-primary">
                            {a.article_url ?? a.article_id}
                          </a>
                        </TableCell>
                        <TableCell>{cat?.label ?? "—"}</TableCell>
                        <TableCell><StatusBadge status={a.status} /></TableCell>
                        <TableCell>
                          {a.contrast_score != null
                            ? <span className={a.contrast_score >= 7 ? "text-emerald-500" : "text-amber-500"}>{a.contrast_score.toFixed(1)}:1</span>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.last_audited_at ? new Date(a.last_audited_at).toLocaleString("fr-CA") : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!cat || regenerate.isPending}
                            onClick={() => cat && regenerate.mutate({ article_id: a.article_id, category_slug: cat.slug })}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" /> Régénérer
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: a.id, status: "manual", table: "content_article_images" })}>
                            Approuver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {tab === "library" && (
          <Card>
            <CardHeader><CardTitle>Bibliothèque d'images</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {library.length === 0 && <p className="text-muted-foreground text-sm">Aucune image.</p>}
              {library.map((img) => {
                const cat = catBySlug[img.category_id];
                return (
                  <div key={img.id} className="rounded-lg border border-border overflow-hidden bg-card">
                    <div className="aspect-video bg-muted relative">
                      <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute top-2 right-2"><StatusBadge status={img.status} /></div>
                    </div>
                    <div className="p-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">{cat?.label ?? "—"}</span>
                        <span className="text-xs">conf. {(img.confidence * 100).toFixed(0)}%</span>
                      </div>
                      {img.violates_blocked?.length > 0 && (
                        <div className="text-xs text-red-500 flex items-start gap-1">
                          <AlertTriangle className="h-3 w-3 mt-0.5" /> {img.violates_blocked.join(", ")}
                        </div>
                      )}
                      {img.rejected_reason && <div className="text-xs text-muted-foreground">{img.rejected_reason}</div>}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => revalidate.mutate(img)}>Ré-évaluer</Button>
                        <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: img.id, status: "manual", table: "content_image_library" })}>Approuver</Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {tab === "rules" && (
          <Card>
            <CardHeader><CardTitle>Règles par catégorie</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {categories.map((c) => {
                const r = rules.find((x) => x.category_id === c.id);
                return (
                  <div key={c.id} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{c.label} <span className="text-muted-foreground text-xs">({c.slug})</span></h3>
                      <Button size="sm" variant="outline" onClick={() => regenerate.mutate({ category_slug: c.slug })}>
                        <ImageIcon className="h-3 w-3 mr-1" /> Générer test
                      </Button>
                    </div>
                    {r ? (
                      <div className="grid gap-2 text-sm">
                        <TagRow label="Autorisés" tags={r.allowed_tags} tone="ok" />
                        <TagRow label="Bloqués" tags={r.blocked_tags} tone="bad" />
                        <TagRow label="Requis" tags={r.required_tags} tone="warn" />
                        <div className="text-xs text-muted-foreground">Confiance minimale : {(r.min_confidence * 100).toFixed(0)}%</div>
                      </div>
                    ) : <p className="text-xs text-muted-foreground">Aucune règle définie.</p>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: "default" | "ok" | "bad" | "warn" }) {
  const color = tone === "ok" ? "text-emerald-500" : tone === "bad" ? "text-red-500" : tone === "warn" ? "text-amber-500" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-3xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    approved: { label: "Approuvé", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: CheckCircle2 },
    manual: { label: "Manuel", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: CheckCircle2 },
    rejected: { label: "Rejeté", cls: "bg-red-500/15 text-red-500 border-red-500/30", icon: XCircle },
    pending: { label: "En attente", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30", icon: AlertTriangle },
  };
  const m = map[status] ?? map.pending;
  const Icon = m.icon;
  return <Badge variant="outline" className={`${m.cls} gap-1`}><Icon className="h-3 w-3" /> {m.label}</Badge>;
}

function TagRow({ label, tags, tone }: { label: string; tags: string[]; tone: "ok" | "bad" | "warn" }) {
  const color = tone === "ok" ? "border-emerald-500/30 text-emerald-500" : tone === "bad" ? "border-red-500/30 text-red-500" : "border-amber-500/30 text-amber-500";
  return (
    <div className="flex flex-wrap gap-1 items-center">
      <span className="text-xs text-muted-foreground w-20">{label}:</span>
      {tags.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
      {tags.map((t) => <span key={t} className={`text-xs px-2 py-0.5 rounded-full border ${color}`}>{t}</span>)}
    </div>
  );
}
