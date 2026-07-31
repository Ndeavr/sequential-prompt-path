/**
 * UNPRO — Contractor Intelligence Landing (Diagnostic).
 *
 * Premium dark UI rebuild — readability, hierarchy, no card clipping.
 * Scope: visual rebuild only. Scoring math, plan selection, intake session
 * persistence and checkout routing are unchanged.
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
  Lock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import AlexMorphingOrb, { type AlexOrbStateV2 } from "@/components/alex/AlexMorphingOrb";
import { elevenlabsService } from "@/features/alex/services/elevenlabsService";
import { CONTRACTOR_PLANS, type ContractorPlanSlug } from "@/config/contractorPlans";
import { recommendPlan, getRecommendationReasons } from "@/services/planRecommendationService";
import { useContractorIntakeSession } from "@/hooks/useContractorIntakeSession";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { cn } from "@/lib/utils";

// ───────────────────────────── design tokens (local) ────────────────────

const SURFACE =
  "rounded-[24px] border border-white/[0.08] bg-[rgba(9,14,28,0.88)] shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl";
const INPUT_BASE =
  "h-14 min-h-[56px] rounded-[18px] bg-white/[0.04] border border-white/10 text-white placeholder:text-white/75 text-[15px] focus-visible:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 focus-visible:shadow-[0_0_0_4px_rgba(37,99,235,0.18)] transition-shadow";
const PRIMARY_CTA =
  "inline-flex items-center justify-center gap-2 h-[58px] min-h-[58px] rounded-[18px] px-6 text-[17px] font-semibold text-white bg-[linear-gradient(90deg,#2563EB,#7C3AED)] shadow-[0_10px_30px_rgba(37,99,235,0.35)] hover:brightness-110 active:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed";
const GHOST_CTA =
  "inline-flex items-center justify-center gap-2 h-[58px] min-h-[58px] rounded-[18px] px-6 text-[17px] font-semibold text-white/85 border border-white/15 bg-white/[0.03] hover:bg-white/[0.06] transition";

const LABEL =
  "text-[11px] font-medium uppercase tracking-[0.14em] text-white/75 flex items-center gap-2";

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
  closeRate: number;
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

  const { patch } = useContractorIntakeSession("form");
  const { setActiveRole } = useActiveRole();

  useEffect(() => {
    setActiveRole("contractor");
  }, [setActiveRole]);

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
      setTimeout(() => setRevealed(true), 350);
      return;
    }
  };

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

  const startCheckout = async () => {
    sessionStorage.setItem("unpro_intake_recommended_plan", planSlug);
    const { buildCheckoutUrl } = await import("@/lib/checkoutUrl");
    navigate(buildCheckoutUrl({ plan: planSlug }));
  };

  return (
    <>
      <Helmet>
        <title>Plus de contrats. Moins de soumissions. — UNPRO</title>
        <meta
          name="description"
          content="UNPRO analyse votre visibilité, votre réputation et votre potentiel de croissance. Obtenez votre score AIPP, votre projection de revenus et le plan recommandé en moins de 3 minutes."
        />
      </Helmet>

      <div className="min-h-screen bg-[#050816] text-white relative overflow-x-hidden">
        {/* ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-12%] left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] rounded-full bg-[#2563EB]/10 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[55vw] h-[55vh] rounded-full bg-[#7C3AED]/10 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-10 lg:pt-16 pb-40 lg:pb-32">
          <Hero />

          <AlexNarrator step={step} orbState={orbState} setOrbState={setOrbState} />

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
                  className="mt-4 space-y-5"
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
                <button onClick={goNext} className={PRIMARY_CTA}>
                  {step === 0 ? "Continuer" : "Voir mon score AIPP"}
                  <ArrowRight className="w-[18px] h-[18px]" />
                </button>
              </div>
            )}
          </div>

          <TrustStrip />
        </div>

        {/* sticky mobile CTA on reveal */}
        {step === 2 && (
          <div
            className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-white/10 bg-[#050816]/95 backdrop-blur px-4 pt-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
          >
            <button onClick={startCheckout} className={cn(PRIMARY_CTA, "w-full")}>
              Activer mon profil UNPRO <ArrowRight className="w-[18px] h-[18px]" />
            </button>
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
      <Badge variant="outline" className="border-[#2563EB]/40 text-[#93C5FD] bg-[#2563EB]/10">
        <Sparkles className="w-3 h-3 mr-1" /> Diagnostic intelligent UNPRO
      </Badge>
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
        Plus de contrats.
        <br />
        <span className="text-white/75">Moins de soumissions.</span>
      </h1>
      <p className="text-[15px] sm:text-[17px] text-white/72 max-w-2xl mx-auto leading-relaxed">
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
        ariaLabel="Alex"
      />
      <p className="mt-6 max-w-xl text-[15px] sm:text-[17px] text-white/85 leading-relaxed">
        « {text} »
      </p>
    </div>
  );
}

function ProgressBar({ step }: { step: number }) {
  const pct = ((step + 1) / 3) * 100;
  return (
    <div className="mb-5">
      <div className="h-[3px] w-full rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full bg-[linear-gradient(90deg,#2563EB,#7C3AED)] shadow-[0_0_18px_rgba(124,58,237,0.45)]"
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.14em] text-white/75">
        <span>Étape {step + 1} / 3</span>
        <span>{Math.round(pct)} %</span>
      </div>
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
      <div className={cn(SURFACE, "p-6 lg:p-8")}>{children}</div>
    </motion.div>
  );
}

