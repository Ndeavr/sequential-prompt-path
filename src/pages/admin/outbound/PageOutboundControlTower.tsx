import AdminLayout from "@/layouts/AdminLayout";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Users, Sparkles, Gauge, FileText, Mail, AlertTriangle,
  FlaskConical, ArrowRight, RefreshCw, ExternalLink,
} from "lucide-react";

interface Stats {
  prospects_total: number;
  prospects_new: number;
  prospects_enriched: number;
  contractors: number;
  scores: number;
  pages: number;
  invites_draft: number;
  invites_sent: number;
  errors_24h: number;
}

interface RecentLog {
  id: string;
  status: string;
  source_module: string;
  message: string;
  created_at: string;
}

interface RecentPage {
  id: string;
  page_slug: string;
  contractor_id: string;
  page_status: string;
  created_at: string;
  acq_contractors?: { company_name: string; city: string | null } | null;
}

export default function PageOutboundControlTower() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<RecentLog[]>([]);
  const [pages, setPages] = useState<RecentPage[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [
        pTotal, pNew, pEnriched, contractors, scores, pagesC, invDraft, invSent, errs,
        logsRes, pagesList,
      ] = await Promise.all([
        supabase.from("contractor_prospects").select("id", { count: "exact", head: true }),
        supabase.from("contractor_prospects").select("id", { count: "exact", head: true }).eq("enrichment_status", "pending"),
        supabase.from("contractor_prospects").select("id", { count: "exact", head: true }).eq("enrichment_status", "enriched"),
        supabase.from("acq_contractors").select("id", { count: "exact", head: true }),
        supabase.from("acq_contractor_scores" as any).select("id", { count: "exact", head: true }),
        supabase.from("acq_aipp_pages").select("id", { count: "exact", head: true }),
        supabase.from("acq_invites" as any).select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("acq_invites" as any).select("id", { count: "exact", head: true }).eq("status", "sent"),
        supabase.from("pipeline_logs").select("id", { count: "exact", head: true })
          .eq("status", "error").gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
        supabase.from("pipeline_logs").select("id, status, source_module, message, created_at")
          .order("created_at", { ascending: false }).limit(15),
        supabase.from("acq_aipp_pages")
          .select("id, page_slug, contractor_id, page_status, created_at, acq_contractors(company_name, city)")
          .order("created_at", { ascending: false }).limit(8),
      ]);

      setStats({
        prospects_total: pTotal.count ?? 0,
        prospects_new: pNew.count ?? 0,
        prospects_enriched: pEnriched.count ?? 0,
        contractors: contractors.count ?? 0,
        scores: scores.count ?? 0,
        pages: pagesC.count ?? 0,
        invites_draft: invDraft.count ?? 0,
        invites_sent: invSent.count ?? 0,
        errors_24h: errs.count ?? 0,
      });
      setLogs((logsRes.data as RecentLog[]) ?? []);
      setPages((pagesList.data as any) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const StatCard = ({ icon: Icon, label, value, hint }: any) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
          </div>
          <div className="p-1.5 rounded-lg bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10"><Activity className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold font-display">Outbound Control Tower</h1>
              <p className="text-xs text-muted-foreground">État réel du pipeline — données live</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Rafraîchir
            </Button>
            <Link to="/admin/outbound/test-center">
              <Button size="sm" className="gap-2">
                <FlaskConical className="h-3.5 w-3.5" /> Test Center
              </Button>
            </Link>
          </div>
        </div>

        {/* Pipeline stats */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pipeline réel</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <StatCard icon={Users} label="Prospects" value={stats?.prospects_total ?? "—"} hint={`${stats?.prospects_new ?? 0} en attente`} />
            <StatCard icon={Sparkles} label="Enrichis" value={stats?.prospects_enriched ?? "—"} hint="enrichment_status=enriched" />
            <StatCard icon={Gauge} label="Scores AIPP" value={stats?.scores ?? "—"} hint="acq_contractor_scores" />
            <StatCard icon={FileText} label="Landings" value={stats?.pages ?? "—"} hint="acq_aipp_pages" />
            <StatCard icon={Mail} label="Emails" value={`${stats?.invites_sent ?? 0}/${(stats?.invites_draft ?? 0) + (stats?.invites_sent ?? 0)}`} hint={`${stats?.invites_draft ?? 0} drafts`} />
          </div>
        </div>

        {/* Errors banner */}
        {(stats?.errors_24h ?? 0) > 0 && (
          <Card className="border-red-500/40 bg-red-500/5">
            <CardContent className="p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-sm">
                <span className="font-semibold text-red-500">{stats?.errors_24h}</span> erreurs dans les dernières 24h
              </p>
            </CardContent>
          </Card>
        )}

        {/* Two-column: pages + logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Dernières landings générées</CardTitle>
              <Badge variant="outline" className="text-[10px]">{pages.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {pages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Aucune landing — lance un test</p>
              ) : (
                <div className="divide-y">
                  {pages.map((p) => (
                    <a key={p.id} href={`/aipp/${p.page_slug}`} target="_blank" rel="noreferrer"
                      className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.acq_contractors?.company_name ?? "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{p.acq_contractors?.city ?? "—"} · /aipp/{p.page_slug}</p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Logs pipeline (récents)</CardTitle>
              <Badge variant="outline" className="text-[10px]">{logs.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {logs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Aucun log</p>
              ) : (
                <div className="divide-y max-h-96 overflow-auto">
                  {logs.map((l) => (
                    <div key={l.id} className="p-3 text-xs">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant={l.status === "error" ? "destructive" : "outline"}
                          className="text-[10px] h-4 px-1.5">{l.status}</Badge>
                        <span className="text-muted-foreground">{l.source_module}</span>
                        <span className="text-muted-foreground ml-auto">{new Date(l.created_at).toLocaleTimeString("fr-CA")}</span>
                      </div>
                      <p className="text-foreground/80">{l.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick links */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Accès rapide</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Link to="/admin/outbound/test-center" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 text-sm">
              <span>Test Center</span><ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link to="/admin/outbound/leads" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 text-sm">
              <span>Leads</span><ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link to="/admin/outbound/landing-pages" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 text-sm">
              <span>Landings</span><ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link to="/admin/outbound/logs" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 text-sm">
              <span>Logs complets</span><ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
