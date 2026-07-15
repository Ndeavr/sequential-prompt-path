/**
 * /admin/verified-contractors
 * Real prospect list — only surface for launching the first $1 batch.
 */
import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  useVerifiedProspects,
  useEnrichProspect,
  useValidatePhone,
  useSendVerifiedBatch,
  formatVerifiedFunctionError,
  statusLabel,
  type VerifiedProspect,
} from "@/hooks/useVerifiedProspects";
import { ExternalLink, RefreshCw, PhoneCall, Send, Sparkles } from "lucide-react";

const toneClass = {
  ok: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  warn: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  err: "bg-red-500/15 text-red-500 border-red-500/30",
  info: "bg-blue-500/15 text-blue-500 border-blue-500/30",
} as const;

export default function AdminVerifiedContractors() {
  const { data, isLoading, refetch } = useVerifiedProspects();
  const enrich = useEnrichProspect();
  const validate = useValidatePhone();
  const send = useSendVerifiedBatch();
  const [busyId, setBusyId] = useState<string | null>(null);

  const eligibleCount = (data ?? []).filter(p =>
    p.sms_eligible && p.outreach_status === "none" && p.data_quality_score >= 80
  ).length;

  async function handleEnrich(p: VerifiedProspect) {
    setBusyId(p.id);
    try {
      const r = await enrich.mutateAsync(p.id);
      toast.success(`Enrichi (${r?.quality_score ?? "?"}/100) — ${r?.pages_scanned ?? 0} pages scannées`);
    } catch (e: any) {
      toast.error("Enrichissement échoué", { description: formatVerifiedFunctionError(e) });
    } finally { setBusyId(null); }
  }

  async function handleValidate(p: VerifiedProspect) {
    setBusyId(p.id);
    try {
      const r = await validate.mutateAsync(p.id);
      toast.success(`Numéro: ${r?.status ?? "inconnu"}`);
    } catch (e: any) {
      toast.error("Validation échouée", { description: formatVerifiedFunctionError(e) });
    } finally { setBusyId(null); }
  }

  async function handleDryRun() {
    try {
      const r = await send.mutateAsync({ limit: 10, dry_run: true });
      toast.info(`${r?.eligible_count ?? 0} prospect(s) éligible(s) — prêt à envoyer`);
    } catch (e: any) { toast.error("Test échoué", { description: formatVerifiedFunctionError(e) }); }
  }

  async function handleSend() {
    if (!confirm(`Envoyer un SMS Twilio réel à ${eligibleCount} entrepreneur(s) ? Cette action est irréversible.`)) return;
    try {
      const r = await send.mutateAsync({ limit: 10, dry_run: false });
      toast.success(`${r?.sent ?? 0} SMS envoyé(s). Voir la table pour les SID Twilio.`);
      refetch();
    } catch (e: any) { toast.error("Envoi échoué", { description: formatVerifiedFunctionError(e) }); }
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Prospects vérifiés"
        description="Vraies entreprises, coordonnées vérifiables. Aucun placeholder n'est envoyable."
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Rafraîchir
        </Button>
        <Button variant="outline" onClick={handleDryRun}>
          <Sparkles className="w-4 h-4 mr-2" /> Test (dry-run)
        </Button>
        <Button
          onClick={handleSend}
          disabled={eligibleCount === 0 || send.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Send className="w-4 h-4 mr-2" />
          Envoyer lot réel ({eligibleCount})
        </Button>
      </div>

      {isLoading ? <LoadingState /> : !data?.length ? (
        <EmptyState message="Aucun prospect vérifié. Ajoutez-en un via SQL ou enrichissement." />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Ligne</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>RBQ</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(p => {
                const s = statusLabel(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div>{p.business_name}</div>
                      {p.outreach_twilio_sid && (
                        <div className="text-[10px] text-muted-foreground font-mono">{p.outreach_twilio_sid}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.category ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.city ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{p.phone_e164 ?? p.phone_primary ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{p.phone_line_type ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{p.email ?? "—"}</TableCell>
                    <TableCell className="text-xs">{p.rbq_number ?? "—"}</TableCell>
                    <TableCell>
                      <span className={`font-semibold text-sm ${
                        p.data_quality_score >= 80 ? "text-emerald-500" :
                        p.data_quality_score >= 50 ? "text-amber-500" : "text-red-500"
                      }`}>{p.data_quality_score}</span>
                    </TableCell>
                    <TableCell>
                      {p.website_url ? (
                        <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 inline-flex items-center gap-1 text-xs">
                          Voir <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className={`text-[11px] border ${toneClass[s.tone]}`}>{s.label}</Badge>
                        {p.outreach_failure_reason && (
                          <div className="max-w-[220px] truncate text-[10px] text-muted-foreground" title={p.outreach_failure_reason}>
                            {p.outreach_failure_reason}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" disabled={busyId === p.id || !p.website_url}
                          onClick={() => handleEnrich(p)} title="Enrichir depuis le site officiel">
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busyId === p.id || !p.phone_primary}
                          onClick={() => handleValidate(p)} title="Valider le numéro (Twilio Lookup)">
                          <PhoneCall className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminLayout>
  );
}
