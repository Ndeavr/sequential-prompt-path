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
import { getKnownContractorContext } from "@/lib/contractorKnownContext";
import { avgTicketFor, closeRateFor } from "@/config/scanCapacityTickets";

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
type ConfirmableField = "city" | "trade_primary" | "trade_secondary" | "company_name" | "service_radius_km";

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
  const [editingProfile, setEditingProfile] = useState(false);
  const [data, setData] = useState<Partial<PricingIntakeInput>>(BASE_DEFAULTS);
  const [submitting, setSubmitting] = useState(false);
  const [detected, setDetected] = useState<{ trade: boolean; city: boolean }>({ trade: false, city: false });
  const [businessConfirmed, setBusinessConfirmed] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [searchState, setSearchState] = useState({ loading: false, count: 0, searched: false });
  const [hydrated, setHydrated] = useState(false);
  /** Saisie manuelle en cours : le résumé ne remplace jamais le formulaire avant « Continuer ». */
  const [userEditing, setUserEditing] = useState(false);

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

  /* ---------- Continuité : ce que l'entrepreneur a déjà répondu ----------
   * Les réponses du profil de compatibilité (services, territoires) et
   * l'identité transmise par l'étape précédente ne sont jamais redemandées.
   * Rien n'est inventé : seuls des champs réellement déclarés sont repris,
   * et une valeur confirmée ici n'est jamais écrasée.
   */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const qsName = searchParams.get("entreprise");
      const qsCity = searchParams.get("ville");
      const qsTrade = searchParams.get("metier");
      let answers: Record<string, unknown> = {};
      try {
        const { data: res } = await supabase.functions.invoke("matching-profile", {
          body: { action: "get", session_key: sessionKey },
        });
        const profile = (res as { profile?: { answers?: Record<string, unknown> } | null } | null)?.profile;
        answers = profile?.answers ?? {};
      } catch {
        /* profil indisponible : le parcours reste utilisable */
      }
      if (cancelled) return;
      const firstOf = (v: unknown): string | null =>
        Array.isArray(v) && typeof v[0] === "string" && v[0].trim() ? String(v[0]).trim() : null;
      // Ce que l'entrepreneur a déjà déclaré ailleurs (Clara, brouillon, tunnel).
      const known = getKnownContractorContext();
      const declaredName = qsName || known.businessName;
      const declaredTrade = qsTrade || firstOf(answers.services_wanted) || known.trade;
      const declaredCity = qsCity || firstOf(answers.territories) || known.city;
      setData((d) => ({
        ...d,
        company_name: confirmedFields.includes("company_name") ? d.company_name : d.company_name || declaredName || undefined,
        trade_primary: confirmedFields.includes("trade_primary") ? d.trade_primary : d.trade_primary || declaredTrade || undefined,
        city: confirmedFields.includes("city") ? d.city : d.city || declaredCity || undefined,
      }));
      if ((declaredName || declaredTrade || declaredCity)) setBusinessConfirmed(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  /* ---------- Fiche entrepreneur rattachée au compte : source prioritaire ---------- */
  const [linked, setLinked] = useState<{ id: string; business_name: string | null; address: string | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: c } = await supabase
        .from("contractors")
        .select("id,business_name,specialty,city,address,travel_radius_km")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (cancelled || !c) return;
      const { data: areas } = await supabase
        .from("contractor_service_areas" as never)
        .select("city_name,radius_km")
        .eq("contractor_id", (c as { id: string }).id)
        .limit(1);
      if (cancelled) return;
      const row = c as { id: string; business_name: string | null; specialty: string | null; city: string | null; address: string | null; travel_radius_km: number | null };
      const area = (areas as unknown as Array<{ city_name: string | null; radius_km: number | null }> | null)?.[0];
      setLinked({ id: row.id, business_name: row.business_name, address: row.address });
      setData((d) => ({
        ...d,
        company_name: confirmedFields.includes("company_name") ? d.company_name : row.business_name || d.company_name,
        trade_primary: confirmedFields.includes("trade_primary") ? d.trade_primary : row.specialty || d.trade_primary,
        city: confirmedFields.includes("city") ? d.city : area?.city_name || row.city || d.city,
        service_radius_km: confirmedFields.includes("service_radius_km") ? d.service_radius_km : area?.radius_km ?? row.travel_radius_km ?? d.service_radius_km,
      }));
      if (row.business_name) setBusinessConfirmed(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const auditValid = Boolean(audit?.business_name);
  /** Identité déjà connue (audit ou étape précédente) : on ne la redemande pas. */
  const identityKnown = Boolean(
    !userEditing && businessConfirmed && data.company_name && data.trade_primary && data.city,
  );
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
          placeholder="Ex. Isolation Solution Royal"
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
              placeholder="Ex. Laval, Montréal, Terrebonne"
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
    isValid: (d) => Boolean(d.trade_primary && d.city),
    render: (d, set) => (
      <div className="space-y-3">
        {!d.trade_primary && (
          <TradePickerSheet
            label="Métier principal"
            sheetTitle="Votre métier principal"
            placeholder="Choisir mon métier"
            value={tradeSlugOf(d.trade_primary)}
            fallbackLabel={d.trade_primary ?? null}
            onChange={(trade) => { confirm("trade_primary"); set({ trade_primary: trade.label }); }}
            testId="trade-primary-picker-scope"
          />
        )}
        <TextInput
          label="Ville principale desservie"
          value={d.city ?? ""}
          placeholder="Ex. Laval, Montréal, Terrebonne"
          onChange={(v) => { confirm("city"); set({ city: v }); }}
        />
        <NumberInput
          label="Rayon de service (km)"
          value={d.service_radius_km ?? null}
          onChange={(v) => { confirm("service_radius_km"); set({ service_radius_km: v ?? undefined }); }}
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

  /* Étape 1 — Votre entreprise : résumé prérempli, modifiable, confirmé une fois. */
  const summaryReady = Boolean(!userEditing && identityKnown && data.company_name && data.trade_primary && data.city);
  const profileStep: Step = {
    key: "profile",
    question: summaryReady && !editingProfile
      ? "Voici ce que nous avons trouvé sur votre entreprise. Est-ce exact?"
      : identityKnown ? "Complétez votre entreprise." : "Commençons. Quelle est votre entreprise?",
    hint: summaryReady && !editingProfile
      ? "Corrigez au besoin. Vos corrections ne seront jamais remplacées par une donnée trouvée en ligne."
      : identityKnown
        ? "Complétez seulement ce qui manque."
        : "Tapez les premières lettres : nous cherchons votre entreprise réelle.",
    isValid: (d) => Boolean(d.company_name && d.trade_primary && d.city),
    render: (d, rawSet) => {
      const set = (p: Partial<PricingIntakeInput>) => { setUserEditing(true); rawSet(p); };
      return (
      summaryReady && !editingProfile ? (
        <div className="space-y-2 text-sm" data-testid="company-summary">
          {[
            ["Entreprise", d.company_name],
            ["Métier principal", d.trade_primary],
            ["Territoire", `${d.city}${d.service_radius_km ? ` · ${d.service_radius_km} km` : ""}`],
            ["Capacité de travaux", d.monthly_capacity ? `${d.monthly_capacity} projets/mois` : "Non indiquée"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-white/5 pb-2">
              <span className="text-white/55">{k}</span>
              <span className="text-white text-right">{v}</span>
            </div>
          ))}
          <button type="button" onClick={() => setEditingProfile(true)} className="pt-2 text-xs text-white/60 underline underline-offset-4">
            Modifier
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {!identityKnown ? (
            identityStep.render(d, set)
          ) : (
            <>
              <TradePickerSheet
                label="Métier principal"
                sheetTitle="Votre métier principal"
                placeholder="Choisir mon métier"
                value={tradeSlugOf(d.trade_primary)}
                fallbackLabel={d.trade_primary ?? null}
                onChange={(trade) => { confirm("trade_primary"); set({ trade_primary: trade.label }); }}
                testId="trade-primary-picker-scope"
              />
              <TextInput
                label="Ville principale desservie"
                value={d.city ?? ""}
                placeholder="Ex. Laval, Montréal, Terrebonne"
                onChange={(v) => { confirm("city"); set({ city: v }); }}
              />
            </>
          )}
          <NumberInput
            label="Rayon desservi autour de cette ville (km)"
            value={d.service_radius_km ?? null}
            onChange={(v) => { confirm("service_radius_km"); set({ service_radius_km: v ?? undefined }); }}
            min={5}
            max={300}
            placeholder="Ex. 40"
          />
          <NumberInput
            label="Capacité de travaux (projets réalisables par mois, optionnel)"
            value={d.monthly_capacity ?? null}
            onChange={(v) => set({ monthly_capacity: v ?? undefined })}
            min={1}
            max={200}
            placeholder="Ex. 6"
          />
        </div>
      )
      );
    },
  };

  /* Étape 2 — Votre objectif financier, calcul transparent, capacité du mois prochain. */
  const objectiveStep: Step = {
    key: "objective",
    question: "Combien d'argent aimeriez-vous faire de plus cette année avec votre entreprise?",
    hint: "Un montant suffit. Nous le traduisons en rendez-vous, avec des hypothèses que vous pouvez corriger.",
    isValid: (d) => Boolean(objectiveToPayload(d)),
    render: (d, set) => {
      const g = d as GoalFields;
      const kind = g.goal_kind ?? "sales";
      const calc = objectiveToPayload({ ...d, next_month_appointments: g.next_month_appointments || 1 } as Partial<PricingIntakeInput>);
      const setG = (p: Partial<GoalFields>) => set(p as Partial<PricingIntakeInput>);
      const months = (g.horizon ?? "12m") === "year_end" ? monthsToYearEnd() : 12;
      return (
        <div className="space-y-3">
          <NumberInput
            label="Montant supplémentaire ($)"
            value={g.goal_amount ?? null}
            onChange={(v) => setG({ goal_amount: v ?? undefined })}
            min={500}
            max={10000000}
            step={1000}
            placeholder="Ex. 30000"
          />
          <ChoiceGroup
            label="Il s'agit de"
            value={kind}
            onChange={(v) => setG({ goal_kind: v as "sales" | "profit" })}
            options={[
              { v: "sales", l: "Ventes supplémentaires" },
              { v: "profit", l: "Profit supplémentaire" },
            ]}
          />
          <ChoiceGroup
            label="Horizon"
            value={g.horizon ?? "12m"}
            onChange={(v) => setG({ horizon: v as "year_end" | "12m" })}
            options={[
              { v: "12m", l: "12 prochains mois" },
              { v: "year_end", l: "D'ici la fin de l'année" },
            ]}
          />
          {calc && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/80 space-y-3" data-testid="objective-assumptions">
              <p className="text-[11px] uppercase tracking-wider text-white/50">
                Hypothèses {calc.assumptionsConfirmed ? "(modifiées par vous)" : "à confirmer — estimations UNPRO, non sourcées"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <NumberInput label="Vente moyenne ($)" value={g.avg_sale ?? calc.avgSale} onChange={(v) => setG({ avg_sale: v ?? undefined })} min={100} max={1000000} step={100} />
                <NumberInput label="Conversion RDV → contrat (%)" value={g.conversion_pct ?? Math.round(calc.conversion * 100)} onChange={(v) => setG({ conversion_pct: v ?? undefined })} min={1} max={95} />
                {kind === "profit" && (
                  <NumberInput label="Marge (%)" value={g.margin_pct ?? Math.round(calc.margin * 100)} onChange={(v) => setG({ margin_pct: v ?? undefined })} min={1} max={95} />
                )}
              </div>
              <p data-testid="objective-calc">
                {kind === "profit" && <>{calc.contribution.toLocaleString("fr-CA")} $ de contribution par contrat → </>}
                <strong className="text-white">{calc.contracts} contrats</strong> →{" "}
                <strong className="text-white">{calc.appointmentsTotal} rendez-vous</strong> sur {months} mois
                (≈ {calc.cadence}/mois).
              </p>
              <p className="text-[11px] text-white/55">
                Estimation avant le coût d'UNPRO, qui dépend entièrement de ces hypothèses.
                {kind === "profit" && " Une contribution estimée n'est pas un bénéfice net garanti."}
              </p>
            </div>
          )}
          <NumberInput
            label="Pour commencer, combien de rendez-vous pourriez-vous accueillir le mois prochain?"
            value={g.next_month_appointments ?? null}
            onChange={(v) => setG({ next_month_appointments: v ?? undefined })}
            min={1}
            max={200}
            placeholder={calc ? `Ex. ${calc.cadence}` : "Ex. 4"}
          />
          <p className="text-[11px] text-white/50">
            Ce sont des rencontres avec des clients, pas des chantiers. Votre entente de départ se base sur ce nombre.
          </p>
        </div>
      );
    },
  };

  const steps: Step[] = [profileStep, objectiveStep];

  const total = steps.length;
  const safeStep = Math.min(step, total - 1);
  const current = steps[safeStep];
  const isLast = safeStep === total - 1;

  const submit = async () => {
    const calc = objectiveToPayload(data);
    if (!calc) return;
    const payload = calc.payload;
    setSubmitting(true);
    void trackFunnelStep("profile_completed", {
      subjectId: payload.company_name ?? null,
      city: payload.city ?? null,
      metadata: { manual_entry: manualEntry, linked_contractor: linked?.id ?? null },
    });
    void trackFunnelStep("goals_completed", {
      subjectId: payload.company_name ?? null,
      metadata: {
        goal_kind: (data as GoalFields).goal_kind ?? "sales",
        horizon: (data as GoalFields).horizon ?? "12m",
        average_project_value: payload.average_project_value ?? null,
        close_rate_estimate: payload.close_rate_estimate ?? null,
        target_monthly_appointments: payload.target_monthly_appointments ?? null,
        monthly_capacity: payload.monthly_capacity ?? null,
        assumptions_confirmed: objectiveToPayload(data)?.assumptionsConfirmed ?? false,
      },
    });
    try {
      const quote = await computePricingQuote(payload as PricingIntakeInput);
      void trackFunnelStep("quote_computed", {
        subjectId: quote.id,
        city: payload.city ?? null,
        metadata: { plan_code: quote.recommended_plan ?? null, from: searchParams.get("from") },
      });
      const carry = new URLSearchParams();
      for (const key of ["promo", "ref", "offer", "audit", "audit_token", "t", "objective", "from"]) {
        const value = searchParams.get(key);
        if (value) carry.set(key, value);
      }
      navigate(`/entrepreneur/plan-personnalise/${quote.id}${carry.size ? `?${carry}` : ""}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Impossible de calculer votre forfait.");
      setSubmitting(false);
    }
  };

  const next = () => {
    if (!current.isValid(data)) {
      toast.error("Complétez les champs pour continuer.");
      return;
    }
    if (isLast) void submit();
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
        {/* Fiche rattachée / entreprise analysée — jamais de détour vers l'audit. */}
        {(linked || auditValid) && (
          <div
            data-testid="audit-identity-banner"
            className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/[0.08] px-4 py-3"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-amber-300/90">
              <ShieldCheck className="w-3.5 h-3.5" /> {linked ? "Fiche rattachée à votre compte" : "Entreprise analysée"}
            </div>
            <p className="mt-1 text-sm font-semibold text-white">{linked?.business_name ?? audit?.business_name}</p>
            {linked?.address && <p className="text-xs text-white/60">Siège : {linked.address}</p>}
          </div>
        )}

        {/* Progression stable : 3 étapes (entreprise, objectif, entente) puis confirmation */}
        <div className="mb-8">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= safeStep ? "bg-amber-400" : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-white/50 mt-3 tracking-wider uppercase" data-testid="intake-step-label">
            Étape {safeStep + 1} sur 3
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

      {/* CTA dans le flux : ne masque jamais un champ ni une condition. */}
      <div className="relative px-5 pt-6 pb-10">
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
            data-testid="intake-next"
            className="flex-1 h-14 rounded-[18px] bg-amber-500 text-black font-semibold flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_10px_30px_-10px_rgba(251,191,36,0.6)]"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLast ? "Voir ma proposition" : summaryReady && !editingProfile ? "Confirmer et continuer" : "Continuer"}
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
  /** Objectif financier annuel : ventes OU profit supplémentaire. */
  goal_kind?: "sales" | "profit";
  goal_amount?: number;
  horizon?: "year_end" | "12m";
  /** Hypothèses modifiables (confirmées par l'entrepreneur si modifiées). */
  avg_sale?: number;
  margin_pct?: number;
  conversion_pct?: number;
  /** Rendez-vous que l'entrepreneur peut accueillir le mois prochain. */
  next_month_appointments?: number;
};

/** Mois restants d'ici la fin de l'année (mois courant exclu, minimum 1). */
export function monthsToYearEnd(now = new Date()): number {
  return Math.max(1, 11 - now.getMonth());
}

/**
 * Calcul transparent : ventes → contrats = ⌈objectif / vente moyenne⌉ ;
 * profit → contrats = ⌈objectif / (vente moyenne × marge)⌉ ;
 * rendez-vous = ⌈contrats / conversion⌉. Estimation avant le coût d'UNPRO.
 * L'entente de départ se base sur la capacité du mois prochain, pas sur l'objectif annuel.
 */
export function objectiveToPayload(d: Partial<PricingIntakeInput>, now = new Date()): {
  payload: Partial<PricingIntakeInput>;
  avgSale: number;
  margin: number;
  conversion: number;
  contribution: number;
  contracts: number;
  appointmentsTotal: number;
  months: number;
  cadence: number;
  startAppointments: number;
  assumptionsConfirmed: boolean;
} | null {
  const g = d as GoalFields;
  const kind = g.goal_kind ?? "sales";
  const amount = g.goal_amount ?? 0;
  if (!amount || amount <= 0) return null;
  const avgSale = g.avg_sale && g.avg_sale > 0 ? g.avg_sale : avgTicketFor(d.trade_primary);
  const margin = Math.min(0.95, Math.max(0.01, (g.margin_pct ?? 30) / 100));
  const conversion = Math.min(0.95, Math.max(0.01, (g.conversion_pct ?? Math.round(closeRateFor(d.trade_primary) * 100)) / 100));
  const contribution = kind === "profit" ? avgSale * margin : avgSale;
  const contracts = Math.max(1, Math.ceil(amount / contribution));
  const appointmentsTotal = Math.max(1, Math.ceil(contracts / conversion));
  const months = (g.horizon ?? "12m") === "year_end" ? monthsToYearEnd(now) : 12;
  const cadence = Math.max(1, Math.ceil(appointmentsTotal / months));
  const next = g.next_month_appointments ?? 0;
  if (!next || next <= 0) return null;
  // Le forfait de départ couvre les RDV demandés pour le mois prochain (jamais réduits).
  const startAppointments = next;
  return {
    avgSale, margin, conversion, contribution, contracts, appointmentsTotal, months, cadence,
    startAppointments,
    assumptionsConfirmed: Boolean(g.avg_sale || g.conversion_pct || (kind === "profit" && g.margin_pct)),
    payload: {
      ...d,
      contract_goal_value: contracts,
      contract_goal_unit: "year",
      average_project_value: avgSale,
      close_rate_estimate: conversion,
      target_monthly_appointments: startAppointments,
      monthly_capacity: Math.max(d.monthly_capacity ?? 0, next),
      pricing_mode: "goal",
      monthly_budget_cents: undefined,
    } as Partial<PricingIntakeInput>,
  };
}

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
