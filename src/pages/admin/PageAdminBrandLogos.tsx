/**
 * UNPRO — Admin · Brand Logos cockpit (Phase 2)
 * Backfill, refetch, and inspect cached brand logos.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LogoMonochromeRenderer } from "@/features/brandEngine";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";

type Filter = "all" | "missing" | "failed" | "ok";

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  logo_svg_url: string | null;
  logo_png_url: string | null;
  logo_grey_svg_url: string | null;
  logo_grey_png_url: string | null;
  logo_source: string | null;
  logo_fetched_at: string | null;
  logo_attempts: number | null;
  logo_last_error: string | null;
}

export default function PageAdminBrandLogos() {
  const { toast } = useToast();
  const [rows, setRows] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [backfilling, setBackfilling] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("brands" as any)
      .select(
        "id,name,slug,website,logo_svg_url,logo_png_url,logo_grey_svg_url,logo_grey_png_url,logo_source,logo_fetched_at,logo_attempts,logo_last_error",
      )
      .order("name");
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows((data ?? []) as any);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function refetch(brand: BrandRow) {
    setBusy(brand.id);
    const { data, error } = await supabase.functions.invoke("brand-fetch-logo", {
      body: { brand_id: brand.id, force: true },
    });
    setBusy(null);
    if (error) {
      toast({ title: "Échec", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Logo récupéré", description: `${brand.slug} · ${(data as any)?.source ?? "—"}` });
      await load();
    }
  }

  async function backfill() {
    setBackfilling(true);
    const { data, error } = await supabase.functions.invoke("brand-backfill-logos", {
      body: { limit: 200, concurrency: 5 },
    });
    setBackfilling(false);
    if (error) {
      toast({ title: "Backfill échoué", description: error.message, variant: "destructive" });
    } else {
      const r = data as any;
      toast({
        title: "Backfill terminé",
        description: `${r?.succeeded ?? 0}/${r?.processed ?? 0} marques mises à jour`,
      });
      await load();
    }
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.slug.includes(search.toLowerCase())) return false;
      const hasLogo = !!(r.logo_svg_url || r.logo_png_url);
      if (filter === "missing") return !hasLogo;
      if (filter === "failed") return !hasLogo && (r.logo_attempts ?? 0) > 0;
      if (filter === "ok") return hasLogo;
      return true;
    });
  }, [rows, filter, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const ok = rows.filter((r) => r.logo_svg_url || r.logo_png_url).length;
    const failed = rows.filter((r) => !(r.logo_svg_url || r.logo_png_url) && (r.logo_attempts ?? 0) > 0).length;
    return { total, ok, missing: total - ok, failed };
  }, [rows]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Brand Logos · Phase 2</h1>
          <p className="text-sm text-muted-foreground">
            Récupération automatique (Brandfetch → Clearbit → favicon) + variante monochrome.
          </p>
        </div>
        <Button onClick={backfill} disabled={backfilling} className="gap-2">
          {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Backfill marques manquantes
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Avec logo" value={stats.ok} accent="text-emerald-500" />
        <StatCard label="Manquantes" value={stats.missing} accent="text-amber-500" />
        <StatCard label="Échouées" value={stats.failed} accent="text-rose-500" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher une marque…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {(["all", "ok", "missing", "failed"] as Filter[]).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Toutes" : f === "ok" ? "OK" : f === "missing" ? "Manquantes" : "Échouées"}
          </Button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Logo</th>
                <th className="px-3 py-2 text-left">Marque</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Récupéré</th>
                <th className="px-3 py-2 text-left">Statut</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin inline" /> Chargement…
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const hasLogo = !!(b.logo_svg_url || b.logo_png_url);
                  return (
                    <tr key={b.id} className="border-t">
                      <td className="px-3 py-2 w-[120px]">
                        {hasLogo ? (
                          <LogoMonochromeRenderer brand={b as any} height={28} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{b.name}</div>
                        <div className="text-xs text-muted-foreground">{b.website ?? b.slug}</div>
                      </td>
                      <td className="px-3 py-2">
                        {b.logo_source ? (
                          <Badge variant="outline">{b.logo_source}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {b.logo_fetched_at ? new Date(b.logo_fetched_at).toLocaleString("fr-CA") : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {hasLogo ? (
                          <Badge className="bg-emerald-500/15 text-emerald-500">OK</Badge>
                        ) : (b.logo_attempts ?? 0) > 0 ? (
                          <Badge variant="destructive" title={b.logo_last_error ?? ""}>
                            Échec ×{b.logo_attempts}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">À récupérer</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === b.id}
                          onClick={() => refetch(b)}
                          className="gap-1"
                        >
                          {busy === b.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          Refetch
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${accent ?? ""}`}>{value}</div>
    </Card>
  );
}
