/**
 * UNPRO — Contractor Intelligence Landing (Diagnostic).
 *
 * Single-page diagnostic that reveals an AIPP-style score, projects lost
 * revenue and recommends a plan. Two modes:
 *   - alex  → premium hero with floating orb + CTA to homepage Alex
 *   - form  → 3-step adaptive questionnaire (chips + sliders, no long forms)
 *
 * State persists in `contractor_intake_sessions`. CTAs route into the
 * existing checkout funnel (we never touch payment code here).
 */
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Globe,
  Phone,
  Building2,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import AlexMorphingOrb, { type AlexOrbStateV2 } from "@/components/alex/AlexMorphingOrb";
import { elevenlabsService } from "@/features/alex/services/elevenlabsService";
import { CONTRACTOR_PLANS, type ContractorPlanSlug } from "@/config/contractorPlans";
import { recommendPlan, getPlanLabel, getRecommendationReasons } from "@/services/planRecommendationService";
import { useContractorIntakeSession } from "@/hooks/useContractorIntakeSession";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { cn } from "@/lib/utils";

// ───────────────────────────── intake state ─────────────────────────────

interface FormState {
  company_name: string;
  website: string;
  phone: string;
  rbq: string;
  city: string;
  projectsPerMonth: number;
  avgTicket: number;
  quotesPerMonth: number;
  closeRate: number; // 0-100
  crews: number;
  serviceRadius: number;
  emergency: boolean;
  seasonal: boolean;
  leadSources: string[];
}

const DEFAULT_STATE: FormState = {
  company_name: "",
  website: "",
  phone: "",
  rbq: "",
  city: "",
  projectsPerMonth: 8,
  avgTicket: 4500,
  quotesPerMonth: 20,
  closeRate: 30,
  crews: 1,
  serviceRadius: 25,
  emergency: false,
  seasonal: false,
  leadSources: [],
};

const LEAD_SOURCES = [
  "Google",
  "Facebook",
  "Référencements",
  "HomeStars",
  "SEO",
  "Porte-à-porte",
  "Publicité payée",
  "Autre",
];

// ───────────────────────────── deterministic scoring ─────────────────────

function computeAippScore(s: FormState): { score: number; categories: Array<{ label: string; value: number }> } {
  const hasWebsite = s.website.trim().length > 4;
  const hasPhone = s.phone.trim().length > 6;
  const hasRbq = s.rbq.trim().length > 4;

  const seo = Math.min(100, (hasWebsite ? 35 : 10) + (s.leadSources.includes("SEO") ? 25 : 0) + (s.leadSources.includes("Google") ? 20 : 0));
  const trust = Math.min(100, (hasRbq ? 35 : 15) + (hasPhone ? 20 : 0) + Math.min(30, s.closeRate * 0.6));
  const conversion = Math.min(100, 25 + Math.min(50, s.closeRate * 1.2));
  const branding = Math.min(100, 30 + (hasWebsite ? 25 : 0) + Math.min(30, s.crews * 8));
  const aeo = Math.min(100, hasWebsite ? 25 : 8);
  const authority = Math.min(100, 20 + Math.min(50, s.projectsPerMonth * 3));

  const score = Math.round((seo + trust + conversion + branding + aeo + authority) / 6);

  return {
    score,
    categories: [
      { label: "Visibilité SEO", value: Math.round(seo) },
      { label: "Confiance Google", value: Math.round(trust) },
      { label: "Conversion", value: Math.round(conversion) },
      { label: "Image de marque", value: Math.round(branding) },
      { label: "Lisibilité IA (AEO)", value: Math.round(aeo) },
      { label: "Autorité contenu", value: Math.round(authority) },
    ],
  };
}

function computeRevenueProjection(s: FormState) {
  const currentMonthly = s.projectsPerMonth * s.avgTicket;
  const upliftLow = Math.round(currentMonthly * 0.45);
  const upliftHigh = Math.round(currentMonthly * 1.2);
  const targetLeadsLow = Math.round(s.projectsPerMonth * 1.6);
  const targetLeadsHigh = Math.round(s.projectsPerMonth * 3.5);
  return { upliftLow, upliftHigh, targetLeadsLow, targetLeadsHigh, currentMonthly };
}

