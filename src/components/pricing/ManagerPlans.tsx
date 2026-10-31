/**
 * UNPRO — Tarifs Gestionnaires.
 * Reuses the existing condo Stripe catalog: no duplicate product, price or billing system.
 * Same server-mapped tier for one condo or a multi-building portfolio; selection persists to checkout.
 */
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Building2, CheckCircle2, ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONDO_PRICING_TIERS, getTierForUnits } from "@/config/condoPricing";
import { isValidDoors, loadSelection, onboardingPath, saveSelection } from "@/lib/managerSelection";

const money = (value: number) => new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 0 }).format(value);
const moneyDecimal = (value: number) => new Intl.NumberFormat("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export default function ManagerPlans({ authenticated }: { authenticated: boolean }) {
  const [params] = useSearchParams();
  const initial = typeof window !== "undefined" ? loadSelection() : null;
  const [countText, setCountText] = useState(String(initial?.doors ?? 24));
  // Le lien de la page gestionnaire peut présélectionner le parc immobilier.
  const [portfolio, setPortfolio] = useState(
    params.get("type") === "portfolio" ? true :
    params.get("type") === "condo" ? false :
    initial?.type !== "condo"
  );
  const count = Number(countText);
  const valid = isValidDoors(count);
  const tier = getTierForUnits(valid ? count : 24);
  const yearly = tier.priceTaxIncluded;
  const perDoorYearly = valid ? yearly / count : 0;
  const selection = { type: (portfolio ? "portfolio" : "condo") as "portfolio" | "condo", doors: count };
  const target = onboardingPath(selection);
  const ctaLink = authenticated ? target : `/signup?redirect=${encodeURIComponent(target)}`;

  return (
    <section id="gestionnaires-plans" aria-labelledby="gestionnaires-title" className="px-4 pb-12 sm:px-5">
      <div className="mx-auto max-w-5xl rounded-2xl border border-primary/25 bg-card p-5 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">UNPRO Gestionnaires</p>
            <h2 id="gestionnaires-title" className="text-xl font-bold text-foreground sm:text-2xl">
              Combien de portes gérez-vous?
            </h2>
          </div>
        </div>

        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Gérez vos immeubles, vos logements, vos documents et l’entretien au même endroit.
          Le forfait annuel est calculé selon le nombre total de portes, même si elles sont réparties dans plusieurs immeubles.
        </p>

        <fieldset className="mt-5" aria-label="Type de gestion">
          <legend className="mb-2 text-sm font-semibold">Quel type d'immeubles gérez-vous?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium ${portfolio ? "border-primary bg-primary/10 text-foreground" : "border-border/50 text-muted-foreground"}`}>
              <input type="radio" name="gestion-type" checked={portfolio} onChange={() => setPortfolio(true)} className="size-4 shrink-0 accent-primary" />
              <span className="min-w-0">Gestionnaire d'immeubles / parc locatif</span>
            </label>
            <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium ${!portfolio ? "border-primary bg-primary/10 text-foreground" : "border-border/50 text-muted-foreground"}`}>
              <input type="radio" name="gestion-type" checked={!portfolio} onChange={() => setPortfolio(false)} className="size-4 shrink-0 accent-primary" />
              <span className="min-w-0">Copropriété / syndicat</span>
            </label>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {portfolio
              ? "Additionnez les portes de tous vos immeubles. Vous pourrez les rattacher progressivement à votre portefeuille."
              : "Pour une copropriété, comptez toutes les unités distinctes de l'immeuble."}
          </p>
        </fieldset>

        <div className="mt-5 grid items-end gap-4 sm:grid-cols-[1fr_1.2fr]">
          <div>
            <label htmlFor="manager-doors" className="mb-2 block text-sm font-semibold text-foreground">
              Nombre total de portes
            </label>
            <Input
              id="manager-doors"
              data-testid="manager-door-count"
              inputMode="numeric"
              type="number"
              min={2}
              max={9999}
              step={1}
              value={countText}
              onChange={(e) => setCountText(e.target.value)}
              aria-invalid={!valid}
              aria-describedby="manager-doors-help"
              className="h-12 rounded-xl text-lg font-semibold"
            />
            <p id="manager-doors-help" className="mt-1 text-xs text-muted-foreground">
              {valid ? "Une porte = un logement ou une unité distincte." : "Entrez un nombre entier entre 2 et 9 999."}
            </p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4" aria-live="polite">
            {valid ? (
              <>
                <p className="text-xs font-medium text-muted-foreground">{portfolio ? "Parc immobilier" : "Copropriété"} · {tier.units.replace("unités", "portes")} · {count} portes</p>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-3xl font-extrabold tabular-nums text-foreground">
                  {money(yearly)}&nbsp;$ <span className="text-sm font-normal text-muted-foreground">/ an + taxes</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {moneyDecimal(perDoorYearly)}&nbsp;$ par porte / an · CAD, avant TPS et TVQ applicables
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Entrez le nombre de portes pour voir votre forfait.</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /> Passeport Immeuble</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /> Suivi des entretiens</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /> Documents centralisés</span>
        </div>

        <Button asChild disabled={!valid} className="mt-5 !h-auto min-h-12 w-full rounded-xl px-4 py-3 font-semibold whitespace-normal">
          {valid ? (
            <Link to={ctaLink} onClick={() => saveSelection(selection)} data-testid="manager-cta"
              aria-label={`Choisir mon forfait à ${money(yearly)} dollars par an avant taxes`}
              className="flex min-w-0 items-center justify-center gap-2 text-center leading-snug">
              <span className="min-w-0">Choisir ce forfait</span>
              <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          ) : (
            <span>Entrez le nombre de portes</span>
          )}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Votre nombre de portes et votre type de gestion sont conservés jusqu'au paiement.
        </p>

        <details className="mt-5 border-t border-border/40 pt-3">
          <summary className="flex min-h-11 w-full min-w-0 cursor-pointer list-none items-center justify-between gap-3 text-left text-sm font-medium leading-snug text-primary">
            <span className="min-w-0">Comparer les forfaits par nombre de portes</span> <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CONDO_PRICING_TIERS.map((plan) => (
              <div key={plan.priceId} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${valid && tier.priceId === plan.priceId ? "border-primary/40 bg-primary/5" : "border-border/40"}`}>
                <span className="text-foreground">{plan.units.replace("unités", "portes")}</span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">{money(plan.priceTaxIncluded)} $ / an + taxes</span>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Tarifs annuels selon le total des portes gérées, en copropriété ou dans un parc locatif. TPS et TVQ applicables en sus.
          </p>
        </details>
      </div>
    </section>
  );
}
