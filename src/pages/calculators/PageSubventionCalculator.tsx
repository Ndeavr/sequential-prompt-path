/**
 * UNPRO — pages SEO + calculateur de subventions (public, sans compte, FR-QC).
 * Réutilise MainLayout, ClaraFormAssistant et le moteur pur; aucun nouveau backend.
 */
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate, useParams } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowRight, BookOpen, Calculator, CheckCircle2, Info, MessageCircle, ShieldCheck, X } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import ClaraConversationBox from "@/components/home-light/ClaraConversationBox";
import { buildGrantClaraHandoff, type GrantHandoffPurpose } from "@/lib/grantClaraHandoff";
import "./grantClaraDialog.css";
import {
  GRANT_SEO_PAGES, GRANT_SOURCES, GRANT_WORKS, calculateGrants,
  type BuildingType, type FoundationType, type GrantRegime, type GrantWork, type RoofType,
} from "@/lib/grantCalculator2026";

const CAD = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const INPUT_CLASS = "w-full min-h-12 rounded-xl border border-border bg-background px-3 text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";
const FIELD = "space-y-2";
const SOURCES = [
  { href: GRANT_SOURCES.renoclimat, label: "Rénoclimat — nouvelles modalités du Québec (octobre 2026)" },
  { href: GRANT_SOURCES.guide, label: "Guide officiel du participant Rénoclimat 2026 (PDF)" },
  { href: GRANT_SOURCES.logisvert, label: "Hydro-Québec — programme résidentiel LogisVert" },
];

const LABELS: Record<FoundationType, string> = {
  "murs-sous-sol": "Murs du sous-sol, y compris solives de rive",
  "dalle-sous-sol": "Dalle du sous-sol",
  "murs-vide-sanitaire": "Murs du vide sanitaire",
  "plancher-vide-sanitaire": "Plancher au-dessus du vide sanitaire",
  "plancher-expose": "Plancher exposé",
};

