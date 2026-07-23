/**
 * UNPRO — Admin Official-Site Enrichment Preview (READ-ONLY, hardened).
 * /admin/official-site-enrichment
 *
 * Assigns every contractor_lead to exactly ONE of 8 mutually exclusive
 * classifications so the operator can see, before any backfill, why each
 * row would be crawled or quarantined. Never mutates data. Never triggers
 * a crawl. "Exécuter backfill" remains disabled.
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
import { RefreshCw, Search, ShieldCheck, AlertTriangle, Lock, ShieldAlert } from "lucide-react";
import {
  classifyLeadBatch,
  countByClassification,
  CLASSIFICATION_LABEL,
  type ClassifiedLead,
  type EnrichmentClassification,
} from "@/lib/enrichmentClassifier";

const CLASSIFICATION_ORDER: EnrichmentClassification[] = [
  "READY_TO_ENRICH",
  "ALREADY_COMPLETE",
  "NO_OFFICIAL_DOMAIN",
  "PHONE_REGION_MISMATCH",
  "INVALID_CONTACT",
  "SUSPECTED_TEST_DATA",
  "SUSPECTED_DUPLICATE",
  "MANUAL_REVIEW_REQUIRED",
];

const CLASSIFICATION_VARIANT: Record<EnrichmentClassification, "default" | "secondary" | "destructive" | "outline"> = {
  READY_TO_ENRICH: "default",
  ALREADY_COMPLETE: "secondary",
  NO_OFFICIAL_DOMAIN: "outline",
  PHONE_REGION_MISMATCH: "destructive",
  INVALID_CONTACT: "destructive",
  SUSPECTED_TEST_DATA: "destructive",
  SUSPECTED_DUPLICATE: "destructive",
  MANUAL_REVIEW_REQUIRED: "outline",
};

const QUARANTINE = new Set<EnrichmentClassification>([
  "SUSPECTED_TEST_DATA",
  "SUSPECTED_DUPLICATE",
  "PHONE_REGION_MISMATCH",
  "INVALID_CONTACT",
]);

export default function AdminOfficialSiteEnrichment() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<EnrichmentClassification | "all">("all");

  const query = useQuery({
    queryKey: ["admin-enrichment-preview-v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_leads")
        .select("id,company_name,city,category_primary,phone,phone_e164,phone_area_code,phone_validation_status,email,website_url,official_domain,official_site_status,official_site_checked_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      const leads = (data ?? []).map((r: any) => ({
        id: r.id,
        company_name: r.company_name,
        city: r.city,
        category: r.category_primary,
        phone: r.phone,
        phone_e164: r.phone_e164,
        phone_area_code: r.phone_area_code,
        phone_validation_status: r.phone_validation_status,
        email: r.email,
        website_url: r.website_url,
        official_domain: r.official_domain,
        official_site_status: r.official_site_status,
      }));
      return classifyLeadBatch(leads);
    },
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const rows: ClassifiedLead[] = query.data ?? [];
  const counts = useMemo(() => countByClassification(rows), [rows]);
  const totalClassified = CLASSIFICATION_ORDER.reduce((s, k) => s + counts[k], 0);
  const invariantOk = totalClassified === rows.length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (filter !== "all" && r.classification !== filter) return false;
      if (!q) return true;
      const hay = `${r.company_name ?? ""} ${r.city ?? ""} ${r.email ?? ""} ${r.phone ?? ""} ${r.phone_e164 ?? ""} ${r.official_domain ?? r.website_url ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, filter, search]);

  const exportCSV = () => {
    const header = [
      "id","company","city","category","classification","reason","confidence",
      "phone_before","email_before","phone_after","email_after","source_url",
      "phone_validation","phone_area_code","warnings",
    ];
    const esc = (v: unknown) => `"${(v ?? "").toString().replace(/"/g, '""')}"`;
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push([
        r.id, r.company_name, r.city, r.category, r.classification, r.reason, r.confidence,
        r.phone ?? r.phone_e164, r.email,
        r.proposed_phone_after, r.proposed_email_after, r.proposed_source_url,
        r.phone_validation_status, r.phone_area_code, r.warnings.join("; "),
      ].map(esc).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `enrichment-preview-${filter}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const readyReason =
    counts.READY_TO_ENRICH === 0
      ? "Aucun candidat à crawler après filtrage."
      : `Ces ${counts.READY_TO_ENRICH} enregistrements possèdent un domaine officiel exploitable, il leur manque au moins un contact (téléphone ou courriel), aucun crawl terminal n'a encore été enregistré (état = required / queued / running / retryable / complete_no_contact), aucun signe de doublon, de données de test, d'indicatif hors QC ni de contact invalide sans canal alternatif.`;

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-6 w-6" /> Enrichissement site officiel — Aperçu durci
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Lecture seule. Aucun crawl, aucune mutation, aucun envoi. Chaque prospect est
              classé dans une seule catégorie mutuellement exclusive.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${query.isFetching ? "animate-spin" : ""}`} />
              Rafraîchir
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filtered.length}>
              Exporter CSV ({filtered.length})
            </Button>
            <Button size="sm" disabled title="Bloqué — le backfill nécessite une autorisation explicite">
              <Lock className="h-4 w-4 mr-2" /> Exécuter backfill (désactivé)
            </Button>
          </div>
        </header>

        {/* Invariant banner */}
        <div className={`rounded-lg border p-3 text-sm ${invariantOk ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/10"}`}>
          <div className="flex items-center gap-2 font-medium">
            {invariantOk
              ? <><ShieldCheck className="h-4 w-4 text-emerald-500" /> Invariant OK : {totalClassified} classifications = {rows.length} prospects.</>
              : <><ShieldAlert className="h-4 w-4 text-red-500" /> Écart détecté : {totalClassified} classifications vs {rows.length} lignes.</>}
          </div>
        </div>

        {/* Counts grid */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Compteurs par classification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CLASSIFICATION_ORDER.map(k => (
                <button
                  key={k}
                  onClick={() => setFilter(filter === k ? "all" : k)}
                  className={`text-left rounded-lg border p-3 transition hover:border-foreground/40 ${filter === k ? "border-foreground bg-muted/40" : "border-border bg-card"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {CLASSIFICATION_LABEL[k]}
                    </span>
                    {QUARANTINE.has(k) && <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />}
                  </div>
                  <div className="text-2xl font-semibold mt-1">{counts[k]}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{k}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* READY_TO_ENRICH explanation */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pourquoi {counts.READY_TO_ENRICH} prospects sont sélectionnés pour crawl</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            {readyReason}
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Recherche société, ville, courriel, téléphone, domaine…"
                       value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les classifications ({rows.length})</SelectItem>
                  {CLASSIFICATION_ORDER.map(k => (
                    <SelectItem key={k} value={k}>{CLASSIFICATION_LABEL[k]} ({counts[k]})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link to="/admin/commercial-eligibility">
                <Button variant="ghost" size="sm">← Éligibilité commerciale</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Société / ID</TableHead>
                  <TableHead>Ville · Cat.</TableHead>
                  <TableHead>Domaine officiel</TableHead>
                  <TableHead>Avant (tél / courriel)</TableHead>
                  <TableHead>Après proposé + source</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Signaux</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const quarantine = QUARANTINE.has(r.classification);
                  return (
                    <TableRow key={r.id} className={quarantine ? "bg-amber-500/5 border-l-2 border-l-amber-500" : ""}>
                      <TableCell className="font-medium align-top">
                        <div>{r.company_name ?? "—"}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{r.id.slice(0, 8)}…</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground align-top">
                        {r.city ?? "—"}<br />{r.category ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs align-top break-all max-w-[180px]">
                        {r.official_domain ?? r.website_url ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs align-top">
                        <div>{r.phone ?? r.phone_e164 ?? <span className="text-muted-foreground">—</span>}</div>
                        <div className="truncate max-w-[180px]">{r.email ?? <span className="text-muted-foreground">—</span>}</div>
                      </TableCell>
                      <TableCell className="text-xs align-top">
                        <div>{r.proposed_phone_after ?? <span className="text-muted-foreground">—</span>}</div>
                        <div className="truncate max-w-[180px]">{r.proposed_email_after ?? <span className="text-muted-foreground">—</span>}</div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                          src: {r.proposed_source_url ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant={CLASSIFICATION_VARIANT[r.classification]}>
                          {CLASSIFICATION_LABEL[r.classification]}
                        </Badge>
                        <div className="text-[10px] text-muted-foreground mt-1 max-w-[220px]">{r.reason}</div>
                        <div className="text-[10px] mt-0.5">Confiance : {r.confidence}</div>
                      </TableCell>
                      <TableCell className="text-xs align-top">
                        {r.warnings.length === 0
                          ? <span className="text-muted-foreground">—</span>
                          : r.warnings.map((w, i) => (
                              <div key={i} className="flex items-start gap-1 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> <span>{w}</span>
                              </div>
                            ))}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Aucun prospect pour ce filtre.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Les prospects en quarantaine (bordure ambre) ne sont ni supprimés, ni fusionnés,
          ni contactés. Ils restent visibles pour audit humain.
        </p>
      </div>
    </div>
  );
}