import { formatWebsiteStorage } from "@/utils/formatWebsite";
import { formatPhoneDisplay } from "@/utils/formatPhone";

function normalizeWebsite(v: string): string {
  return formatWebsiteStorage(v);
}
function normalizePhone(v: string): string {
  return formatPhoneDisplay(v);
}


function Step0Identification({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-black tracking-tight text-white">Votre entreprise</h2>
        <p className="text-[15px] text-white/72 mt-1.5 leading-relaxed">
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
          className={INPUT_BASE}
        />
      </FieldGroup>

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
          className={INPUT_BASE}
        />
      </FieldGroup>

      <FieldGroup icon={Phone} label="Téléphone">
        <Input
          value={form.phone}
          onChange={(e) => update("phone", formatPhoneDisplay(e.target.value))}
          onBlur={(e) => update("phone", normalizePhone(e.target.value))}
          placeholder="(514) 123-4567"
          inputMode="tel"
          className={INPUT_BASE}
        />
      </FieldGroup>

      <FieldGroup icon={ShieldCheck} label="RBQ (optionnel)">
        <Input
          value={form.rbq}
          onChange={(e) => update("rbq", e.target.value)}
          placeholder="5732-1234-01"
          className={INPUT_BASE}
        />
      </FieldGroup>

      <div className="flex items-center gap-2 pt-2 text-[12px] text-white/75">
        <Lock className="w-3.5 h-3.5" />
        <span>Aucune carte requise · Analyse privée · Données non partagées</span>
      </div>
    </div>
  );
}

