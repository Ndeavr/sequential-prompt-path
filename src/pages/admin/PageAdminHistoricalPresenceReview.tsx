/**
 * /admin/presence-historique — revue humaine des droits Présence historiques en attente.
 * Preuves séparées par mode Stripe (LIVE/TEST), sans nom ni contact; aucune décision
 * automatique. Décision = admin connecté, en son nom, raison écrite (RPC serveur).
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type Row = {
  contractor_id: string; stripe_mode: string; activation_status_at_rule: string | null; is_published: boolean | null;
  auth_user_exists: boolean | null; synthetic_name_hint: boolean | null;
  same_mode_paid_sessions: number; other_mode_paid_sessions: number; unknown_mode_paid_sessions: number;
  same_mode_signed_paid_events: number; other_mode_signed_paid_events: number; same_mode_max_paid_amount_cents: number | null;
  ledger_actions: string | null; admin_activation_logs: number; evidence_class: string; checkout_impact: string;
};

export const EVIDENCE_LABEL: Record<string, string> = {
  same_mode_paid_350_evidence: "Paiement signé de 350 $ ou plus, même mode",
  same_mode_paid_other_amount: "Paiement signé d'un autre montant, même mode",
  other_or_unknown_mode_payment_only: "Paiement seulement dans l'autre mode (ou mode inconnu)",
  no_same_mode_payment_published: "Aucun paiement de ce mode — profil publié",
  no_same_mode_payment_unpublished: "Aucun paiement de ce mode — profil non publié",
};

export const MIN_REASON = 20;

const money = (c: number | null) => (c === null ? "—" : new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(c / 100));
const yes = (b: boolean | null) => (b === null ? "inconnu" : b ? "oui" : "non");

function Decision({ row }: { row: Row }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: async (decision: "confirmed" | "rejected") => {
      const { error } = await supabase.rpc("review_historical_presence_right", {
        _contractor_id: row.contractor_id, _stripe_mode: row.stripe_mode, _decision: decision, _reason: reason.trim(),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-historical-presence-evidence"] }),
  });
  const ok = reason.trim().length >= MIN_REASON && !m.isPending;
  return (
    <div className="space-y-2">
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Raison de la décision (preuve consultée, au moins 20 caractères)" aria-label="Raison de la décision" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={!ok} onClick={() => m.mutate("confirmed")}>Confirmer le droit</Button>
        <Button size="sm" variant="outline" disabled={!ok} onClick={() => m.mutate("rejected")}>Refuser le droit</Button>
      </div>
      {m.isError && <p className="text-sm text-destructive" role="alert">La décision n'a pas été enregistrée. Rien n'a changé.</p>}
    </div>
  );
}

export default function PageAdminHistoricalPresenceReview() {
  const q = useQuery({
    queryKey: ["admin-historical-presence-evidence"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_historical_presence_review_evidence");
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <Helmet><title>Droits Présence historiques — revue | UNPRO</title><meta name="robots" content="noindex" /></Helmet>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Droits Présence historiques en attente</h1>
        <p className="text-sm text-muted-foreground">
          Tant qu'un dossier est en attente, aucun paiement n'est créé pour cette entreprise et ses accès actuels restent inchangés.
          Seule une preuve du même mode Stripe compte; l'indice de nom de test n'est qu'une information.
        </p>
      </header>
      {q.isLoading && <p className="text-sm text-muted-foreground">Chargement des preuves…</p>}
      {q.isError && <p className="text-sm text-destructive" role="alert">Preuves indisponibles (accès admin requis).</p>}
      {q.data && q.data.length === 0 && <p className="text-sm text-muted-foreground">Aucun dossier en attente.</p>}
      {q.data?.map((r) => (
        <section key={`${r.contractor_id}:${r.stripe_mode}`} className="space-y-3 rounded-[28px] border border-border/40 bg-card/40 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={r.stripe_mode === "live" ? "default" : "secondary"}>{r.stripe_mode.toUpperCase()}</Badge>
            <Link className="font-mono text-sm text-foreground underline" to={`/admin/contractors/${r.contractor_id}`}>{r.contractor_id}</Link>
          </div>
          <p className="text-sm font-medium text-foreground">{EVIDENCE_LABEL[r.evidence_class] ?? r.evidence_class}</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground sm:grid-cols-3">
            <div><dt className="inline">Statut à la règle : </dt><dd className="inline text-foreground">{r.activation_status_at_rule ?? "—"}</dd></div>
            <div><dt className="inline">Publié : </dt><dd className="inline text-foreground">{yes(r.is_published)}</dd></div>
            <div><dt className="inline">Compte existant : </dt><dd className="inline text-foreground">{yes(r.auth_user_exists)}</dd></div>
            <div><dt className="inline">Paiements signés (même mode) : </dt><dd className="inline text-foreground">{r.same_mode_signed_paid_events}</dd></div>
            <div><dt className="inline">Autre mode : </dt><dd className="inline text-foreground">{r.other_mode_signed_paid_events + r.other_mode_paid_sessions}</dd></div>
            <div><dt className="inline">Montant max : </dt><dd className="inline text-foreground">{money(r.same_mode_max_paid_amount_cents)}</dd></div>
            <div><dt className="inline">Registre : </dt><dd className="inline text-foreground">{r.ledger_actions ?? "—"}</dd></div>
            <div><dt className="inline">Journal admin : </dt><dd className="inline text-foreground">{r.admin_activation_logs}</dd></div>
            <div><dt className="inline">Indice nom de test : </dt><dd className="inline text-foreground">{yes(r.synthetic_name_hint)}</dd></div>
          </dl>
          <Decision row={r} />
        </section>
      ))}
    </main>
  );
}
