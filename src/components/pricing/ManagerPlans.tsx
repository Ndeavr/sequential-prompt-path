/**
 * UNPRO — Tarifs Gestionnaires.
 * Reuses the existing condo Stripe catalog: no duplicate product, price or billing system.
 * Multi-building/rental portfolios are qualified by Clara, not mis-sold a one-syndicate subscription.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, CheckCircle2, ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONDO_PRICING_TIERS, getTierForUnits } from "@/config/condoPricing";

const money = (value: number) => new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 0 }).format(value);
const moneyDecimal = (value: number) => new Intl.NumberFormat("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export default function ManagerPlans({ authenticated }: { authenticated: boolean }) {
  const [countText, setCountText] = useState("24");
  const [portfolio, setPortfolio] = useState(false);
  const count = Number(countText);
  const valid = Number.isInteger(count) && count >= 2 && count <= 9999;
  const tier = getTierForUnits(valid ? count : 24);
  const yearly = tier.priceTaxIncluded;
  const perDoorMonthly = valid ? yearly / count / 12 : 0;
  const onboarding = `/condos/onboarding?units=${count}&source=gestionnaires`;
  const signupLink = authenticated ? onboarding : `/signup?redirect=${encodeURIComponent(onboarding)}`;
  const claraLink = `/alex?q=${encodeURIComponent(
    `Je suis gestionnaire immobilier. J'administre ${valid ? count : "plusieurs"} portes ${portfolio ? "dans plusieurs immeubles" : "et je souhaite une offre UNPRO adaptée"}. Aidez-moi à choisir une offre et à créer mon dossier.`
  )}`;

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
          Un Passeport Immeuble, les documents et le suivi d'entretien au même endroit.
          Pour les copropriétés, le prix annuel varie selon le nombre de portes.
        </p>

        <fieldset className="mt-5 grid gap-2 sm:grid-cols-2" aria-label="Type de gestion">
          <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-medium ${!portfolio ? "border-primary bg-primary/10 text-foreground" : "border-border/50 text-muted-foreground"}`}>
            <input type="radio" name="gestion-type" checked={!portfolio} onChange={() => setPortfolio(false)} className="accent-primary" />
            Une copropriété
          </label>
          <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-medium ${portfolio ? "border-primary bg-primary/10 text-foreground" : "border-border/50 text-muted-foreground"}`}>
            <input type="radio" name="gestion-type" checked={portfolio} onChange={() => setPortfolio(true)} className="accent-primary" />
            Plusieurs immeubles / parc locatif
          </label>
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
            {!portfolio && valid ? (
              <>
                <p className="text-xs font-medium text-muted-foreground">UNPRO Condos Premium · {tier.units}</p>
                <p className="mt-1 text-3xl font-extrabold tabular-nums text-foreground">
                  {money(yearly)} $ <span className="text-sm font-normal text-muted-foreground">/ an</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {moneyDecimal(perDoorMonthly)} $ par porte / mois · TPS et TVQ incluses
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-foreground">Offre pour votre portefeuille</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Clara vous aide à préciser les immeubles, les accès et les services avant toute tarification.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /> Passeport Immeuble</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /> Suivi des entretiens</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /> Documents centralisés</span>
        </div>

        <Button asChild disabled={!valid} className="mt-5 min-h-12 w-full rounded-xl font-semibold">
          {valid ? (
            <Link to={portfolio ? claraLink : signupLink}>
              {portfolio ? "Obtenir une offre adaptée avec Clara" : "Créer mon Passeport Immeuble"}
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span>Entrez le nombre de portes</span>
          )}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {portfolio
            ? "Les offres multi-immeubles ne sont pas facturées automatiquement."
            : "Création du Passeport gratuite. Le plan Premium est choisi séparément, avant paiement."}
        </p>

        <details className="mt-5 border-t border-border/40 pt-3">
          <summary className="flex min-h-9 cursor-pointer list-none items-center justify-center gap-2 text-sm font-medium text-primary">
            Voir les six paliers de copropriété <ChevronDown className="size-4" aria-hidden="true" />
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CONDO_PRICING_TIERS.map((plan) => (
              <div key={plan.priceId} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${!portfolio && valid && tier.priceId === plan.priceId ? "border-primary/40 bg-primary/5" : "border-border/40"}`}>
                <span className="text-foreground">{plan.units.replace("unités", "portes")}</span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">{money(plan.priceTaxIncluded)} $ / an</span>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Tarifs du catalogue UNPRO Condos pour une copropriété. Taxes incluses. La tarification des portefeuilles distincts reste à définir.
          </p>
        </details>
      </div>
    </section>
  );
}
