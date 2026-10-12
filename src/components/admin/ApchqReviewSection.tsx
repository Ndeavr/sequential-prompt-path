/**
 * APCHQ — 24 dossiers à qualifier (lot apchq_pdf_review_2026-10-12).
 * Admin-only (RLS has_role admin on acquisition_manual_import_rows).
 * Review-only: never creates prospects, never enables sending.
 * Saving a CASL review only documents evidence; send_enabled/dispatchable stay false.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const BATCH_SOURCE = "apchq_pdf_review_2026-10-12";

type Norm = Record<string, any>;
interface Row {
  id: string; row_number: number | null; company: string | null; contact: string | null;
  phone: string | null; email: string | null; city: string | null; category: string | null;
  status: string; normalized: Norm;
}

export const maskPhone = (p: string | null) => (p ? p.replace(/\d(?=\d{4})/g, "•") : "—");
export const maskEmail = (e: string | null) => {
  if (!e) return "—";
  const [u, d] = e.split("@");
  return `${u.slice(0, 1)}•••@${d ?? ""}`;
};

const Flag = ({ label, kind }: { label: string; kind: "verified" | "declared" | "inferred" | "pending" }) => {
  const map = { verified: "Vérifié", declared: "Déclaré", inferred: "Inféré", pending: "En attente" };
  return (
    <Badge variant={kind === "verified" ? "default" : kind === "pending" ? "destructive" : "secondary"} className="text-[11px]">
      {label} : {map[kind]}
    </Badge>
  );
};

function CaslForm({ row, onSaved }: { row: Row; onSaved: () => void }) {
  const cur = row.normalized?.casl_review ?? {};
  const [f, setF] = useState({
    source_url: cur.source_url ?? "", evidence_date: cur.evidence_date ?? "",
    relevance: cur.relevance ?? "", anti_solicitation_mention: cur.anti_solicitation_mention ?? "",
    notes: cur.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const complete = /^https:\/\//.test(f.source_url) && f.evidence_date && f.relevance.length > 10 && f.anti_solicitation_mention;

  const save = async () => {
    setSaving(true); setErr(null);
    const { data: u } = await supabase.auth.getUser();
    const casl_review = {
      ...f,
      status: complete ? "EVIDENCE_DOCUMENTED_NOT_APPROVED" : "NEEDS_REVIEW",
      reviewer_id: u.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("acquisition_manual_import_rows")
      .update({ normalized: { ...row.normalized, casl_review, send_enabled: false, dispatchable: false } })
      .eq("id", row.id)
      .eq("status", "needs_review");
    setSaving(false);
    if (error) setErr("Enregistrement refusé. Vérifiez vos droits administrateur.");
    else onSaved();
  };

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <p className="text-xs font-medium text-foreground">Revue humaine de la preuve LCAP (aucune validation automatique)</p>
      <Input placeholder="URL HTTPS de la source publique" value={f.source_url} onChange={(e) => setF({ ...f, source_url: e.target.value })} />
      <Input type="date" value={f.evidence_date} onChange={(e) => setF({ ...f, evidence_date: e.target.value })} />
      <Textarea placeholder="Pertinence du message pour l'activité de l'entreprise" value={f.relevance} onChange={(e) => setF({ ...f, relevance: e.target.value })} />
      <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={f.anti_solicitation_mention} onChange={(e) => setF({ ...f, anti_solicitation_mention: e.target.value })}>
        <option value="">Mention anti-sollicitation ?</option>
        <option value="none_found">Aucune mention trouvée</option>
        <option value="found_refusal">Mention de refus trouvée → exclure</option>
      </select>
      <Textarea placeholder="Notes du réviseur" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      {err && <p className="text-xs text-destructive">{err}</p>}
      <Button size="sm" className="w-full min-h-11" onClick={save} disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enregistrer la revue
      </Button>
      <p className="text-[11px] text-muted-foreground">L'envoi reste interdit : mobile, lien 350 $ et approbation restent requis.</p>
    </div>
  );
}

export default function ApchqReviewSection() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "missing" | "casl_doc" | "excluded">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["apchq-review"],
    queryFn: async () => {
      const { data: b, error: be } = await supabase.from("acquisition_manual_import_batches").select("id").eq("source", BATCH_SOURCE).maybeSingle();
      if (be) throw be;
      if (!b) return [] as Row[];
      const { data: rows, error: re } = await supabase
        .from("acquisition_manual_import_rows")
        .select("id,row_number,company,contact,phone,email,city,category,status,normalized")
        .eq("batch_id", b.id).order("row_number");
      if (re) throw re;
      return (rows ?? []) as Row[];
    },
  });

  const rows = useMemo(() => (data ?? []).filter((r) => {
    const n = r.normalized ?? {};
    if (q && !`${r.company} ${r.contact} ${r.city}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "missing") return (n.crosscheck?.missing ?? []).length > 0;
    if (filter === "casl_doc") return n.casl_review?.status === "EVIDENCE_DOCUMENTED_NOT_APPROVED";
    if (filter === "excluded") return n.casl_review?.anti_solicitation_mention === "found_refusal";
    return true;
  }), [data, q, filter]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">APCHQ — {data?.length ?? 24} dossiers à qualifier</CardTitle>
        <p className="text-xs text-muted-foreground">Revue seulement. Aucun prospect créé, aucun envoi possible. Prêts à envoyer : 0.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input placeholder="Rechercher entreprise, nom, ville" value={q} onChange={(e) => setQ(e.target.value)} />
          <select aria-label="Filtre" className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="all">Tous</option>
            <option value="missing">Données manquantes</option>
            <option value="casl_doc">Preuve LCAP documentée</option>
            <option value="excluded">Refus trouvé</option>
          </select>
        </div>
        {isLoading && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Chargement…</p>}
        {error && (
          <div className="text-sm text-destructive">Impossible de charger les dossiers. <Button variant="link" size="sm" onClick={() => refetch()}>Réessayer</Button></div>
        )}
        {!isLoading && !error && rows.length === 0 && <p className="text-sm text-muted-foreground">Aucun dossier pour ce filtre.</p>}
        <div className="space-y-2">
          {rows.map((r) => {
            const n = r.normalized ?? {};
            const cc = n.crosscheck ?? {};
            const isOpen = open === r.id;
            return (
              <div key={r.id} className="rounded-xl border border-border p-3 space-y-2">
                <button className="w-full text-left min-h-11" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen}>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-foreground">{r.company ?? "Entreprise non précisée"}</span>
                    <span className="text-xs text-muted-foreground">Ligne {n.source_row ?? r.row_number}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{r.contact ?? "—"} · {r.category ?? "métier ?"} · {r.city ?? "ville ?"}</div>
                  <div className="text-xs text-muted-foreground">{maskPhone(r.phone)} · {maskEmail(r.email)}</div>
                </button>
                <div className="flex flex-wrap gap-1">
                  <Flag label="Identité" kind="declared" />
                  <Flag label="Entreprise" kind={r.company ? "declared" : "pending"} />
                  <Flag label="Mobile" kind="pending" />
                  <Flag label="LCAP" kind="pending" />
                  <Flag label="Lien 350 $" kind="pending" />
                  <Flag label="RBQ" kind="pending" />
                </div>
                {isOpen && (
                  <div className="space-y-2 text-xs text-foreground">
                    <p>Croisement ({cc.checked_at ? new Date(cc.checked_at).toLocaleString("fr-CA") : "non fait"}) : opt-out {cc.sms_opt_outs ?? "?"}, suppressions {(cc.suppression_index ?? 0) + (cc.outreach_suppressions ?? 0) + (cc.outbound_suppressions ?? 0) + (cc.suppressed_emails ?? 0)}, historique SMS {cc.sms_history ?? "?"}, échecs Twilio {cc.twilio_failures_30003_30006_30034 ?? "?"}, compte entrepreneur {cc.contractor_account ?? "?"}, doublons {(cc.duplicate_other_imports ?? 0) + (cc.duplicate_in_batch ?? 0)}.</p>
                    {(cc.missing ?? []).length > 0 && <p className="text-destructive">Manquant : {(cc.missing as string[]).join(", ")}</p>}
                    <p>Adhésion APCHQ : non établie. Mobile : vérification non effectuée. Lien 350 $ : en attente (bloqué).</p>
                    <p className="rounded-md bg-muted p-2">Brouillon interne (non envoyable) : {n.internal_draft?.body ?? "—"}</p>
                    <p>Revue LCAP : <strong>{n.casl_review?.status ?? "NEEDS_REVIEW"}</strong></p>
                    <CaslForm row={r} onSaved={() => qc.invalidateQueries({ queryKey: ["apchq-review"] })} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