function pickRecommendedPlan(s: FormState, score: number): ContractorPlanSlug {
  return recommendPlan({
    aippScore: score,
    confidenceLevel: "medium",
    goal: s.avgTicket >= 8000 ? "appointments" : s.crews >= 3 ? "territory" : "ai_presence",
    monthlyAppointmentGoal: Math.max(s.projectsPerMonth, Math.round(s.projectsPerMonth * 2)),
    averageJobValue: s.avgTicket,
    serviceAreaCount: Math.max(1, Math.round(s.serviceRadius / 25)),
  }) as ContractorPlanSlug;
}

// ───────────────────────────── page ─────────────────────────────────────

export default function PageEntrepreneurDiagnosticLanding() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [revealed, setRevealed] = useState(false);
  const [orbState, setOrbState] = useState<AlexOrbStateV2>("idle");
  const [form, setForm] = useState<FormState>(() => ({
    ...DEFAULT_STATE,
    company_name: params.get("company") ?? "",
    website: params.get("website") ?? "",
    phone: params.get("phone") ?? "",
  }));

  const { sessionId, patch } = useContractorIntakeSession("form");
  const { setActiveRole } = useActiveRole();

  // Site-wide contractor mode: triggered immediately on landing.
  useEffect(() => {
    setActiveRole("contractor");
  }, [setActiveRole]);


  // Deep-link prefilled enough? Skip identification step.
  useEffect(() => {
    if (form.company_name && (form.website || form.phone) && step === 0) {
      setStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aipp = useMemo(() => computeAippScore(form), [form]);
  const projection = useMemo(() => computeRevenueProjection(form), [form]);
  const planSlug = useMemo(() => pickRecommendedPlan(form, aipp.score), [form, aipp.score]);
  const plan = CONTRACTOR_PLANS.find((p) => p.slug === planSlug)!;

  const showInstantScan = form.website.trim().length > 4 || form.phone.trim().length > 6;

  // ───────── handlers ─────────

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const goNext = async () => {
    if (step === 0) {
      await patch({
        company_name: form.company_name || null,
        website: form.website || null,
        phone: form.phone || null,
        rbq: form.rbq || null,
        completion_percentage: 33,
      });
      setStep(1);
      return;
    }
    if (step === 1) {
      await patch({
        answers: {
          projectsPerMonth: form.projectsPerMonth,
          avgTicket: form.avgTicket,
          quotesPerMonth: form.quotesPerMonth,
          closeRate: form.closeRate,
          crews: form.crews,
          serviceRadius: form.serviceRadius,
          emergency: form.emergency,
          seasonal: form.seasonal,
          leadSources: form.leadSources,
        },
        completion_percentage: 66,
      });
      setStep(2);
      setRevealed(false);
      // Stagger reveal animations
      setTimeout(() => setRevealed(true), 350);
      return;
    }
  };

  // Persist final reveal once step 2 reached
  useEffect(() => {
    if (step !== 2) return;
    void patch({
      aipp_score: aipp.score,
      recommended_plan: planSlug,
      projected_revenue_low: projection.upliftLow,
      projected_revenue_high: projection.upliftHigh,
      completion_percentage: 100,
    });
  }, [step, aipp.score, planSlug, projection.upliftLow, projection.upliftHigh, patch]);

  const startCheckout = () => {
    sessionStorage.setItem("unpro_intake_recommended_plan", planSlug);
    navigate(`/entrepreneur/checkout?plan=${planSlug}`);
  };

  // ───────── render ─────────

  return (
    <>
      <Helmet>
        <title>Plus de contrats. Moins de soumissions. — UNPRO</title>
        <meta
          name="description"
          content="UNPRO analyse votre visibilité, votre réputation et votre potentiel de croissance. Obtenez votre score AIPP, votre projection de revenus et le plan recommandé en moins de 3 minutes."
        />
      </Helmet>

      <div className="min-h-screen bg-[#060B14] text-white relative overflow-hidden">
        {/* ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vh] rounded-full bg-blue-500/10 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-5 pb-32 pt-10 lg:pt-16">
          <Hero />

          <AlexNarrator
            step={step}
            orbState={orbState}
            setOrbState={setOrbState}
          />

          <VerificationFlow
            website={form.website}
            phone={form.phone}
            companyName={form.company_name}
          />

          <div className="mt-8">
            <ProgressBar step={step} />

            <AnimatePresence mode="wait">
              {step === 0 && (
                <StepCard key="step0">
                  <Step0Identification form={form} update={update} />
                </StepCard>
              )}
              {step === 1 && (
                <StepCard key="step1">
                  <Step1Situation form={form} update={update} />
                </StepCard>
              )}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="mt-8 space-y-6"
                >
                  <AippRevealSection aipp={aipp} revealed={revealed} />
                  <RevenueProjectionCard form={form} projection={projection} />
                  <PlanRecommendationCard
                    plan={plan}
                    slug={planSlug}
                    score={aipp.score}
                    onActivate={startCheckout}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {step < 2 && (
              <div className="mt-6 flex justify-end">
                <Button onClick={goNext} size="lg" className="gap-2">
                  {step === 0 ? "Continuer" : "Voir mon score AIPP"} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <TrustStrip />
        </div>

        {/* sticky mobile CTA on reveal */}
        {step === 2 && (
          <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-white/10 bg-[#060B14]/95 backdrop-blur p-4">
            <Button onClick={startCheckout} className="w-full gap-2" size="lg">
              Activer mon profil UNPRO <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

// ───────────────────────────── sub-components ───────────────────────────

function Hero() {
  return (
    <header className="text-center space-y-5">
      <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">
        <Sparkles className="w-3 h-3 mr-1" /> Diagnostic intelligent UNPRO
      </Badge>
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
        Plus de contrats.
        <br />
        <span className="text-white/60">Moins de soumissions.</span>
      </h1>
      <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto">
        UNPRO analyse votre visibilité, votre réputation et votre capacité actuelle. En moins
        de 3 minutes, obtenez votre score AIPP, votre potentiel de rendez-vous et le plan
        recommandé pour dominer votre territoire.
      </p>
    </header>
  );
}

const ALEX_STEP_SCRIPT: Record<0 | 1 | 2, string> = {
  0: "Bonjour. Je suis Alex d'UNPRO. Pour commencer, donnez-moi le nom de votre entreprise, votre site web et votre téléphone. Je m'occupe du reste.",
  1: "Parfait. Maintenant, ajustez les curseurs : projets par mois, valeur moyenne d'un contrat, taux de fermeture. Sautez ce que vous voulez.",
  2: "Voici votre score AIPP, votre potentiel de revenus, et le plan recommandé pour dominer votre territoire.",
};

function AlexNarrator({
  step,
  orbState,
  setOrbState,
}: {
  step: 0 | 1 | 2;
  orbState: AlexOrbStateV2;
  setOrbState: (s: AlexOrbStateV2) => void;
}) {
  const text = ALEX_STEP_SCRIPT[step];

  const speakNow = useMemo(
    () => async (t: string) => {
      try {
        setOrbState("speaking");
        await elevenlabsService.speak(
          t,
          () => setOrbState("speaking"),
          () => setOrbState("idle"),
        );
      } catch {
        setOrbState("idle");
      }
    },
    [setOrbState],
  );

  // Speak each step's narration on entry (user gesture already happened on landing).
  useEffect(() => {
    void speakNow(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <div className="mt-10 flex flex-col items-center text-center">
      <AlexMorphingOrb
        state={orbState}
        size="lg"
        onClick={() => void speakNow(text)}
        ariaLabel="Alex — touchez pour réécouter"
      />
      <p className="mt-6 max-w-xl text-base sm:text-lg text-white/85 leading-relaxed">
        « {text} »
      </p>
    </div>
  );
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-2 mb-6">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors",
            i <= step ? "bg-primary" : "bg-white/10",
          )}
        />
      ))}
    </div>
  );
}

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-white/[0.03] border-white/10 backdrop-blur p-6 lg:p-8 mt-2">
        {children}
      </Card>
    </motion.div>
  );
}

function normalizeWebsite(v: string): string {
  const t = v.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t.toLowerCase();
  return `https://${t.toLowerCase()}`;
}
function normalizePhone(v: string): string {
  const digits = v.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return v.trim();
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function Step0Identification({ form, update }: { form: FormState; update: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Votre entreprise</h2>
        <p className="text-sm text-white/60 mt-1">
          Tout ce qui suit reste privé. Aucune carte de crédit pour voir le score.
        </p>
      </div>
      <FieldGroup icon={Building2} label="Nom de l'entreprise">
        <Input
          autoFocus
          value={form.company_name}
          onChange={(e) => update("company_name", e.target.value)}
          onBlur={(e) => update("company_name", e.target.value.trim())}
          placeholder="ex : Toiture Tremblay inc."
          className="bg-white/5 border-white/10"
        />
      </FieldGroup>
      <div className="grid sm:grid-cols-2 gap-4">
        <FieldGroup icon={Globe} label="Site web">
          <Input
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
            onBlur={(e) => update("website", normalizeWebsite(e.target.value))}
            placeholder="toituretremblay.ca"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="url"
            className="bg-white/5 border-white/10"
          />
        </FieldGroup>
        <FieldGroup icon={Phone} label="Téléphone">
          <Input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            onBlur={(e) => update("phone", normalizePhone(e.target.value))}
            placeholder="(514) 555-1234"
            inputMode="tel"
            className="bg-white/5 border-white/10"
          />
        </FieldGroup>
      </div>
      <FieldGroup icon={ShieldCheck} label="RBQ (optionnel)">
        <Input
          value={form.rbq}
          onChange={(e) => update("rbq", e.target.value)}
          placeholder="5732-1234-01"
          className="bg-white/5 border-white/10"
        />
      </FieldGroup>
    </div>
  );
}

function Step1Situation({ form, update }: { form: FormState; update: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-xl font-semibold">Votre situation actuelle</h2>
        <p className="text-sm text-white/60 mt-1">
          Sliders rapides. Skippez ce que vous voulez — la recommandation s'adapte.
        </p>
      </div>

      <SliderRow
        label="Projets / mois"
        value={form.projectsPerMonth}
        min={1}
        max={50}
        step={1}
        suffix=""
        onChange={(v) => update("projectsPerMonth", v)}
      />
      <SliderRow
        label="Valeur moyenne d'un contrat"
        value={form.avgTicket}
        min={500}
        max={50000}
        step={500}
        suffix=" $"
        format={(v) => v.toLocaleString("fr-CA")}
        onChange={(v) => update("avgTicket", v)}
      />
      <SliderRow
        label="Taux de fermeture"
        value={form.closeRate}
        min={0}
        max={100}
        step={5}
        suffix=" %"
        onChange={(v) => update("closeRate", v)}
      />
      <SliderRow
        label="Équipes / camions"
        value={form.crews}
        min={1}
        max={20}
        step={1}
        suffix=""
        onChange={(v) => update("crews", v)}
      />

      <div>
        <div className="text-sm font-medium text-white/80 mb-3">Sources de leads actuelles</div>
        <div className="flex flex-wrap gap-2">
          {LEAD_SOURCES.map((s) => {
            const active = form.leadSources.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() =>
                  update(
                    "leadSources",
                    active ? form.leadSources.filter((x) => x !== s) : [...form.leadSources, s],
                  )
                }
                className={cn(
                  "px-3 py-1.5 rounded-full border text-sm transition",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-white/15 text-white/70 hover:border-white/30",
                )}
              >
                {active && <Check className="w-3 h-3 inline mr-1" />}
                {s}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FieldGroup({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-wide text-white/50 flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" /> {label}
      </label>
      {children}
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  suffix,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const display = format ? format(value) : String(value);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm text-white/80">{label}</span>
        <span className="text-base font-semibold tabular-nums">
          {display}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}

function VerificationFlow({
  website,
  phone,
  companyName,
}: {
  website: string;
  phone: string;
  companyName: string;
}) {
  type Phase = "idle" | "checking" | "confirm" | "rejected";
  const [phase, setPhase] = useState<Phase>("idle");
  const [stepIdx, setStepIdx] = useState(0);

  const CHECKS = [
    "Recherche du site web…",
    "Vérification du domaine…",
    "Recherche des informations publiques…",
    "Validation téléphone et entreprise…",
    "Analyse de la vitesse mobile…",
    "Recherche des données structurées…",
    "Préparation du score AIPP…",
  ];

  const canVerify = (companyName.trim().length > 1) && (website.trim().length > 3 || phone.trim().length > 6);

  const startVerification = () => {
    if (!canVerify || phase === "checking") return;
    setPhase("checking");
    setStepIdx(0);
    let i = 0;
    const tick = () => {
      i += 1;
      if (i >= CHECKS.length) {
        setStepIdx(CHECKS.length);
        setTimeout(() => setPhase("confirm"), 350);
        return;
      }
      setStepIdx(i);
      setTimeout(tick, 550 + Math.random() * 250);
    };
    setTimeout(tick, 550);
  };

  const confidence: "Low" | "Medium" | "High" =
    (website && phone && companyName ? "Medium" : "Low") as "Low" | "Medium" | "High";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-8"
    >
      <Card className="bg-white/[0.03] border-white/10 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-primary/80">
              Vérification de l'entreprise
            </div>
            <div className="text-base font-semibold mt-0.5 truncate">
              {companyName || "Entrez vos informations"}
            </div>

            {phase === "idle" && (
              <>
                <p className="text-sm text-white/60 mt-2">
                  Aucune analyse n'a encore été lancée. Cliquez pour vérifier votre entreprise
                  à partir de sources publiques.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={startVerification}
                  disabled={!canVerify}
                >
                  Vérifier l'entreprise
                </Button>
                {!canVerify && (
                  <p className="text-xs text-white/40 mt-2">
                    Entrez au moins le nom + le site web ou le téléphone pour démarrer.
                  </p>
                )}
              </>
            )}

            {phase === "checking" && (
              <ul className="mt-3 space-y-1.5">
                {CHECKS.map((c, i) => {
                  const status = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
                  return (
                    <li
                      key={c}
                      className={cn(
                        "text-sm flex items-start gap-2 transition-colors",
                        status === "done" && "text-white/80",
                        status === "active" && "text-white",
                        status === "pending" && "text-white/35",
                      )}
                    >
                      {status === "done" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      ) : status === "active" ? (
                        <span className="w-3.5 h-3.5 mt-0.5 shrink-0 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
                      ) : (
                        <span className="w-3.5 h-3.5 mt-0.5 shrink-0 rounded-full border border-white/15" />
                      )}
                      {c}
                    </li>
                  );
                })}
              </ul>
            )}

            {phase === "confirm" && (
              <div className="mt-3 space-y-3">
                <div className="text-sm font-medium text-white">
                  Est-ce la bonne entreprise?
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-1.5">
                  <ConfirmRow label="Nom" value={companyName} />
                  <ConfirmRow label="Site web" value={website} />
                  <ConfirmRow label="Téléphone" value={phone} />
                  <ConfirmRow label="Adresse" value="" />
                  <ConfirmRow label="RBQ" value="" />
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/5">
                    <span className="text-xs uppercase tracking-wider text-white/40">Confiance</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        confidence === "High" && "border-emerald-400/40 text-emerald-300",
                        confidence === "Medium" && "border-amber-400/40 text-amber-300",
                        confidence === "Low" && "border-white/20 text-white/60",
                      )}
                    >
                      {confidence}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setPhase("idle")}>
                    Oui, c'est mon entreprise
                  </Button>
                  <Button size="sm" variant="outline" className="border-white/15" onClick={() => setPhase("rejected")}>
                    Non, corriger
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white/60" onClick={() => setPhase("idle")}>
                    Je ne sais pas
                  </Button>
                </div>
                <p className="text-[11px] text-white/40">
                  Résultat provisoire. Les signaux affichés sont à confirmer après l'analyse complète.
                </p>
              </div>
            )}

            {phase === "rejected" && (
              <div className="mt-3 text-sm text-white/70">
                Corrigez les informations ci-dessous puis relancez la vérification.
                <div className="mt-3">
                  <Button size="sm" variant="outline" className="border-white/15" onClick={() => setPhase("idle")}>
                    Relancer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  const present = value.trim().length > 0;
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-xs uppercase tracking-wider text-white/40">{label}</span>
      <span className={cn("text-right truncate max-w-[60%]", present ? "text-white/90" : "text-white/35 italic")}>
        {present ? value : "Donnée non confirmée pour l'instant"}
      </span>
    </div>
  );
}

function AippRevealSection({
  aipp,
  revealed,
}: {
  aipp: { score: number; categories: Array<{ label: string; value: number }> };
  revealed: boolean;
}) {
  return (
    <Card className="bg-white/[0.03] border-white/10 p-6 lg:p-8">
      <div className="text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-primary/80">Score AIPP™</div>
        <motion.div
          key={aipp.score}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={revealed ? { scale: 1, opacity: 1 } : {}}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="text-6xl lg:text-7xl font-bold mt-2 tabular-nums"
        >
          {aipp.score}
          <span className="text-2xl text-white/40 font-medium"> / 100</span>
        </motion.div>
        <div className="text-sm text-white/60 mt-2">
          {aipp.score >= 70
            ? "Très solide — votre positionnement digital est au-dessus de la moyenne."
            : aipp.score >= 45
              ? "Du potentiel sous-exploité. Beaucoup de contrats vous échappent."
              : "Présence digitale fragile. Vos compétiteurs prennent vos contrats."}
        </div>
      </div>

      <div className="mt-6 grid sm:grid-cols-2 gap-3">
        {aipp.categories.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, x: -12 }}
            animate={revealed ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.1 + i * 0.06 }}
            className="bg-white/[0.02] rounded-lg p-3 border border-white/5"
          >
            <div className="flex justify-between text-xs text-white/70 mb-1.5">
              <span>{c.label}</span>
              <span className="font-semibold text-white">{c.value}</span>
            </div>
            <Progress value={c.value} className="h-1.5" />
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

function RevenueProjectionCard({
  form,
  projection,
}: {
  form: FormState;
  projection: ReturnType<typeof computeRevenueProjection>;
}) {
  const fmt = (n: number) => n.toLocaleString("fr-CA");
  return (
    <Card className="bg-gradient-to-br from-amber-500/10 via-white/[0.03] to-white/[0.03] border-amber-500/20 p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-semibold">Revenus que vous laissez sur la table</h3>
      </div>

      <div className="mt-5 grid sm:grid-cols-2 gap-5">
        <div className="rounded-xl bg-white/[0.03] p-4 border border-white/5">
          <div className="text-xs uppercase tracking-wider text-white/50">Aujourd'hui</div>
          <div className="text-2xl font-bold mt-1">~{form.projectsPerMonth} contrats / mois</div>
          <div className="text-sm text-white/60 mt-0.5">
            ≈ {fmt(projection.currentMonthly)} $ / mois
          </div>
        </div>
        <div className="rounded-xl bg-amber-500/10 p-4 border border-amber-500/20">
          <div className="text-xs uppercase tracking-wider text-amber-400">Avec UNPRO</div>
          <div className="text-2xl font-bold mt-1">
            {projection.targetLeadsLow}–{projection.targetLeadsHigh} rendez-vous / mois
          </div>
          <div className="text-sm text-white/80 mt-0.5">
            Croissance estimée : <strong>+{fmt(projection.upliftLow)} à {fmt(projection.upliftHigh)} $ / mois</strong>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-white/70">
        Vous laissez probablement entre <strong className="text-amber-300">{fmt(projection.upliftLow)} $</strong>{" "}
        et <strong className="text-amber-300">{fmt(projection.upliftHigh)} $</strong> par mois en contrats
        non captés à des compétiteurs mieux positionnés digitalement.
      </p>
    </Card>
  );
}

function PlanRecommendationCard({
  plan,
  slug,
  score,
  onActivate,
}: {
  plan: ReturnType<typeof CONTRACTOR_PLANS["find"]> & object;
  slug: ContractorPlanSlug;
  score: number;
  onActivate: () => void;
}) {
  const reasons = getRecommendationReasons(slug as never, score).slice(0, 3);
  return (
    <Card className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-primary/30 p-6 lg:p-8 relative overflow-hidden">
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-primary">Plan recommandé</div>
            <div className="flex items-baseline gap-3 mt-2">
              <h3 className="text-3xl font-bold">{plan.name}</h3>
              <span className="text-white/60 text-sm">{plan.subtitle}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{plan.monthlyPrice} $</div>
            <div className="text-xs text-white/60">/ mois CAD</div>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {reasons.map((r) => (
            <div key={r} className="flex items-start gap-2 text-sm text-white/85">
              <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              {r}
            </div>
          ))}
        </div>

        <div className="mt-5 grid sm:grid-cols-2 gap-2">
          {plan.features.slice(0, 6).map((f) => (
            <div key={f} className="text-xs text-white/60 flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 text-primary" />
              {f}
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-col sm:flex-row gap-3">
          <Button size="lg" onClick={onActivate} className="flex-1 gap-2">
            Activer mon profil UNPRO <ArrowRight className="w-4 h-4" />
          </Button>
          <Link to="/entrepreneur/plans" className="flex-1">
            <Button size="lg" variant="outline" className="w-full border-white/20 text-white/80 hover:bg-white/5">
              Voir les autres plans
            </Button>
          </Link>
        </div>

        <p className="mt-3 text-xs text-white/40 text-center">
          Places limitées par territoire — activation immédiate.
        </p>
      </div>
    </Card>
  );
}

function TrustStrip() {
  const items = [
    { kpi: "+38 %", label: "Croissance moyenne" },
    { kpi: "< 24 h", label: "Activation profil" },
    { kpi: "0", label: "Lead partagé. Jamais." },
    { kpi: "100 %", label: "Made in Québec ⚜️" },
  ];
  return (
    <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map((i) => (
        <div key={i.label} className="text-center bg-white/[0.02] rounded-xl border border-white/5 p-4">
          <div className="text-xl font-bold text-primary">{i.kpi}</div>
          <div className="text-xs text-white/60 mt-1">{i.label}</div>
        </div>
      ))}
    </div>
  );
}
