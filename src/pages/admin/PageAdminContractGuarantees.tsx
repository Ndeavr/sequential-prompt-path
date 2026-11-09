/**
 * /admin/garanties-contrats — revue humaine de l'offre « 10 contrats garantis ».
 * Contrats déclarés : compter seulement avec preuve d'acceptation du client et
 * concordance services/territoire. Garanties échues : remboursement dû calculé
 * (35 $ × contrats manquants, max 350 $, taxes au prorata). Aucun remboursement
 * Stripe n'est exécuté ici : l'admin le fait dans la facturation puis le consigne.
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GUARANTEE_STATUS_LABEL, CONTRACT_STATUS_LABEL } from "@/pages/pro/PageContractGuarantee";

type QueueRow = {
  guarantee_id: string; contractor_id: string; business_name: string | null; stripe_mode: string; paid_at: string; ends_at: string;
  status: string; status_reason: string | null; guaranteed_contracts: number; counted_contracts: number; pending_contracts: number;
  refund_base_cents: number; refund_total_estimate_cents: number; amount_subtotal_cents: number; amount_total_cents: number;
  refund_recorded_cents: number | null; is_due: boolean;
};
type ContractRow = {
  id: string; guarantee_id: string; service_label: string; city: string; client_reference: string; contract_reference: string | null;
  contractor_evidence_note: string | null; status: string; cancellation_review_open: boolean; created_at: string;
};

const MIN_REASON = 20;
const money = (c: number | null) => (c === null ? "—" : new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(c / 100));
const date = (d: string) => new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium" }).format(new Date(d));
const KEY = ["admin-contract-guarantees"];

function ContractReview({ c }: { c: ContractRow }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState("signed_contract");
  const [acceptedAt, setAcceptedAt] = useState("");
  const [evidence, setEvidence] = useState("");
  const [scope, setScope] = useState(false);
  const m = useMutation({
    mutationFn: async (decision: string) => {
      const { error } = await supabase.rpc("admin_review_guarantee_contract", {
        p_contract_id: c.id, p_decision: decision, p_reason: reason.trim(),
        ...(decision === "counted" ? { p_client_method: method, p_client_accepted_at: acceptedAt ? new Date(acceptedAt).toISOString() : undefined, p_client_evidence: evidence.trim(), p_scope_matches: scope } : {}),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
  const reasonOk = reason.trim().length >= MIN_REASON && !m.isPending;
  const countOk = reasonOk && !!acceptedAt && evidence.trim().length >= 10 && scope;
  return (
    <div className="space-y-2 rounded-2xl border border-border/60 p-3 text-sm">
      <p className="font-medium">{c.service_label} · {c.city} · {c.client_reference}{c.contract_reference ? ` · ${c.contract_reference}` : ""}</p>
      <p className="text-muted-foreground">{CONTRACT_STATUS_LABEL[c.status] ?? c.status} · déclaré le {date(c.created_at)}{c.cancellation_review_open ? " · annulation en revue (reste compté jusqu'à décision)" : ""}</p>
      {c.contractor_evidence_note && <p className="text-muted-foreground">Preuve indiquée : {c.contractor_evidence_note}</p>}
      <div className="grid gap-2 sm:grid-cols-3">
        <label>Mode d'acceptation du client
          <select className="mt-1 h-10 w-full rounded-md border border-border bg-background px-2" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="signed_contract">Contrat signé</option>
            <option value="written_confirmation">Confirmation écrite du client</option>
            <option value="homeowner_account">Compte propriétaire UNPRO</option>
          </select>
        </label>
        <label>Date d'acceptation du client<Input type="date" className="mt-1" value={acceptedAt} onChange={(e) => setAcceptedAt(e.target.value)} /></label>
        <label className="flex items-center gap-2 pt-6"><input type="checkbox" checked={scope} onChange={(e) => setScope(e.target.checked)} />Services et territoire du profil</label>
      </div>
      <Input value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Preuve consultée (document, courriel, appel confirmé…)" aria-label="Preuve consultée" />
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Raison de la décision (au moins 20 caractères)" aria-label="Raison de la décision" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={!countOk} onClick={() => m.mutate("counted")}>Compter le contrat</Button>
        <Button size="sm" variant="outline" disabled={!reasonOk} onClick={() => m.mutate("not_counted")}>Ne pas compter</Button>
        <Button size="sm" variant="ghost" disabled={!reasonOk} onClick={() => m.mutate(c.cancellation_review_open ? "close_cancellation_review" : "open_cancellation_review")}>
          {c.cancellation_review_open ? "Fermer la revue d'annulation" : "Ouvrir une revue d'annulation"}
        </Button>
      </div>
      {m.isError && <p role="alert" className="text-destructive">Décision refusée par le serveur : {m.error.message}. Rien n'a changé.</p>}
    </div>
  );
}

function GuaranteeStatus({ g }: { g: QueueRow }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [recorded, setRecorded] = useState("");
  const m = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.rpc("admin_set_contract_guarantee_status", {
        p_guarantee_id: g.guarantee_id, p_status: status, p_reason: reason.trim(),
        ...(status === "refund_recorded" ? { p_refund_recorded_cents: Math.round(Number(recorded.replace(",", ".")) * 100) } : {}),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
  const ok = reason.trim().length >= MIN_REASON && !m.isPending;
  return (
    <div className="space-y-2 text-sm">
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Raison (au moins 20 caractères)" aria-label="Raison du statut" />
      <div className="flex flex-wrap items-center gap-2">
        {g.is_due && g.status === "active" && g.refund_base_cents > 0 && <Button size="sm" disabled={!ok} onClick={() => m.mutate("refund_due")}>Confirmer le remboursement dû</Button>}
        {g.is_due && g.status === "active" && g.refund_base_cents === 0 && <Button size="sm" disabled={!ok} onClick={() => m.mutate("closed_no_refund")}>Clore — objectif atteint</Button>}
        {g.status === "refund_due" && <>
          <Input className="w-36" inputMode="decimal" value={recorded} onChange={(e) => setRecorded(e.target.value)} placeholder="Montant remboursé $" aria-label="Montant remboursé" />
          <Button size="sm" disabled={!ok || !(Number(recorded.replace(",", ".")) > 0)} onClick={() => m.mutate("refund_recorded")}>Consigner le remboursement fait</Button>
        </>}
        {g.status === "payment_review" && <Button size="sm" variant="outline" disabled={!ok} onClick={() => m.mutate("active")}>Revue terminée — garder la garantie</Button>}
      </div>
      {m.isError && <p role="alert" className="text-destructive">Statut refusé par le serveur : {m.error.message}. Rien n'a changé.</p>}
    </div>
  );
}

export default function PageAdminContractGuarantees() {
  const q = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const [{ data: rows, error: e1 }, { data: contracts, error: e2 }] = await Promise.all([
        supabase.rpc("admin_contract_guarantee_queue"),
        supabase.from("contractor_guarantee_contracts")
          .select("id,guarantee_id,service_label,city,client_reference,contract_reference,contractor_evidence_note,status,cancellation_review_open,created_at")
          .order("created_at", { ascending: true }),
      ]);
      if (e1 || e2) throw new Error("unavailable");
      return { rows: (rows ?? []) as QueueRow[], contracts: (contracts ?? []) as ContractRow[] };
    },
  });
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <Helmet><title>Garanties 10 contrats — revue | UNPRO</title><meta name="robots" content="noindex" /></Helmet>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Garanties « 10 contrats »</h1>
        <p className="text-sm text-muted-foreground">Un contrat compte seulement avec l'acceptation prouvée du client et la concordance services/territoire. Le remboursement n'est jamais automatique : faites-le dans la facturation Stripe, puis consignez-le ici.</p>
      </header>
      {q.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {q.isError && <p role="alert" className="text-sm text-destructive">File indisponible (accès admin requis).</p>}
      {q.data && q.data.rows.length === 0 && <p className="text-sm text-muted-foreground">Aucune garantie payée pour le moment.</p>}
      {q.data?.rows.map((g) => (
        <section key={g.guarantee_id} className="space-y-3 rounded-[28px] border border-border/40 bg-card/40 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={g.stripe_mode === "live" ? "default" : "secondary"}>{g.stripe_mode.toUpperCase()}</Badge>
            <Badge variant="outline">{GUARANTEE_STATUS_LABEL[g.status] ?? g.status}</Badge>
            {g.is_due && <Badge variant="destructive">Échue</Badge>}
            <Link className="text-sm underline" to={`/admin/contractors/${g.contractor_id}`}>{g.business_name ?? g.contractor_id}</Link>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground sm:grid-cols-4">
            <div>Période : <span className="text-foreground">{date(g.paid_at)} → {date(g.ends_at)}</span></div>
            <div>Comptés : <span className="text-foreground">{g.counted_contracts} / {g.guaranteed_contracts}</span> · en revue {g.pending_contracts}</div>
            <div>Base due : <span className="text-foreground">{money(g.refund_base_cents)}</span></div>
            <div>Avec taxes (prorata) : <span className="text-foreground">{money(g.refund_total_estimate_cents)}</span></div>
            <div>Payé : <span className="text-foreground">{money(g.amount_total_cents)}</span></div>
            <div>Remboursé consigné : <span className="text-foreground">{money(g.refund_recorded_cents)}</span></div>
            {g.status_reason && <div className="col-span-2">Motif : <span className="text-foreground">{g.status_reason}</span></div>}
          </dl>
          <GuaranteeStatus g={g} />
          {q.data.contracts.filter((c) => c.guarantee_id === g.guarantee_id).map((c) => <ContractReview key={c.id} c={c} />)}
        </section>
      ))}
    </main>
  );
}