function Step1Situation({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-[22px] font-black tracking-tight text-white">Votre situation actuelle</h2>
        <p className="text-[15px] text-white/72 mt-1.5 leading-relaxed">
          Sliders rapides. Skippez ce que vous voulez — la recommandation s'adapte.
        </p>
      </div>

      <SliderRow label="Projets / mois" value={form.projectsPerMonth} min={1} max={50} step={1} onChange={(v) => update("projectsPerMonth", v)} />
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
      <SliderRow label="Taux de fermeture" value={form.closeRate} min={0} max={100} step={5} suffix=" %" onChange={(v) => update("closeRate", v)} />
      <SliderRow label="Équipes / camions" value={form.crews} min={1} max={20} step={1} onChange={(v) => update("crews", v)} />

      <div>
        <div className={cn(LABEL, "mb-3")}>Sources de leads actuelles</div>
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
                  "h-9 px-4 rounded-full text-[14px] font-medium transition inline-flex items-center gap-1.5",
                  active
                    ? "bg-[#2563EB] text-white border border-[#2563EB] shadow-[0_4px_14px_rgba(37,99,235,0.35)]"
                    : "bg-white/[0.04] text-white/72 border border-white/12 hover:border-white/25 hover:text-white",
                )}
              >
                {active && <Check className="w-3 h-3" />}
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
    <div className="space-y-1.5">
      <label className={LABEL}>
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
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-[14px] text-white/72">{label}</span>
        <span className="text-[17px] font-semibold tabular-nums text-white">
          {display}
          {suffix}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
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

  const canVerify =
    companyName.trim().length > 1 && (website.trim().length > 3 || phone.trim().length > 6);

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

  const confidence: "Low" | "Medium" | "High" = (website && phone && companyName
    ? "Medium"
    : "Low") as "Low" | "Medium" | "High";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-8"
    >
      <div className={cn(SURFACE, "p-5 sm:p-6")}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/15 border border-[#2563EB]/25 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#93C5FD]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#93C5FD]">
              Vérification de l'entreprise
            </div>
            <div className="text-[16px] font-semibold text-white mt-1 truncate">
              {companyName || "Entrez vos informations"}
            </div>

            {phase === "idle" && (
              <>
                <p className="text-[14px] text-white/72 mt-2 leading-relaxed">
                  Aucune analyse n'a encore été lancée. Cliquez pour vérifier votre entreprise
                  à partir de sources publiques.
                </p>
                <button
                  onClick={startVerification}
                  disabled={!canVerify}
                  className={cn(PRIMARY_CTA, "mt-4 h-12 min-h-[48px] text-[15px] px-5")}
                >
                  Vérifier l'entreprise
                </button>
                {!canVerify && (
                  <p className="text-[12px] text-white/75 mt-3">
                    Entrez au moins le nom + le site web ou le téléphone pour démarrer.
                  </p>
                )}
              </>
            )}

            {phase === "checking" && (
              <ul className="mt-3 space-y-2">
                {CHECKS.map((c, i) => {
                  const status = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
                  return (
                    <li
                      key={c}
                      className={cn(
                        "text-[14px] flex items-start gap-2 transition-colors",
                        status === "done" && "text-white/80",
                        status === "active" && "text-white",
                        status === "pending" && "text-white/75",
                      )}
                    >
                      {status === "done" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      ) : status === "active" ? (
                        <span className="w-3.5 h-3.5 mt-0.5 shrink-0 rounded-full border-2 border-[#2563EB]/40 border-t-[#2563EB] animate-spin" />
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
                <div className="text-[14px] font-semibold text-white">Est-ce la bonne entreprise?</div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 space-y-2.5">
                  <ConfirmRow label="Nom" value={companyName} />
                  <ConfirmRow label="Site web" value={website} />
                  <ConfirmRow label="Téléphone" value={phone} />
                  <ConfirmRow label="Adresse" value="" />
                  <ConfirmRow label="RBQ" value="" />
                  <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-white/8">
                    <span className="text-[11px] uppercase tracking-[0.14em] text-white/75">Confiance</span>
                    <span
                      className={cn(
                        "text-[11px] font-semibold px-2.5 py-1 rounded-full border",
                        confidence === "High" && "border-emerald-400/40 text-emerald-300 bg-emerald-400/10",
                        confidence === "Medium" && "border-amber-400/40 text-amber-300 bg-amber-400/10",
                        confidence === "Low" && "border-white/20 text-white/75 bg-white/5",
                      )}
                    >
                      {confidence}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setPhase("idle")} className={cn(PRIMARY_CTA, "h-11 min-h-[44px] text-[14px] px-4")}>
                    Oui, c'est mon entreprise
                  </button>
                  <button
                    onClick={() => setPhase("rejected")}
                    className="h-11 px-4 rounded-[14px] border border-white/15 bg-white/[0.03] text-[14px] font-medium text-white/85 hover:bg-white/[0.06]"
                  >
                    Non, corriger
                  </button>
                </div>
                <p className="text-[11px] text-white/75">
                  Résultat provisoire. Les signaux affichés sont à confirmer après l'analyse complète.
                </p>
              </div>
            )}

            {phase === "rejected" && (
              <div className="mt-3 text-[14px] text-white/72">
                Corrigez les informations ci-dessous puis relancez la vérification.
                <div className="mt-3">
                  <button
                    onClick={() => setPhase("idle")}
                    className="h-11 px-4 rounded-[14px] border border-white/15 bg-white/[0.03] text-[14px] font-medium text-white/85 hover:bg-white/[0.06]"
                  >
                    Relancer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  const present = value.trim().length > 0;
  return (
    <div className="flex items-baseline justify-between gap-3 text-[14px]">
      <span className="text-[11px] uppercase tracking-[0.14em] text-white/75">{label}</span>
      <span className={cn("text-right truncate max-w-[60%]", present ? "text-white/90" : "text-white/75 italic")}>
        {present ? value : "Donnée non confirmée pour l'instant"}
      </span>
    </div>
  );
}

// ───────────────────────────── AIPP reveal ──────────────────────────────

function AippRevealSection({
  aipp,
  revealed,
}: {
  aipp: { score: number; categories: Array<{ label: string; value: number }> };
  revealed: boolean;
}) {
  const status =
    aipp.score >= 70
      ? "Très solide — au-dessus de la moyenne."
      : aipp.score >= 45
        ? "Du potentiel sous-exploité."
        : "Présence digitale fragile.";

  const insight =
    aipp.score >= 70
      ? "Votre positionnement digital domine déjà une partie de votre marché. Optimisez la conversion."
      : aipp.score >= 45
        ? "Beaucoup de contrats vous échappent. Une optimisation ciblée libère une croissance rapide."
        : "Vos compétiteurs prennent vos contrats. Une remise à niveau s'impose maintenant.";

  return (
    <div className="space-y-4">
      {/* Hero score */}
      <div className={cn(SURFACE, "p-6 lg:p-8")}>
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#93C5FD] font-semibold">
            Score AIPP™
          </div>

          <div className="relative mx-auto mt-5 w-[200px] h-[200px]">
            <ScoreRing value={aipp.score} revealed={revealed} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                key={aipp.score}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={revealed ? { scale: 1, opacity: 1 } : {}}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                className="text-[64px] leading-none font-black tabular-nums text-white"
              >
                {aipp.score}
              </motion.div>
              <div className="text-[13px] text-white/75 mt-1 tabular-nums">/ 100</div>
            </div>
          </div>

          <div className="text-[15px] font-semibold text-white mt-5">{status}</div>
        </div>
      </div>

      {/* Insight summary */}
      <div className={cn(SURFACE, "p-5")}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/25 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[#C4B5FD]" />
          </div>
          <p className="text-[14px] text-white/80 leading-relaxed">{insight}</p>
        </div>
      </div>

      {/* Metric stack — single column on mobile */}
      <div className="space-y-4">
        {aipp.categories.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, x: -12 }}
            animate={revealed ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.1 + i * 0.06 }}
            className={cn(SURFACE, "p-4")}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[14px] font-medium text-white/85">{c.label}</span>
              <span className="text-[16px] font-bold tabular-nums text-white">{c.value}</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={revealed ? { width: `${c.value}%` } : { width: 0 }}
                transition={{ delay: 0.25 + i * 0.06, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-[linear-gradient(90deg,#2563EB,#7C3AED)]"
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ScoreRing({ value, revealed }: { value: number; revealed: boolean }) {
  const radius = 88;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - value / 100);
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
      <defs>
        <linearGradient id="aippRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="60%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth="8" fill="none" />
      <motion.circle
        cx="100"
        cy="100"
        r={radius}
        stroke="url(#aippRing)"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: revealed ? offset : circ }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ filter: "drop-shadow(0 0 10px rgba(124,58,237,0.45))" }}
      />
    </svg>
  );
}

// ───────────────────────────── revenue + plan ───────────────────────────

function RevenueProjectionCard({
  form,
  projection,
}: {
  form: FormState;
  projection: ReturnType<typeof computeRevenueProjection>;
}) {
  const fmt = (n: number) => n.toLocaleString("fr-CA");
  return (
    <div
      className="rounded-[24px] border border-white/[0.08] p-6 lg:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
      style={{ background: "linear-gradient(160deg,#0A1736 0%,#070D22 50%,#050816 100%)" }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-amber-300" />
        </div>
        <h3 className="text-[18px] font-bold text-white leading-tight">
          Revenus que vous laissez sur la table
        </h3>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-white/75">Aujourd'hui</div>
          <div className="text-[22px] font-bold text-white mt-1 break-words">
            ~{form.projectsPerMonth} contrats / mois
          </div>
          <div className="text-[14px] text-white/75 mt-0.5">
            ≈ {fmt(projection.currentMonthly)} $ / mois
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border-t-2 border-amber-400/40 border-x border-b border-x-white/8 border-b-white/8 p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-amber-300 font-semibold">Avec UNPRO</div>
          <div className="text-[22px] font-bold text-white mt-1 break-words">
            {projection.targetLeadsLow}–{projection.targetLeadsHigh} rendez-vous / mois
          </div>
          <div className="text-[14px] text-white/80 mt-1 leading-relaxed">
            Croissance estimée :{" "}
            <strong className="text-amber-300 font-bold">
              +{fmt(projection.upliftLow)} à {fmt(projection.upliftHigh)} $ / mois
            </strong>
          </div>
        </div>
      </div>

      <p className="mt-5 text-[14px] text-white/72 leading-relaxed">
        Vous laissez probablement entre{" "}
        <strong className="text-amber-300 font-bold">{fmt(projection.upliftLow)} $</strong> et{" "}
        <strong className="text-amber-300 font-bold">{fmt(projection.upliftHigh)} $</strong> par mois
        en contrats non captés à des compétiteurs mieux positionnés digitalement.
      </p>
    </div>
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
    <div className="relative rounded-[24px] border border-[#2563EB]/30 p-6 lg:p-8 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
      style={{ background: "linear-gradient(160deg,#0B132E 0%,#0A1022 60%,#050816 100%)" }}
    >
      <motion.div
        animate={{ opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#2563EB]/25 blur-3xl pointer-events-none"
      />
      <div className="relative">
        {/* header — stacked */}
        <div className="flex flex-col gap-1">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#93C5FD] font-semibold">
            Plan recommandé
          </div>
          <h3 className="text-[32px] sm:text-[36px] font-black tracking-tight text-white leading-[1.05] mt-1 break-words">
            {plan.name}
          </h3>
          {plan.subtitle && (
            <div className="text-[14px] text-white/75 mt-1 break-words">{plan.subtitle}</div>
          )}
        </div>

        {/* price block */}
        <div className="mt-5 flex items-baseline gap-2">
          <div className="text-[40px] sm:text-[44px] font-black tabular-nums text-white leading-none">
            {plan.monthlyPrice} $
          </div>
          <div className="text-[13px] text-white/75">/ mois CAD</div>
        </div>

        {/* reasons */}
        <div className="mt-5 space-y-2.5">
          {reasons.map((r) => (
            <div key={r} className="flex items-start gap-2.5 text-[14px] text-white/85 leading-relaxed">
              <Check className="w-4 h-4 text-[#93C5FD] mt-0.5 shrink-0" />
              <span>{r}</span>
            </div>
          ))}
        </div>

        {/* features */}
        {plan.features && plan.features.length > 0 && (
          <div className="mt-5 grid sm:grid-cols-2 gap-2">
            {plan.features.slice(0, 6).map((f) => (
              <div key={f} className="text-[12px] text-white/75 flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-[#93C5FD] shrink-0" />
                <span className="truncate">{f}</span>
              </div>
            ))}
          </div>
        )}

        {/* CTAs */}
        <div className="mt-7 flex flex-col sm:flex-row gap-3">
          <button onClick={onActivate} className={cn(PRIMARY_CTA, "w-full sm:flex-1")}>
            Activer mon profil UNPRO <ArrowRight className="w-[18px] h-[18px]" />
          </button>
          <Link to="/entrepreneur/plan-ia" className="w-full sm:flex-1">
            <span className={cn(GHOST_CTA, "w-full")}>Voir les autres plans</span>
          </Link>
        </div>

        <div className="mt-5 flex items-center gap-2 text-[12px] text-white/75">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Aucun engagement · Annulable en 1 clic</span>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── trust strip ──────────────────────────────

function TrustStrip() {
  const items = [
    { icon: Lock, label: "100% Confidentiel", desc: "Vos données ne sont jamais partagées." },
    { icon: Sparkles, label: "Résultats instantanés", desc: "Analyse complète en moins de 30 secondes." },
    { icon: ShieldCheck, label: "Résultats concrets", desc: "Des rendez-vous qualifiés, pas des promesses." },
  ];
  return (
    <div className="mt-12 grid sm:grid-cols-3 gap-3">
      {items.map((it) => (
        <div key={it.label} className={cn(SURFACE, "p-5 text-center")}>
          <div className="mx-auto w-10 h-10 rounded-xl bg-[#2563EB]/15 border border-[#2563EB]/25 flex items-center justify-center">
            <it.icon className="w-5 h-5 text-[#93C5FD]" />
          </div>
          <div className="text-[14px] font-semibold text-white mt-3">{it.label}</div>
          <div className="text-[12px] text-white/75 mt-1 leading-relaxed">{it.desc}</div>
        </div>
      ))}
    </div>
  );
}
