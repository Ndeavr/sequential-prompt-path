import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; created_at: string; company: string; role: string; sellers_count: number; specialties: string; territories: string; objectives: string[]; annual_revenue_goal_cad: number | null; weekly_capacity: number | null; first_name: string; last_name: string; email: string; status: string; is_synthetic: boolean; utm: Record<string, string> };

/** Demandes d'offre équipes de vente (/directeur-des-ventes) — lecture admin via RLS. */
export default function AdminSalesTeamRequests() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    void supabase.from("sales_team_requests").select("id, created_at, company, role, sellers_count, specialties, territories, objectives, annual_revenue_goal_cad, weekly_capacity, first_name, last_name, email, status, is_synthetic, utm").order("created_at", { ascending: false }).limit(200)
      .then(({ data, error }) => { if (error) setErr("Lecture impossible : accès administrateur requis."); else setRows((data ?? []) as Row[]); });
  }, []);
  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-6">
      <h1 className="text-2xl font-semibold mb-4">Demandes — équipes de vente</h1>
      {err && <p role="alert" className="text-destructive">{err}</p>}
      {!rows && !err && <p role="status">Chargement…</p>}
      {rows?.length === 0 && <p>Aucune demande pour le moment.</p>}
      <div className="space-y-3">
        {rows?.map(r => (
          <article key={r.id} className="rounded-xl border border-border bg-card p-4 text-sm">
            <p className="font-semibold">{r.company} · {r.sellers_count} vendeur(s) · {r.role}{r.is_synthetic && " · SYNTHÉTIQUE"}</p>
            <p>{r.specialties} — {r.territories}</p>
            <p>Objectifs : {r.objectives.join(", ") || "—"}{r.annual_revenue_goal_cad ? ` · ${r.annual_revenue_goal_cad} $` : ""}{r.weekly_capacity ? ` · ${r.weekly_capacity} RDV/sem.` : ""}</p>
            <p>{r.first_name} {r.last_name} · {r.email} · {r.status} · {new Date(r.created_at).toLocaleString("fr-CA")}{r.utm?.utm_campaign ? ` · ${r.utm.utm_campaign}` : ""}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
