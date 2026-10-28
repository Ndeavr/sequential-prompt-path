/**
 * The Intelligent Booker — animated product explainer, not a booking engine.
 *
 * No synthetic availability or provider calls. Real appointments continue
 * through the existing Clara and booking flows, with all existing safeguards.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, BrainCircuit, CalendarCheck2, CalendarClock,
  CheckCircle2, ChevronLeft, ChevronRight, CircleDot, House, MapPin,
  MessageCircle, Pause, Play, ShieldCheck, Sparkles, Users, WandSparkles,
} from "lucide-react";
import UnproLogo from "@/components/brand/UnproLogo";

type Copy = { fr: string; en: string };
type Stage = {
  id: string;
  label: Copy;
  title: Copy;
  description: Copy;
  output: Copy;
  Icon: typeof BrainCircuit;
};
const FLOW: readonly Stage[] = [
  {
    id: "understand",
    label: { fr: "1 · Comprendre", en: "1 · Understand" },
    title: { fr: "Clara comprend le projet.", en: "Clara understands the project." },
    description: {
      fr: "Le propriétaire explique son besoin. Clara précise le type de travaux, les contraintes et le secteur, une question à la fois.",
      en: "The homeowner describes the need. Clara clarifies the work, constraints and location, one question at a time.",
    },
    output: { fr: "Projet : isolation de l'entretoit · Laval", en: "Project: attic insulation · Laval" },
    Icon: MessageCircle,
  },
  {
    id: "context",
    label: { fr: "2 · Contextualiser", en: "2 · Add context" },
    title: { fr: "Chaque détail devient utile.", en: "Every detail has a purpose." },
    description: {
      fr: "Photos, urgence, budget approximatif et historique de la maison peuvent enrichir l'analyse, lorsque le propriétaire les fournit.",
      en: "Photos, urgency, approximate budget and property history can enrich the analysis when the homeowner provides them.",
    },
    output: { fr: "Données fournies : besoins et préférences", en: "Provided details: needs and preferences" },
    Icon: House,
  },
  {
    id: "match",
    label: { fr: "3 · Jumeler", en: "3 · Match" },
    title: { fr: "La compatibilité avant la proximité.", en: "Compatibility comes before proximity." },
    description: {
      fr: "Services réellement offerts, secteurs exclus, langue, disponibilité et licence requise : UNPRO vérifie les critères avant de proposer un professionnel admissible.",
      en: "Actual services, excluded areas, language, availability and required licensing: UNPRO checks the criteria before suggesting an eligible professional.",
    },
    output: { fr: "Admissibilité et disponibilité : à confirmer", en: "Eligibility and availability: pending confirmation" },
    Icon: ShieldCheck,
  },
  {
    id: "book",
    label: { fr: "4 · Réserver", en: "4 · Book" },
    title: { fr: "Un rendez-vous. Pas un lead partagé.", en: "One appointment. Not a shared lead." },
    description: {
      fr: "Clara guide la sélection d'un créneau réellement disponible. Un rendez-vous exclusif n'est confirmé qu'après validation des critères et des deux parties.",
      en: "Clara guides selection of a genuinely available time. An exclusive appointment is confirmed only after the criteria and both sides are validated.",
    },
    output: { fr: "Rendez-vous réel : aucune réservation effectuée dans cette démo", en: "Real appointment: none booked in this demo" },
    Icon: CalendarCheck2,
  },
] as const;

const POSITIONS = [
  "left-[5%] top-[12%]",
  "right-[5%] top-[12%]",
  "left-[5%] bottom-[12%]",
  "right-[5%] bottom-[12%]",
];
const BENEFITS = [
  {
    Icon: House,
    title: { fr: "Pour les propriétaires", en: "For homeowners" },
    body: { fr: "Un besoin mieux compris, des questions pertinentes et des professionnels évalués selon le projet.", en: "Better-understood needs, relevant questions and professionals assessed for project fit." },
  },
  {
    Icon: Users,
    title: { fr: "Pour les professionnels", en: "For professionals" },
    body: { fr: "Des critères sur mesure : services acceptés, territoires, exclusions, disponibilité et type de clientèle.", en: "Personalized criteria: accepted services, areas, exclusions, availability and client fit." },
  },
  {
    Icon: CalendarClock,
    title: { fr: "Pour les rendez-vous", en: "For appointments" },
    body: { fr: "Une coordination fondée sur de vraies disponibilités et un rendez-vous exclusif lorsqu'il est confirmé.", en: "Coordination based on real availability and an exclusive appointment when confirmed." },
  },
] as const;

export default function PageIntelligentBooker() {
  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const reducedMotion = useReducedMotion();
  const stage = FLOW[active];
  const chooseStep = (index: number) => {
    setActive((index + FLOW.length) % FLOW.length);
    setPlaying(false);
  };
  const t = (text: Copy) => text[language];

  useEffect(() => {
    if (reducedMotion) setPlaying(false);
  }, [reducedMotion]);
  useEffect(() => {
    if (!playing || reducedMotion) return;
    const interval = window.setInterval(() => setActive(current => (current + 1) % FLOW.length), 4600);
    return () => window.clearInterval(interval);
  }, [playing, reducedMotion]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#070D18] text-slate-100">
      <Helmet>
        <html lang={language === "fr" ? "fr-CA" : "en-CA"} />
        <title>The Intelligent Booker | Clara et UNPRO</title>
        <meta name="description" content="Découvrez comment Clara d'UNPRO comprend les projets, jumelle les professionnels compatibles et facilite la réservation de rendez-vous exclusifs." />
        <link rel="canonical" href="https://unpro.ca/intelligent-booker" />
      </Helmet>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-[700px] bg-[radial-gradient(ellipse_at_70%_25%,rgba(28,157,226,0.22),transparent_48%),radial-gradient(ellipse_at_10%_4%,rgba(6,193,189,0.10),transparent_40%)]" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Link to="/" aria-label="UNPRO — accueil" className="inline-flex min-h-12 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          <UnproLogo size={136} tone="dark" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setLanguage(current => current === "fr" ? "en" : "fr")}
            aria-label={language === "fr" ? "View in English" : "Afficher en français"}
            className="min-h-11 rounded-full border border-white/15 bg-white/5 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-cyan-300/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            {language === "fr" ? "EN" : "FR"}
          </button>
          <Link to="/conversation" className="hidden min-h-11 items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:inline-flex">
            {language === "fr" ? "Parler à Clara" : "Talk to Clara"} <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-9 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:pb-28 lg:pt-14">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/[0.07] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.20em] text-cyan-200">
            <Sparkles size={15} aria-hidden="true" /> UNPRO Intelligence
          </div>
          <h1 className="mt-7 text-[clamp(3rem,6.8vw,6rem)] font-bold leading-[0.98] tracking-[-0.065em]">
            The <span className="bg-gradient-to-r from-cyan-200 via-cyan-400 to-blue-500 bg-clip-text text-transparent">Intelligent</span> Booker<span className="text-cyan-400">.</span>
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-slate-300 sm:text-xl">
            {language === "fr"
              ? "Clara ne cherche pas simplement un nom dans une liste. Elle comprend le projet, tient compte des personnes et aide à organiser le bon rendez-vous."
              : "Clara doesn't simply pick a name from a directory. She understands the project, considers compatibility and helps coordinate the right appointment."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/conversation" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 to-sky-500 px-6 py-3 font-bold text-[#061320] shadow-[0_14px_44px_rgba(32,166,231,.25)] transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              {language === "fr" ? "Discuter de mon projet" : "Discuss my project"} <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/entrepreneurs/audit-ia" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-3 font-medium text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
              {language === "fr" ? "Je suis professionnel" : "I'm a professional"}
            </Link>
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-400">
            <span className="inline-flex items-center gap-2"><CircleDot className="text-cyan-400" size={15} aria-hidden="true" /> {language === "fr" ? "Compatibilité humaine" : "Human compatibility"}</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="text-cyan-400" size={15} aria-hidden="true" /> {language === "fr" ? "Confiance vérifiable" : "Verifiable trust"}</span>
            <span className="inline-flex items-center gap-2"><CalendarCheck2 className="text-cyan-400" size={15} aria-hidden="true" /> {language === "fr" ? "RDV exclusifs confirmés" : "Confirmed exclusive appointments"}</span>
          </div>
        </div>

        <div className="relative min-w-0">
          <div className="pointer-events-none absolute -inset-6 rounded-[3rem] bg-cyan-500/10 blur-[70px]" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-[30px] border border-cyan-200/20 bg-[#0B1526]/95 shadow-[0_35px_100px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.8)]" />
                {language === "fr" ? "Parcours intelligent" : "Intelligent journey"}
              </div>
              <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{language === "fr" ? "Simulation" : "Demo only"}</span>
            </div>

            <div className="relative h-[370px] overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(13,93,144,0.28),transparent_56%)] sm:h-[420px]">
              <div className="absolute inset-0 opacity-35" style={{ backgroundImage: "linear-gradient(rgba(125,211,252,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(125,211,252,.07) 1px,transparent 1px)", backgroundSize: "28px 28px" }} aria-hidden="true" />
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 500 420" preserveAspectRatio="none" aria-hidden="true">
                <circle cx="250" cy="210" r="118" fill="none" stroke="#1d799e" strokeOpacity="0.3" strokeDasharray="5 9" />
                <circle cx="250" cy="210" r="76" fill="none" stroke="#3cbed2" strokeOpacity="0.24" />
                {[[120,96],[380,96],[120,324],[380,324]].map(([x,y],i) => (
                  <g key={i}>
                    <path d={"M250 210 L" + x + " " + y} stroke={active === i ? "#67e8f9" : "#2c6b86"} strokeWidth={active === i ? 2.2 : 1} strokeOpacity={active === i ? 0.9 : 0.27} strokeDasharray={active === i ? "7 7" : "4 9"} />
                    {active === i && !reducedMotion && (
                      <motion.circle r="5" fill="#a5f3fc" initial={{ cx:250, cy:210, opacity:0 }} animate={{ cx:x, cy:y, opacity:[0,1,1,0] }} transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut" }} />
                    )}
                  </g>
                ))}
              </svg>

              <motion.div className="absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/40 bg-[#0A1B31] shadow-[0_0_75px_rgba(34,211,238,0.28)] sm:h-36 sm:w-36" animate={reducedMotion ? undefined : { boxShadow:["0 0 30px rgba(34,211,238,.16)","0 0 78px rgba(34,211,238,.4)","0 0 30px rgba(34,211,238,.16)"] }} transition={{ duration: 4, repeat: Infinity }}>
                <div className="absolute inset-3 rounded-full border border-dashed border-cyan-300/35" />
                <div className="z-10 flex flex-col items-center gap-1 text-cyan-100">
                  <BrainCircuit size={34} strokeWidth={1.5} aria-hidden="true" />
                  <span className="text-xl font-bold tracking-tight">Clara</span>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-cyan-300">UNPRO AI</span>
                </div>
              </motion.div>

              {FLOW.map((item,i) => {
                const Icon = item.Icon;
                return (
                  <button key={item.id} type="button" aria-label={t(item.label)} aria-pressed={active === i} onClick={() => chooseStep(i)}
                    className={"absolute z-10 flex w-[40%] min-h-[70px] items-center gap-2 rounded-2xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 sm:min-h-[86px] sm:px-4 " + POSITIONS[i] + (active === i ? " border-cyan-300/65 bg-cyan-400/[0.13] shadow-[0_0_28px_rgba(34,211,238,.12)]" : " border-white/15 bg-[#101F34]/90 hover:border-cyan-200/40")}>
                    <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl " + (active === i ? " bg-cyan-300 text-[#071525]" : " bg-white/10 text-cyan-200")}><Icon size={20} aria-hidden="true" /></span>
                    <span className="min-w-0 text-[11px] font-semibold leading-tight text-white sm:text-sm">{t(item.label)}</span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-white/10 bg-[#0C192C] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.19em] text-cyan-300">{language === "fr" ? "Étape" : "Stage"} {active + 1} / 4</span>
                <div className="flex items-center gap-2" aria-label={language === "fr" ? "Contrôles de la démonstration" : "Demo controls"}>
                  <button type="button" onClick={() => chooseStep(active - 1)} aria-label={language === "fr" ? "Étape précédente" : "Previous stage"} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><ChevronLeft size={18}/></button>
                  <button type="button" disabled={Boolean(reducedMotion)} onClick={() => setPlaying(current => !current)} aria-label={playing ? (language === "fr" ? "Mettre en pause" : "Pause demo") : (language === "fr" ? "Lancer l'animation" : "Play demo")} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-40">
                    {playing ? <Pause size={16} aria-hidden="true"/> : <Play size={16} aria-hidden="true"/>}
                  </button>
                  <button type="button" onClick={() => chooseStep(active + 1)} aria-label={language === "fr" ? "Étape suivante" : "Next stage"} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><ChevronRight size={18}/></button>
                </div>
              </div>
              <div className="relative min-h-[158px] pt-3" aria-live={playing ? "off" : "polite"} aria-atomic="true">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={stage.id} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity:0, y:-5 }} transition={{ duration: .25 }}>
                    <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{t(stage.title)}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{t(stage.description)}</p>
                    <p className="mt-3 flex items-start gap-2 rounded-xl border border-cyan-400/15 bg-cyan-300/[0.07] px-3 py-2 text-xs leading-relaxed text-cyan-100"><CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden="true" />{t(stage.output)}</p>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="flex gap-1.5" aria-label={language === "fr" ? "Progression" : "Progress"}>
                {FLOW.map((item,i) => <button key={item.id} type="button" onClick={() => chooseStep(i)} aria-label={t(item.label)} aria-current={i === active ? "step" : undefined} className={"h-1.5 flex-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white " + (i === active ? "bg-cyan-300" : "bg-white/15 hover:bg-white/30")}/>)}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-slate-400">{language === "fr" ? "Démonstration du processus seulement : aucun entrepreneur, créneau, vérification de licence ou rendez-vous réel n'est affiché ou confirmé." : "Process illustration only: no real contractor, slot, licence verification or booking is displayed or confirmed."}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-y border-white/10 bg-white/[0.025] px-5 py-20 sm:px-8" id="fonctionnement">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">{language === "fr" ? "Une autre façon de réserver" : "A different way to book"}</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-5xl">{language === "fr" ? "L'intelligence avant l'agenda." : "Intelligence before the calendar."}</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300">{language === "fr" ? "UNPRO ne distribue pas la même demande à trois entreprises. Le parcours vise à comprendre les besoins des deux parties avant de faciliter la prise d'un rendez-vous exclusif." : "UNPRO doesn't distribute the same request to three companies. The flow aims to understand both sides before coordinating an exclusive appointment."}</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {BENEFITS.map(({Icon,title,body}) => (
              <div key={title.fr} className="rounded-[26px] border border-white/10 bg-[#0D192B] p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200"><Icon size={25} aria-hidden="true"/></div>
                <h3 className="mt-6 text-xl font-semibold text-white">{t(title)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{t(body)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="relative overflow-hidden rounded-[32px] border border-cyan-300/20 bg-gradient-to-br from-[#0C293B] via-[#0A1D31] to-[#0A1424] px-6 py-11 sm:px-12 sm:py-14">
          <div className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300"><WandSparkles size={17} aria-hidden="true" /> {language === "fr" ? "Votre prochaine bonne décision" : "Your next informed decision"}</div>
            <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">{language === "fr" ? "Commencez par parler à Clara." : "Start with a conversation with Clara."}</h2>
            <p className="mt-4 max-w-2xl text-slate-300">{language === "fr" ? "Expliquez votre projet ou les types de mandats que votre entreprise recherche. Clara vous aidera à avancer, sans inventer de correspondance ni de réservation." : "Describe your project or the assignments your company wants. Clara can help you move forward, without inventing matches or bookings."}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/conversation" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-cyan-300 px-6 py-3 font-bold text-[#071320] transition hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                {language === "fr" ? "Parler à Clara" : "Talk to Clara"} <ArrowRight size={18} aria-hidden="true"/>
              </Link>
              <Link to="/entrepreneurs" className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                {language === "fr" ? "Découvrir UNPRO pour les pros" : "Explore UNPRO for pros"} <MapPin size={16} aria-hidden="true"/>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-7 text-xs text-slate-400 sm:px-8">
        <span>© UNPRO · The Intelligent Booker</span>
        <span>{language === "fr" ? "Un meilleur jumelage commence par une meilleure compréhension." : "Better matching starts with better understanding."}</span>
      </footer>
    </main>
  );
}
