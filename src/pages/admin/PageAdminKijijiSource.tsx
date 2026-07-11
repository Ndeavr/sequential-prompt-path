import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Play, RefreshCw, AlertTriangle, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPageTracking } from "@/hooks/useAdminPageTracking";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const QC_CITIES = [
  "Laval","Montreal","Terrebonne","Mascouche","Repentigny","Longueuil","Brossard",
  "Saint-Jerome","Mirabel","Blainville","Boisbriand","Sainte-Therese",
  "Vaudreuil-Dorion","West Island","Laurentides","Lanaudiere","Monteregie",
  "Quebec City","Gatineau","Trois-Rivieres","Sherbrooke",
];

export default function PageAdminKijijiSource() {
  useAdminPageTracking();
  const qc = useQueryClient();
  const [selectedCity, setSelectedCity] = useState<string>("");

  const source = useQuery({
    queryKey: ["scraping-source", "kijiji_services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("scraping_sources" as any)
        .select("*").eq("source_key", "kijiji_services").single();
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 15000,
  });

  const runs = useQuery({
    queryKey: ["scrape-runs", "kijiji_services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("scrape_runs" as any)
        .select("*").eq("source_key", "kijiji_services")
        .order("started_at", { ascending: false }).limit(20);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    refetchInterval: 10000,
  });

  const funnel = useQuery({
    queryKey: ["kijiji-funnel"],
    queryFn: async () => {
      const [{ count: discovered }, { count: qualified }, { count: rejected }, { count: duplicates }, { count: prospects }] = await Promise.all([
        supabase.from("prospect_source_listings" as any).select("id", { count: "exact", head: true }).eq("source_key", "kijiji_services"),
        supabase.from("prospect_source_listings" as any).select("id", { count: "exact", head: true }).eq("source_key", "kijiji_services").is("rejection_reason", null),
        supabase.from("prospect_source_listings" as any).select("id", { count: "exact", head: true }).eq("source_key", "kijiji_services").not("rejection_reason", "is", null),
        supabase.from("prospect_source_listings" as any).select("id", { count: "exact", head: true }).eq("source_key", "kijiji_services").eq("rejection_reason", "duplicate"),
        supabase.from("contractor_prospects" as any).select("id", { count: "exact", head: true }).eq("source_key", "kijiji_services"),
      ]);
      return { discovered: discovered ?? 0, qualified: qualified ?? 0, rejected: rejected ?? 0, duplicates: duplicates ?? 0, prospects: prospects ?? 0 };
    },
    refetchInterval: 15000,
  });

  const buckets = useQuery({
    queryKey: ["kijiji-buckets"],
    queryFn: async () => {
      const { data } = await supabase.from("contractor_prospects" as any)
        .select("id, acquisition_score, phone_type, phone_sms_capable, outreach_eligibility")
        .eq("source_key", "kijiji_services").limit(1000);
      const rows = (data as any[]) ?? [];
      const inBucket = (r: any) => {
        const s = r.acquisition_score ?? 0;
        const mobile = r.phone_type === "mobile" && r.phone_sms_capable;
        if (s >= 80 && mobile) return "P0";
        if (s >= 65 && mobile) return "P1";
        if (s >= 65 && r.outreach_eligibility === "email_only") return "P2";
        if (s >= 50) return "P3";
        return "REJECT";
      };
      return {
        P0: rows.filter(r => inBucket(r) === "P0").length,
        P1: rows.filter(r => inBucket(r) === "P1").length,
        P2: rows.filter(r => inBucket(r) === "P2").length,
        P3: rows.filter(r => inBucket(r) === "P3").length,
      };
    },
    refetchInterval: 15000,
  });

  const runScrape = useMutation({
    mutationFn: async (city?: string) => {
      const { data, error } = await supabase.functions.invoke("scrape-kijiji-services", {
        body: city ? { city, max_pages: 3 } : { max_pages: 2 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Scrape lancé"); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  const runProcess = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("process-kijiji-listing", { body: { limit: 50 } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Traitement en cours"); qc.invalidateQueries(); },
  });

  const runValidate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("validate-kijiji-contact", { body: { limit: 50 } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Validation lancée"); qc.invalidateQueries(); },
  });

  const queueP0 = useMutation({
    mutationFn: async (dryRun: boolean) => {
      if (!dryRun && !window.confirm("Envoi SMS réels via Twilio aux prospects P0. Continuer ?")) {
        return { cancelled: true };
      }
      const { data, error } = await supabase.functions.invoke("queue-kijiji-outreach", {
        body: { bucket: "P0", limit: 25, dry_run: dryRun },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      if (d?.cancelled) return;
      const parts = [`file: ${d.queued ?? 0}`, `envoyés: ${d.sent ?? 0}`, `échecs: ${d.failed ?? 0}`, `exclus: ${d.skipped ?? 0}`];
      toast.success(`P0 ${d.dry_run ? "(dry run)" : "réel"} — ${parts.join(" · ")}`);
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const s = source.data;
  const isBlocked = s?.scrape_status === "blocked_by_source";
  const isPaused = s?.status !== "active";

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Link to="/admin/outreach-command-center" className="inline-flex items-center gap-1 text-xs text-readable-muted hover:text-readable mb-2">
              <ArrowLeft className="w-3 h-3" /> Outreach Command Center
            </Link>
            <h1 className="text-3xl font-bold text-readable">Kijiji Services — Acquisition</h1>
            <p className="text-sm text-readable-muted mt-1">
              Source active pour recruter des entrepreneurs QC. Massage & non-résidentiel exclus.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isBlocked && <Badge variant="destructive" className="gap-1"><ShieldOff className="w-3 h-3"/> Bloqué</Badge>}
            {isPaused && <Badge variant="outline">Pausé</Badge>}
            {!isBlocked && !isPaused && <Badge className="bg-emerald-600">Actif</Badge>}
          </div>
        </header>

        {isBlocked && (
          <Card className="p-4 border-red-500/40 bg-red-500/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-readable">Kijiji bloque l'accès automatisé</div>
                <p className="text-xs text-readable-muted mt-1">
                  Le scraper s'est arrêté proprement. Import manuel requis. Dernière erreur : {s?.last_error ?? "—"}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Funnel */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Annonces découvertes" value={funnel.data?.discovered} />
          <StatCard label="Qualifiées" value={funnel.data?.qualified} tone="success" />
          <StatCard label="Rejetées" value={funnel.data?.rejected} tone="warn" />
          <StatCard label="Doublons" value={funnel.data?.duplicates} />
          <StatCard label="Prospects canoniques" value={funnel.data?.prospects} tone="primary" />
        </section>

        {/* Priority buckets */}
        <section>
          <h2 className="text-lg font-semibold text-readable mb-3">Files de priorité</h2>
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="P0 — mobile score ≥80" value={buckets.data?.P0} tone="success" />
            <StatCard label="P1 — mobile score ≥65" value={buckets.data?.P1} tone="primary" />
            <StatCard label="P2 — email score ≥65" value={buckets.data?.P2} />
            <StatCard label="P3 — score 50-64" value={buckets.data?.P3} tone="warn" />
          </div>
        </section>

        {/* Actions */}
        <section className="flex flex-wrap gap-2">
          <Button onClick={() => runScrape.mutate(undefined)} disabled={runScrape.isPending || isBlocked}>
            <Play className="w-4 h-4 mr-1" /> Scraper QC
          </Button>
          <select
            className="rounded-md border border-white/10 bg-transparent px-2 text-sm text-readable"
            value={selectedCity}
            onChange={e => setSelectedCity(e.target.value)}
          >
            <option value="">Choisir une ville…</option>
            {QC_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button variant="outline" onClick={() => selectedCity && runScrape.mutate(selectedCity)} disabled={!selectedCity || runScrape.isPending || isBlocked}>
            Scraper ville
          </Button>
          <Button variant="outline" onClick={() => runProcess.mutate()} disabled={runProcess.isPending}>
            <RefreshCw className="w-4 h-4 mr-1" /> Traiter les annonces
          </Button>
          <Button variant="outline" onClick={() => runValidate.mutate()} disabled={runValidate.isPending}>
            Valider les contacts
          </Button>
          <Button variant="outline" onClick={() => queueP0.mutate(true)} disabled={queueP0.isPending}>
            Queue P0 (dry run)
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={() => queueP0.mutate(false)} disabled={queueP0.isPending}>
            Queue P0 (envoyer)
          </Button>
        </section>

        {/* Recent runs */}
        <section>
          <h2 className="text-lg font-semibold text-readable mb-3">Runs récents</h2>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr className="text-left text-xs text-readable-muted">
                  <th className="p-2">Ville</th><th className="p-2">Statut</th>
                  <th className="p-2">Pages</th><th className="p-2">Découverts</th>
                  <th className="p-2">Traités</th><th className="p-2">Qualifiés</th>
                  <th className="p-2">Rejetés</th><th className="p-2">Doublons</th>
                  <th className="p-2">Début</th>
                </tr>
              </thead>
              <tbody>
                {(runs.data ?? []).map(r => (
                  <tr key={r.id} className="border-t border-white/5">
                    <td className="p-2 text-readable">{r.city ?? "—"}</td>
                    <td className="p-2">
                      <Badge variant={r.status === "completed" ? "default" : r.status === "blocked_by_source" ? "destructive" : "outline"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="p-2 text-readable-muted">{r.pages_successful}/{r.pages_requested}</td>
                    <td className="p-2 text-readable">{r.listings_discovered}</td>
                    <td className="p-2 text-readable-muted">{r.listings_processed}</td>
                    <td className="p-2 text-readable">{r.listings_qualified}</td>
                    <td className="p-2 text-readable-muted">{r.listings_rejected}</td>
                    <td className="p-2 text-readable-muted">{r.duplicates_found}</td>
                    <td className="p-2 text-readable-muted">{new Date(r.started_at).toLocaleString("fr-CA")}</td>
                  </tr>
                ))}
                {!runs.data?.length && (
                  <tr><td colSpan={9} className="p-4 text-center text-readable-muted">Aucun run pour le moment.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number | undefined; tone?: "success" | "warn" | "primary" }) {
  const toneCls =
    tone === "success" ? "text-emerald-400" :
    tone === "warn" ? "text-amber-400" :
    tone === "primary" ? "text-sky-400" : "text-readable";
  return (
    <Card className="p-3">
      <div className="text-[10px] uppercase tracking-widest text-readable-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${toneCls}`}>{value ?? "—"}</div>
    </Card>
  );
}
