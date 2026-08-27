/**
 * UNPRO — Calculateur de forfait de croissance
 * Route: /entrepreneur/calculateur-forfait
 *
 * L'entrepreneur construit lui-même son forfait: objectifs → rendez-vous requis →
 * forfait recommandé (mensuel ou annuel) + frais de création de profil.
 * Toute la tarification provient de `compute-pricing-quote` (source unique).
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  TrendingUp,
  ShieldCheck,
  Users,
  CalendarCheck,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { formatPrice, formatPriceCents } from "@/lib/formatPrice";
import { redirectToCheckout } from "@/lib/redirectToCheckout";
import {
  useGrowthCalculatorEngine,
  useCalculatorReferenceData,
} from "@/hooks/useGrowthCalculatorEngine";

const COMPETITION_META: Record<string, { label: string; width: string; tone: string }> = {
  faible: { label: "Faible concurrence", width: "33%", tone: "bg-emerald-500" },
  moyenne: { label: "Concurrence moyenne", width: "66%", tone: "bg-amber-500" },
  forte: { label: "Forte concurrence", width: "100%", tone: "bg-rose-500" },
};

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-4 text-center">
      <p className="text-2xl font-black text-foreground">{value}</p>
      <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

export default function PageForfaitGrowthCalculator() {
  const { inputs, update, math, quote, computing, error, canCompute, computeQuote } =
    useGrowthCalculatorEngine();
  const { data: reference } = useCalculatorReferenceData();
  const [paying, setPaying] = useState<"plan" | "pack" | null>(null);

  const growth = quote?.growth;
  const competition = COMPETITION_META[growth?.competition_level ?? "moyenne"];

  const handleCompute = async () => {
    const result = await computeQuote();
    if (result) {
      setTimeout(
        () => document.getElementById("resultats")?.scrollIntoView({ behavior: "smooth" }),
        120,
      );
    }
  };

  const requireAuth = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      toast.info("Connectez-vous pour activer votre forfait.");
      window.location.href = `/auth?redirect=${encodeURIComponent("/entrepreneur/calculateur-forfait")}`;
      return false;
    }
    return true;
  };

  const activatePlan = async () => {
    if (!quote || !growth) return;
    if (!(await requireAuth())) return;
    setPaying("plan");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          planId: quote.recommended_plan,
          billingInterval: inputs.billingInterval,
          quoteId: quote.quote_id,
          includeProfileFee: true,
          // Server-authoritative: no client-side amount authorization.
          successUrl: `${window.location.origin}/entrepreneur/payment-success?quote_id=${quote.quote_id}`,
          cancelUrl: `${window.location.origin}/entrepreneur/calculateur-forfait`,
        },
      });
      if (fnErr) throw new Error(fnErr.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      if ((data as any)?.url) redirectToCheckout((data as any).url);
      else toast.error("Impossible d'ouvrir le paiement. Réessayez.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de paiement.");
    } finally {
      setPaying(null);
    }
  };

  const activatePack = async () => {
    if (!growth) return;
    if (!(await requireAuth())) return;
    setPaying("pack");
    try {
      const { data: packQuote, error: qErr } = await supabase.functions.invoke(
        "compute-pricing-quote",
        {
          body: {
            company_name: inputs.companyName || null,
            trade_primary: inputs.trade,
            city: inputs.city,
            service_cities: [inputs.city],
            pricing_mode: "pack",
            total_price_cents: growth.entry_pack.total_price_cents,
            guarantee_duration_months: growth.entry_pack.duration_months,
            target_monthly_appointments: math?.monthlyAppointments ?? 1,
            average_project_value: inputs.avgProjectValue,
            monthly_capacity: inputs.monthlyCapacity || (math?.monthlyContracts ?? 1),
            close_rate_estimate: inputs.closeRate,
            source: "growth_calculator_pack",
          },
        },
      );
      if (qErr) throw new Error(qErr.message);
      if ((packQuote as any)?.error) throw new Error((packQuote as any).error);
      const guaranteed = Number((packQuote as any).guaranteed_appointments ?? 0);
      if (guaranteed <= 0) {
        toast.error("Analyse du territoire requise avant le paiement du pack d'entrée.");
        return;
      }
      const { data, error: fnErr } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          packQuoteId: (packQuote as any).quote_id,
          // Server-authoritative: the amount is resolved from the stored quote.
        },
      });
      if (fnErr) throw new Error(fnErr.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      if ((data as any)?.url) redirectToCheckout((data as any).url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de paiement.");
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <Helmet>
        <title>Calculez le forfait adapté à votre croissance | UNPRO</title>
        <meta
          name="description"
          content="Indiquez vos objectifs de croissance : UNPRO calcule les contrats, les rendez-vous requis et le forfait exact adapté à votre domaine et votre territoire."
        />
        <link rel="canonical" href="https://unpro.ca/entrepreneur/calculateur-forfait" />
      </Helmet>

      {/* Hero */}
      <header className="px-5 pt-10 pb-6 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Calculateur UNPRO
          </span>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
            Calculez le forfait adapté à votre croissance
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Un projet. Un bon match. Un PRO. Répondez à quelques questions : nous calculons les
            contrats à décrocher, les rendez-vous nécessaires et le forfait exact pour votre
            domaine et votre territoire.
          </p>
        </div>
      </header>

      {/* Intake */}
      <section className="px-5 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-border/50 bg-card p-5 sm:p-6">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nom de l'entreprise</Label>
            <Input
              value={inputs.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              placeholder="Ex. Ventilation Boréale"
              className="h-11 rounded-xl"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Domaine principal</Label>
              <AutocompleteInput
                options={reference?.trades ?? []}
                value={inputs.trade}
                onValueChange={(v) => update("trade", v)}
                placeholder="Choisir un domaine"
                searchPlaceholder="Rechercher un domaine…"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ville principale</Label>
              <AutocompleteInput
                options={reference?.cities ?? []}
                value={inputs.city}
                onValueChange={(v) => update("city", v)}
                placeholder="Choisir une ville"
                searchPlaceholder="Rechercher une ville…"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Rayon de service : {inputs.radiusKm} km
            </Label>
            <input
              type="range"
              min={5}
              max={150}
              step={5}
              value={inputs.radiusKm}
              onChange={(e) => update("radiusKm", parseInt(e.target.value, 10))}
              className="w-full accent-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Chiffre d'affaires annuel ($)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={inputs.annualRevenue || ""}
                onChange={(e) => update("annualRevenue", parseFloat(e.target.value) || 0)}
                placeholder="750000"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Marge brute (%)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={inputs.marginPercent || ""}
                onChange={(e) => update("marginPercent", parseFloat(e.target.value) || 0)}
                placeholder="25"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Valeur moyenne d'un contrat ($)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={inputs.avgProjectValue || ""}
                onChange={(e) => update("avgProjectValue", parseFloat(e.target.value) || 0)}
                placeholder="8000"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Taux de conversion (%)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={inputs.closeRate || ""}
                onChange={(e) => update("closeRate", parseFloat(e.target.value) || 0)}
                placeholder="30"
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Croissance souhaitée</Label>
            <div className="flex gap-2">
              {(["percent", "amount"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => update("growthMode", mode)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    inputs.growthMode === mode
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/60 text-muted-foreground"
                  }`}
                >
                  {mode === "percent" ? "En pourcentage" : "En dollars"}
                </button>
              ))}
            </div>
            <Input
              type="number"
              inputMode="numeric"
              value={inputs.growthValue || ""}
              onChange={(e) => update("growthValue", parseFloat(e.target.value) || 0)}
              placeholder={inputs.growthMode === "percent" ? "20" : "150000"}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Capacité max (projets / mois)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={inputs.monthlyCapacity || ""}
                onChange={(e) => update("monthlyCapacity", parseFloat(e.target.value) || 0)}
                placeholder="6"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Facturation</Label>
              <div className="flex gap-2">
                {(["month", "year"] as const).map((iv) => (
                  <button
                    key={iv}
                    type="button"
                    onClick={() => update("billingInterval", iv)}
                    className={`flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                      inputs.billingInterval === iv
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    {iv === "month" ? "Mensuel" : "Annuel"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/60 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Exclusivité territoriale</p>
              <p className="text-xs text-muted-foreground">
                Selon la disponibilité réelle de votre territoire.
              </p>
            </div>
            <Switch
              checked={inputs.wantsExclusivity}
              onCheckedChange={(v) => update("wantsExclusivity", v)}
            />
          </div>

          {/* Live objective math */}
          <AnimatePresence>
            {math && math.growthAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent p-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                  Votre objectif
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <StatTile value={formatPrice(math.growthAmount)} label="croissance visée" />
                  <StatTile value={String(math.contractsNeeded)} label="contrats à décrocher" />
                  <StatTile value={String(math.appointmentsNeeded)} label="rendez-vous / an" />
                  <StatTile value={String(math.monthlyAppointments)} label="rendez-vous / mois" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    value={formatPrice(math.potentialGrossProfit)}
                    label="profit brut potentiel"
                  />
                  <StatTile
                    value={formatPrice(math.expectedGrossProfitPerAppointment)}
                    label="profit brut / rendez-vous"
                  />
                </div>
                {math.capacityExceeded && (
                  <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                    <p className="text-xs text-foreground">
                      Votre objectif dépasse votre capacité déclarée ({inputs.monthlyCapacity}{" "}
                      projets/mois). Augmentez votre capacité ou ajustez votre croissance visée.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            onClick={handleCompute}
            disabled={!canCompute || computing}
            className="h-12 w-full rounded-xl text-sm font-bold"
          >
            {computing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyse de votre territoire…
              </>
            ) : (
              "Calculer mon forfait"
            )}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </section>

      {/* Results */}
      {quote && growth && (
        <section id="resultats" className="mt-8 px-5 sm:px-8">
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="rounded-3xl border border-primary/40 bg-card p-5 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Forfait recommandé
              </p>
              <h2 className="mt-1 text-2xl font-black text-foreground">{quote.plan_name}</h2>

              <div className="mt-4 space-y-2 rounded-2xl border border-border/50 bg-background/60 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">
                    {inputs.billingInterval === "year" ? "Facturation annuelle" : "Facturation mensuelle"}
                  </span>
                  <span className="text-2xl font-black text-foreground">
                    {formatPriceCents(
                      inputs.billingInterval === "year"
                        ? growth.annual_price_cents
                        : growth.monthly_price_cents,
                    )}
                  </span>
                </div>
                {inputs.billingInterval === "year" && growth.annual_savings_cents > 0 && (
                  <p className="text-xs font-semibold text-emerald-500">
                    Économie de {formatPriceCents(growth.annual_savings_cents)} — 2 mois offerts
                  </p>
                )}
                <div className="flex items-baseline justify-between border-t border-border/50 pt-2">
                  <span className="text-sm text-muted-foreground">
                    Création et optimisation du profil (unique)
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatPriceCents(growth.profile_fee_cents)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t border-border/50 pt-2">
                  <span className="text-sm font-semibold text-foreground">Payable aujourd'hui</span>
                  <span className="text-xl font-black text-primary">
                    {formatPriceCents(growth.due_today_cents)}
                  </span>
                </div>
              </div>

              {/* Competition gauge */}
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> {inputs.city} · {inputs.trade}
                  </span>
                  <span className="font-semibold text-foreground">{competition.label}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${competition.tone}`}
                    style={{ width: competition.width }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Données de marché : {quote.data_status === "verified" ? "vérifiées" : "partielles"}
                  {growth.territory_override?.manually_validated && " · territoire validé manuellement"}
                </p>
              </div>

              <Button
                onClick={activatePlan}
                disabled={paying !== null || quote.pricing_status === "waitlisted"}
                className="mt-5 h-12 w-full rounded-xl text-sm font-bold"
              >
                {paying === "plan" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ouverture du paiement…
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" /> Activer mon forfait
                  </>
                )}
              </Button>
              {quote.pricing_status === "waitlisted" && (
                <p className="mt-2 text-center text-xs text-amber-500">
                  Ce territoire est complet. Vous serez placé en liste d'attente.
                </p>
              )}
            </div>

            {/* Entry pack */}
            <div className="rounded-3xl border border-border/50 bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Autre option — paiement unique
              </p>
              <h3 className="mt-1 text-lg font-bold text-foreground">
                Pack d'entrée {formatPriceCents(growth.entry_pack.total_price_cents)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Comprend la création de votre profil et jusqu'à {growth.entry_pack.max_appointments}{" "}
                rendez-vous exclusifs garantis, selon votre domaine, votre territoire et la
                disponibilité réelle. Le nombre exact est confirmé avant le paiement.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarCheck className="h-3.5 w-3.5" />
                Livraison sur {growth.entry_pack.duration_months} mois maximum
              </div>
              <Button
                variant="outline"
                onClick={activatePack}
                disabled={paying !== null}
                className="mt-4 h-11 w-full rounded-xl text-sm font-semibold"
              >
                {paying === "pack" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirmation…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Confirmer mon pack d'entrée
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