function NumericField({ id, label, value, onChange, hint, max = 50000 }: {
  id: string; label: string; value: number; onChange: (n: number) => void; hint?: string; max?: number;
}) {
  return (
    <div className={FIELD}>
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <input id={id} type="number" inputMode="decimal" min="0" max={max} step="1"
        className={INPUT_CLASS} value={value || ""} placeholder="À préciser"
        onChange={(e) => {
          const n = Number(e.currentTarget.value);
          onChange(Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0);
        }} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function PageSubventionCalculator() {
  const { slug } = useParams<{ slug?: string }>();
  const pageKey = slug && Object.prototype.hasOwnProperty.call(GRANT_SEO_PAGES, slug) ? slug : "calculateur-subventions";
  const page = GRANT_SEO_PAGES[pageKey];
  const canonical = pageKey === "calculateur-subventions"
    ? "https://unpro.ca/calculateur-subventions"
    : `https://unpro.ca/subventions/${pageKey}`;
  const pageWork = GRANT_WORKS.find((entry) => entry.page.endsWith(`/${pageKey}`))?.id;

  const [selected, setSelected] = useState<GrantWork[]>(pageWork ? [pageWork] : []);
  const [building, setBuilding] = useState<BuildingType>("maison");
  const [regime, setRegime] = useState<GrantRegime>("nouveau");
  const [roofType, setRoofType] = useState<RoofType>("grenier");
  const [roofArea, setRoofArea] = useState(0);
  const [roofRAdded, setRoofRAdded] = useState(0);
  const [roofRFinal, setRoofRFinal] = useState(0);
  const [wallsArea, setWallsArea] = useState(0);
  const [wallsRAdded, setWallsRAdded] = useState(0);
  const [foundationType, setFoundationType] = useState<FoundationType>("murs-sous-sol");
  const [foundationArea, setFoundationArea] = useState(0);
  const [foundationRAdded, setFoundationRAdded] = useState(0);
  const [windowCount, setWindowCount] = useState(0);
  const [windowsMostEfficient, setWindowsMostEfficient] = useState(false);
  const [claraOpen, setClaraOpen] = useState(false);
  const [claraHandoff, setClaraHandoff] = useState<{ id: string; text: string } | null>(null);
  useEffect(() => { setSelected(pageWork ? [pageWork] : []); }, [pageWork]);

  const grants = useMemo(() => calculateGrants({
    selected, building, regime, roofType, roofArea, roofRAdded, roofRFinal,
    wallsArea, wallsRAdded, foundationType, foundationArea, foundationRAdded,
    windowCount, windowsMostEfficient,
  }), [selected, building, regime, roofType, roofArea, roofRAdded, roofRFinal,
    wallsArea, wallsRAdded, foundationType, foundationArea, foundationRAdded,
    windowCount, windowsMostEfficient]);

  const jsonLd = useMemo(() => JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: page.h1,
      url: canonical,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      inLanguage: "fr-CA",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
      description: page.description,
      publisher: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map((faq) => ({
        "@type": "Question", name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ]), [page, canonical]);

  const toggleWork = (id: GrantWork) => {
    setSelected((previous) => previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]);
  };

  const openClaraFromCalculator = (purpose: GrantHandoffPurpose) => {
    const text = buildGrantClaraHandoff({
      selected, building, regime, roofType, roofArea, roofRAdded, roofRFinal,
      wallsArea, wallsRAdded, foundationType, foundationArea, foundationRAdded,
      windowCount, windowsMostEfficient,
    }, purpose);
    // Un résumé distinct n'est créé que si la sélection ou l'intention change.
    // Réouvrir la même conversation n'envoie jamais une copie du même contexte.
    setClaraHandoff(previous => previous?.text === text ? previous : ({
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID() : `grant-${Date.now().toString(36)}`,
      text,
    }));
    setClaraOpen(true);
  };

  if (slug && !Object.prototype.hasOwnProperty.call(GRANT_SEO_PAGES, slug)) {
    return <Navigate to="/calculateur-subventions" replace />;
  }

  return (
    <MainLayout hideMemorySection>
      <Helmet>
        <title>{page.title}</title>
        <meta name="description" content={page.description} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_CA" />
        <script type="application/ld+json">{jsonLd}</script>
      </Helmet>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-14 text-foreground">
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:underline">Accueil</Link> / <Link to="/calculateur-subventions" className="hover:underline">Subventions</Link>{pageWork ? ` / ${GRANT_WORKS.find(w => w.id === pageWork)?.label}` : ""}
        </nav>
        <header className="max-w-3xl mb-9 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
            <Calculator size={17} aria-hidden="true" /> Outil gratuit · Mise à jour : novembre 2026
          </div>
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-5xl">{page.h1}</h1>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">{page.intro}</p>
          <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Sans inscription ni coordonnées. Ces montants sont indicatifs et conditionnels. UNPRO ne représente ni le gouvernement du Québec ni Hydro-Québec.
          </p>
        </header>

        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
          <section aria-labelledby="calculateur-aides" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7 space-y-6">
            <h2 id="calculateur-aides" className="text-xl font-bold">1. Quels travaux prévoyez-vous?</h2>
            <div className="space-y-3">
              {GRANT_WORKS.map((work) => (
                <label key={work.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background/60 p-4 hover:border-primary/50">
                  <input type="checkbox" checked={selected.includes(work.id)} onChange={() => toggleWork(work.id)}
                    className="h-5 w-5 shrink-0 accent-primary" />
                  <span className="flex-1"><span className="block font-semibold">{work.label}</span>
                    <span className="text-xs text-muted-foreground">{work.hint}</span></span>
                </label>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">2. Votre habitation et votre dossier</h3>
              <div className={FIELD}>
                <label htmlFor="grant-building" className="text-sm font-medium">Type d'habitation</label>
                <select id="grant-building" value={building} onChange={e => setBuilding(e.target.value as BuildingType)} className={INPUT_CLASS}>
                  <option value="maison">Maison unifamiliale, jumelée ou en rangée</option>
                  <option value="multilogement">Duplex, triplex ou immeuble admissible</option>
                </select>
              </div>
              <div className={FIELD}>
                <label htmlFor="grant-regime" className="text-sm font-medium">Selon la date et l'historique de votre dossier</label>
                <select id="grant-regime" className={INPUT_CLASS} value={regime} onChange={e => setRegime(e.target.value as GrantRegime)}>
                  <option value="nouveau">Nouveau parcours Rénoclimat (travaux depuis le 1er octobre 2026)</option>
                  <option value="ancien">Dossier Rénoclimat commencé avant octobre 2026</option>
                  <option value="incertain">Je ne sais pas / travaux déjà réalisés</option>
                </select>
                <p className="text-xs text-muted-foreground">Un dossier commencé avant octobre 2026 peut relever des règles transitoires, même si les travaux sont récents.</p>
              </div>
            </div>

            {selected.includes("toit") && <fieldset className="space-y-3 border-t border-border pt-5">
              <legend className="font-semibold pt-2">Isolation de la toiture</legend>
              <div className={FIELD}>
                <label htmlFor="grant-roof-type" className="text-sm font-medium">Type de toit</label>
                <select id="grant-roof-type" className={INPUT_CLASS} value={roofType} onChange={e => setRoofType(e.target.value as RoofType)}>
                  <option value="grenier">Grenier / entretoit (minimum R-60)</option>
                  <option value="plat">Toit plat / plafond cathédrale (minimum R-40)</option>
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <NumericField id="grant-roof-area" label="Surface isolée (pi²)" value={roofArea} onChange={setRoofArea} />
                <NumericField id="grant-roof-add" label="Valeur R ajoutée" value={roofRAdded} onChange={setRoofRAdded} max={100}/>
                <NumericField id="grant-roof-final" label="Valeur R finale" value={roofRFinal} onChange={setRoofRFinal} max={150}/>
              </div>
            </fieldset>}

            {selected.includes("fenetres") && <fieldset className="space-y-3 border-t border-border pt-5">
              <legend className="font-semibold pt-2">Fenêtres et portes-patio</legend>
              <NumericField id="grant-windows" label="Nombre d'ouvertures brutes remplacées" value={windowCount} onChange={setWindowCount} max={100}
                hint="Une fenêtre en baie avec trois panneaux dans la même ouverture compte comme une ouverture." />
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={windowsMostEfficient} onChange={e => setWindowsMostEfficient(e.target.checked)}
                  className="mt-1 h-5 w-5 accent-primary" />
                <span>Je prévois des modèles ENERGY STAR « Les plus écoénergétiques » dont le numéro RNCan pourra être vérifié.</span>
              </label>
            </fieldset>}

            {selected.includes("murs") && <fieldset className="space-y-3 border-t border-border pt-5">
              <legend className="font-semibold pt-2">Murs extérieurs</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <NumericField id="grant-wall-area" label="Surface nette à isoler (pi²)" value={wallsArea} onChange={setWallsArea} hint="Exclure les portes et les fenêtres."/>
                <NumericField id="grant-wall-r" label="Valeur R ajoutée" value={wallsRAdded} onChange={setWallsRAdded} max={100}/>
              </div>
            </fieldset>}

            {selected.includes("fondations") && <fieldset className="space-y-3 border-t border-border pt-5">
              <legend className="font-semibold pt-2">Fondations, sous-sol ou vide sanitaire</legend>
              <div className={FIELD}>
                <label htmlFor="grant-foundation-type" className="text-sm font-medium">Travaux</label>
                <select id="grant-foundation-type" className={INPUT_CLASS} value={foundationType} onChange={e => setFoundationType(e.target.value as FoundationType)}>
                  {Object.entries(LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <NumericField id="grant-foundation-area" label="Surface isolée (pi²)" value={foundationArea} onChange={setFoundationArea}/>
                <NumericField id="grant-foundation-r" label="Valeur R ajoutée" value={foundationRAdded} onChange={setFoundationRAdded} max={100}/>
              </div>
            </fieldset>}

            {selected.some((id) => id === "calfeutrage" || id === "thermopompe") && (
              <p className="flex gap-2 text-sm text-muted-foreground border-t border-border pt-5">
                <Info className="h-5 w-5 shrink-0" /> Pour LogisVert, l'admissibilité précise de l'équipement ou de l'ensemble des travaux doit être vérifiée. Nous n'inventons aucun montant de thermopompe.
              </p>
            )}
          </section>

          <aside aria-live="polite" className="space-y-5 lg:sticky lg:top-24">
            <section className="rounded-2xl border border-primary/25 bg-card p-5 shadow-sm sm:p-7 space-y-4">
              <div className="flex items-center gap-2"><CheckCircle2 size={20} className="text-primary"/><h2 className="text-xl font-bold">Votre estimation indicative</h2></div>
              {selected.length === 0 ? (
                <p className="text-muted-foreground">Sélectionnez au moins un type de travaux.</p>
              ) : (
                <ul className="space-y-4">
                  {grants.results.map(result => {
                    const work = GRANT_WORKS.find(item => item.id === result.work);
                    return <li key={result.work} className="border-b border-border pb-3 last:border-b-0">
                      <div className="flex flex-wrap justify-between gap-2 items-baseline">
                        <strong className="text-sm">{work?.label}</strong>
                        <span className="font-bold text-primary">{result.amount === null ? "À vérifier" : CAD.format(result.amount)}</span>
                      </div>
                      {result.ceiling !== null && result.amount === null && <p className="text-xs text-muted-foreground">Plafond possible : {CAD.format(result.ceiling)} (sous conditions)</p>}
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{result.note}</p>
                    </li>;
                  })}
                </ul>
              )}
              {grants.renoclimatSubtotal !== null && <div className="border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">Sous-total Rénoclimat des mesures calculables, non garanti</span>
                <p className="text-3xl font-bold">{CAD.format(grants.renoclimatSubtotal)}</p>
              </div>}
              {grants.logisvertRoofCaulking !== null && <div className="rounded-xl bg-muted/50 p-3">
                <strong className="text-sm">LogisVert : jusqu'à {CAD.format(grants.logisvertRoofCaulking)}</strong>
                <p className="text-xs text-muted-foreground mt-1">Isolation du toit + calfeutrage pour maison admissible. Programme distinct; cumul non ajouté au total.</p>
              </div>}
              <p className="text-xs leading-relaxed text-muted-foreground">
                Estimation non contractuelle. Dépenses, preuves, licences RBQ, dates, modalités et fonds disponibles : validation requise avant tout engagement.
              </p>
              <button type="button" onClick={() => openClaraFromCalculator("project")}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                data-testid="grant-clara-start">
                <MessageCircle size={18} aria-hidden="true" /> Discuter de mon projet avec Clara
              </button>
              <button type="button" onClick={() => openClaraFromCalculator("cost")}
                className="flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
                data-testid="grant-clara-cost">
                Estimer aussi le coût de mes travaux avec Clara <ArrowRight size={16} aria-hidden="true"/>
              </button>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h3 className="flex gap-2 items-center font-semibold"><ShieldCheck size={18}/> Sources gouvernementales</h3>
              {SOURCES.map(source => <a key={source.href} href={source.href} target="_blank" rel="noopener noreferrer"
                className="flex gap-2 text-sm text-primary hover:underline">
                <BookOpen className="h-4 w-4 shrink-0 mt-0.5"/> {source.label}
              </a>)}
            </section>
          </aside>
        </div>

        <DialogPrimitive.Root open={claraOpen} onOpenChange={setClaraOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-[190] bg-black/70" />
            <DialogPrimitive.Content
              className="grant-clara-dialog home-light fixed inset-0 z-[200] flex h-[100dvh] w-screen flex-col overflow-hidden bg-background text-foreground shadow-2xl md:left-1/2 md:top-1/2 md:h-[min(85dvh,720px)] md:w-[min(94vw,650px)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:border-border"
              aria-describedby="grant-clara-description"
              data-testid="grant-clara-dialog">
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
                <div>
                  <DialogPrimitive.Title className="font-semibold">Clara · Votre projet de rénovation</DialogPrimitive.Title>
                  <DialogPrimitive.Description id="grant-clara-description" className="text-xs text-muted-foreground">
                    Vos réponses au calculateur accompagnent la conversation.
                  </DialogPrimitive.Description>
                </div>
                <DialogPrimitive.Close type="button"
                  aria-label="Fermer la conversation"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  <X size={22} aria-hidden="true" />
                </DialogPrimitive.Close>
              </header>
              <div className="grant-clara-chat min-h-0 flex-1">
                {claraHandoff && <ClaraConversationBox key="grant-clara-canonical" surface="embedded" grantHandoff={claraHandoff}/>}
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        <article className="mt-14 space-y-8 border-t border-border pt-10">
          <h2 className="text-2xl font-bold">Comprendre les aides avant de faire les travaux</h2>
          <p className="leading-relaxed text-muted-foreground">
            Le nouveau programme Rénoclimat s'applique depuis le 1er octobre 2026 et prévoit des critères par mesure.
            Une évaluation énergétique avant travaux n'est plus obligatoire dans ce nouveau parcours, mais demeure recommandée.
            Le programme LogisVert d'Hydro-Québec a ses propres conditions. Les dossiers antérieurs et les rénovations déjà réalisées
            doivent être analysés selon leur régime; les anciens montants ne doivent pas être confondus avec les nouveaux.
          </p>
          <h2 className="text-2xl font-bold">Questions fréquentes</h2>
          <div className="space-y-5">
            {page.faq.map(faq => <section key={faq.question} className="rounded-xl border border-border p-5">
              <h3 className="font-semibold mb-2">{faq.question}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
            </section>)}
          </div>
          <h2 className="text-xl font-bold">Tous les calculateurs et guides de subventions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {GRANT_WORKS.map(item => <Link key={item.id} to={item.page} className="rounded-xl border border-border p-4 hover:border-primary/50">
              <span className="font-semibold">{item.label}</span><span className="mt-1 flex items-center gap-2 text-xs text-primary">Consulter le guide <ArrowRight size={14}/></span>
            </Link>)}
          </div>
        </article>
      </main>
    </MainLayout>
  );
}
