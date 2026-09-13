/**
 * UNPRO — Pricing Intake (Clara-style conversational)
 * Route: /entrepreneur/devis-personnalise
 *
 * L'identité de l'entreprise vient TOUJOURS du serveur (audit revalidé via la
 * fonction `matching-profile`), jamais de l'URL et jamais d'un exemple de
 * démonstration. Sans audit valide, l'entrepreneur cherche son entreprise
 * réelle (Google via `business-lookup`) avant toute autre question.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, Sparkles, ShieldCheck, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BusinessNameSearch, { type BusinessSearchResult } from "@/components/contractor/BusinessNameSearch";
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

/** Identité d'entreprise résolue côté serveur à partir de l'audit validé. */
type AuditContext = {
  audit_id: string;
  business_name: string | null;
  city: string | null;
  trade: string | null;
  readiness_score: number | null;
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

const SESSION_STORAGE_KEY = "unpro_matching_session_key";

function getSessionKey(): string {
  try {
    const existing = localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;
    const key = `mp_${crypto.randomUUID()}`;
    localStorage.setItem(SESSION_STORAGE_KEY, key);
    return key;
  } catch {
    return `mp_${Math.random().toString(36).slice(2)}${Date.now()}`;
  }
}

const BASE_DEFAULTS: Partial<PricingIntakeInput> = {
  seasonal_priority: "all",
  wants_exclusivity: false,
  desired_growth_level: "growth",
  service_radius_km: 50,
  close_rate_estimate: 0.4,
  current_ai_visibility_score: 30,
};

export default function PageContractorPricingIntake() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auditId = searchParams.get("audit");
  const auditToken = searchParams.get("audit_token");
  const sessionKey = useMemo(getSessionKey, []);
  const draftKey = `unpro_pricing_intake_draft:${auditId ?? sessionKey}`;

  const [booting, setBooting] = useState<boolean>(Boolean(auditId && auditToken));
  const [audit, setAudit] = useState<AuditContext | null>(null);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<PricingIntakeInput>>(BASE_DEFAULTS);
  const [submitting, setSubmitting] = useState(false);
  const [detected, setDetected] = useState<{ trade: boolean; city: boolean }>({ trade: false, city: false });
  const [businessConfirmed, setBusinessConfirmed] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [searchState, setSearchState] = useState({ loading: false, count: 0, searched: false });
  const [hydrated, setHydrated] = useState(false);

  const set = useCallback(
    (patch: Partial<PricingIntakeInput>) => setData((d) => ({ ...d, ...patch })),
    [],
  );

  /* ---------- Brouillon local (reprise après rafraîchissement) ---------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          data?: Partial<PricingIntakeInput>;
          step?: number;
          businessConfirmed?: boolean;
          manualEntry?: boolean;
          detected?: { trade: boolean; city: boolean };
        };
        if (parsed.data) setData({ ...BASE_DEFAULTS, ...parsed.data });
        if (typeof parsed.step === "number") setStep(Math.max(0, parsed.step));
        if (parsed.businessConfirmed) setBusinessConfirmed(true);
        if (parsed.manualEntry) setManualEntry(true);
        if (parsed.detected) setDetected(parsed.detected);
      }
    } catch {
      /* brouillon illisible : on repart proprement, sans fausse donnée */
    } finally {
      // `hydrated` est un state (pas un ref) pour que la sauvegarde ci-dessous
      // ne s'exécute qu'après le rendu portant les valeurs restaurées.
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ data, step, businessConfirmed, manualEntry, detected }),
      );
    } catch {
      /* stockage indisponible : le parcours reste utilisable */
    }
  }, [hydrated, draftKey, data, step, businessConfirmed, manualEntry, detected]);


  /* ---------- Audit revalidé côté serveur avant tout rendu ---------- */
  useEffect(() => {
    if (!auditId || !auditToken) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data: res } = await supabase.functions.invoke("matching-profile", {
          body: { action: "get", session_key: sessionKey, audit_id: auditId, audit_token: auditToken },
        });
        if (cancelled) return;
        const resolved = (res as { audit?: AuditContext | null } | null)?.audit ?? null;
        if (resolved) {
          setAudit(resolved);
          setData((d) => ({
            ...d,
            company_name: resolved.business_name ?? d.company_name,
            trade_primary: resolved.trade ?? d.trade_primary,
            city: resolved.city ?? d.city,
          }));
          setBusinessConfirmed(true);
        }
      } catch {
        /* audit non résolu : parcours neutre, jamais une entreprise inventée */
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auditId, auditToken, sessionKey]);

  const auditValid = Boolean(audit?.business_name);
  const detectedCity = audit?.city ?? data.city ?? null;

  const onBusinessSelected = useCallback((r: BusinessSearchResult) => {
    setData((d) => ({
      ...d,
      company_name: r.business_name,
      city: r.city || d.city,
      trade_primary: r.primary_category || d.trade_primary,
      website_url: r.website || d.website_url,
    }));
    setDetected({ trade: Boolean(r.primary_category), city: Boolean(r.city) });
    setBusinessConfirmed(true);
    setManualEntry(false);
  }, []);

  /* ---------- Étapes ---------- */
  const identityStep: Step = {
    key: "identity",
    question: "Commençons. Quelle est votre entreprise?",
    hint: "Tapez les premières lettres : nous cherchons votre entreprise réelle.",
    isValid: (d) => Boolean(businessConfirmed && d.company_name && d.trade_primary && d.city),
    render: (d, set) => (
      <div className="space-y-3">
        <BusinessNameSearch
          tone="dark"
          source="unpro"

          label="Nom de l'entreprise"
          placeholder="Tapez le nom de votre entreprise"
          value={d.company_name ?? ""}
          minChars={2}
          debounceMs={300}
          onChange={(v) => {
            set({ company_name: v });
            setBusinessConfirmed(false);
          }}
          onBusinessSelected={onBusinessSelected}
          onSearchState={setSearchState}
        />

        {!businessConfirmed && !manualEntry && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
            {searchState.loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Recherche en cours…
              </span>
            ) : searchState.searched && searchState.count === 0 ? (
              <div className="space-y-2">
                <p>Aucune entreprise trouvée pour cette recherche.</p>
                <button
                  type="button"
                  onClick={() => {
                    setManualEntry(true);
                    setBusinessConfirmed(true);
                  }}
                  className="w-full rounded-xl border border-amber-400/40 bg-amber-500/10 py-2.5 text-sm font-medium text-amber-200"
                >
                  Continuer avec une entreprise non trouvée
                </button>
              </div>
            ) : (
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5" /> Sélectionnez votre entreprise dans la liste pour continuer.
              </span>
            )}
          </div>
        )}

        {(businessConfirmed || manualEntry) && (
          <>
            <SelectInput
              label={`Métier principal${detected.trade ? " · Détecté — à confirmer" : ""}`}
              value={d.trade_primary ?? ""}
              onChange={(v) => set({ trade_primary: v })}
              options={tradeOptions(d.trade_primary)}
            />
            <TextInput
              label={`Ville desservie${detected.city ? " · Détecté — à confirmer" : ""}`}
              value={d.city ?? ""}
              onChange={(v) => set({ city: v })}
            />
          </>
        )}
      </div>
    ),
  };

  const scopeStep: Step = {
    key: "scope",
    question: auditValid && detectedCity
      ? `${detectedCity} détecté — confirmez vos territoires desservis.`
      : "Jusqu'où vous déplacez-vous?",
    hint: "Rayon de service et second métier (optionnel).",
    isValid: () => true,
    render: (d, set) => (
      <div className="space-y-3">
        <TextInput
          label="Ville principale desservie"
          value={d.city ?? ""}
          onChange={(v) => set({ city: v })}
        />
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
  };

  const steps: Step[] = [
    ...(auditValid ? [] : [identityStep]),
    scopeStep,
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

  const total = steps.length;
  const safeStep = Math.min(step, total - 1);
  const current = steps[safeStep];
  const isLast = safeStep === total - 1;

  const submit = async () => {
    setSubmitting(true);
    try {
      const quote = await computePricingQuote(data as PricingIntakeInput);
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      const carry = new URLSearchParams();
      for (const key of ["promo", "ref", "offer", "audit", "audit_token", "t"]) {
        const value = searchParams.get(key);
        if (value) carry.set(key, value);
      }
      navigate(`/entrepreneur/plan-personnalise/${quote.id}${carry.size ? `?${carry}` : ""}`);
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
    else setStep(safeStep + 1);
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <Helmet><title>Votre plan personnalisé · UNPRO</title></Helmet>
        <div className="flex items-center gap-3 text-white/70">
          <Loader2 className="w-5 h-5 animate-spin" /> Nous récupérons votre analyse…
        </div>
      </div>
    );
  }

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
        {/* Entreprise réellement analysée — résolue côté serveur */}
        {auditValid ? (
          <div
            data-testid="audit-identity-banner"
            className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/[0.08] px-4 py-3"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-amber-300/90">
              <ShieldCheck className="w-3.5 h-3.5" /> Entreprise analysée
            </div>
            <p className="mt-1 text-sm font-semibold text-white">{audit?.business_name}</p>
            <p className="text-xs text-white/60">
              {[audit?.city, audit?.trade].filter(Boolean).join(" · ")}
              {typeof audit?.readiness_score === "number" ? ` · Score ${audit.readiness_score}/100` : ""}
            </p>
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-sm text-white/80">Aucune analyse rattachée à ce parcours.</p>
            <button
              type="button"
              onClick={() => navigate("/entrepreneurs/audit-ia")}
              className="mt-2 text-sm font-medium text-amber-300 underline underline-offset-4"
            >
              Commencer un audit gratuit
            </button>
          </div>
        )}

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= safeStep ? "bg-amber-400" : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-white/50 mt-3 tracking-wider uppercase">
            Étape {safeStep + 1} sur {total}
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
              Clara vous guide
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
          {safeStep > 0 && (
            <button
              onClick={() => setStep(safeStep - 1)}
              className="h-14 px-5 rounded-[18px] bg-white/[0.06] border border-white/10 text-sm"
              disabled={submitting}
            >
              Retour
            </button>
          )}
          <button
            onClick={next}
            disabled={submitting || !current.isValid(data)}
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

/** Liste des métiers incluant celui détecté s'il ne fait pas partie du catalogue. */
function tradeOptions(current?: string | null): string[] {
  const base = ["", ...TRADES];
  if (current && !base.includes(current)) return ["", current, ...TRADES];
  return base;
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
