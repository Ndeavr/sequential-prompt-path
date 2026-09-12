/**
 * UNPRO — Calculateur de rénovation (public, fr-CA, mobile d'abord)
 * Routes : /calculateur-renovation et /:city/calculateur-renovation
 *
 * Valeur avant identité : projet → détails → estimation complète affichée,
 * puis sauvegarde par code SMS et mise en relation avec UN entrepreneur
 * compatible. Jamais de demande envoyée à plusieurs entrepreneurs.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bath,
  Boxes,
  ChefHat,
  Home,
  Info,
  Loader2,
  Sofa,
  Warehouse,
} from "lucide-react";

import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import PhoneOtpForm from "@/components/auth/PhoneOtpForm";
import AddressVerifiedInput from "@/components/address/AddressVerifiedInput";
import { emptyAddress, isVerified, type VerifiedAddress } from "@/types/address";
import { supabase } from "@/integrations/supabase/client";
import { logFunnelEvent, getFunnelAttribution } from "@/lib/analytics/logFunnelEvent";
import { toast } from "sonner";

import {
  AGE_LABELS,
  CATEGORIES,
  CATEGORY_ORDER,
  PROPERTY_LABELS,
  SCOPE_LABELS,
  isRenoCategory,
  type BuildingAge,
  type PropertyKind,
  type RenoCategory,
  type ScopeLevel,
} from "@/features/renovationEstimator/catalog";
import {
  computeRenovationEstimate,
  formatCad,
  type BenchmarkRow,
} from "@/features/renovationEstimator/engine";
import {
  fetchApprovedProjectVideos,
  fetchBenchmarks,
  saveEstimateProject,
  type ApprovedProjectVideo,
} from "@/features/renovationEstimator/services";
import ProjectVideoCard from "@/features/renovationEstimator/ProjectVideoCard";
import {
  clearProgress,
  loadProgress,
  newIdempotencyKey,
  saveProgress,
} from "@/features/renovationEstimator/session";

const CATEGORY_ICONS: Record<RenoCategory, typeof Home> = {
  cuisine: ChefHat,
  salle_de_bain: Bath,
  sous_sol: Boxes,
  garage: Warehouse,
  aire_de_vie: Sofa,
  renovation_complete: Home,
};

function prettyCity(slug?: string | null): string | null {
  if (!slug) return null;
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("-");
}

export default function PageRenovationEstimator() {
  const { city: cityParam } = useParams<{ city?: string }>();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const citySlug = cityParam?.toLowerCase() ?? null;
  const cityName = prettyCity(citySlug);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<RenoCategory | null>(null);
  const [sizeSqft, setSizeSqft] = useState<number | null>(null);
  const [scope, setScope] = useState<ScopeLevel>("standard");
  const [addons, setAddons] = useState<string[]>([]);
  const [propertyKind, setPropertyKind] = useState<PropertyKind>("maison");
  const [age, setAge] = useState<BuildingAge>("inconnu");
  const [address, setAddress] = useState<VerifiedAddress>(emptyAddress());
  const [benchmarks, setBenchmarks] = useState<BenchmarkRow[]>([]);
  const [videos, setVideos] = useState<ApprovedProjectVideo[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dir, setDir] = useState<1 | -1>(1);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => newIdempotencyKey());

  const [saveOpen, setSaveOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const savingRef = useRef(false);
  const topRef = useRef<HTMLDivElement | null>(null);

  const def = category ? CATEGORIES[category] : null;
  const effectiveSize = sizeSqft ?? def?.sizeDefault ?? 0;

  // Reprise de progression (aucune donnée personnelle stockée).
  useEffect(() => {
    const saved = loadProgress();
    if (!saved) return;
    if (saved.category && isRenoCategory(saved.category)) setCategory(saved.category);
    if (typeof saved.sizeSqft === "number") setSizeSqft(saved.sizeSqft);
    if (saved.scope) setScope(saved.scope);
    if (Array.isArray(saved.addons)) setAddons(saved.addons);
    if (saved.propertyKind) setPropertyKind(saved.propertyKind);
    if (saved.age) setAge(saved.age);
    if (saved.idempotencyKey) setIdempotencyKey(saved.idempotencyKey);
    if (saved.step === 2 || saved.step === 3) setStep(saved.category ? saved.step : 1);
  }, []);

  useEffect(() => {
    saveProgress({
      step,
      category,
      sizeSqft,
      scope,
      addons,
      propertyKind,
      age,
      citySlug,
      idempotencyKey,
    });
  }, [step, category, sizeSqft, scope, addons, propertyKind, age, citySlug, idempotencyKey]);

  useEffect(() => {
    void logFunnelEvent({
      event_type: "estimator_view",
      step: "estimator",
      metadata: { city: citySlug ?? null },
    });
    setDataLoading(true);
    void Promise.allSettled([
      fetchBenchmarks().then(setBenchmarks),
      fetchApprovedProjectVideos().then(setVideos),
    ]).finally(() => setDataLoading(false));
    void supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, [citySlug]);

  const estimate = useMemo(() => {
    if (!category) return null;
    return computeRenovationEstimate(
      { category, sizeSqft: effectiveSize, scope, addons, propertyKind, age, citySlug },
      benchmarks,
    );
  }, [category, effectiveSize, scope, addons, propertyKind, age, citySlug, benchmarks]);

  const goTop = useCallback(() => {
    topRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, [reduceMotion]);

  const selectCategory = (c: RenoCategory) => {
    setCategory(c);
    setSizeSqft(CATEGORIES[c].sizeDefault);
    setAddons([]);
    void logFunnelEvent({
      event_type: "estimator_category_selected",
      step: "estimator",
      metadata: { category: c },
    });
  };

  const toggleAddon = (id: string) =>
    setAddons((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const goToDetails = () => {
    if (!category) return;
    setDir(1);
    setStep(2);
    goTop();
  };

  const goToResult = () => {
    if (!category || !estimate) return;
    setDir(1);
    setStep(3);
    goTop();
    void logFunnelEvent({
      event_type: "estimator_details_completed",
      step: "estimator",
      metadata: { category, size_sqft: effectiveSize, scope, addons_count: addons.length },
    });
    void logFunnelEvent({
      event_type: "estimator_result_viewed",
      step: "estimator",
      metadata: {
        category,
        total_min: estimate.totalMin,
        total_max: estimate.totalMax,
        confidence: estimate.confidence,
      },
    });
  };

  /** Conversion permise seulement avec prénom et adresse vérifiée Google. */
  const canSave = isVerified(address) && firstName.trim().length >= 2;

  const startSave = () => {
    setSaveOpen(true);
    setSaveError(null);
    void logFunnelEvent({
      event_type: "estimator_save_started",
      step: "estimator",
      metadata: { category, authenticated: authed },
    });
  };

  const persist = useCallback(async () => {
    if (savingRef.current || !category || !estimate || !def) return;
    const verified = isVerified(address) ? address : null;
    if (!verified || firstName.trim().length < 2) {
      setSaveError(
        "Indiquez votre prénom et confirmez l'adresse du projet pour enregistrer votre estimation.",
      );
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const result = await saveEstimateProject({
        idempotency_key: idempotencyKey,
        first_name: firstName.trim(),
        email: email.trim() || null,
        category,
        category_label: def.label,
        city: verified.city ?? cityName ?? null,
        postal_code: verified.postalCode ?? null,
        address: verified.fullAddress,
        latitude: verified.latitude ?? null,
        longitude: verified.longitude ?? null,
        property_type: propertyKind,
        budget_min: estimate.totalMin,
        budget_max: estimate.totalMax,
        estimate: estimate as unknown as Record<string, unknown>,
        inputs: { category, sizeSqft: effectiveSize, scope, addons, propertyKind, age },
        attribution: getFunnelAttribution(),
        source_page: window.location.pathname,
        consent_marketing: consent,
      });
      await logFunnelEvent({
        event_type: "project_created",
        step: "estimator",
        metadata: { project_id: result.projectId, reused: result.reused, category },
      });
      await logFunnelEvent({
        event_type: "matching_started",
        step: "estimator",
        metadata: { project_id: result.projectId, has_matches: result.hasMatches },
      });
      clearProgress();
      navigate(
        `/project-created?id=${encodeURIComponent(result.projectId)}` +
          (result.leadId ? `&lead=${encodeURIComponent(result.leadId)}` : "") +
          (result.hasMatches ? "&matches=1" : ""),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "save_failed";
      setSaveError(
        "Votre estimation n'a pas pu être enregistrée pour l'instant. Réessayez dans un moment.",
      );
      void logFunnelEvent({
        event_type: "activation_error",
        step: "estimator",
        metadata: { reason: msg },
      });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [
    address, addons, age, category, cityName, consent, def, effectiveSize, email, estimate,
    firstName, idempotencyKey, navigate, propertyKind, scope,
  ]);

  const onOtpSuccess = useCallback(() => {
    setAuthed(true);
    void logFunnelEvent({ event_type: "otp_completed", step: "estimator" });
    void persist();
  }, [persist]);

  const canonical = citySlug
    ? `https://unpro.ca/${citySlug}/calculateur-renovation`
    : "https://unpro.ca/calculateur-renovation";
  const pageTitle = cityName
    ? `Calculateur de rénovation ${cityName} | Estimation instantanée | UNPRO`
    : "Calculateur de rénovation | Estimation instantanée | UNPRO";
  const pageDesc = cityName
    ? `Estimez le coût de vos rénovations à ${cityName} en moins d'une minute, puis obtenez un entrepreneur compatible et un rendez-vous exclusif.`
    : "Estimez le coût de vos rénovations en moins d'une minute : cuisine, salle de bain, sous-sol, garage, aire de vie ou rénovation complète.";

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Calculateur de rénovation UNPRO",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: canonical,
        inLanguage: "fr-CA",
        offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
      },
      {
        "@type": "Service",
        name: "Estimation de coûts de rénovation résidentielle",
        areaServed: cityName ?? "Québec",
        provider: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: "https://unpro.ca/" },
          { "@type": "ListItem", position: 2, name: "Calculateur de rénovation", item: canonical },
        ],
      },
    ],
  };

  /** Glissement directionnel : avance vers la gauche, retour vers la droite. */
  const fade = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, x: dir * 24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: dir * -24 },
        transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
      };

  /** Retour tactile sobre, jamais bloquant pour la saisie. */
  const press = reduceMotion ? {} : { whileTap: { scale: 0.97 } };
  const selectedMark = reduceMotion
    ? { initial: false as const }
    : {
        initial: { scale: 0.6, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { type: "spring" as const, stiffness: 520, damping: 24 },
      };

  return (
    <MainLayout>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div ref={topRef} className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:pt-12">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Combien coûteront vos rénovations{cityName ? ` à ${cityName}` : ""}?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
            Trois étapes : votre projet, vos dimensions, votre fourchette de coûts.
            Vous voyez l'estimation complète avant de donner quoi que ce soit.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Estimation indicative, basée sur des références de marché québécoises.
          </p>
        </header>

        {/* Progression */}
        <ol className="mb-8 flex items-center justify-center gap-2 text-xs font-medium" aria-label="Étapes">
          {["Projet", "Détails", "Votre estimation"].map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            const active = step === n;
            const done = step > n;
            return (
              <li key={label} className="flex items-center gap-2">
                <span
                  aria-current={active ? "step" : undefined}
                  className={`flex h-8 min-w-[2rem] items-center justify-center rounded-full transition-colors px-3 ${
                    active || done
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {n}
                </span>
                <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                {n < 3 ? (
                  <span className="relative h-px w-6 overflow-hidden bg-border" aria-hidden>
                    <motion.span
                      className="absolute inset-y-0 left-0 bg-primary"
                      initial={false}
                      animate={{ width: done ? "100%" : "0%" }}
                      transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease: "easeOut" }}
                      data-testid={`progress-connector-${n}`}
                    />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>


        <AnimatePresence mode="wait">
          {/* ÉTAPE 1 — PROJET */}
          {step === 1 && (
            <motion.section key="step1" {...fade} aria-labelledby="etape-projet">
              <h2 id="etape-projet" className="mb-4 text-lg font-medium">
                Quel projet souhaitez-vous estimer ?
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORY_ORDER.map((c) => {
                  const Icon = CATEGORY_ICONS[c];
                  const selected = category === c;
                  return (
                    <motion.button
                      key={c}
                      type="button"
                      {...press}
                      onClick={() => selectCategory(c)}
                      aria-pressed={selected}
                      data-testid={`category-${c}`}
                      className={`relative flex min-h-[7rem] flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selected
                          ? "border-primary bg-primary/5 shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <Icon className="h-6 w-6 text-primary" aria-hidden />
                      <span className="font-medium">{CATEGORIES[c].label}</span>
                      <span className="text-xs text-muted-foreground">{CATEGORIES[c].tagline}</span>
                      {selected && (
                        <motion.span
                          {...selectedMark}
                          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                          data-testid={`category-selected-${c}`}
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden />
                        </motion.span>
                      )}
                    </motion.button>
                  );
                })}
              </div>


              <Button
                className="mt-6 h-12 w-full"
                disabled={!category}
                onClick={goToDetails}
              >
                Continuer — dimensions et options
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>

              {dataLoading && (
                <div className="mt-10 space-y-3" aria-hidden data-testid="estimator-skeleton">
                  <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="h-40 animate-pulse rounded-2xl bg-muted" />
                    <div className="h-40 animate-pulse rounded-2xl bg-muted" />
                  </div>
                </div>
              )}

              {!dataLoading && videos.length > 0 && (
                <section className="mt-10" aria-label="Projets réalisés">
                  <h2 className="mb-3 text-lg font-medium">Projets réalisés</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {videos.map((v) => (
                      <ProjectVideoCard
                        key={v.id}
                        video={v}
                        onStarted={(id) =>
                          void logFunnelEvent({
                            event_type: "video_started",
                            step: "estimator",
                            metadata: { media_id: id },
                          })
                        }
                        onCompleted={(id) =>
                          void logFunnelEvent({
                            event_type: "video_completed",
                            step: "estimator",
                            metadata: { media_id: id },
                          })
                        }
                      />
                    ))}
                  </div>
                </section>
              )}
            </motion.section>
          )}

          {/* ÉTAPE 2 — DÉTAILS */}
          {step === 2 && def && (
            <motion.section key="step2" {...fade} aria-labelledby="etape-details" className="space-y-8">
              <h2 id="etape-details" className="text-lg font-medium">
                {def.label} — dimensions et options
              </h2>

              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <Label htmlFor="size">{def.sizeLabel}</Label>
                  <span className="text-sm font-medium">
                    {effectiveSize} {def.sizeUnit}
                  </span>
                </div>
                <Slider
                  id="size"
                  min={def.sizeMin}
                  max={def.sizeMax}
                  step={def.sizeStep}
                  value={[effectiveSize]}
                  onValueChange={(v) => setSizeSqft(v[0])}
                  aria-label={def.sizeLabel}
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  className="mt-3 h-12"
                  min={def.sizeMin}
                  max={def.sizeMax}
                  value={effectiveSize}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) setSizeSqft(n);
                  }}
                  aria-label={`${def.sizeLabel} en ${def.sizeUnit}`}
                />
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium">Niveau de finition</legend>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(SCOPE_LABELS) as ScopeLevel[]).map((s) => (
                    <motion.button
                      key={s}
                      type="button"
                      {...press}
                      onClick={() => setScope(s)}
                      aria-pressed={scope === s}
                      data-testid={`scope-${s}`}
                      className={`min-h-[3rem] rounded-xl border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        scope === s
                          ? "border-primary bg-primary/5 font-medium shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]"
                          : "border-border bg-card"
                      }`}
                    >
                      {SCOPE_LABELS[s]}
                    </motion.button>
                  ))}

                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm font-medium">Options à inclure</legend>
                <ul className="space-y-2">
                  {def.addons.map((a) => {
                    const on = addons.includes(a.id);
                    return (
                      <li key={a.id}>
                        <motion.label
                          {...press}
                          className={`flex min-h-[3rem] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                            on
                              ? "border-primary bg-primary/5 shadow-[0_0_0_3px_hsl(var(--primary)/0.10)]"
                              : "border-border bg-card"
                          }`}
                        >
                          <Checkbox
                            checked={on}
                            onCheckedChange={() => toggleAddon(a.id)}
                            aria-label={a.label}
                          />
                          <span className="flex-1 text-sm">{a.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatCad(a.min)} – {formatCad(a.max)}
                          </span>
                        </motion.label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm font-medium">Type de propriété</legend>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(PROPERTY_LABELS) as PropertyKind[]).map((p) => (
                    <motion.button
                      key={p}
                      type="button"
                      {...press}
                      onClick={() => setPropertyKind(p)}
                      aria-pressed={propertyKind === p}
                      data-testid={`property-${p}`}
                      className={`min-h-[3rem] rounded-xl border px-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        propertyKind === p
                          ? "border-primary bg-primary/5 font-medium shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]"
                          : "border-border bg-card"
                      }`}
                    >
                      {PROPERTY_LABELS[p]}
                    </motion.button>
                  ))}
                </div>
              </fieldset>

              {def.asksAge && (
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Année de construction</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(AGE_LABELS) as BuildingAge[]).map((a) => (
                      <motion.button
                        key={a}
                        type="button"
                        {...press}
                        onClick={() => setAge(a)}
                        aria-pressed={age === a}
                        data-testid={`age-${a}`}
                        className={`min-h-[3rem] rounded-xl border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          age === a
                            ? "border-primary bg-primary/5 font-medium shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]"
                            : "border-border bg-card"
                        }`}
                      >
                        {AGE_LABELS[a]}
                      </motion.button>
                    ))}
                  </div>
                </fieldset>
              )}


              <div>
                <AddressVerifiedInput
                  value={address}
                  onChange={setAddress}
                  label="Adresse du projet"
                  showUnitField={false}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="h-12 flex-1" onClick={() => { setDir(-1); setStep(1); goTop(); }}>
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                  Retour
                </Button>
                <Button className="h-12 flex-[2]" onClick={goToResult}>
                  Voir mon estimation
                </Button>
              </div>
            </motion.section>
          )}

          {/* ÉTAPE 3 — ESTIMATION */}
          {step === 3 && def && estimate && (
            <motion.section key="step3" {...fade} aria-labelledby="etape-estimation" className="space-y-6">
              <div className="rounded-3xl border border-border bg-card p-6 text-center">
                <h2 id="etape-estimation" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Estimation indicative — {def.label}
                </h2>
                <p className="mt-3 text-3xl font-semibold sm:text-4xl">
                  {formatCad(estimate.totalMin)} – {formatCad(estimate.totalMax)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Taxes incluses dans ce total · {formatCad(estimate.taxesMin)} – {formatCad(estimate.taxesMax)} de TPS et TVQ
                </p>
                {estimate.likely !== null && (
                  <p className="mt-2 text-sm">
                    Scénario le plus probable : <strong>{formatCad(estimate.likely)}</strong>
                  </p>
                )}
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  Confiance {estimate.confidence} · {estimate.provenance} · référence {estimate.benchmark.version}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="mb-3 text-sm font-medium">Détail</h3>
                <ul className="space-y-2 text-sm">
                  {estimate.lines.map((l) => (
                    <li key={l.id} className="flex items-baseline justify-between gap-3">
                      <span className="text-muted-foreground">
                        {l.label}
                        <span className="ml-2 text-[11px] uppercase tracking-wide">{l.provenance}</span>
                      </span>
                      <span className="whitespace-nowrap">
                        {formatCad(l.min)} – {formatCad(l.max)}
                      </span>
                    </li>
                  ))}
                  <li className="flex items-baseline justify-between gap-3">
                    <span className="text-muted-foreground">Imprévus</span>
                    <span className="whitespace-nowrap">
                      {formatCad(estimate.contingencyMin)} – {formatCad(estimate.contingencyMax)}
                    </span>
                  </li>
                </ul>
                <Separator className="my-4" />
                <div className="flex items-baseline justify-between text-sm font-medium">
                  <span>Sous-total avant taxes</span>
                  <span>
                    {formatCad(estimate.subtotalMin)} – {formatCad(estimate.subtotalMax)}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="mb-2 text-sm font-medium">Hypothèses</h3>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                    {estimate.assumptions.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="mb-2 text-sm font-medium">Non inclus</h3>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                    {estimate.exclusions.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                </div>
              </div>

              <p className="flex items-start gap-2 rounded-xl bg-muted p-4 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Cette fourchette est indicative : elle repose sur des références de
                marché inférées (version {estimate.benchmark.version}, en vigueur le{" "}
                {estimate.benchmark.effectiveDate}). Certaines lignes peuvent afficher
                une provenance vérifiée; l'estimation globale demeure inférée. Seule
                une visite permet d'obtenir un prix ferme.
              </p>


              {!saveOpen ? (
                <div className="space-y-3">
                  <Button
                    className="h-auto min-h-[3.5rem] w-full whitespace-normal px-4 py-3 text-center text-base leading-snug"
                    onClick={startSave}
                  >
                    Sauvegarder et trouver mon entrepreneur compatible
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 w-full"
                    asChild
                    onClick={() =>
                      void logFunnelEvent({
                        event_type: "estimator_clara_clicked" as never,
                        step: "estimator",
                        metadata: { category },
                      })
                    }
                  >
                    <Link to="/alex">Affiner avec Clara</Link>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    UNPRO identifie un seul entrepreneur compatible. Votre demande n'est jamais
                    envoyée à plusieurs entrepreneurs.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="mb-1 text-base font-medium">Sauvegarder votre estimation</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Un code par message texte confirme qu'il s'agit bien de vous. Aucun paiement.
                  </p>

                  <div className="mb-4 grid gap-3">
                    <div>
                      <Label htmlFor="prenom">Prénom</Label>
                      <Input
                        id="prenom"
                        className="mt-1 h-12"
                        value={firstName}
                        required
                        aria-required="true"
                        autoComplete="given-name"
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div>
                      <AddressVerifiedInput
                        value={address}
                        onChange={setAddress}
                        label="Adresse du projet (obligatoire)"
                        showUnitField={false}
                      />
                      {!isVerified(address) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Sélectionnez votre adresse dans la liste proposée pour qu'elle soit
                          confirmée.
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="courriel">Courriel (facultatif)</Label>
                      <Input
                        id="courriel"
                        type="email"
                        inputMode="email"
                        className="mt-1 h-12"
                        value={email}
                        autoComplete="email"
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <label className="flex items-start gap-3 text-xs text-muted-foreground">
                      <Checkbox
                        checked={consent}
                        onCheckedChange={(v) => setConsent(v === true)}
                        aria-label="Consentement aux conseils et offres"
                      />
                      <span>
                        J'accepte de recevoir des conseils et offres d'UNPRO. Facultatif : les
                        messages nécessaires au suivi de mon projet sont envoyés séparément.
                      </span>
                    </label>
                  </div>

                  {!canSave && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      Votre prénom et une adresse confirmée sont nécessaires pour enregistrer le
                      projet.
                    </p>
                  )}

                  {authed ? (
                    <Button
                      className="h-12 w-full"
                      onClick={() => void persist()}
                      disabled={saving || !canSave}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                          Enregistrement…
                        </>
                      ) : (
                        "Sauvegarder mon projet"
                      )}
                    </Button>
                  ) : (
                    <div aria-disabled={!canSave} className={canSave ? "" : "pointer-events-none opacity-50"}>
                      <PhoneOtpForm onSuccess={onOtpSuccess} loading={saving} />
                    </div>
                  )}

                  {saveError && (
                    <p role="alert" className="mt-3 text-sm text-destructive">
                      {saveError}
                    </p>
                  )}
                </div>
              )}

              <Button variant="ghost" className="h-12 w-full" onClick={() => { setDir(-1); setStep(2); goTop(); }}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                Modifier mes détails
              </Button>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
}
