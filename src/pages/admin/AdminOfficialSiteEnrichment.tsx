/**
 * UNPRO — Admin Official-Site Enrichment Preview
 * /admin/official-site-enrichment
 *
 * READ-ONLY. Queries real production data (contractor_leads +
 * official_site_crawl_runs) and explains, per lead, whether it would be
 * enriched by the official-site crawler, is complete, blocked, has no
 * official domain, etc.
 *
 * Never mutates leads. Never triggers a crawl (single-record dry-run
 * remains available via the existing /admin/commercial-eligibility flow;
 * the "Run bounded backfill" button is intentionally disabled).
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Search, ShieldCheck, AlertTriangle, Info, Lock } from "lucide-react";
import {
  classifyOfficialSiteState,
  hasUsableOfficialDomain,
  isEnrichmentPending,
  type OfficialSiteState,
} from "../../../supabase/functions/_shared/officialSiteGate";

type LeadRow = {
  id: string;
  company_name: string | null;
  city: string | null;
  category: string | null;
  phone: string | null;
  phone_e164: string | null;
  email: string | null;
  website_url: string | null;
  official_domain: string | null;
  official_site_status: string | null;
  official_site_checked_at: string | null;
  missing_contact_after_crawl: boolean | null;
};

type CrawlRow = {
  contractor_lead_id: string | null;
  status: string;
  created_at: string;
  reason: string | null;
};

interface Enriched extends LeadRow {
  state: OfficialSiteState;
  proposed_action: "would_crawl" | "would_skip" | "already_terminal" | "no_domain";
  reason: string;
  attempts: number;
  last_error: string | null;
  missing_phone_before: boolean;
  missing_email_before: boolean;
}

function stateBadge(s: OfficialSiteState) {
  const map: Record<OfficialSiteState, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    complete_with_contact: { label: "Contact trouvé", variant: "default" },
    complete_no_contact: { label: "Sans contact", variant: "secondary" },
    no_official_domain: { label: "Pas de site officiel", variant: "outline" },
    blocked: { label: "Bloqué", variant: "destructive" },
    official_site_enrichment_required: { label: "Enrichissement requis", variant: "secondary" },
    official_site_enrichment_queued: { label: "En file", variant: "secondary" },
    official_site_enrichment_running: { label: "En cours", variant: "secondary" },
    official_site_enrichment_retryable: { label: "À réessayer", variant: "outline" },
  };
  const cfg = map[s];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export default function AdminOfficialSiteEnrichment() {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");

  const query = useQuery({
    queryKey: ["admin-official-site-enrichment"],
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from("contractor_leads")
        .select("id,company_name,city,category_primary,phone,phone_e164,email,website_url,official_domain,official_site_status,official_site_checked_at,missing_contact_after_crawl")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      const rows = ((leads ?? []) as any[]).map(r => ({ ...r, category: r.category_primary ?? null })) as LeadRow[];

      const ids = rows.map(r => r.id);
      const runsByLead = new Map<string, CrawlRow[]>();
      if (ids.length > 0) {
        // Chunk to keep query size sane.
        for (let i = 0; i < ids.length; i += 500) {
          const chunk = ids.slice(i, i + 500);
          const { data: runs } = await supabase
            .from("official_site_crawl_runs")
            .select("contractor_lead_id,status,created_at,reason")
            .in("contractor_lead_id", chunk)
            .order("created_at", { ascending: false });
          for (const r of (runs ?? []) as CrawlRow[]) {
            if (!r.contractor_lead_id) continue;
            const arr = runsByLead.get(r.contractor_lead_id) ?? [];
            arr.push(r);
            runsByLead.set(r.contractor_lead_id, arr);
          }
        }
      }

      const enriched: Enriched[] = rows.map(r => {
        const state = classifyOfficialSiteState({
          phone: r.phone ?? r.phone_e164 ?? null,
          email: r.email ?? null,
          website_url: r.website_url ?? null,
          official_domain: r.official_domain ?? null,
          official_site_status: r.official_site_status ?? null,
        });
        const runs = runsByLead.get(r.id) ?? [];
        const attempts = runs.length;
        const lastFailure = runs.find(x => x.status === "failed" || x.status === "retryable");
        const missing_phone_before = !r.phone && !r.phone_e164;
        const missing_email_before = !r.email;

        let action: Enriched["proposed_action"] = "would_skip";
        let reason = "already has contact";
        if (!hasUsableOfficialDomain(r.official_domain ?? r.website_url ?? null)) {
          action = "no_domain"; reason = "no usable official domain";
        } else if (state === "complete_with_contact" || state === "complete_no_contact" || state === "blocked") {
          action = "already_terminal"; reason = `terminal:${state}`;
        } else if (isEnrichmentPending(state)) {
          action = "would_crawl"; reason = state;
        } else if (state === "no_official_domain") {
          action = "no_domain"; reason = "no usable official domain";
        }

        return {
          ...r,
          state,
          proposed_action: action,
          reason,
          attempts,
          last_error: lastFailure?.reason ?? null,
          missing_phone_before,
          missing_email_before,
        };
      });
      return enriched;
    },
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const rows = query.data ?? [];

  const counts = useMemo(() => {
    const c = {
      total: rows.length,
      has_domain: 0,
      no_domain: 0,
      complete_with_contact: 0,
      complete_no_contact: 0,
      pending: 0,
      retryable: 0,
      blocked: 0,
      would_crawl: 0,
      would_skip: 0,
      missing_phone_before: 0,
      missing_email_before: 0,
      missing_both_before: 0,
    };
    for (const r of rows) {
      if (hasUsableOfficialDomain(r.official_domain ?? r.website_url)) c.has_domain++;
      else c.no_domain++;
      if (r.state === "complete_with_contact") c.complete_with_contact++;
      else if (r.state === "complete_no_contact") c.complete_no_contact++;
      else if (r.state === "official_site_enrichment_retryable") c.retryable++;
      else if (isEnrichmentPending(r.state)) c.pending++;
      else if (r.state === "blocked") c.blocked++;
      if (r.proposed_action === "would_crawl") c.would_crawl++;
      else c.would_skip++;
      if (r.missing_phone_before) c.missing_phone_before++;
      if (r.missing_email_before) c.missing_email_before++;
      if (r.missing_phone_before && r.missing_email_before) c.missing_both_before++;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (stateFilter !== "all" && r.state !== stateFilter) return false;
      if (q) {
        const hay = `${r.company_name ?? ""} ${r.city ?? ""} ${r.official_domain ?? r.website_url ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).slice(0, 500);
  }, [rows, search, stateFilter]);

  const exportCSV = () => {
    const header = ["id","company","city","category","phone","email","domain","state","proposed_action","reason","attempts","last_error","last_checked_at"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      const esc = (v: unknown) => `"${(v ?? "").toString().replace(/"/g, '""')}"`;
      lines.push([
        r.id, r.company_name, r.city, r.category,
        r.phone ?? r.phone_e164, r.email,
        r.official_domain ?? r.website_url,
        r.state, r.proposed_action, r.reason, r.attempts, r.last_error,
        r.official_site_checked_at,
      ].map(esc).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `official-site-enrichment-preview-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-6 w-6" /> Enrichissement site officiel — Aperçu
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Lecture seule. Aucune modification de leads, aucun crawl déclenché, aucun envoi.
              Aperçu de ce qui serait fait si un backfill borné était autorisé.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${query.isFetching ? "animate-spin" : ""}`} />
              Rafraîchir
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!rows.length}>
              Exporter CSV
            </Button>
            <Button size="sm" disabled title="Non autorisé — exécuter le backfill nécessite une action explicite">
              <Lock className="h-4 w-4 mr-2" /> Exécuter backfill borné (non autorisé)
            </Button>
          </div>
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Compteurs (données réelles)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                ["Total", counts.total],
                ["Domaine officiel", counts.has_domain],
                ["Pas de domaine", counts.no_domain],
                ["Complet + contact", counts.complete_with_contact],
                ["Complet sans contact", counts.complete_no_contact],
                ["En attente/en cours", counts.pending],
                ["À réessayer", counts.retryable],
                ["Bloqué", counts.blocked],
                ["Serait crawlé", counts.would_crawl],
                ["Serait ignoré", counts.would_skip],
                ["Tél. manquant avant", counts.missing_phone_before],
                ["Courriel manquant avant", counts.missing_email_before],
                ["Les deux manquants", counts.missing_both_before],
              ].map(([label, n]) => (
                <div key={label as string} className="rounded-lg border border-border bg-card p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
                  <div className="text-2xl font-semibold mt-1">{n as number}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" /> Candidats ({filtered.length} affichés)
            </CardTitle>
            <div className="flex gap-2 mt-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Recherche société, ville, domaine…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les états</SelectItem>
                  <SelectItem value="official_site_enrichment_required">Enrichissement requis</SelectItem>
                  <SelectItem value="official_site_enrichment_queued">En file</SelectItem>
                  <SelectItem value="official_site_enrichment_running">En cours</SelectItem>
                  <SelectItem value="official_site_enrichment_retryable">À réessayer</SelectItem>
                  <SelectItem value="complete_with_contact">Complet + contact</SelectItem>
                  <SelectItem value="complete_no_contact">Complet sans contact</SelectItem>
                  <SelectItem value="no_official_domain">Pas de domaine officiel</SelectItem>
                  <SelectItem value="blocked">Bloqué</SelectItem>
                </SelectContent>
              </Select>
              <Link to="/admin/commercial-eligibility">
                <Button variant="ghost" size="sm">← Éligibilité commerciale</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Société</TableHead>
                  <TableHead>Ville / Cat.</TableHead>
                  <TableHead>Tél / Courriel</TableHead>
                  <TableHead>Domaine canonique</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead>Action proposée</TableHead>
                  <TableHead>Tentatives</TableHead>
                  <TableHead>Dernier check</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.company_name ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.city ?? "—"}<br />{r.category ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{r.phone ?? r.phone_e164 ?? <span className="text-muted-foreground">—</span>}</div>
                      <div className="truncate max-w-[180px]">{r.email ?? <span className="text-muted-foreground">—</span>}</div>
                    </TableCell>
                    <TableCell className="text-xs">{r.official_domain ?? r.website_url ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{stateBadge(r.state)}</TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{r.proposed_action}</div>
                      <div className="text-muted-foreground">{r.reason}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.attempts}
                      {r.last_error && (
                        <div className="text-destructive flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="h-3 w-3" />{r.last_error}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.official_site_checked_at
                        ? new Date(r.official_site_checked_at).toLocaleString("fr-CA")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Aucun candidat.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Dry-run individuel disponible via <code>POST /functions/v1/enrich-official-website</code>{" "}
          avec <code>{`{ lead_id, dry_run: true }`}</code>. Aucune mutation ni envoi ne se produit.
        </p>
      </div>
    </div>
  );
}
