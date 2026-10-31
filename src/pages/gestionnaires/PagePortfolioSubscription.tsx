/**
 * Portefeuille multi-immeubles : compte réel (portfolios), abonnement consolidé (portfolio_subscriptions, lecture seule),
 * immeubles rattachés progressivement (portfolio_properties, plafonné par trigger). Statut = Stripe signé seulement.
 */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getTierForUnits } from "@/config/condoPricing";
import { isValidDoors, loadSelection, parseSelection, saveSelection } from "@/lib/managerSelection";
import { redirectToCheckout } from "@/lib/redirectToCheckout";

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente de paiement confirmé",
  active: "Actif (paiement confirmé par Stripe)",
  past_due: "Paiement en retard",
  failed: "Paiement échoué",
  cancelled: "Annulé",
};
const db = supabase as any;

export default function PagePortfolioSubscription() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const checkout = params.get("checkout");
  const [selection] = useState(() => {
    const s = parseSelection(params) ?? loadSelection();
    return s ? { ...s, type: "portfolio" as const } : null;
  });
  const [doorsText, setDoorsText] = useState(String(selection?.doors ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pf = useQuery({
    queryKey: ["mgr-portfolio", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.from("portfolios").select("id, name, total_doors").eq("user_id", user!.id)
        .not("total_doors", "is", null).order("created_at").limit(1).maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string; total_doors: number } | null;
    },
  });
  const portfolio = pf.data ?? null;

  const sub = useQuery({
    queryKey: ["mgr-portfolio-sub", portfolio?.id],
    enabled: !!portfolio,
    refetchInterval: checkout === "success" ? 5000 : false,
    queryFn: async () => {
      const { data, error } = await db.from("portfolio_subscriptions").select("status, doors, current_period_end").eq("portfolio_id", portfolio!.id).maybeSingle();
      if (error) throw error;
      return data as { status: string; doors: number; current_period_end: string | null } | null;
    },
  });

  const links = useQuery({
    queryKey: ["mgr-portfolio-props", portfolio?.id],
    enabled: !!portfolio,
    queryFn: async () => {
      const { data, error } = await db.from("portfolio_properties").select("id, door_count, property_id").eq("portfolio_id", portfolio!.id);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; door_count: number | null; property_id: string }>;
    },
  });
  const props = useQuery({
    queryKey: ["mgr-own-props", user?.id],
    enabled: !!user && !!portfolio,
    queryFn: async () => {
      const { data, error } = await db.from("properties").select("id, address, full_address, city").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; address: string | null; full_address: string | null; city: string | null }>;
    },
  });

  useEffect(() => { if (selection) saveSelection(selection); }, [selection]);
  useEffect(() => { if (portfolio && !doorsText) setDoorsText(String(portfolio.total_doors)); }, [portfolio, doorsText]);

  const doors = Number(doorsText);
  const valid = isValidDoors(doors);
  const tier = getTierForUnits(valid ? doors : 2);
  const status = sub.data?.status ?? null;
  const locked = status === "active" || status === "past_due";
  const capacity = locked ? sub.data!.doors : portfolio?.total_doors ?? 0;
  const used = (links.data ?? []).reduce((a, l) => a + (l.door_count ?? 0), 0);

  const saveAndSubscribe = async () => {
    if (!user || !valid) return;
    setBusy(true); setError(null);
    try {
      let id = portfolio?.id;
      if (!id) {
        const { data, error } = await db.from("portfolios").insert({ user_id: user.id, name: "Mon parc immobilier", plan_type: "manager", total_doors: doors }).select("id").single();
        if (error) throw error;
        id = data.id;
      } else if (!locked && portfolio!.total_doors !== doors) {
        const { error } = await db.from("portfolios").update({ total_doors: doors }).eq("id", id);
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ["mgr-portfolio"] });
      const { data, error } = await supabase.functions.invoke("create-condo-checkout", { body: { portfolioId: id } });
      if (error) {
        let msg = "Le paiement n'a pas pu être préparé. Réessayez.";
        try { const b = await (error as any).context?.json?.(); if (b?.message) msg = b.message; } catch { /* ignore */ }
        throw new Error(msg);
      }
      if (!data?.url) throw new Error("Le paiement n'a pas pu être préparé. Réessayez.");
      redirectToCheckout(data.url);
    } catch (e: any) {
      setError(e?.message || "Une erreur est survenue. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const [propId, setPropId] = useState("");
  const [propDoors, setPropDoors] = useState("");
  const addBuilding = async () => {
    if (!portfolio || !propId || !(Number(propDoors) >= 1)) return;
    setError(null);
    const { error } = await db.from("portfolio_properties").insert({ portfolio_id: portfolio.id, property_id: propId, door_count: Number(propDoors) });
    if (error) { setError(error.message.includes("capacité") ? error.message : "Impossible d'ajouter cet immeuble."); return; }
    setPropId(""); setPropDoors("");
    qc.invalidateQueries({ queryKey: ["mgr-portfolio-props"] });
  };

  if (pf.isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Chargement" /></div>;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <Helmet><title>Mon parc immobilier — UNPRO</title><meta name="robots" content="noindex" /></Helmet>
      <div className="mx-auto max-w-lg space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="size-5" aria-hidden="true" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Plusieurs immeubles / parc locatif</p>
            <h1 className="text-xl font-bold">Mon parc immobilier</h1>
          </div>
        </div>

        {checkout === "success" && status !== "active" && (
          <p role="status" className="rounded-xl border border-border p-3 text-sm">Paiement reçu par Stripe? Nous attendons sa confirmation signée avant d'activer votre abonnement.</p>
        )}
        {checkout === "cancelled" && <p role="status" className="rounded-xl border border-border p-3 text-sm">Paiement annulé. Votre sélection est conservée; vous pouvez reprendre.</p>}

        <section className="space-y-3 rounded-2xl border border-primary/20 bg-card p-5">
          <label htmlFor="pf-doors" className="block text-sm font-semibold">Nombre total de portes</label>
          <Input id="pf-doors" type="number" inputMode="numeric" min={2} max={9999} value={doorsText} disabled={locked}
            onChange={(e) => setDoorsText(e.target.value)} aria-invalid={!valid} className="h-12 text-lg font-semibold" />
          {!valid && <p className="text-xs text-destructive">Entrez un nombre entier entre 2 et 9 999.</p>}
          <p className="whitespace-nowrap text-2xl font-extrabold tabular-nums">{tier.priceTaxIncluded.toLocaleString("fr-CA")}&nbsp;$ / an + taxes</p>
          <p className="text-xs text-muted-foreground">{tier.units.replace("unités", "portes")} · CAD, avant TPS et TVQ applicables</p>
          <p className="text-sm">Statut : <strong>{status ? STATUS_LABEL[status] ?? status : "Aucun abonnement"}</strong></p>
          {!locked && (
            <Button onClick={saveAndSubscribe} disabled={!valid || busy} className="min-h-12 w-full whitespace-normal">
              {busy ? "Préparation du paiement…" : `Choisir mon forfait — ${tier.priceTaxIncluded.toLocaleString("fr-CA")}\u00a0$/an + taxes`}
            </Button>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </section>

        {portfolio && (
          <section className="space-y-3 rounded-2xl border border-border bg-card p-5" aria-labelledby="pf-b">
            <h2 id="pf-b" className="font-semibold">Immeubles rattachés</h2>
            <p className="text-sm text-muted-foreground">{used} / {capacity} portes attribuées. Ajoutez vos immeubles à votre rythme.</p>
            <ul className="space-y-1 text-sm">
              {(links.data ?? []).map((l) => {
                const p = props.data?.find((x) => x.id === l.property_id);
                return <li key={l.id}>{p?.full_address || p?.address || "Immeuble"} · {l.door_count ?? 0} portes</li>;
              })}
            </ul>
            {(props.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune propriété dans votre compte. <Link to="/dashboard/properties/new" className="text-primary underline">Ajouter une propriété</Link></p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
                <select aria-label="Propriété" value={propId} onChange={(e) => setPropId(e.target.value)} className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
                  <option value="">Choisir une propriété</option>
                  {(props.data ?? []).filter((p) => !(links.data ?? []).some((l) => l.property_id === p.id)).map((p) => (
                    <option key={p.id} value={p.id}>{p.full_address || p.address || "Propriété"}</option>
                  ))}
                </select>
                <Input aria-label="Portes dans cet immeuble" type="number" min={1} value={propDoors} onChange={(e) => setPropDoors(e.target.value)} placeholder="Portes" className="min-h-11" />
                <Button variant="outline" className="min-h-11" onClick={addBuilding} disabled={!propId || !(Number(propDoors) >= 1) || used + Number(propDoors) > capacity}>Ajouter</Button>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
