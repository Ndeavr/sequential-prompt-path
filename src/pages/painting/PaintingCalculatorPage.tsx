/**
 * UNPRO — Painting Calculator Page
 * Premium cinematic dark, mobile-first, French-first (fr-CA).
 * Route: /peinture/calculateur and /:city/peinture/calculateur
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Sparkles,
  Lock,
  MapPin,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Star,
  Camera,
  Home as HomeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  computeEstimate,
  PROJECT_TYPE_LABELS,
  WALL_CONDITION_LABELS,
  URGENCY_LABELS,
  PAINT_QUALITY_LABELS,
  type CalculatorInput,
  type CalculatorResult,
  type CityPricing,
  type ProjectType,
  type WallCondition,
  type Urgency,
  type PaintQuality,
} from "@/features/paintingCalculator/engine";
import {
  CATEGORY_LABELS,
  CATEGORY_TAGLINES,
  CATEGORY_ITEMS,
  CATEGORY_METHODS,
  CATEGORY_MATERIALS,
  CATEGORY_CONDITIONS,
  SINGLE_ZONE,
  METHODS,
  MATERIALS,
  CONDITIONS,
  type ProjectCategory,
  type ApplicationMethod,
  type SurfaceMaterial,
  type SurfaceConditionCode,
} from "@/features/paintingCalculator/projectCatalog";
import {
  fetchCityPricing,
  uploadPaintingPhoto,
  analyzePhotoInline,
  findMatchingPainters,
} from "@/features/paintingCalculator/services";
import {
  loadSession,
  saveSession,
  clearSession,
  getGuestSessionId,
} from "@/features/paintingCalculator/session";
import type { PaintingPhoto, PainterMatch } from "@/features/paintingCalculator/types";
import AmbientLayer from "@/pages/painting/AmbientLayer";

const SUPPORTED_CITIES = [
  { slug: "montreal", name: "Montréal" },
  { slug: "laval", name: "Laval" },
  { slug: "terrebonne", name: "Terrebonne" },
  { slug: "longueuil", name: "Longueuil" },
  { slug: "quebec", name: "Québec" },
  { slug: "brossard", name: "Brossard" },
  { slug: "blainville", name: "Blainville" },
];

function fmtMoney(n: number) {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

const DEFAULT_INPUT: CalculatorInput = {
  projectType: "single_room",
  roomCount: 1,
  avgRoomSqft: 140,
  ceilingHeightFt: 8,
  wallCondition: "good",
  paintQuality: "standard",
  coats: 2,
  includesCeilings: false,
  includesTrim: false,
  includesDoors: false,
  darkToLight: false,
  occupiedHome: true,
  urgency: "flexible",
};

export default function PaintingCalculatorPage() {
  const { city: cityParam } = useParams<{ city?: string }>();
  const cityFromUrl = useMemo(
    () => SUPPORTED_CITIES.find((c) => c.slug === cityParam) || null,
    [cityParam],
  );
  const { user, isLoading: authLoading } = useAuth();

  const [input, setInput] = useState<CalculatorInput>(DEFAULT_INPUT);
  const [photos, setPhotos] = useState<PaintingPhoto[]>([]);
  const [city, setCity] = useState<CityPricing | null>(null);
  const [step, setStep] = useState(1); // 1: project, 2: photos, 3: surface, 4: gate, 5: result
  const [addressLine, setAddressLine] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [selectedCitySlug, setSelectedCitySlug] = useState(cityFromUrl?.slug || "montreal");
  const [matches, setMatches] = useState<PainterMatch[]>([]);
  const [saving, setSaving] = useState(false);

  // Hydrate from session
  useEffect(() => {
    const s = loadSession();
    if (s) {
      if (s.input) setInput({ ...DEFAULT_INPUT, ...s.input });
      if (s.photos) setPhotos(s.photos);
      if (s.step) setStep(s.step);
      if (s.address) {
        setAddressLine(s.address.line);
        setPostalCode(s.address.postalCode);
      }
    }
  }, []);

  // Load city pricing
  useEffect(() => {
    fetchCityPricing(selectedCitySlug).then(setCity);
  }, [selectedCitySlug]);

  // Persist session
  useEffect(() => {
    saveSession({
      input,
      photos,
      city,
      result: null,
      step,
      address: addressLine ? { line: addressLine, postalCode, city: selectedCitySlug } : undefined,
    });
  }, [input, photos, city, step, addressLine, postalCode, selectedCitySlug]);

  const result: CalculatorResult | null = useMemo(() => {
    if (!city) return null;
    return computeEstimate(input, city);
  }, [input, city]);

  const teaserUnlocked = !!user && !!addressLine && !!postalCode;

  // Load matches once result + auth ready
  useEffect(() => {
    if (teaserUnlocked && step === 5) {
      findMatchingPainters(selectedCitySlug).then(setMatches);
    }
  }, [teaserUnlocked, step, selectedCitySlug]);

  // --- Handlers
  async function handlePhotoUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const ownerKey = user?.id ?? "guest";
    for (const file of Array.from(files).slice(0, 6)) {
      const placeholder: PaintingPhoto = {
        url: URL.createObjectURL(file),
        analyzing: true,
      };
      setPhotos((p) => [...p, placeholder]);
      const uploaded = await uploadPaintingPhoto(file, ownerKey);
      if (!uploaded) {
        setPhotos((p) =>
          p.map((ph) =>
            ph === placeholder ? { ...ph, analyzing: false, aiNotes: { summary: "Aperçu uniquement" } } : ph,
          ),
        );
        continue;
      }
      // Inline analysis (Gemini Vision)
      const ai = await analyzePhotoInline(uploaded.publicUrl);
      setPhotos((p) =>
        p.map((ph) =>
          ph === placeholder
            ? {
                url: uploaded.publicUrl,
                storagePath: uploaded.storagePath,
                analyzing: false,
                aiNotes: (ai as any) ?? undefined,
              }
            : ph,
        ),
      );
      // Auto-apply detected condition for first photo
      if (ai && (ai as any).detectedCondition && photos.length === 0) {
        const cond = (ai as any).detectedCondition as WallCondition;
        if (["excellent", "good", "fair", "poor"].includes(cond)) {
          setInput((i) => ({ ...i, wallCondition: cond }));
        }
      }
    }
  }

  async function handleGoogleSignIn() {
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.href,
    });
    if (res.error) {
      toast.error("Connexion impossible pour le moment.");
    }
  }

  async function handleSaveAndContinue() {
    if (!user || !city || !result) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("painting_estimates")
        .insert({
          user_id: user.id,
          project_type: input.projectType,
          room_count: input.roomCount,
          surface_sqft: result.surfaceSqft,
          ceiling_height_ft: input.ceilingHeightFt,
          wall_condition: input.wallCondition,
          paint_quality: input.paintQuality,
          coats: input.coats,
          includes_ceilings: input.includesCeilings,
          includes_trim: input.includesTrim,
          includes_doors: input.includesDoors,
          urgency: input.urgency,
          occupied_home: input.occupiedHome,
          city_slug: selectedCitySlug,
          address_line: addressLine,
          postal_code: postalCode,
          estimated_paint_cost: result.paintCost,
          estimated_labour_cost: result.labourCost,
          estimated_prep_cost: result.prepCost,
          estimated_total_min: result.totalMin,
          estimated_total_max: result.totalMax,
          confidence_level: result.confidence,
          status: "ready",
        })
        .select("id")
        .single();
      if (error) throw error;
      // Persist photos rows
      if (photos.length) {
        await supabase.from("painting_photos").insert(
          photos
            .filter((p) => p.storagePath)
            .map((p) => ({
              estimate_id: data!.id,
              user_id: user.id,
              image_url: p.url,
              storage_path: p.storagePath,
              ai_notes: p.aiNotes ?? {},
              detected_condition: (p.aiNotes as any)?.detectedCondition ?? null,
              detected_surface_sqft: (p.aiNotes as any)?.estimatedSurfaceSqft ?? null,
            })),
        );
      }
      setStep(5);
    } catch (e) {
      toast.error("Sauvegarde impossible. Réessayez dans un instant.");
    } finally {
      setSaving(false);
    }
  }

  // SEO meta
  const cityName = cityFromUrl?.name ?? "Québec";
  const pageTitle = cityFromUrl
    ? `Calculateur de peinture résidentielle à ${cityName} — UNPRO`
    : "Calculateur de peinture résidentielle — UNPRO";
  const pageDesc = cityFromUrl
    ? `Estimez le coût de vos travaux de peinture à ${cityName} en moins de 60 secondes. Photos IA, surfaces, peinture, main-d'œuvre. Trouvez un peintre UNPRO vérifié.`
    : "Estimez le coût de vos travaux de peinture en moins de 60 secondes, puis trouvez un peintre professionnel vérifié sur UNPRO.";
  const canonical = cityFromUrl
    ? `https://unpro.ca/${cityFromUrl.slug}/peinture/calculateur`
    : "https://unpro.ca/peinture/calculateur";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: `Peinture résidentielle${cityFromUrl ? ` à ${cityName}` : ""}`,
        provider: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
        areaServed: cityFromUrl
          ? { "@type": "City", name: cityName, address: { "@type": "PostalAddress", addressRegion: "QC", addressCountry: "CA" } }
          : { "@type": "AdministrativeArea", name: "Québec" },
        offers: city
          ? {
              "@type": "AggregateOffer",
              priceCurrency: "CAD",
              lowPrice: city.min_rate_sqft,
              highPrice: city.max_rate_sqft,
              priceSpecification: { "@type": "UnitPriceSpecification", unitCode: "FTK", unitText: "par pied carré" },
            }
          : undefined,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `Combien coûte la peinture d'une pièce${cityFromUrl ? ` à ${cityName}` : ""}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: city
                ? `Pour une pièce standard de 12×12 pi à ${cityName}, prévoyez entre ${fmtMoney(city.min_rate_sqft * 400)} et ${fmtMoney(city.max_rate_sqft * 400)} incluant peinture, préparation et main-d'œuvre.`
                : "Pour une pièce standard de 12×12 pi, prévoyez entre 400 $ et 1 200 $ incluant peinture, préparation et main-d'œuvre.",
            },
          },
          {
            "@type": "Question",
            name: "Comment UNPRO calcule l'estimation?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "UNPRO combine la surface (murs, plafonds, boiseries), la quantité de peinture nécessaire, l'état actuel des murs, la couleur cible, le taux horaire local et l'urgence. Les photos sont analysées par IA pour valider la condition et la surface.",
            },
          },
          {
            "@type": "Question",
            name: "Est-ce qu'UNPRO vend ma demande à plusieurs entrepreneurs?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Non. UNPRO ne vend pas votre demande. Nous vous aidons à comprendre le projet, estimer le coût et vous mettre en lien avec le bon peintre vérifié.",
            },
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: "https://unpro.ca/" },
          { "@type": "ListItem", position: 2, name: "Peinture", item: "https://unpro.ca/peinture/calculateur" },
          ...(cityFromUrl
            ? [{ "@type": "ListItem", position: 3, name: cityName, item: canonical }]
            : []),
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white relative overflow-hidden">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <html lang="fr-CA" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>
      <AmbientLayer category={input.category} method={input.method} />

      <main className="relative max-w-3xl mx-auto px-5 pt-12 pb-32">
        {/* Hero */}
        <header className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" /> Estimation IA en 60 secondes
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-[-0.04em] leading-[1.05]">
            {cityFromUrl ? (
              <>
                Calculez vos travaux de peinture
                <br />
                <span className="text-cyan-300">à {cityName}</span>
              </>
            ) : (
              <>
                Calculez vos travaux de peinture
                <br />
                <span className="text-cyan-300">avec l'IA UNPRO</span>
              </>
            )}
          </h1>
          <p className="text-white/70 max-w-xl mx-auto text-base md:text-lg leading-relaxed">
            Photos, surfaces, peinture, main-d'œuvre, préparation. Obtenez une estimation claire et trouvez le bon peintre.
          </p>
        </header>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={`h-1 rounded-full transition-all ${
                step >= n ? "bg-cyan-400 w-10" : "bg-white/10 w-6"
              }`}
            />
          ))}
        </div>

        {/* STEP 1 — Project category (9 surfaces & coatings) */}
        {step === 1 && (
          <StepCard
            title="Quel type de projet souhaitez-vous estimer ?"
            subtitle="Peinture, scellant, teinture ou protection — choisissez votre surface."
          >
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(CATEGORY_LABELS) as ProjectCategory[]).map((c) => {
                const single = SINGLE_ZONE.includes(c);
                const projectType: ProjectType =
                  c === "exterior" ? "exterior"
                  : c === "deck_wood" ? "exterior"
                  : c === "metal_specialty" ? "stairs_railings"
                  : c === "commercial" ? "whole_house"
                  : single ? "exterior"
                  : "single_room";
                const defaultMethod = CATEGORY_METHODS[c][0];
                const defaultMaterial = CATEGORY_MATERIALS[c][0];
                return (
                  <button
                    key={c}
                    onClick={() => {
                      setInput((i) => ({
                        ...i,
                        category: c,
                        projectType,
                        method: defaultMethod,
                        material: defaultMaterial,
                        conditionCodes: i.conditionCodes ?? [],
                        // sensible defaults for single-zone (avgRoomSqft = total zone)
                        ...(single
                          ? { roomCount: 1, avgRoomSqft: 400, includesCeilings: false }
                          : {}),
                      }));
                      setStep(2);
                    }}
                    className={`text-left p-4 rounded-2xl border transition-all ${
                      input.category === c
                        ? "bg-cyan-400/10 border-cyan-400/50"
                        : "bg-white/[0.03] border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="text-sm font-semibold">{CATEGORY_LABELS[c]}</div>
                    <div className="text-[11px] text-white/50 mt-0.5">{CATEGORY_TAGLINES[c]}</div>
                  </button>
                );
              })}
            </div>
          </StepCard>
        )}

        {/* STEP 2 — Photos */}
        {step === 2 && (
          <StepCard
            title="Ajoutez des photos des surfaces"
            subtitle="Notre IA détecte la condition des murs et estime la surface."
          >
            <div className="space-y-4">
              <label className="block border-2 border-dashed border-white/15 rounded-2xl p-8 text-center cursor-pointer hover:border-cyan-400/50 transition-colors bg-white/[0.02]">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                />
                <Camera className="h-8 w-8 mx-auto text-cyan-300 mb-2" />
                <div className="text-sm font-medium">Téléverser des photos</div>
                <div className="text-xs text-white/50 mt-1">Murs, plafonds, surfaces à peindre</div>
              </label>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((p, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white/5">
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                      {p.analyzing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
                        </div>
                      )}
                      {p.aiNotes?.detectedCondition && !p.analyzing && (
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-sm text-[10px] p-1.5 text-cyan-200 text-center">
                          {WALL_CONDITION_LABELS[p.aiNotes.detectedCondition as WallCondition] ?? p.aiNotes.detectedCondition}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10">
                  Retour
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1 bg-cyan-400 text-[#050816] hover:bg-cyan-300">
                  {photos.length ? "Continuer" : "Passer"} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </StepCard>
        )}

        {/* STEP 3 — Surfaces, méthode, matériau, condition */}
        {step === 3 && (
          <StepCard title="Quelques détails" subtitle="Plus c'est précis, plus l'estimation est juste.">
            <div className="space-y-5">
              {input.category && SINGLE_ZONE.includes(input.category) ? (
                <>
                  <Field label="Surface totale à traiter (pi²)">
                    <NumberStepper
                      value={input.avgRoomSqft}
                      onChange={(v) => setInput((i) => ({ ...i, avgRoomSqft: v, roomCount: 1 }))}
                      min={50}
                      max={20000}
                      step={50}
                    />
                  </Field>
                  <Field label="Périmètre / bordures (pi linéaires) — optionnel">
                    <NumberStepper
                      value={input.linearFt ?? 0}
                      onChange={(v) => setInput((i) => ({ ...i, linearFt: v }))}
                      min={0}
                      max={2000}
                      step={5}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Nombre de pièces">
                    <NumberStepper
                      value={input.roomCount}
                      onChange={(v) => setInput((i) => ({ ...i, roomCount: v }))}
                      min={1}
                      max={20}
                    />
                  </Field>
                  <Field label="Surface moyenne par pièce (pi²)">
                    <NumberStepper
                      value={input.avgRoomSqft}
                      onChange={(v) => setInput((i) => ({ ...i, avgRoomSqft: v }))}
                      min={60}
                      max={600}
                      step={10}
                    />
                  </Field>
                  <Field label="Hauteur des plafonds (pi)">
                    <NumberStepper
                      value={input.ceilingHeightFt}
                      onChange={(v) => setInput((i) => ({ ...i, ceilingHeightFt: v }))}
                      min={7}
                      max={14}
                    />
                  </Field>
                </>
              )}

              {input.category && CATEGORY_METHODS[input.category].length > 1 && (
                <Field label="Méthode d'application">
                  <SegmentedGroup
                    options={CATEGORY_METHODS[input.category].map((m) => ({
                      value: m,
                      label: METHODS[m].label,
                    }))}
                    value={input.method ?? CATEGORY_METHODS[input.category][0]}
                    onChange={(v) => setInput((i) => ({ ...i, method: v as ApplicationMethod }))}
                  />
                </Field>
              )}

              {input.category && CATEGORY_MATERIALS[input.category].length > 1 && (
                <Field label="Matériau de surface">
                  <SegmentedGroup
                    options={CATEGORY_MATERIALS[input.category].map((m) => ({
                      value: m,
                      label: MATERIALS[m].label,
                    }))}
                    value={input.material ?? CATEGORY_MATERIALS[input.category][0]}
                    onChange={(v) => setInput((i) => ({ ...i, material: v as SurfaceMaterial }))}
                  />
                </Field>
              )}

              {input.category && (
                <Field label="État de la surface (cochez ce qui s'applique)">
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_CONDITIONS[input.category].map((code) => {
                      const active = (input.conditionCodes ?? []).includes(code);
                      return (
                        <button
                          key={code}
                          onClick={() =>
                            setInput((i) => {
                              const cur = new Set(i.conditionCodes ?? []);
                              if (cur.has(code)) cur.delete(code);
                              else cur.add(code);
                              return { ...i, conditionCodes: Array.from(cur) };
                            })
                          }
                          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                            active
                              ? "bg-cyan-400/15 border-cyan-400/60 text-cyan-100"
                              : "bg-white/5 border-white/10 text-white/70 hover:border-white/30"
                          }`}
                        >
                          {CONDITIONS[code].label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              )}

              {!input.category || !SINGLE_ZONE.includes(input.category) ? (
                <>
                  <Field label="État général">
                    <SegmentedGroup
                      options={Object.entries(WALL_CONDITION_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                      value={input.wallCondition}
                      onChange={(v) => setInput((i) => ({ ...i, wallCondition: v as WallCondition }))}
                    />
                  </Field>

                  <Field label="Qualité de peinture">
                    <SegmentedGroup
                      options={Object.entries(PAINT_QUALITY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                      value={input.paintQuality}
                      onChange={(v) => setInput((i) => ({ ...i, paintQuality: v as PaintQuality }))}
                    />
                  </Field>

                  <div className="grid grid-cols-3 gap-2">
                    <Toggle
                      label="Plafonds"
                      active={input.includesCeilings}
                      onClick={() => setInput((i) => ({ ...i, includesCeilings: !i.includesCeilings }))}
                    />
                    <Toggle
                      label="Moulures"
                      active={input.includesTrim}
                      onClick={() => setInput((i) => ({ ...i, includesTrim: !i.includesTrim }))}
                    />
                    <Toggle
                      label="Portes"
                      active={input.includesDoors}
                      onClick={() => setInput((i) => ({ ...i, includesDoors: !i.includesDoors }))}
                    />
                  </div>
                </>
              ) : null}

              <Field label="Urgence">
                <SegmentedGroup
                  options={Object.entries(URGENCY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                  value={input.urgency}
                  onChange={(v) => setInput((i) => ({ ...i, urgency: v as Urgency }))}
                />
              </Field>


              {/* Live teaser */}
              {result && (
                <div className="mt-2 p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Surface estimée</span>
                    <span className="font-semibold text-cyan-200">{result.surfaceSqft} pi²</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-white/60">Complexité</span>
                    <span className="font-semibold text-cyan-200 capitalize">
                      {result.complexity === "low" ? "Faible" : result.complexity === "medium" ? "Moyenne" : "Élevée"}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-xs text-white/60">
                    <Lock className="h-3.5 w-3.5" />
                    Coût détaillé verrouillé jusqu'à la connexion
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10">
                  Retour
                </Button>
                <Button onClick={() => setStep(4)} className="flex-1 bg-cyan-400 text-[#050816] hover:bg-cyan-300">
                  Voir mon estimation <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </StepCard>
        )}

        {/* STEP 4 — Login + address gate */}
        {step === 4 && (
          <StepCard title="Votre estimation est prête" subtitle="Connectez-vous pour voir le coût détaillé et les peintres disponibles près de chez vous.">
            <div className="space-y-5">
              {!user && !authLoading && (
                <div className="space-y-3">
                  <Button
                    onClick={handleGoogleSignIn}
                    className="w-full bg-white text-[#050816] hover:bg-white/90 h-12 rounded-2xl font-medium"
                  >
                    Continuer avec Google
                  </Button>
                  <Link
                    to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                    className="block text-center text-sm text-white/70 hover:text-white"
                  >
                    Créer un compte gratuit ou se connecter
                  </Link>
                </div>
              )}

              {user && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-green-300">
                    <CheckCircle2 className="h-4 w-4" /> Connecté
                  </div>

                  <Field label="Adresse des travaux">
                    <Input
                      placeholder="123 rue Sainte-Catherine"
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-12 rounded-2xl"
                    />
                  </Field>
                  <Field label="Code postal">
                    <Input
                      placeholder="H2X 1Z4"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-12 rounded-2xl"
                      maxLength={7}
                    />
                  </Field>
                  <Field label="Ville">
                    <select
                      value={selectedCitySlug}
                      onChange={(e) => setSelectedCitySlug(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white h-12 rounded-2xl px-4"
                    >
                      {SUPPORTED_CITIES.map((c) => (
                        <option key={c.slug} value={c.slug} className="bg-[#050816]">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Button
                    disabled={!addressLine || !postalCode || saving}
                    onClick={handleSaveAndContinue}
                    className="w-full bg-cyan-400 text-[#050816] hover:bg-cyan-300 h-12 rounded-2xl font-semibold"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Voir mon estimation complète"}
                  </Button>
                </div>
              )}

              <p className="text-xs text-white/50 text-center pt-2 border-t border-white/10 leading-relaxed">
                UNPRO ne vend pas votre demande à 10 entrepreneurs. Nous vous aidons à comprendre le projet, estimer le coût et trouver le bon professionnel.
              </p>
            </div>
          </StepCard>
        )}

        {/* STEP 5 — Result */}
        {step === 5 && result && city && (
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/20 rounded-3xl">
              <CardContent className="p-6 md:p-8 space-y-5">
                <div className="text-center">
                  <div className="text-xs uppercase tracking-widest text-cyan-300 mb-2">
                    Fourchette totale réaliste
                  </div>
                  <div className="text-4xl md:text-5xl font-semibold tracking-tight">
                    {fmtMoney(result.totalMin)} <span className="text-white/40">—</span> {fmtMoney(result.totalMax)}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                    <Star className="h-3 w-3 text-cyan-300" />
                    Confiance {result.confidence === "high" ? "élevée" : result.confidence === "medium" ? "moyenne" : "faible"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Stat label="Surface estimée" value={`${result.surfaceSqft} pi²`} />
                  <Stat label="Peinture requise" value={`${result.paintGallons} gal.`} />
                  <Stat label="Coût peinture" value={fmtMoney(result.paintCost)} />
                  <Stat label="Coût main-d'œuvre" value={fmtMoney(result.labourCost)} />
                  <Stat label="Préparation" value={fmtMoney(result.prepCost)} />
                  <Stat label="Durée estimée" value={`${result.durationDays} jour${result.durationDays > 1 ? "s" : ""}`} />
                </div>
              </CardContent>
            </Card>

            {/* Matches */}
            <Card className="bg-white/[0.03] border-white/10 rounded-3xl">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">Peintres UNPRO disponibles à {city.city_name}</h2>
                {matches.length === 0 ? (
                  <div className="text-sm text-white/60 leading-relaxed bg-white/[0.02] border border-white/10 rounded-2xl p-4">
                    Nous n'avons pas encore de peintre partenaire disponible dans votre secteur. Votre demande est conservée et UNPRO peut chercher un professionnel compatible.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {matches.map((m) => (
                      <div key={m.id} className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-cyan-400/40 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{m.name}</div>
                            <div className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> {m.city}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-sm shrink-0">
                            <Star className="h-3.5 w-3.5 fill-cyan-300 text-cyan-300" />
                            <span className="font-medium">{m.rating.toFixed(1)}</span>
                            <span className="text-white/40">({m.reviewCount})</span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-cyan-200">{m.nextAvailability}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 pt-2">
                  <Button className="w-full bg-cyan-400 text-[#050816] hover:bg-cyan-300 h-12 rounded-2xl font-semibold">
                    Trouver un peintre UNPRO
                  </Button>
                  <Button variant="outline" className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 h-12 rounded-2xl">
                    Réserver une estimation
                  </Button>
                  <Link
                    to="/alex"
                    className="text-center text-sm text-cyan-200 hover:text-cyan-100 py-2"
                  >
                    Parler à Alex
                  </Link>
                </div>
              </CardContent>
            </Card>

            <button
              onClick={() => {
                clearSession();
                setInput(DEFAULT_INPUT);
                setPhotos([]);
                setStep(1);
              }}
              className="w-full text-center text-xs text-white/40 hover:text-white/70 py-3"
            >
              Recommencer une nouvelle estimation
            </button>
          </div>
        )}

        {/* City SEO footer */}
        {!cityFromUrl && step === 1 && (
          <div className="mt-12 text-center">
            <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Calculateurs locaux</div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUPPORTED_CITIES.map((c) => (
                <Link
                  key={c.slug}
                  to={`/${c.slug}/peinture/calculateur`}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ---------- subcomponents ----------

function StepCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="bg-white/[0.04] backdrop-blur-2xl border-white/10 rounded-[28px] shadow-2xl">
        <CardContent className="p-6 md:p-8 space-y-5">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="text-white/60 text-sm mt-1.5">{subtitle}</p>}
          </div>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs uppercase tracking-wider text-white/50">{label}</label>
      {children}
    </div>
  );
}

function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="h-11 w-11 rounded-2xl bg-white/5 border border-white/10 text-lg hover:bg-white/10"
      >
        −
      </button>
      <div className="flex-1 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-semibold text-lg">
        {value}
      </div>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="h-11 w-11 rounded-2xl bg-white/5 border border-white/10 text-lg hover:bg-white/10"
      >
        +
      </button>
    </div>
  );
}

function SegmentedGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-white/5 border border-white/10 rounded-2xl">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
            value === o.value ? "bg-cyan-400 text-[#050816]" : "text-white/70 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-2xl border text-sm font-medium transition-colors ${
        active
          ? "bg-cyan-400/10 border-cyan-400/50 text-cyan-200"
          : "bg-white/[0.03] border-white/10 text-white/70 hover:border-white/30"
      }`}
    >
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
      <div className="text-base font-semibold mt-1">{value}</div>
    </div>
  );
}
