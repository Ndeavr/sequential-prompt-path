import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; reference: string; created_at: string; client_name: string; client_phone: string | null; client_email: string | null; city_or_postal: string; service_requested: string; project_description: string; transfer_reason: string; status: string; credit_status: string; admin_notes: string | null; is_synthetic: boolean };
const STATUSES = ["received", "in_review", "accepted", "refused"] as const;
const CREDITS = ["to_evaluate", "granted", "not_granted"] as const;

/** Leads recyclés par les entrepreneurs — lecture/évaluation admin via RLS; réviseur et date estampillés par le serveur. */
export default function AdminLeadReferrals() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const load = () => void supabase.from("contractor_lead_referrals").select("id, reference, created_at, client_name, client_phone, client_email, city_or_postal, service_requested, project_description, transfer_reason, status, credit_status, admin_notes, is_synthetic").order("created_at", { ascending: false }).limit(200)
    .then(({ data, error }) => { if (error) setErr("Lecture impossible : accès administrateur requis."); else setRows((data ?? []) as Row[]); });
  useEffect(load, []);
  const update = async (id: string, patch: Partial<Row>) => {
    const { error } = await supabase.from("contractor_lead_referrals").update(patch).eq("id", id);
    if (error) setErr("Mise à jour refusée."); else load();
  };
  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-6">
      <h1 className="text-2xl font-semibold mb-4">Leads recyclés</h1>
      {err && <p role="alert" className="text-destructive">{err}</p>}
      {!rows && !err && <p role="status">Chargement…</p>}
      {rows?.length === 0 && <p>Aucun lead pour le moment.</p>}
      <div className="space-y-3">
        {rows?.map((r) => (
          <article key={r.id} className="rounded-xl border border-border bg-card p-4 text-sm space-y-1">
            <p className="font-semibold">{r.reference} · {r.service_requested} · {r.city_or_postal}{r.is_synthetic && " · SYNTHÉTIQUE"}</p>
            <p>{r.client_name} · {r.client_phone ?? "—"} · {r.client_email ?? "—"} · {r.transfer_reason} · {new Date(r.created_at).toLocaleString("fr-CA")}</p>
            <p>{r.project_description}</p>
            <div className="flex flex-wrap gap-2">
              <select aria-label="Statut" value={r.status} onChange={(e) => void update(r.id, { status: e.target.value })} className="rounded border border-input bg-background px-2 py-1">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              <select aria-label="Crédit" value={r.credit_status} onChange={(e) => void update(r.id, { credit_status: e.target.value })} className="rounded border border-input bg-background px-2 py-1">{CREDITS.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
