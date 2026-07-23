/**
 * UNPRO — Admin Commercial Send Eligibility Preview
 * /admin/commercial-eligibility
 *
 * Read-only cockpit that previews rows from `v_commercial_send_eligibility`
 * joined with `contractor_leads` (source_type / source_label / city) and
 * explains, per lead, why it is ELIGIBLE or BLOCKED for commercial outreach.
 *
 * Logic mirrors the pre-send gate in `commercial-send-gate`:
 *   BLOCKERS (any → blocked, in this priority):
 *     1. compliance_review_required
 *     2. no destination (no mobile_phone / phone AND no email)
 *     3. phone_suppressed / email_suppressed (STOP / opt-out)
 *     4. last_sms_at within cooldown window (30 days)
 *     5. no valid CASL evidence on the destination
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, ShieldCheck, ShieldAlert, Search, Download } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

const SMS_COOLDOWN_DAYS = 30;

interface EligibilityRow {
  contractor_lead_id: string;
  company_name: string | null;
  phone: string | null;
  mobile_phone: string | null;
  email: string | null;
  compliance_review_required: boolean | null;
  compliance_review_reason: string | null;
  last_sms_at: string | null;
  valid_phone_evidence_count: number | null;
  valid_email_evidence_count: number | null;
  phone_suppressed: boolean | null;
  email_suppressed: boolean | null;
}

interface LeadMeta {
  id: string;
  source_type: string | null;
  source_label: string | null;
  city: string | null;
}

interface EvaluatedRow extends EligibilityRow {
  source_type: string;
  source_label: string | null;
  city: string | null;
  eligible: boolean;
  reasons: { code: string; label: string; tone: "block" | "warn" | "ok" }[];
  channel: "sms" | "email" | "none";
}

function evaluate(row: EligibilityRow, meta: LeadMeta | undefined): EvaluatedRow {
  const reasons: EvaluatedRow["reasons"] = [];
  const smsDest = row.mobile_phone || row.phone || null;
  const emailDest = row.email || null;

  // Decide preferred channel (SMS-first, mirrors gate)
  const channel: EvaluatedRow["channel"] = smsDest ? "sms" : emailDest ? "email" : "none";

  if (row.compliance_review_required) {
    reasons.push({
      code: "compliance_review",
      label: `Revue conformité requise${row.compliance_review_reason ? ` — ${row.compliance_review_reason}` : ""}`,
      tone: "block",
    });
  }

  if (channel === "none") {
    reasons.push({ code: "no_destination", label: "Aucun téléphone mobile ni courriel", tone: "block" });
  }

  if (channel === "sms") {
    if (row.phone_suppressed) {
      reasons.push({ code: "sms_suppressed", label: "Téléphone dans la liste STOP / suppression", tone: "block" });
    }
    if (row.last_sms_at) {
      const days = differenceInDays(new Date(), new Date(row.last_sms_at));
      if (days < SMS_COOLDOWN_DAYS) {
        reasons.push({
          code: "sms_cooldown",
          label: `SMS envoyé il y a ${days} j (fenêtre ${SMS_COOLDOWN_DAYS} j)`,
          tone: "block",
        });
      } else {
        reasons.push({ code: "sms_prior_ok", label: `Dernier SMS il y a ${days} j (hors fenêtre)`, tone: "warn" });
      }
    }
    if ((row.valid_phone_evidence_count ?? 0) === 0) {
      reasons.push({ code: "no_casl_phone", label: "Aucune preuve CASL valide pour ce téléphone", tone: "block" });
    } else {
      reasons.push({
        code: "casl_phone_ok",
        label: `${row.valid_phone_evidence_count} preuve(s) CASL téléphone valide(s)`,
        tone: "ok",
      });
    }
  } else if (channel === "email") {
    if (row.email_suppressed) {
      reasons.push({ code: "email_suppressed", label: "Courriel désabonné / suppression", tone: "block" });
    }
    if ((row.valid_email_evidence_count ?? 0) === 0) {
      reasons.push({ code: "no_casl_email", label: "Aucune preuve CASL valide pour ce courriel", tone: "block" });
    } else {
      reasons.push({
        code: "casl_email_ok",
        label: `${row.valid_email_evidence_count} preuve(s) CASL courriel valide(s)`,
        tone: "ok",
      });
    }
  }

  const eligible = !reasons.some((r) => r.tone === "block");

  return {
    ...row,
    source_type: meta?.source_type || "unknown",
    source_label: meta?.source_label || null,
    city: meta?.city || null,
    eligible,
    reasons,
    channel,
  };
}

export default function AdminCommercialEligibility() {
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-commercial-eligibility"],
    queryFn: async () => {
      const [eligRes, metaRes] = await Promise.all([
        supabase.from("v_commercial_send_eligibility" as any).select("*").limit(2000),
        supabase.from("contractor_leads").select("id,source_type,source_label,city").limit(5000),
      ]);
      if (eligRes.error) throw eligRes.error;
      if (metaRes.error) throw metaRes.error;
      const metaById = new Map<string, LeadMeta>();
      (metaRes.data as LeadMeta[]).forEach((m) => metaById.set(m.id, m));
      const rows = ((eligRes.data as unknown) as EligibilityRow[]).map((r) =>
        evaluate(r, metaById.get(r.contractor_lead_id)),
      );
      return rows;
    },
    staleTime: 30_000,
  });

  const sources = useMemo(() => {
    const s = new Set<string>();
    (data ?? []).forEach((r) => s.add(r.source_type || "unknown"));
    return Array.from(s).sort();
  }, [data]);

  const filtered = useMemo(() => {
    return (data ?? []).filter((r) => {
      if (sourceFilter !== "all" && r.source_type !== sourceFilter) return false;
      if (statusFilter === "eligible" && !r.eligible) return false;
      if (statusFilter === "blocked" && r.eligible) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${r.company_name ?? ""} ${r.phone ?? ""} ${r.mobile_phone ?? ""} ${r.email ?? ""} ${r.city ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, sourceFilter, statusFilter, search]);

  const bySource = useMemo(() => {
    const map = new Map<string, { total: number; eligible: number; blocked: number }>();
    (data ?? []).forEach((r) => {
      const key = r.source_type || "unknown";
      const bucket = map.get(key) ?? { total: 0, eligible: 0, blocked: 0 };
      bucket.total++;
      if (r.eligible) bucket.eligible++;
      else bucket.blocked++;
      map.set(key, bucket);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [data]);

  const totals = useMemo(() => {
    const t = { total: 0, eligible: 0, blocked: 0 };
    (data ?? []).forEach((r) => {
      t.total++;
      if (r.eligible) t.eligible++;
      else t.blocked++;
    });
    return t;
  }, [data]);

  const blockerBreakdown = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    (data ?? []).forEach((r) => {
      r.reasons
        .filter((x) => x.tone === "block")
        .forEach((x) => {
          const cur = counts.get(x.code) ?? { label: x.label.replace(/ —.*$/, ""), count: 0 };
          cur.count++;
          counts.set(x.code, cur);
        });
    });
    return Array.from(counts.entries())
      .map(([code, v]) => ({ code, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const exportCsv = () => {
    const header = ["lead_id", "company", "source_type", "source_label", "city", "channel", "eligible", "blockers"];
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      const blockers = r.reasons.filter((x) => x.tone === "block").map((x) => x.code).join("|");
      lines.push(
        [
          r.contractor_lead_id,
          JSON.stringify(r.company_name ?? ""),
          r.source_type,
          JSON.stringify(r.source_label ?? ""),
          JSON.stringify(r.city ?? ""),
          r.channel,
          r.eligible ? "yes" : "no",
          blockers,
        ].join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commercial-eligibility-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Éligibilité envoi commercial
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Prévisualisation de <code>v_commercial_send_eligibility</code> — raisons de blocage / éligibilité par source.
            Lecture seule. Aucune communication envoyée.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{totals.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Éligibles</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-emerald-500">{totals.eligible}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Bloqués</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-destructive">{totals.blocked}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Taux d'éligibilité</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totals.total ? Math.round((totals.eligible / totals.total) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By source */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Par source (<code>contractor_leads.source_type</code>)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Éligibles</TableHead>
                <TableHead className="text-right">Bloqués</TableHead>
                <TableHead className="text-right">Taux</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bySource.map(([src, b]) => (
                <TableRow key={src}>
                  <TableCell><Badge variant="outline">{src}</Badge></TableCell>
                  <TableCell className="text-right">{b.total}</TableCell>
                  <TableCell className="text-right text-emerald-500">{b.eligible}</TableCell>
                  <TableCell className="text-right text-destructive">{b.blocked}</TableCell>
                  <TableCell className="text-right">
                    {b.total ? Math.round((b.eligible / b.total) * 100) : 0}%
                  </TableCell>
                </TableRow>
              ))}
              {!bySource.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    {isLoading ? "Chargement…" : "Aucune donnée"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Blocker breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Répartition des blocages</CardTitle>
        </CardHeader>
        <CardContent>
          {blockerBreakdown.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {blockerBreakdown.map((b) => (
                <div
                  key={b.code}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 p-3"
                >
                  <div>
                    <div className="text-sm font-medium">{b.label}</div>
                    <code className="text-xs text-muted-foreground">{b.code}</code>
                  </div>
                  <Badge variant="destructive">{b.count}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun blocage détecté.</p>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher (nom, téléphone, courriel, ville)"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les sources</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="eligible">Éligibles seulement</SelectItem>
            <SelectItem value="blocked">Bloqués seulement</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rows */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Prospects ({filtered.length}{data && filtered.length !== data.length ? ` / ${data.length}` : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Raisons</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 500).map((r) => (
                <TableRow key={r.contractor_lead_id}>
                  <TableCell>
                    <div className="font-medium">{r.company_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.mobile_phone || r.phone || "—"}{r.email ? ` · ${r.email}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.source_type}</Badge>
                    {r.source_label && (
                      <div className="text-xs text-muted-foreground mt-1">{r.source_label}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{r.city || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.channel}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.eligible ? (
                      <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 border">
                        <ShieldCheck className="w-3 h-3 mr-1" /> Éligible
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <ShieldAlert className="w-3 h-3 mr-1" /> Bloqué
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {r.reasons.map((x, i) => (
                        <span
                          key={i}
                          className={
                            "text-xs px-2 py-0.5 rounded border " +
                            (x.tone === "block"
                              ? "bg-destructive/10 text-destructive border-destructive/30"
                              : x.tone === "ok"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/30")
                          }
                          title={x.code}
                        >
                          {x.label}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {isLoading ? "Chargement…" : "Aucun prospect ne correspond aux filtres."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {filtered.length > 500 && (
            <p className="text-xs text-muted-foreground p-3 border-t border-border/50">
              Affichage des 500 premiers résultats. Utilisez l'export CSV pour la liste complète.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
