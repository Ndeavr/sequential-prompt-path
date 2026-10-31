/**
 * UNPRO — Page publique « Vous gérez plusieurs unités? ».
 * Parcours : besoin → immeuble → unité → métier → Clara (qualification/matching/agenda existants).
 * Aucune donnée fictive présentée comme réelle; aucun RDV confirmé ici.
 * Immeubles réels : uniquement via useSyndicates (adhésion + RLS du compte connecté).
 */
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, CalendarDays, ChevronDown, Hammer, Search, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useSyndicates } from "@/hooks/useSyndicate";
import { buildManagerClaraLink, MANAGER_NEEDS } from "@/lib/managerIntake";

const CANONICAL = "https://unpro.ca/gestionnaires-immobiliers";
const TITLE = "Vous gérez plusieurs unités? Trouvez le bon pro par logement — UNPRO";
const DESC = "Gestionnaires d'immeubles, propriétaires de plex et syndicats : une toilette au 123, un peintre au 204? Clara qualifie le besoin et cherche un professionnel admissible, logement par logement.";

const DEMO_STEPS = [
  { title: "L'intervention", value: "Remplacer une toilette", icon: Wrench },
  { title: "L'immeuble", value: "Immeuble d'exemple — 24 logements", icon: Building2 },
  { title: "L'unité", value: "Logement 123", icon: Search },
  { title: "Le bon pro, puis l'agenda", value: "Plombier — licence vérifiée avant recommandation", icon: CalendarDays },
];

const FAQ = [
  { q: "Quand choisir un homme à tout faire ou un spécialiste?", a: "Pour de petits travaux sans risque (poignée, ajustement, retouches), un homme à tout faire peut suffire. Dès qu'il y a plomberie, électricité, gaz ou structure, Clara oriente vers un professionnel détenant la licence ou la certification requise au Québec. Aucune recommandation n'est faite sans cette vérification." },
  { q: "Puis-je faire une demande pour un logement précis?", a: "Oui. Chaque demande est rattachée à un immeuble et à une unité (par exemple le logement 123), afin que l'intervenant, l'accès et le suivi soient clairs." },
  { q: "Je gère plusieurs immeubles. Est-ce adapté?", a: "Oui. Une fois connecté, vous choisissez parmi les immeubles de votre compte uniquement. Le forfait de plusieurs immeubles est calculé selon le nombre total de portes gérées." },
  { q: "Comment se passe la prise de rendez-vous?", a: "Clara qualifie le besoin, l'urgence, les photos et vos disponibilités, puis cherche un professionnel admissible. Un rendez-vous n'est confirmé qu'après confirmation réelle; si aucun professionnel ne correspond, vous en êtes informé honnêtement." },
  { q: "Combien coûte l'offre gestionnaire?", a: "Le prix annuel dépend du nombre de portes. Les paliers sont présentés sur la page des forfaits gestionnaires, avant taxes." },
];

