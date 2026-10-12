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

type Review = { id: string; import_row_id: string; decision: string; source_url: string; evidence_date: string; reason: string; notes: string | null; created_at: string; reviewer_id: string };
type LinkRow = { import_row_id: string; expires_at: string; revoked_at: string | null; claim_status: string; opened_count: number };

/** Revue LCAP signée : append-only (table immuable), aucune approbation d'envoi. */
function CaslForm({ row, reviews, onSaved }: { row: Row; reviews: Review[]; onSaved: () => void }) {
  const [f, setF] = useState({ source_url: "", evidence_date: "", reason: "", decision: "", notes: "", examined: false });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const complete = /^https:\/\//.test(f.source_url) && !!f.evidence_date && f.reason.trim().length >= 10 && !!f.decision && f.examined;

  const save = async () => {
    if (!complete) return;
    setSaving(true); setErr(null);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("manual_import_casl_reviews").insert({
      import_row_id: row.id, reviewer_id: u.user?.id as string, decision: f.decision,
      source_url: f.source_url.trim(), evidence_date: f.evidence_date, reason: f.reason.trim(), notes: f.notes.trim() || null,
    });
    setSaving(false);
    if (error) setErr("Signature refusée. Vérifiez vos droits administrateur et les champs.");
    else { setF({ source_url: "", evidence_date: "", reason: "", decision: "", notes: "", examined: false }); onSaved(); }
  };

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <p className="text-xs font-medium text-foreground">Revue humaine de la preuve LCAP (signée, non modifiable)</p>
      {reviews.length > 0 && (
        <ul className="space-y-1">
          {reviews.map((v) => (
            <li key={v.id} className="rounded-md bg-muted p-2 text-[11px]">
              {new Date(v.created_at).toLocaleString("fr-CA")} · <strong>{v.decision}</strong> · preuve du {v.evidence_date} · {v.reason}
            </li>
          ))}
        </ul>
      )}
      <Input placeholder="URL HTTPS de la source examinée" value={f.source_url} onChange={(e) => setF({ ...f, source_url: e.target.value })} />
      <Input type="date" aria-label="Date de la preuve" value={f.evidence_date} onChange={(e) => setF({ ...f, evidence_date: e.target.value })} />
      <select aria-label="Décision" className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={f.decision} onChange={(e) => setF({ ...f, decision: e.target.value })}>
        <option value="">Décision…</option>
        <option value="evidence_documented">Preuve documentée (n'autorise pas l'envoi)</option>
        <option value="insufficient_evidence">Preuve insuffisante</option>
        <option value="refusal_found">Refus de sollicitation trouvé → exclure</option>
      </select>
      <Textarea placeholder="Motif (pertinence, mention de refus, etc.)" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
      <Textarea placeholder="Notes (facultatif)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      <label className="flex items-start gap-2 text-xs text-foreground min-h-11">
        <input type="checkbox" className="mt-0.5 h-5 w-5" checked={f.examined} onChange={(e) => setF({ ...f, examined: e.target.checked })} />
        J'ai ouvert et examiné moi-même cette source.
      </label>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <Button size="sm" className="w-full min-h-11" onClick={save} disabled={saving || !complete}>
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Signer la revue
      </Button>
      <p className="text-[11px] text-muted-foreground">L'envoi reste interdit : mobile vérifié et approbation d'envoi restent requis.</p>
    </div>
  );
}

