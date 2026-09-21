/**
 * UNPRO — Pricing Intake (Clara-style conversational)
 * Route: /entrepreneur/devis-personnalise
 *
 * L'identité de l'entreprise vient TOUJOURS du serveur (audit revalidé via la
 * fonction `matching-profile`), jamais de l'URL et jamais d'un exemple de
 * démonstration. Sans audit valide, l'entrepreneur cherche son entreprise
 * réelle (Google via `business-lookup`) avant toute autre question.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { trackFunnelStep } from "@/lib/analytics/funnelSteps";
import TradePickerSheet from "@/components/contractor/TradePickerSheet";
import { detectTrade, useTradeTaxonomy } from "@/hooks/useTradeTaxonomy";
import { setActiveActivationToken } from "@/lib/checkoutUrl";

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

// Aucune liste de métiers codée en dur : la taxonomie canonique
// (`service_categories`) est la seule source, via `useTradeTaxonomy`.


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
  // Aucun score de visibilité par défaut : une valeur inventée fausserait le plan.
};

/** Champs que l'entrepreneur a lui-même confirmés — priorité absolue. */
type ConfirmableField = "city" | "trade_primary" | "trade_secondary" | "company_name";

export default function PageContractorPricingIntake() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auditId = searchParams.get("audit");
  const auditToken = searchParams.get("audit_token");
  const activationToken = searchParams.get("t");
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

  useEffect(() => {
    setActiveActivationToken(activationToken);
  }, [activationToken]);
  /**
   * Hiérarchie de confiance : confirmé par l'entrepreneur > vérifié par une
   * source > déduit. Une donnée déduite (ville d'un autre appel, catégorie
   * devinée) ne remplace jamais silencieusement un champ confirmé ici.
   */
  const [confirmedFields, setConfirmedFields] = useState<ConfirmableField[]>([]);
  const confirm = useCallback(
    (field: ConfirmableField) =>
      setConfirmedFields((f) => (f.includes(field) ? f : [...f, field])),
    [],
  );

  const set = useCallback(
    (patch: Partial<PricingIntakeInput>) => setData((d) => ({ ...d, ...patch })),
    [],
  );

  /** Métier canonique correspondant au libellé réellement détecté (jamais deviné au hasard). */
  const { taxonomy } = useTradeTaxonomy();
  const tradeSlugOf = useCallback(
    (label?: string | null) => (label ? detectTrade(taxonomy, label)?.slug ?? null : null),
    [taxonomy],
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
          confirmedFields?: ConfirmableField[];
        };
        if (parsed.data) setData({ ...BASE_DEFAULTS, ...parsed.data });
        if (typeof parsed.step === "number") setStep(Math.max(0, parsed.step));
        if (parsed.businessConfirmed) setBusinessConfirmed(true);
        if (parsed.manualEntry) setManualEntry(true);
        if (parsed.detected) setDetected(parsed.detected);
        if (Array.isArray(parsed.confirmedFields)) setConfirmedFields(parsed.confirmedFields);
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
        JSON.stringify({ data, step, businessConfirmed, manualEntry, detected, confirmedFields }),
      );
    } catch {
      /* stockage indisponible : le parcours reste utilisable */
    }
  }, [hydrated, draftKey, data, step, businessConfirmed, manualEntry, detected, confirmedFields]);


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
            // Une valeur confirmée par l'entrepreneur n'est jamais écrasée.
            company_name: confirmedFields.includes("company_name")
              ? d.company_name
              : resolved.business_name ?? d.company_name,
            trade_primary: confirmedFields.includes("trade_primary")
              ? d.trade_primary
              : resolved.trade ?? d.trade_primary,
            city: confirmedFields.includes("city") ? d.city : resolved.city ?? d.city,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId, auditToken, sessionKey]);

  const auditValid = Boolean(audit?.business_name);
  const detectedCity = audit?.city ?? data.city ?? null;
  /** L'audit vient de mesurer la présence : on ne la redemande pas. */
  const auditScoreKnown = typeof audit?.readiness_score === "number";

  /* ---------- Points d'abandon mesurables (une seule table, dédupliqués) ---------- */
  useEffect(() => {
    void trackFunnelStep("analysis_started", {
      metadata: { has_audit: Boolean(auditId), surface: "pricing_intake" },
    });
    void trackFunnelStep("profile_started", { metadata: { surface: "pricing_intake" } });
  }, [auditId]);

  const onBusinessSelected = useCallback((r: BusinessSearchResult) => {
    setData((d) => ({
      ...d,
      company_name: r.business_name,
      // Source vérifiée : elle complète, mais n'écrase jamais un champ confirmé.
      city: confirmedFields.includes("city") ? d.city : r.city || d.city,
      trade_primary: confirmedFields.includes("trade_primary")
        ? d.trade_primary
        : r.primary_category || d.trade_primary,
      website_url: r.website || d.website_url,
    }));
    setDetected({ trade: Boolean(r.primary_category), city: Boolean(r.city) });
    setBusinessConfirmed(true);
    setManualEntry(false);
    // Entreprise réelle reconnue : l'analyse est rattachée à une identité vérifiable.
    void trackFunnelStep("company_recognized", {
      subjectId: r.business_name,
      city: r.city ?? null,
      metadata: { source: "business_lookup", has_website: Boolean(r.website) },
    });
    void trackFunnelStep("analysis_completed", {
      subjectId: r.business_name,
      city: r.city ?? null,
      metadata: { provenance: "verifie_source_google" },
    });
  }, [confirmedFields]);

  /* ---------- Étapes ---------- */
  const identityStep: Step = {
    key: "identity",
    question: "Commençons. Quelle est votre entreprise?",
    hint: "Tapez les premières lettres : nous cherchons votre entreprise réelle.",
    isValid: (d) =>
      Boolean((businessConfirmed || manualEntry) && d.company_name && d.trade_primary && d.city),
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

        {!businessConfirmed && !manualEntry && (d.company_name ?? "").trim().length >= 2 && (
          /* L'option « Mon entreprise n'est pas listée » est disponible dès que
             deux caractères sont saisis — pendant la recherche, avec résultats
             ou sans résultat. La saisie reste déclarée, jamais vérifiée, et ne
             bloque jamais « Continuer ». */
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                {searchState.loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Recherche en cours…
                  </>
                ) : searchState.searched && searchState.count === 0 ? (
                  "Aucune entreprise trouvée pour cette recherche."
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" /> Sélectionnez votre entreprise dans la liste.
                  </>
                )}
              </p>
              <button
                type="button"
                data-testid="company-not-listed"
                onClick={() => {
                  setManualEntry(true);
                  setBusinessConfirmed(true);
                  void trackFunnelStep("analysis_completed", {
                    subjectId: (d.company_name ?? "").trim() || null,
                    metadata: { provenance: "declare_non_verifie" },
                  });
                }}
                className="w-full rounded-xl border border-amber-400/40 bg-amber-500/10 py-2.5 text-sm font-medium text-amber-200"
              >
                Mon entreprise n'est pas listée
              </button>
            </div>
          </div>
        )}

        {manualEntry && !detected.trade && (
          <p className="text-xs text-white/50">
            Nom d'entreprise déclaré — non vérifié pour l'instant.
          </p>
        )}

        {(businessConfirmed || manualEntry) && (
          <>
            <TradePickerSheet
              label={`Métier principal${detected.trade ? " · Détecté — à confirmer" : ""}`}
              value={tradeSlugOf(d.trade_primary)}
              fallbackLabel={d.trade_primary ?? null}
              excludeSlug={tradeSlugOf(d.trade_secondary)}
              onChange={(trade) => { confirm("trade_primary"); set({ trade_primary: trade.label }); }}
              testId="trade-primary-picker"
            />

            <TextInput
              label={`Ville desservie${detected.city ? " · Détecté — à confirmer" : ""}`}
              value={d.city ?? ""}
              onChange={(v) => { confirm("city"); set({ city: v }); }}
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
          onChange={(v) => { confirm("city"); set({ city: v }); }}
        />
        <NumberInput
          label="Rayon de service (km)"
          value={d.service_radius_km ?? null}
          onChange={(v) => set({ service_radius_km: v ?? undefined })}
          min={5}
          max={300}
          placeholder="Ex. 50"
        />
        <TradePickerSheet
          label="Métier secondaire (optionnel)"
          sheetTitle="Votre métier secondaire"
          placeholder="Aucun"
          allowNone
          excludeSlug={tradeSlugOf(d.trade_primary)}
          onClear={() => { confirm("trade_secondary"); set({ trade_secondary: undefined }); }}
          value={tradeSlugOf(d.trade_secondary)}
          fallbackLabel={d.trade_secondary ?? null}
          onChange={(trade) => { confirm("trade_secondary"); set({ trade_secondary: trade.label }); }}
          testId="trade-secondary-picker"
        />

      </div>
    ),
  };

  const steps: Step[] = [
    ...(auditValid ? [] : [identityStep]),
    scopeStep,
    {
      key: "objectives",
      question: "Quel est votre objectif de contrats?",
      hint: "Un objectif de contrats n'est pas un nombre de rendez-vous : nous le convertirons.",
      isValid: (d) =>
        ((d as GoalFields).contract_goal_value ?? 0) > 0 &&
        (d.average_project_value ?? 0) > 0,
      render: (d, set) => (
        <div className="space-y-3">
          <NumberInput
            label="Nouveaux contrats visés"
            value={(d as GoalFields).contract_goal_value ?? null}
            onChange={(v) => set({ contract_goal_value: v ?? undefined } as Partial<PricingIntakeInput>)}
            min={1}
            max={2000}
            placeholder="Ex. 100"
          />
          <ChoiceGroup
            label="Sur quelle période"
            value={(d as GoalFields).contract_goal_unit ?? "year"}
            onChange={(v) => set({ contract_goal_unit: v as "month" | "year" } as Partial<PricingIntakeInput>)}
            options={[
              { v: "month", l: "Par mois" },
              { v: "year", l: "Par année" },
            ]}
          />
          <NumberInput
            label="Valeur moyenne d'un projet ($)"
            value={d.average_project_value ?? null}
            onChange={(v) => set({ average_project_value: v ?? undefined })}
            min={1}
            max={500000}
            step={500}
            placeholder="Ex. 3000"
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
            value={d.monthly_capacity ?? null}
            onChange={(v) => set({ monthly_capacity: v ?? undefined })}
            min={1}
            max={200}
            placeholder="Ex. 6"
          />
          <NumberInput
            label="Taux de fermeture estimé (%)"
            value={
              typeof d.close_rate_estimate === "number"
                ? Math.round(d.close_rate_estimate * 100)
                : null
            }
            onChange={(v) => set({ close_rate_estimate: v === null ? undefined : v / 100 })}
            min={5}
            max={95}
            step={5}
            placeholder="Ex. 40"
          />
        </div>
      ),
    },
    {
      key: "appointments",
      question: "Combien de rendez-vous exclusifs par mois?",
      hint: "Calculé depuis votre objectif, votre taux de fermeture et votre capacité. Ajustable.",
      isValid: (d) => (d.target_monthly_appointments ?? 0) > 0,
      render: (d, set) => {
        const reco = recommendAppointments(d);
        return (
          <div className="space-y-3">
            {reco && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75">
                <p>
                  {reco.contractsPerMonth} contrat{reco.contractsPerMonth > 1 ? "s" : ""} par mois ÷{" "}
                  {Math.round(reco.closeRate * 100)} % de fermeture ={" "}
                  <strong className="text-white">{reco.needed} rendez-vous</strong> par mois.
                </p>
                {reco.limitedByCapacity && (
                  <p className="mt-1 text-xs text-amber-200/90">
                    Votre capacité déclarée ({reco.capacity} projets/mois) limite la recommandation à{" "}
                    {reco.recommended} rendez-vous.
                  </p>
                )}
              </div>
            )}
            <NumberInput
              label="Rendez-vous exclusifs souhaités / mois"
              value={d.target_monthly_appointments ?? reco?.recommended ?? null}
              onChange={(v) => set({ target_monthly_appointments: v ?? undefined })}
              min={1}
              max={500}
              placeholder={reco ? `Recommandé : ${reco.recommended}` : "Ex. 4"}
              hint="Chaque rendez-vous est exclusif : il est facturé au tarif réel de votre métier."
            />
            <NumberInput
              label="Budget mensuel maximum ($) — optionnel"
              value={
                typeof (d as GoalFields).monthly_budget_cents === "number"
                  ? Math.round(((d as GoalFields).monthly_budget_cents as number) / 100)
                  : null
              }
              onChange={(v) =>
                set({
                  monthly_budget_cents: v === null ? undefined : Math.round(v * 100),
                  pricing_mode: v === null ? undefined : "budget",
                } as Partial<PricingIntakeInput>)
              }
              min={49}
              max={100000}
              step={50}
              placeholder="Laisser vide pour voir le vrai prix"
              hint="Avec un budget, nous indiquons combien de rendez-vous exclusifs il permet réellement."
            />
          </div>
        );
      },
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
    // Présence actuelle : si l'audit vient de la mesurer, on l'affiche avec sa
    // provenance au lieu de la redemander. Sinon, champs libres avec « Non
    // déterminé » possible — jamais de valeur inventée.
    ...(auditScoreKnown
      ? []
      : [{
          key: "visibility",
          question: "Votre présence actuelle?",
          hint: "Laissez vide si vous ne le savez pas : nous inscrirons « Non déterminé ».",
          isValid: () => true,
          render: (d: Partial<PricingIntakeInput>, set: (p: Partial<PricingIntakeInput>) => void) => (
            <div className="space-y-3">
              <NumberInput
                label="Score Google Business actuel (0-100)"
                value={d.current_google_presence ?? null}
                onChange={(v) => set({ current_google_presence: v ?? undefined })}
                min={0}
                max={100}
                step={5}
                placeholder="Non déterminé"
              />
              <NumberInput
                label="Score visibilité IA actuel (0-100)"
                value={d.current_ai_visibility_score ?? null}
                onChange={(v) => set({ current_ai_visibility_score: v ?? undefined })}
                min={0}
                max={100}
                step={5}
                placeholder="Non déterminé"
              />
            </div>
          ),
        } satisfies Step]),
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
    // Profil confirmé et objectifs réellement saisis avant tout calcul de plan.
    void trackFunnelStep("profile_completed", {
      subjectId: data.company_name ?? null,
      city: data.city ?? null,
      metadata: { manual_entry: manualEntry },
    });
    void trackFunnelStep("goals_completed", {
      subjectId: data.company_name ?? null,
      metadata: {
        target_monthly_appointments: data.target_monthly_appointments ?? null,
        monthly_capacity: data.monthly_capacity ?? null,
        average_project_value: data.average_project_value ?? null,
        growth_level: data.desired_growth_level ?? null,
      },
    });
    try {
      const quote = await computePricingQuote(data as PricingIntakeInput);
      void trackFunnelStep("quote_computed", {
        subjectId: quote.id,
        city: (data as { city?: string }).city ?? null,
        metadata: {
          plan_code: quote.recommended_plan ?? null,
          objective: searchParams.get("objective"),
          from: searchParams.get("from"),
        },
      });
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      const carry = new URLSearchParams();
      for (const key of ["promo", "ref", "offer", "audit", "audit_token", "t", "objective", "from"]) {
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

/**
 * Champ numérique mobile — jamais de zéro parasite.
 * Le champ vide affiche un texte d'aide (pas la valeur 0), la première frappe
 * remplace réellement la valeur et les zéros de tête sont normalisés
 * (« 075 » → 75, « 04 » → 4, « 03000 » → 3000).
 */
function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  hint,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  hint?: string;
}) {
  const external = typeof value === "number" && Number.isFinite(value) ? String(value) : "";
  const [draft, setDraft] = useState(external);
  const [focused, setFocused] = useState(false);

  // Hors saisie, la valeur affichée suit toujours le dossier.
  useEffect(() => {
    if (!focused) setDraft(external);
  }, [external, focused]);

  const commit = (raw: string) => {
    const cleaned = raw.replace(/[^\d.]/g, "");
    if (cleaned === "") {
      setDraft("");
      onChange(null);
      return;
    }
    const normalized = cleaned.replace(/^0+(?=\d)/, "");
    setDraft(normalized);
    const parsed = Number(normalized);
    onChange(Number.isFinite(parsed) ? parsed : null);
  };

  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-white/50">
        {label}
      </span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        placeholder={placeholder ?? "—"}
        onFocus={(e) => {
          setFocused(true);
          e.currentTarget.select();
        }}
        onBlur={(e) => {
          setFocused(false);
          const raw = e.currentTarget.value.trim();
          if (raw === "") return;
          let parsed = Number(raw.replace(/^0+(?=\d)/, ""));
          if (!Number.isFinite(parsed)) { onChange(null); setDraft(""); return; }
          if (typeof min === "number" && parsed < min) parsed = min;
          if (typeof max === "number" && parsed > max) parsed = max;
          setDraft(String(parsed));
          onChange(parsed);
        }}
        onChange={(e) => commit(e.target.value)}
        className="mt-1.5 w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400"
      />
      {hint && <span className="mt-1 block text-[11px] text-white/45">{hint}</span>}
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

/* ---------- Objectif de contrats → rendez-vous recommandés ---------- */

export type GoalFields = {
  contract_goal_value?: number;
  contract_goal_unit?: "month" | "year";
  monthly_budget_cents?: number;
  pricing_mode?: "goal" | "budget";
};

/**
 * Convertit un objectif de contrats en nombre de rendez-vous exclusifs.
 * Aucune valeur inventée : sans objectif confirmé, aucune recommandation.
 */
export function recommendAppointments(d: Partial<PricingIntakeInput>): {
  contractsPerMonth: number;
  closeRate: number;
  needed: number;
  capacity: number;
  recommended: number;
  limitedByCapacity: boolean;
} | null {
  const g = d as GoalFields;
  const goal = g.contract_goal_value;
  if (!goal || goal <= 0) return null;
  const perMonth = (g.contract_goal_unit ?? "year") === "year" ? goal / 12 : goal;
  const contractsPerMonth = Math.max(1, Math.ceil(perMonth));
  const closeRate =
    typeof d.close_rate_estimate === "number" && d.close_rate_estimate > 0
      ? Math.min(0.95, d.close_rate_estimate)
      : 0.4;
  const needed = Math.max(1, Math.ceil(contractsPerMonth / closeRate));
  const capacity = d.monthly_capacity ?? 0;
  const capacityAppointments = capacity > 0 ? Math.max(1, Math.ceil(capacity / closeRate)) : needed;
  const recommended = Math.min(needed, capacityAppointments);
  return {
    contractsPerMonth,
    closeRate,
    needed,
    capacity,
    recommended,
    limitedByCapacity: recommended < needed,
  };
}
