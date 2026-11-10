/**
 * /admin/realisations — modération humaine des réalisations gratuites.
 * Décision uniquement via `moderate_portfolio_project` (admin vérifié serveur).
 */
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { PORTFOLIO_BUCKET } from "@/lib/portfolio/freePortfolio";

interface Row {
  id: string; title: string; description: string | null; service_name: string | null; city: string | null;
  status: string; gallery_urls: unknown; created_at: string; review_reason: string | null;
  show_company_name: boolean; photo_rights_confirmed: boolean; contractor_id: string;
}

export default function PageAdminPortfolioModeration() {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "withdrawn">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error: e } = await supabase.from("contractor_portfolio_projects")
      .select("id,title,description,service_name,city,status,gallery_urls,created_at,review_reason,show_company_name,photo_rights_confirmed,contractor_id")
      .eq("status", filter).order("created_at", { ascending: filter === "pending" }).limit(50);
    if (e) { setError(e.message); setLoading(false); return; }
    const list = (data ?? []) as Row[];
    setRows(list);
    const paths = list.flatMap((r) => (Array.isArray(r.gallery_urls) ? (r.gallery_urls as string[]) : []));
    if (paths.length) {
      const { data: signed } = await supabase.storage.from(PORTFOLIO_BUCKET).createSignedUrls(paths, 600);
      setUrls(Object.fromEntries((signed ?? []).filter((s) => s.path && s.signedUrl).map((s) => [s.path as string, s.signedUrl])));
    }
    setLoading(false);
  }, [filter]);
  useEffect(() => { void load(); }, [load]);

  const decide = async (id: string, decision: "approve" | "reject") => {
    setError(null);
    const { error: e } = await supabase.rpc("moderate_portfolio_project" as never, { p_id: id, p_decision: decision, p_reason: reasons[id] ?? "" } as never);
    if (e) { setError(e.message.includes("reason_required") ? "Un motif d’au moins 5 caractères est requis pour refuser ou retirer." : e.message); return; }
    await load();
  };

  return (
    <div className="admin-theme min-h-screen bg-background p-6 text-foreground">
      <Helmet><title>Modération des réalisations | UNPRO Admin</title></Helmet>
      <h1 className="text-2xl font-semibold">Réalisations à modérer</h1>
      <p className="mt-1 text-sm text-muted-foreground">Vérifier : vrai projet, aucun visage, plaque ou adresse identifiable sans consentement, droits confirmés. Réalisation déclarée ≠ qualifications vérifiées.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "withdrawn"] as const).map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {{ pending: "En attente", approved: "Approuvées", rejected: "Refusées", withdrawn: "Retirées" }[s]}
          </Button>
        ))}
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      {loading ? <p className="mt-6 text-sm text-muted-foreground">Chargement…</p> : rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Aucune réalisation dans cet état.</p>
      ) : (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {rows.map((r) => {
            const paths = Array.isArray(r.gallery_urls) ? (r.gallery_urls as string[]) : [];
            return (
              <li key={r.id} className="rounded-[28px] border border-border bg-card p-4">
                <div className="grid grid-cols-4 gap-2">
                  {paths.map((p) => urls[p] ? <a key={p} href={urls[p]} target="_blank" rel="noreferrer"><img src={urls[p]} alt="" className="aspect-square w-full rounded-xl object-cover" /></a> : <div key={p} className="aspect-square rounded-xl bg-muted" />)}
                </div>
                <p className="mt-3 font-semibold">{r.title}</p>
                <p className="text-sm text-muted-foreground">{[r.service_name, r.city].filter(Boolean).join(" · ")} — {new Date(r.created_at).toLocaleString("fr-CA")}</p>
                {r.description && <p className="mt-1 text-sm">{r.description}</p>}
                <p className="mt-1 text-xs text-muted-foreground">Droits confirmés : {r.photo_rights_confirmed ? "oui" : "non"} · Nom affiché : {r.show_company_name ? "oui" : "non"} · Entreprise : {r.contractor_id.slice(0, 8)}</p>
                {r.review_reason && <p className="mt-1 text-xs">Motif : {r.review_reason}</p>}
                {(r.status === "pending" || r.status === "approved") && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Input className="min-w-[12rem] flex-1" placeholder="Motif (requis pour refuser/retirer)" value={reasons[r.id] ?? ""} onChange={(e) => setReasons((x) => ({ ...x, [r.id]: e.target.value }))} />
                    {r.status === "pending" && <Button onClick={() => void decide(r.id, "approve")}>Approuver</Button>}
                    <Button variant="outline" onClick={() => void decide(r.id, "reject")}>{r.status === "pending" ? "Refuser" : "Retirer"}</Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