/** Lien protégé : préparé à la demande, montré une seule fois, jamais transmis. */
function LinkPanel({ row, link, onChanged }: { row: Row; link: LinkRow | undefined; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const active = link && !link.revoked_at && new Date(link.expires_at) > new Date();
  const run = async (action: "prepare" | "regenerate" | "revoke") => {
    if (busy) return;
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.functions.invoke("manual-import-prepare-link", { body: { row_id: row.id, action } });
    setBusy(false);
    if (error || !data?.ok) { setMsg("Action refusée."); return; }
    if (data.url) setShown(data.url);
    else if (data.already_prepared) setMsg("Lien déjà préparé (non réaffiché). Régénérez pour obtenir un nouveau lien.");
    else if (action === "revoke") { setShown(null); setMsg("Lien révoqué."); }
    onChanged();
  };
  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <p className="text-xs font-medium text-foreground">Lien protégé 350 $ (non transmis)</p>
      <p className="text-[11px] text-muted-foreground">
        {active ? `Préparé · expire le ${new Date(link!.expires_at).toLocaleDateString("fr-CA")} · ouvertures ${link!.opened_count} · revendication ${link!.claim_status}` : "Non préparé"}
      </p>
      {shown && <p className="rounded-md bg-muted p-2 text-[11px] break-all text-foreground">{shown}<br /><span className="text-muted-foreground">Affiché une seule fois. Ne pas envoyer tant que mobile et LCAP ne sont pas validés.</span></p>}
      {msg && <p className="text-[11px] text-muted-foreground">{msg}</p>}
      <div className="flex gap-2">
        {!active && <Button size="sm" className="flex-1 min-h-11" disabled={busy} onClick={() => run("prepare")}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Préparer lien sécurisé</Button>}
        {active && <Button size="sm" variant="outline" className="flex-1 min-h-11" disabled={busy} onClick={() => run("regenerate")}>Régénérer</Button>}
        {active && <Button size="sm" variant="outline" className="flex-1 min-h-11" disabled={busy} onClick={() => run("revoke")}>Révoquer</Button>}
      </div>
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

  const ids = (data ?? []).map((r) => r.id);
  const { data: extra, refetch: refetchExtra } = useQuery({
    queryKey: ["apchq-review-extra", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const [l, v] = await Promise.all([
        supabase.from("manual_import_claim_links").select("import_row_id,expires_at,revoked_at,claim_status,opened_count").in("import_row_id", ids).is("revoked_at", null),
        supabase.from("manual_import_casl_reviews").select("*").in("import_row_id", ids).order("created_at"),
      ]);
      if (l.error) throw l.error;
      if (v.error) throw v.error;
      return { links: (l.data ?? []) as LinkRow[], reviews: (v.data ?? []) as Review[] };
    },
  });
  const linkOf = (id: string) => extra?.links.find((x) => x.import_row_id === id);
  const reviewsOf = (id: string) => (extra?.reviews ?? []).filter((x) => x.import_row_id === id);
  const lastDecision = (id: string) => reviewsOf(id).at(-1)?.decision;

  const rows = useMemo(() => (data ?? []).filter((r) => {
    const n = r.normalized ?? {};
    if (q && !`${r.company} ${r.contact} ${r.city}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "missing") return (n.crosscheck?.missing ?? []).length > 0;
    if (filter === "casl_doc") return lastDecision(r.id) === "evidence_documented";
    if (filter === "excluded") return lastDecision(r.id) === "refusal_found";
    return true;
  }), [data, q, filter, extra]);

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
                  <Flag label="LCAP" kind={lastDecision(r.id) === "evidence_documented" ? "declared" : "pending"} />
                  <Flag label="Lien 350 $" kind={linkOf(r.id) && new Date(linkOf(r.id)!.expires_at) > new Date() ? "declared" : "pending"} />
                  <Flag label="RBQ" kind="pending" />
                </div>
                {isOpen && (
                  <div className="space-y-2 text-xs text-foreground">
                    <p>Croisement ({cc.checked_at ? new Date(cc.checked_at).toLocaleString("fr-CA") : "non fait"}) : opt-out {cc.sms_opt_outs ?? "?"}, suppressions {(cc.suppression_index ?? 0) + (cc.outreach_suppressions ?? 0) + (cc.outbound_suppressions ?? 0) + (cc.suppressed_emails ?? 0)}, historique SMS {cc.sms_history ?? "?"}, échecs Twilio {cc.twilio_failures_30003_30006_30034 ?? "?"}, compte entrepreneur {cc.contractor_account ?? "?"}, doublons {(cc.duplicate_other_imports ?? 0) + (cc.duplicate_in_batch ?? 0)}.</p>
                    {(cc.missing ?? []).length > 0 && <p className="text-destructive">Manquant : {(cc.missing as string[]).join(", ")}</p>}
                    <p>Adhésion APCHQ : non établie. Mobile : non vérifié (Twilio Canada restreint). Envoi : bloqué.</p>
                    <p className="rounded-md bg-muted p-2">Brouillon interne (non envoyable) : {n.internal_draft?.body ?? "—"}</p>
                    <p>Revue LCAP : <strong>{lastDecision(r.id) ?? "à faire"}</strong></p>
                    <LinkPanel row={r} link={linkOf(r.id)} onChanged={() => refetchExtra()} />
                    <CaslForm row={r} reviews={reviewsOf(r.id)} onSaved={() => refetchExtra()} />
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
