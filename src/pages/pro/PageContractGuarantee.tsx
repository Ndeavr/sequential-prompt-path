/**
 * /pro/garantie-contrats — solde et échéance de la garantie « 10 contrats »
 * de l'entrepreneur connecté. Lecture par RPC propriétaire; la déclaration
 * d'un contrat enregistre seulement l'acceptation de l'entrepreneur : il ne
 * compte qu'après vérification de l'acceptation du client par UNPRO.
 * Aucun remboursement n'est automatique : il est revu à l'échéance.
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GUARANTEE_COPY } from "../../../supabase/functions/_shared/contractGuarantee";

type Guarantee = {
  guarantee_id: string; label_fr: string; terms_fr: string; stripe_mode: string; paid_at: string; ends_at: string; status: string;
  guaranteed_contracts: number; counted_contracts: number; pending_contracts: number; missing_contracts: number; refund_base_cents: number;
};
type Contract = { id: string; guarantee_id: string; service_label: string; city: string; client_reference: string; status: string; created_at: string; cancellation_review_open: boolean };

const money = (c: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(c / 100);
const date = (d: string) => new Intl.DateTimeFormat("fr-CA", { dateStyle: "long" }).format(new Date(d));

export const GUARANTEE_STATUS_LABEL: Record<string, string> = {
  active: "En cours",
  payment_review: "En revue (paiement remboursé ou contesté)",
  refund_due: "Remboursement confirmé, en préparation",
  refund_recorded: "Remboursement effectué",
  closed_no_refund: "Terminée — objectif atteint",
};
export const CONTRACT_STATUS_LABEL: Record<string, string> = {
  pending_review: "Vérification de l'acceptation du client",
  counted: "Compté",
  not_counted: "Non compté",
};

function DeclareContract({ guarantee }: { guarantee: Guarantee }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ service: "", city: "", client: "", reference: "", note: "" });
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("declare_guarantee_contract", {
        p_guarantee_id: guarantee.guarantee_id, p_service_label: f.service.trim(), p_city: f.city.trim(),
        p_client_reference: f.client.trim(), p_contract_reference: f.reference.trim() || undefined, p_evidence_note: f.note.trim() || undefined,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { setF({ service: "", city: "", client: "", reference: "", note: "" }); void qc.invalidateQueries({ queryKey: ["my-contract-guarantees"] }); },
  });
  const ok = f.service.trim().length >= 2 && f.city.trim().length >= 2 && f.client.trim().length >= 2 && !m.isPending;
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (ok) m.mutate(); }} aria-label="Déclarer un contrat accepté">
      <h3 className="text-base font-semibold">Déclarer un contrat accepté</h3>
      <p className="text-sm text-muted-foreground">Le contrat compte après vérification de l'acceptation de votre client. Un rendez-vous ou une soumission envoyée ne compte pas.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Service<Input className="mt-1" value={f.service} maxLength={160} onChange={(e) => setF({ ...f, service: e.target.value })} /></label>
        <label className="text-sm font-medium">Ville<Input className="mt-1" value={f.city} maxLength={120} onChange={(e) => setF({ ...f, city: e.target.value })} /></label>
        <label className="text-sm font-medium">Client (nom ou référence)<Input className="mt-1" value={f.client} maxLength={160} onChange={(e) => setF({ ...f, client: e.target.value })} /></label>
        <label className="text-sm font-medium">N° de contrat (facultatif)<Input className="mt-1" value={f.reference} maxLength={120} onChange={(e) => setF({ ...f, reference: e.target.value })} /></label>
      </div>
      <label className="block text-sm font-medium">Preuve de l'acceptation du client (ex. contrat signé, courriel de confirmation)
        <Textarea className="mt-1" value={f.note} maxLength={1000} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </label>
      <Button type="submit" disabled={!ok} className="min-h-11">{m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer pour vérification"}</Button>
      {m.isSuccess && <p role="status" className="text-sm text-primary">Contrat reçu. Il sera compté après vérification de l'acceptation du client.</p>}
      {m.isError && <p role="alert" className="text-sm text-destructive">Le contrat n'a pas été enregistré. Vérifiez les champs et réessayez.</p>}
    </form>
  );
}

export default function PageContractGuarantee() {
  const q = useQuery({
    queryKey: ["my-contract-guarantees"],
    queryFn: async () => {
      const [{ data: g, error: ge }, { data: c, error: ce }] = await Promise.all([
        supabase.rpc("my_contract_guarantees"),
        supabase.from("contractor_guarantee_contracts").select("id,guarantee_id,service_label,city,client_reference,status,created_at,cancellation_review_open").order("created_at", { ascending: false }),
      ]);
      if (ge || ce) throw new Error("unavailable");
      return { guarantees: (g ?? []) as Guarantee[], contracts: (c ?? []) as Contract[] };
    },
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <Helmet><title>Ma garantie 10 contrats | UNPRO</title><meta name="robots" content="noindex" /></Helmet>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{GUARANTEE_COPY.headline}</h1>
        <p className="text-sm">{GUARANTEE_COPY.conditions}</p>
      </header>
      {q.isLoading && <p className="text-sm text-muted-foreground">Chargement de votre garantie…</p>}
      {q.isError && <p role="alert" className="text-sm text-destructive">Votre garantie n'a pas pu être chargée. Réessayez dans un instant.</p>}
      {q.data && q.data.guarantees.length === 0 && (
        <section className="rounded-[28px] border border-border p-5 text-sm">
          <p>Aucune garantie active. Elle apparaît ici dès que Stripe confirme le paiement de l'offre 10 contrats garantis.</p>
          <Link to="/allume" className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary underline">Voir l'offre</Link>
        </section>
      )}
      {q.data?.guarantees.map((g) => {
        const contracts = q.data.contracts.filter((c) => c.guarantee_id === g.guarantee_id);
        const open = (g.status === "active" || g.status === "payment_review") && new Date(g.ends_at) > new Date();
        return (
          <section key={g.guarantee_id} className="space-y-4 rounded-[28px] border border-primary/30 bg-card p-5" data-testid="guarantee-balance">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{GUARANTEE_STATUS_LABEL[g.status] ?? g.status}</Badge>
              {g.stripe_mode === "test" && <Badge variant="secondary">TEST</Badge>}
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-muted-foreground">Contrats comptés</dt><dd className="text-2xl font-semibold">{g.counted_contracts} / {g.guaranteed_contracts}</dd></div>
              <div><dt className="text-muted-foreground">En vérification</dt><dd className="text-2xl font-semibold">{g.pending_contracts}</dd></div>
              <div><dt className="text-muted-foreground">Échéance</dt><dd className="font-semibold">{date(g.ends_at)}</dd></div>
              <div><dt className="text-muted-foreground">Remboursement si l'échéance était aujourd'hui</dt><dd className="font-semibold">{money(g.refund_base_cents)} + taxes</dd></div>
            </dl>
            <p className="text-xs text-muted-foreground">Période du {date(g.paid_at)} au {date(g.ends_at)}. À l'échéance, UNPRO vérifie le solde et prépare le remboursement de 35 $ par contrat manquant, avec la part correspondante des taxes payées.</p>
            {contracts.length > 0 && (
              <ul className="divide-y divide-border text-sm">
                {contracts.map((c) => (
                  <li key={c.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>{c.service_label} · {c.city} · {c.client_reference}</span>
                    <span className="text-muted-foreground">{CONTRACT_STATUS_LABEL[c.status] ?? c.status}{c.cancellation_review_open ? " · annulation en revue" : ""}</span>
                  </li>
                ))}
              </ul>
            )}
            {open && <DeclareContract guarantee={g} />}
          </section>
        );
      })}
    </main>
  );
}