function BuildingsIllustration({ step }: { step: number }) {
  return (
    <svg viewBox="0 0 320 220" role="img" aria-label="Illustration : immeubles, logement 123 en surbrillance, boîte à outils et calendrier" className="gi-svg h-auto w-full">
      <defs>
        <radialGradient id="gi-halo" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.28" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="gi-halo" cx="160" cy="105" r="110" fill="url(#gi-halo)" />
      <g fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round">
        <rect x="40" y="70" width="80" height="120" rx="4" />
        <rect x="130" y="40" width="100" height="150" rx="4" />
        {[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => (
          <rect key={`b${r}${c}`} x={142 + c * 30} y={54 + r * 30} width="18" height="18" rx="2"
            className={r === 2 && c === 1 ? "gi-unit" : undefined}
            fill={r === 2 && c === 1 && step >= 2 ? "hsl(var(--primary))" : "none"} />
        )))}
        {[0, 1, 2].map((r) => [0, 1].map((c) => (
          <rect key={`a${r}${c}`} x={54 + c * 32} y={84 + r * 32} width="18" height="18" rx="2" />
        )))}
        <rect x="244" y="150" width="56" height="36" rx="4" />
        <path d="M262 150v-8h20v8M244 164h56" />
        <rect x="248" y="70" width="48" height="50" rx="4" />
        <path d="M248 84h48M260 64v12M284 64v12" />
        <path d="M18 196h290" opacity="0.6" />
      </g>
      {step >= 2 && <text x="181" y="134" textAnchor="middle" fontSize="11" fontWeight="700" fill="hsl(var(--primary))">123</text>}
      {step >= 3 && <path d="M262 98l6 6 12-12" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" className="gi-check" />}
    </svg>
  );
}

export default function PageGestionnairesImmobiliers() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const authed = Boolean(session);
  const syndicates = useSyndicates();
  const [step, setStep] = useState(0);
  const [need, setNeed] = useState<string>(MANAGER_NEEDS[0]);
  const [buildingId, setBuildingId] = useState("");
  const [unit, setUnit] = useState("");

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setStep((s) => (s + 1) % DEMO_STEPS.length), 3200);
    return () => window.clearInterval(t);
  }, []);

  const buildings = (syndicates.data ?? []) as Array<{ id: string; name?: string | null }>;
  const buildingName = buildings.find((b) => b.id === buildingId)?.name ?? null;
  const claraLink = useMemo(() => buildManagerClaraLink({ need, buildingName, unit }), [need, buildingName, unit]);

  const start = () => {
    if (!authed) {
      navigate(`/login?redirect=${encodeURIComponent("/gestionnaires-immobiliers#demande")}`);
      return;
    }
    navigate(claraLink);
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": CANONICAL, url: CANONICAL, name: TITLE, description: DESC, inLanguage: "fr-CA" },
      { "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="Vous gérez plusieurs unités? — UNPRO" />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <style>{`
        .gi-halo{animation:giPulse 4s ease-in-out infinite;transform-origin:160px 105px}
        .gi-unit{transition:fill .42s cubic-bezier(.22,1,.36,1)}
        .gi-check{stroke-dasharray:30;stroke-dashoffset:30;animation:giDraw .6s forwards}
        @keyframes giPulse{0%,100%{opacity:.7}50%{opacity:1}}
        @keyframes giDraw{to{stroke-dashoffset:0}}
        @media (prefers-reduced-motion:reduce){.gi-halo,.gi-check{animation:none;stroke-dashoffset:0}}
      `}</style>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-8 sm:px-6 md:grid-cols-2 md:items-center md:pt-14">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Gestionnaires · plex · syndicats</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Vous gérez plusieurs unités?</h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Une toilette à remplacer au logement 123? Un peintre pour le 204? Un plombier pour un dégât d'eau? Clara vous aide à trouver le bon professionnel et à organiser l'intervention, sans multiplier les appels.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="min-h-12 gap-2"><a href="#demande">Trouver un professionnel <ArrowRight className="h-4 w-4" aria-hidden="true" /></a></Button>
            <Button asChild size="lg" variant="outline" className="min-h-12"><Link to="/tarifs/gestionnaires?type=portfolio">Voir les forfaits gestionnaires</Link></Button>
          </div>
        </div>
        <div className="rounded-3xl border border-primary/20 bg-card p-4"><BuildingsIllustration step={step} /></div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-labelledby="gi-demo">
        <h2 id="gi-demo" className="text-2xl font-bold sm:text-3xl">Un immeuble. Une unité. Le bon pro. Un rendez-vous.</h2>
        <p className="mt-2 text-sm text-muted-foreground">Exemple de parcours — immeuble et numéro fictifs, pour la démonstration seulement.</p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DEMO_STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            return (
              <li key={s.title}>
                <button type="button" onClick={() => setStep(i)} aria-current={active ? "step" : undefined}
                  className={`flex h-full w-full flex-col gap-2 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
                  <span className="flex items-center gap-2 text-xs font-semibold text-primary"><Icon className="h-4 w-4" aria-hidden="true" />Étape {i + 1}</span>
                  <span className="font-semibold">{s.title}</span>
                  <span className="text-sm text-muted-foreground">{s.value}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">L'étape agenda montre vos disponibilités à transmettre; aucun créneau ni professionnel n'est affiché tant qu'une vraie disponibilité n'est pas confirmée.</p>
        <p className="mt-2 text-sm text-muted-foreground">Autres exemples : serrure, peinture, robinet, chauffage, nettoyage, urgence.</p>
      </section>

      <section id="demande" className="mx-auto max-w-3xl scroll-mt-6 px-4 py-10 sm:px-6" aria-labelledby="gi-form">
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
          <h2 id="gi-form" className="flex items-center gap-2 text-xl font-bold"><Hammer className="h-5 w-5 text-primary" aria-hidden="true" />Votre demande</h2>
          <p className="mt-1 text-sm text-muted-foreground">Clara poursuit ensuite avec l'urgence, les photos et vos plages horaires, puis cherche un professionnel admissible.</p>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold">Intervention</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {MANAGER_NEEDS.map((n) => (
                <button key={n} type="button" onClick={() => setNeed(n)} aria-pressed={need === n}
                  className={`min-h-11 rounded-full border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${need === n ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>{n}</button>
              ))}
            </div>
          </fieldset>

          {authed && (
            <div className="mt-5">
              <label htmlFor="gi-building" className="text-sm font-semibold">Immeuble</label>
              {syndicates.isLoading ? (
                <p className="mt-2 text-sm text-muted-foreground">Chargement de vos immeubles…</p>
              ) : syndicates.isError ? (
                <p className="mt-2 text-sm text-destructive">Impossible de charger vos immeubles. Vous pouvez continuer et préciser l'immeuble à Clara.</p>
              ) : buildings.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Aucun immeuble enregistré dans votre compte. <Link to="/condos/onboarding" className="text-primary underline">Ajouter un immeuble</Link> ou précisez-le à Clara.</p>
              ) : (
                <select id="gi-building" value={buildingId} onChange={(e) => setBuildingId(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                  <option value="">Choisir un immeuble</option>
                  {buildings.map((b) => <option key={b.id} value={b.id}>{b.name || "Immeuble sans nom"}</option>)}
                </select>
              )}
            </div>
          )}

          <div className="mt-5">
            <label htmlFor="gi-unit" className="text-sm font-semibold">Unité (déclarée)</label>
            <Input id="gi-unit" value={unit} maxLength={20} onChange={(e) => setUnit(e.target.value)} placeholder="ex. 123" className="mt-2 min-h-11" />
          </div>

          <Button type="button" size="lg" onClick={start} className="mt-6 min-h-12 w-full gap-2">
            {authed ? "Continuer avec Clara" : "Se connecter pour continuer"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />Plomberie, électricité et gaz : licence RBQ ou certification requise vérifiée avant toute recommandation. Si aucun professionnel ne correspond, Clara vous le dit.</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6" aria-labelledby="gi-faq">
        <h2 id="gi-faq" className="text-2xl font-bold">Questions fréquentes</h2>
        <div className="mt-4 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-border bg-card p-4">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-semibold leading-snug [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">{f.q}</span>
                <ChevronDown className="mt-0.5 size-5 shrink-0 text-primary transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Choisissez un forfait selon le nombre total de portes de votre parc immobilier.
        </p>
        <Button asChild variant="outline" className="mt-3 !h-auto min-h-12 w-full whitespace-normal px-3 py-3 text-center leading-snug">
          <Link to="/tarifs/gestionnaires?type=portfolio" className="flex min-w-0 items-center justify-center gap-2">
            <span className="min-w-0 break-words">Voir les forfaits gestionnaires</span>
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
        </Button>
      </section>
    </main>
  );
}
