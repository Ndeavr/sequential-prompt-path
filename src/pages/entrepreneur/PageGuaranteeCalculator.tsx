/**
 * UNPRO — Calculateur de garantie (offre d'entrée 350 $, paiement unique).
 *
 * Une seule question à la fois, mobile-first. Le nombre de rendez-vous vient
 * TOUJOURS du moteur canonique (compute-pricing-quote, mode "pack").
 * Avant calcul : « jusqu'à 5 ». Après calcul : la garantie réelle.
 */
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, ShieldCheck, Sparkles, MapPin, Hammer, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OFFER_350, guaranteeSentence } from "@/lib/copy/offer350";
import { redirectToCheckout } from "@/lib/redirectToCheckout";
import { Helmet } from "react-helmet-async";

interface PackQuote {
  quote_id: string;
  guaranteed_appointments: number;
  total_price_cents: number | null;
  guarantee_duration_months: number | null;
  offer_max_appointments: number | null;
  pricing_status: string;
  mode_outcome: string;
  city: string;
  trade: string;
}

const STEPS = ["trade", "city", "capacity", "value"] as const;
type Step = (typeof STEPS)[number];

export default function PageGuaranteeCalculator() {
  // Pré-remplissage depuis la page d'activation (?trade=&city=) : on ne repose
  // jamais une question dont UNPRO connaît déjà la réponse vérifiée.
  const prefill =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const prefillTrade = (prefill.get("trade") ?? "").trim();
  const prefillCity = (prefill.get("city") ?? "").trim();

  const [step, setStep] = useState<Step>(
    prefillTrade ? (prefillCity ? "capacity" : "city") : "trade",
  );
  const [trade, setTrade] = useState(prefillTrade);
  const [city, setCity] = useState(prefillCity);
  const [capacity, setCapacity] = useState("");
  const [projectValue, setProjectValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<PackQuote | null>(null);
  const [paying, setPaying] = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const progress = useMemo(() => ((stepIndex + 1) / STEPS.length) * 100, [stepIndex]);

  const next = () => {
    if (step === "trade" && !trade.trim()) return toast.error("Indiquez votre domaine.");
    if (step === "city" && !city.trim()) return toast.error("Indiquez votre ville principale.");
    if (step === "capacity" && !Number(capacity)) return toast.error("Indiquez votre capacité mensuelle.");
    if (step === "value") return compute();
    setStep(STEPS[stepIndex + 1]);
  };

  const compute = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("compute-pricing-quote", {
        body: {
          pricing_mode: "pack",
          total_price_cents: OFFER_350.price_cents,
          guarantee_duration_months: OFFER_350.duration_months,
          trade_primary: trade.trim(),
          city: city.trim(),
          service_cities: [city.trim()],
          target_monthly_appointments: 0,
          monthly_capacity: Math.max(1, Number(capacity) || 1),
          average_project_value: Math.max(500, Number(projectValue) || 5000),
          close_rate_estimate: 0.3,
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);

      setQuote({
        quote_id: (data as any).quote_id,
        guaranteed_appointments: Number((data as any).guaranteed_appointments ?? 0),
        total_price_cents: (data as any).total_price_cents ?? OFFER_350.price_cents,
        guarantee_duration_months: (data as any).guarantee_duration_months ?? OFFER_350.duration_months,
        offer_max_appointments: (data as any).offer_max_appointments ?? OFFER_350.max_appointments,
        pricing_status: (data as any).pricing_status,
        mode_outcome: (data as any).mode_outcome,
        city: city.trim(),
        trade: trade.trim(),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors du calcul.");
    } finally {
      setLoading(false);
    }
  };

  const activate = async () => {
    if (!quote || quote.guaranteed_appointments <= 0) return;
    setPaying(true);
    try {
      // Un jeton d'activation (?t=) signifie que le prospect vient d'une
      // sollicitation UNPRO : on passe par le checkout d'activation pour
      // préserver la chaîne d'attribution jusqu'au paiement.
      const activationToken =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("t") : null;
      const { data, error } = activationToken
        ? await supabase.functions.invoke("create-activation-checkout", {
          body: {
            activation_token: activationToken,
            quote_id: quote.quote_id,
            source: "guarantee_calculator",
          },
        })
        : await supabase.functions.invoke("create-checkout-session", {
          body: {
            packQuoteId: quote.quote_id,
            displayedPriceCents: quote.total_price_cents,
            displayedGuaranteedAppointments: quote.guaranteed_appointments,
          },
        });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      if ((data as any)?.url) {
        const auditId = prefill.get("audit");
        const auditToken = prefill.get("audit_token");
        if (auditId && auditToken) {
          await supabase.functions.invoke("ai-recommendation-audit", {
            body: {
              action: "event",
              audit_id: auditId,
              token: auditToken,
              event_type: "checkout_created",
              metadata: { quote_id: quote.quote_id, source: "guarantee_calculator" },
            },
          });
        }
        redirectToCheckout((data as any).url);
      }
      else toast.error("Impossible d'ouvrir le paiement. Réessayez.");

    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de paiement.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Jusqu'à 5 rendez-vous exclusifs garantis dès 350 $ | UNPRO</title>
        <meta name="description" content={OFFER_350.subtitle} />
      </Helmet>

      <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-10">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {OFFER_350.card.eyebrow}
          </div>
          <h1 className="text-balance text-2xl font-extrabold leading-tight text-foreground sm:text-3xl">
            {OFFER_350.title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{OFFER_350.subtitle}</p>
        </div>

        {!quote && (
          <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-lg backdrop-blur">
            <div className="mb-5 h-1 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.28 }}
                className="space-y-4"
              >
                {step === "trade" && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-base font-semibold text-foreground">
                      <Hammer className="h-4 w-4 text-primary" /> Quel est votre domaine principal ?
                    </Label>
                    <Input
                      autoFocus
                      value={trade}
                      onChange={(e) => setTrade(e.target.value)}
                      placeholder="Toiture, isolation, pavage…"
                      onKeyDown={(e) => e.key === "Enter" && next()}
                    />
                  </div>
                )}

                {step === "city" && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-base font-semibold text-foreground">
                      <MapPin className="h-4 w-4 text-primary" /> Dans quelle ville voulez-vous des rendez-vous ?
                    </Label>
                    <Input
                      autoFocus
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Laval, Terrebonne, Québec…"
                      onKeyDown={(e) => e.key === "Enter" && next()}
                    />
                  </div>
                )}

                {step === "capacity" && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-base font-semibold text-foreground">
                      <Gauge className="h-4 w-4 text-primary" /> Combien de nouveaux projets pouvez-vous absorber par mois ?
                    </Label>
                    <Input
                      autoFocus
                      inputMode="numeric"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ""))}
                      placeholder="5"
                      onKeyDown={(e) => e.key === "Enter" && next()}
                    />
                  </div>
                )}

                {step === "value" && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold text-foreground">
                      Quelle est la valeur moyenne d'un de vos projets ?
                    </Label>
                    <Input
                      autoFocus
                      inputMode="numeric"
                      value={projectValue}
                      onChange={(e) => setProjectValue(e.target.value.replace(/\D/g, ""))}
                      placeholder="8000"
                      onKeyDown={(e) => e.key === "Enter" && next()}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <Button className="mt-6 h-12 w-full rounded-2xl text-base font-semibold" onClick={next} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyse du territoire…
                </>
              ) : step === "value" ? (
                <>
                  {OFFER_350.ctaCalculate} <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Continuer <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="mt-4 text-center text-xs text-muted-foreground">{OFFER_350.disclaimer}</p>
          </div>
        )}

        {quote && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-xl backdrop-blur"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {OFFER_350.resultTitle}
            </p>

            {quote.guaranteed_appointments > 0 ? (
              <>
                <p className="mt-2 text-4xl font-extrabold text-foreground">{OFFER_350.price_label}</p>
                <p className="mt-1 text-lg font-semibold text-primary">
                  {guaranteeSentence(quote.guaranteed_appointments)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {quote.trade} · {quote.city} · jusqu'à {quote.guarantee_duration_months ?? OFFER_350.duration_months} mois
                </p>

                <div className="mt-5 space-y-2 rounded-2xl border border-border/50 bg-background/50 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{OFFER_350.resultMaxLabel}</span>
                    <span className="font-medium text-foreground">{OFFER_350.resultMaxValue}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{OFFER_350.resultGuaranteeLabel}</span>
                    <span className="font-semibold text-foreground">{quote.guaranteed_appointments}</span>
                  </div>
                </div>

                <Button
                  className="mt-6 h-12 w-full rounded-2xl text-base font-semibold"
                  onClick={activate}
                  disabled={paying}
                >
                  {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  {OFFER_350.ctaActivate}
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">{OFFER_350.paymentNote}</p>
              </>
            ) : (
              <>
                <p className="mt-2 text-2xl font-bold text-foreground">{OFFER_350.analysisRequired}</p>
                <p className="mt-3 text-sm text-muted-foreground">{OFFER_350.analysisRequiredHelp}</p>
                <Button
                  variant="outline"
                  className="mt-6 h-12 w-full rounded-2xl"
                  onClick={() => {
                    setQuote(null);
                    setStep("trade");
                  }}
                >
                  Modifier mes critères
                </Button>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
