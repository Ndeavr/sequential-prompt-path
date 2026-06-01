/**
 * UNPRO — Pricing Intake (Alex-style conversational)
 * Route: /entrepreneur/devis-personnalise
 * Mobile-first cinematic. Collects the 17 fields in ~7 steps, then computes the quote.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import {
  computePricingQuote,
  type PricingIntakeInput,
} from "@/services/contractorPricingQuoteService";
import { toast } from "sonner";

type Step = {
  key: string;
  question: string;
  hint?: string;
  render: (
    data: Partial<PricingIntakeInput>,
    set: (patch: Partial<PricingIntakeInput>) => void,
  ) => React.ReactNode;
  isValid: (d: Partial<PricingIntakeInput>) => boolean;
};

const TRADES = [
  "Plomberie",
  "Électricité",
  "Toiture",
  "Rénovation",
  "Peinture",
  "CVAC",
  "Aménagement paysager",
  "Autre",
];

const SEASONS = [
  { v: "spring", l: "Printemps" },
  { v: "summer", l: "Été" },
  { v: "fall", l: "Automne" },
  { v: "winter", l: "Hiver" },
  { v: "all", l: "Toute l'année" },
];

export default function PageContractorPricingIntake() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<PricingIntakeInput>>({
    seasonal_priority: "all",
    wants_exclusivity: false,
    desired_growth_level: "growth",
    service_radius_km: 50,
    close_rate_estimate: 0.4,
    current_ai_visibility_score: 30,
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (patch: Partial<PricingIntakeInput>) =>
    setData((d) => ({ ...d, ...patch }));

  const steps: Step[] = [
    {
      key: "identity",
      question: "Commençons. Quelle est votre entreprise?",
      hint: "Nom, métier principal, ville.",
      isValid: (d) => !!(d.company_name && d.trade_primary && d.city),
      render: (d, set) => (
        <div className="space-y-3">
          <TextInput
            label="Nom de l'entreprise"
            value={d.company_name ?? ""}
            onChange={(v) => set({ company_name: v })}
            placeholder="Plomberie Tremblay inc."
          />
          <SelectInput
            label="Métier principal"
            value={d.trade_primary ?? ""}
            onChange={(v) => set({ trade_primary: v })}
            options={TRADES}
          />
          <TextInput
            label="Ville desservie"
            value={d.city ?? ""}
            onChange={(v) => set({ city: v })}
            placeholder="Québec"
          />
        </div>
      ),
    },
    {
      key: "scope",
      question: "Jusqu'où vous déplacez-vous?",
      hint: "Rayon de service et second métier (optionnel).",
      isValid: () => true,
      render: (d, set) => (
        <div className="space-y-3">
          <NumberInput
            label="Rayon de service (km)"
            value={d.service_radius_km ?? 50}
            onChange={(v) => set({ service_radius_km: v })}
            min={5}
            max={300}
          />
          <SelectInput
            label="Métier secondaire (optionnel)"
            value={d.trade_secondary ?? ""}
            onChange={(v) => set({ trade_secondary: v || null })}
            options={["", ...TRADES]}
          />
        </div>
      ),
    },
    {
      key: "objectives",
      question: "Quels sont vos objectifs mensuels?",
      hint: "Rendez-vous visés et valeur moyenne de projet.",
      isValid: (d) =>
        (d.target_monthly_appointments ?? 0) > 0 &&
        (d.average_project_value ?? 0) > 0,
      render: (d, set) => (
        <div className="space-y-3">
          <NumberInput
            label="Rendez-vous visés / mois"
            value={d.target_monthly_appointments ?? 0}
            onChange={(v) => set({ target_monthly_appointments: v })}
            min={0}
            max={100}
          />
          <NumberInput
            label="Valeur moyenne d'un projet ($)"
            value={d.average_project_value ?? 0}
            onChange={(v) => set({ average_project_value: v })}
            min={0}
            max={500000}
            step={500}
          />
        </div>
      ),
    },
    {
      key: "capacity",
      question: "Et votre capacité réelle?",
      hint: "Combien de projets pouvez-vous livrer et avec quel taux de fermeture?",
      isValid: (d) => (d.monthly_capacity ?? 0) > 0,
      render: (d, set) => (
        <div className="space-y-3">
          <NumberInput
            label="Capacité mensuelle (projets)"
            value={d.monthly_capacity ?? 0}
            onChange={(v) => set({ monthly_capacity: v })}
            min={0}
            max={100}
          />
          <NumberInput
            label="Taux de fermeture estimé (%)"
            value={Math.round((d.close_rate_estimate ?? 0.4) * 100)}
            onChange={(v) => set({ close_rate_estimate: v / 100 })}
            min={5}
            max={95}
            step={5}
          />
        </div>
      ),
    },
    {
      key: "strategy",
      question: "Votre stratégie de croissance?",
      isValid: () => true,
      render: (d, set) => (
        <div className="space-y-3">
          <ChoiceGroup
            label="Niveau de croissance souhaité"
            value={d.desired_growth_level ?? "growth"}
            onChange={(v) => set({ desired_growth_level: v as any })}
            options={[
              { v: "steady", l: "Stable" },
              { v: "growth", l: "Croissance" },
              { v: "aggressive", l: "Agressive" },
            ]}
          />
          <ChoiceGroup
            label="Priorité saisonnière"
            value={d.seasonal_priority ?? "all"}
            onChange={(v) => set({ seasonal_priority: v as any })}
            options={SEASONS}
          />
          <Toggle
            label="Exclusivité territoriale souhaitée"
            value={!!d.wants_exclusivity}
            onChange={(v) => set({ wants_exclusivity: v })}
          />
        </div>
      ),
    },
    {
      key: "visibility",
      question: "Votre présence actuelle?",
      hint: "Pour calibrer l'optimisation visibilité IA.",
      isValid: () => true,
      render: (d, set) => (
        <div className="space-y-3">
          <NumberInput
            label="Score Google Business actuel (0-100)"
            value={d.current_google_presence ?? 0}
            onChange={(v) => set({ current_google_presence: v })}
            min={0}
            max={100}
            step={5}
          />
          <NumberInput
            label="Score visibilité IA actuel (0-100)"
            value={d.current_ai_visibility_score ?? 0}
            onChange={(v) => set({ current_ai_visibility_score: v })}
            min={0}
            max={100}
            step={5}
          />
        </div>
      ),
    },
    {
      key: "credentials",
      question: "Finalisons votre profil.",
      hint: "RBQ et site web (optionnels mais recommandés).",
      isValid: () => true,
      render: (d, set) => (
        <div className="space-y-3">
          <TextInput
            label="Numéro RBQ"
            value={d.rbq_number ?? ""}
            onChange={(v) => set({ rbq_number: v })}
            placeholder="0000-0000-00"
          />
          <TextInput
            label="Site web"
            value={d.website_url ?? ""}
            onChange={(v) => set({ website_url: v })}
            placeholder="https://"
          />
        </div>
      ),
    },
  ];

  const current = steps[step];
  const total = steps.length;
  const isLast = step === total - 1;

  const submit = async () => {
    setSubmitting(true);
    try {
      const quote = await computePricingQuote(data as PricingIntakeInput);
      navigate(`/entrepreneur/plan-personnalise/${quote.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Impossible de calculer votre plan.");
      setSubmitting(false);
    }
  };

  const next = () => {
    if (!current.isValid(data)) {
      toast.error("Complétez les champs pour continuer.");
      return;
    }
    if (isLast) submit();
    else setStep((s) => s + 1);
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white relative overflow-hidden pb-32">
      <Helmet>
        <title>Votre plan personnalisé · UNPRO</title>
      </Helmet>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative max-w-xl mx-auto px-5 pt-10">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-amber-400" : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-white/50 mt-3 tracking-wider uppercase">
            Étape {step + 1} sur {total}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-2 text-amber-300/80 text-xs uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Alex vous guide
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] mb-2">
              {current.question}
            </h1>
            {current.hint && (
              <p className="text-sm text-white/60 mb-6">{current.hint}</p>
            )}

            <div className="rounded-[28px] bg-white/[0.04] border border-white/10 backdrop-blur-xl p-5">
              {current.render(data, set)}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-[#050816] via-[#050816]/95 to-transparent pt-6 pb-5 px-5">
        <div className="max-w-xl mx-auto flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="h-14 px-5 rounded-[18px] bg-white/[0.06] border border-white/10 text-sm"
              disabled={submitting}
            >
              Retour
            </button>
          )}
          <button
            onClick={next}
            disabled={submitting}
            className="flex-1 h-14 rounded-[18px] bg-amber-500 text-black font-semibold flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_10px_30px_-10px_rgba(251,191,36,0.6)]"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLast ? "Calculer mon plan" : "Continuer"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Inputs ---------- */

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-white/50">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400"
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-white/50">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="mt-1.5 w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-white/50">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#0a1020]">
            {o || "—"}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChoiceGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-white/50 mb-2">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`px-4 py-2 rounded-full text-sm border transition-colors ${
              value === o.v
                ? "border-amber-400 bg-amber-500/20 text-amber-100"
                : "border-white/10 bg-white/[0.04] text-white/80"
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
        value
          ? "border-amber-400 bg-amber-500/15"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <span className="text-sm">{label}</span>
      <span
        className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
          value ? "bg-amber-400" : "bg-white/20"
        }`}
      >
        <span
          className={`block w-5 h-5 bg-white rounded-full transition-transform ${
            value ? "translate-x-5" : ""
          }`}
        />
      </span>
    </button>
  );
}
