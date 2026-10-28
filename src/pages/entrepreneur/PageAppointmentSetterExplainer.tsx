/**
 * UNPRO — Animated appointment-setter explainer.
 *
 * Marketing demonstration ONLY. No calendar, routing, database, SMS,
 * email, payment, or booking API calls are made from this page.
 * Use the existing logo; Clara remains UNPRO's single AI assistant.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight, Bell, CalendarCheck2, CalendarDays, Check, CheckCheck,
  ChevronLeft, ChevronRight, Clock3, Home, MapPin, Navigation,
  Pause, Play, RotateCcw, Route, ShieldCheck, Smartphone, Sparkles,
} from "lucide-react";
import UnproLogo from "@/components/brand/UnproLogo";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { campaignLink } from "@/lib/contractorCampaignLinks";

const numberOfSteps = 6;
const SLOT_LABELS = [
  { fr: "Mardi · 10 h 30", en: "Tuesday · 10:30 AM", tagFr: "Plus tôt", tagEn: "Earliest" },
  { fr: "Mercredi · 13 h 00", en: "Wednesday · 1:00 PM", tagFr: "Itinéraire optimisé*", tagEn: "Travel-aware*" },
  { fr: "Jeudi · 9 h 15", en: "Thursday · 9:15 AM", tagFr: "Autre choix", tagEn: "Another option" },
] as const;

const copy = {
  fr: {
    title: "Un rendez-vous. Le bon moment. Le bon trajet.",
    subtitle: "Clara vous aide à remplir votre agenda sans les appels interminables. Découvrez comment UNPRO pourrait proposer un rendez-vous qui tient compte de vos disponibilités et de vos déplacements.",
    eyebrow: "Le rendez-vous intelligent, expliqué en 30 secondes",
    demo: "Démonstration illustrative — aucun véritable rendez-vous créé",
    steps: [
      ["L'agenda", "Clara vérifie les périodes libres, les événements occupés et les horaires acceptés."],
      ["Le déplacement", "UNPRO vérifie le trajet, le temps nécessaire et les marges avant et après la visite."],
      ["Trois choix", "Le propriétaire voit jusqu'à trois plages compatibles. Aucune heure inventée."],
      ["Le choix", "Il sélectionne son créneau. La disponibilité doit être revérifiée à la confirmation."],
      ["L'événement", "Le rendez-vous est enregistré dans UNPRO, puis envoyé au calendrier connecté de l'entrepreneur."],
      ["L'alerte", "Une notification est préparée pour le téléphone de l'entrepreneur, selon son canal configuré."],
    ],
    calendar: "Agenda de l'entrepreneur",
    busy: "Occupé",
    free: "Libre",
    tues: "MAR", wed: "MER", thurs: "JEU",
    travel: "Trajet et marges",
    base: "Entreprise",
    house: "Chez le propriétaire",
    km: "Distance*",
    eta: "Trajet*",
    margin: "Marge*",
    simulated: "* Chiffres fictifs à titre illustratif. Un vrai trajet exige des données de routage vérifiées.",
    select: "Le propriétaire choisit",
    simulate: "Simuler ce choix",
    confirmed: "Choix du propriétaire",
    selectionNote: "Exemple seulement : aucune disponibilité réelle n'a été réservée.",
    contractor: "Agenda connecté",
    appointment: "Visite chez le propriétaire",
    appointmentInfo: "Créneau choisi · exemple de 60 minutes",
    calendarHint: "L'ajout réel nécessite un calendrier connecté et une confirmation serveur.",
    phone: "Téléphone de l'entrepreneur",
    phoneTitle: "UNPRO · Nouveau rendez-vous",
    phoneBody: "Une visite a été planifiée. Consultez votre agenda pour les détails.",
    phoneTime: "À l'instant · simulation",
    phoneHint: "La réception sur le téléphone nécessite des notifications push ou SMS transactionnels configurés et vérifiés.",
    prev: "Précédent", next: "Étape suivante", replay: "Revoir", play: "Lire", pause: "Pause",
    sectionTitle: "De la demande au rendez-vous, sans double réservation.",
    sectionBody: "UNPRO doit revérifier le créneau au moment du choix. Si un horaire vient d'être pris, Clara propose d'autres disponibilités plutôt que de confirmer une réservation impossible.",
    checkpoint1: "Calendrier et plages vérifiés",
    checkpoint2: "Temps de déplacement et marge",
    checkpoint3: "Un seul rendez-vous exclusif",
    checkpoint4: "Confirmation et avis distincts",
    ctaTitle: "Et si vos clients pouvaient réserver sans vous déranger?",
    ctaText: "Définissez les services et territoires que vous acceptez. Clara peut ensuite guider les propriétaires vers la bonne prochaine étape.",
    cta: "Analyser mon entreprise",
    homeCta: "Découvrir UNPRO",
    ctaFoot: "Analyse initiale sans paiement. L'activation de base à 350 $ + taxes comprend le profil et 12 mois de présence UNPRO; les rendez-vous ne sont pas inclus sans offre distincte confirmée.",
    status: "Étape",
    incomplete: "Illustration d'une fonctionnalité cible, pas une réservation active.",
  },
  en: {
    title: "One appointment. The right time. The right route.",
    subtitle: "Clara helps simplify scheduling without endless calls. See how UNPRO could suggest an appointment that respects calendar availability and travel.",
    eyebrow: "Smart appointment setting, explained in 30 seconds",
    demo: "Illustrative demo — no real appointment is created",
    steps: [
      ["The calendar", "Clara checks open periods, busy events, and accepted working hours."],
      ["The travel", "UNPRO checks the route, journey time, and buffers around the visit."],
      ["Three options", "The homeowner sees up to three compatible slots. No made-up times."],
      ["The choice", "They select a slot. Availability must be checked again when confirming."],
      ["The event", "The appointment is saved in UNPRO, then sent to the contractor's connected calendar."],
      ["The alert", "A phone notification is prepared according to the contractor's configured channel."],
    ],
    calendar: "Contractor calendar",
    busy: "Busy", free: "Free",
    tues: "TUE", wed: "WED", thurs: "THU",
    travel: "Route and buffers",
    base: "Business",
    house: "Homeowner's home",
    km: "Distance*",
    eta: "Travel time*",
    margin: "Buffer*",
    simulated: "* Illustrative numbers, not a measured route. Real travel requires verified routing data.",
    select: "The homeowner chooses",
    simulate: "Simulate selection",
    confirmed: "Homeowner's choice",
    selectionNote: "Example only. No actual availability has been reserved.",
    contractor: "Connected calendar",
    appointment: "Homeowner visit",
    appointmentInfo: "Selected slot · example 60-minute visit",
    calendarHint: "Real insertion requires a connected calendar and server-confirmed booking.",
    phone: "Contractor phone",
    phoneTitle: "UNPRO · New appointment",
    phoneBody: "A visit has been scheduled. Open your calendar for the details.",
    phoneTime: "Just now · simulation",
    phoneHint: "Phone delivery requires configured, verified push or transactional SMS.",
    prev: "Previous", next: "Next step", replay: "Replay", play: "Play", pause: "Pause",
    sectionTitle: "From request to appointment, without double bookings.",
    sectionBody: "UNPRO must recheck the chosen time when confirming. If a slot has just been taken, Clara offers alternatives instead of confirming the impossible.",
    checkpoint1: "Real calendar availability",
    checkpoint2: "Travel time and buffers",
    checkpoint3: "One exclusive appointment",
    checkpoint4: "Booking and alert tracked separately",
    ctaTitle: "What if clients could book without interrupting your day?",
    ctaText: "Define your services and preferred areas. Clara can then guide homeowners toward the right next step.",
    cta: "Analyze my business",
    homeCta: "Discover UNPRO",
    ctaFoot: "Start your analysis without payment. The base CAD 350 activation plus applicable taxes includes a profile and 12 months of UNPRO presence; appointments require a separately confirmed offer.",
    status: "Step",
    incomplete: "Illustration of the intended workflow, not a live reservation.",
  },
} as const;

const stages = [CalendarDays, Route, Clock3, Check, CalendarCheck2, Bell];

function softPanel() {
  return "rounded-[1.6rem] border border-white/10 bg-white/[0.045] shadow-[0_24px_85px_rgba(0,0,0,0.24)] backdrop-blur-xl";
}

export default function PageAppointmentSetterExplainer() {
  const { lang } = useLanguage();
  const t = copy[lang];
  const fr = lang === "fr";
  const { search } = useLocation();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!playing || reduce) return;
    const interval = window.setInterval(() => {
      setStep((previous) => previous === numberOfSteps - 1 ? 0 : previous + 1);
    }, 3600);
    return () => window.clearInterval(interval);
  }, [playing, reduce]);

  const goTo = (index: number) => {
    setPlaying(false);
    setStep(Math.max(0, Math.min(numberOfSteps - 1, index)));
  };
  const choose = (index: number) => {
    setSelected(index);
    setPlaying(false);
    setStep(3);
  };
  const currentChoice = SLOT_LABELS[selected];
  const currentTime = fr ? currentChoice.fr : currentChoice.en;
  const Icon = stages[step];

  return (
    <>
      <Helmet>
        <title>{fr ? "Rendez-vous intelligents avec Clara — UNPRO" : "Smart appointment setting with Clara — UNPRO"}</title>
        <meta name="description" content={fr
          ? "Découvrez l'expérience de prise de rendez-vous UNPRO : agenda, trajet, marge, trois créneaux, confirmation et notification. Démonstration illustrative."
          : "Explore the UNPRO appointment-setting experience: calendar, travel time, buffers, three choices, confirmation and phone notification. Illustrative demo."} />
        <link rel="canonical" href="https://unpro.ca/entrepreneurs/rendez-vous-intelligents" />
      </Helmet>

      <main className="relative min-h-screen overflow-hidden bg-[#050b18] text-white selection:bg-cyan-400/30">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-48 left-1/3 h-[38rem] w-[38rem] rounded-full bg-[#1a65db]/20 blur-[120px]" />
          <div className="absolute top-[28rem] -right-60 h-[30rem] w-[30rem] rounded-full bg-cyan-400/10 blur-[105px]" />
          <div className="absolute bottom-0 left-0 h-[28rem] w-[28rem] rounded-full bg-blue-500/10 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-7 lg:px-10">
          <header className="flex items-center justify-between gap-3">
            <Link to="/entrepreneurs" aria-label="UNPRO — accueil des professionnels" className="inline-flex items-center">
              <UnproLogo size={105} variant="primary" animated={false} />
            </Link>
            <Link to={campaignLink("/entrepreneurs/audit-ia", search)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-4 text-xs font-semibold text-white/90 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
              {t.cta} <ArrowRight className="h-4 w-4" />
            </Link>
          </header>

          <div className="mx-auto mt-12 max-w-4xl text-center sm:mt-16">
            <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="mx-auto inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/[0.09] px-4 py-2 text-xs font-bold tracking-wide text-cyan-200">
              <Sparkles className="h-4 w-4" aria-hidden /> {t.eyebrow}
            </motion.div>
            <motion.h1 initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.55 }}
              className="mt-6 font-display text-[clamp(2.25rem,6vw,4.7rem)] font-extrabold leading-[1.07] tracking-tight">
              {fr ? <>Un rendez-vous. <span className="text-[#51c9ff]">Le bon moment.</span> Le bon trajet.</>
                : <>One appointment. <span className="text-[#51c9ff]">The right time.</span> The right route.</>}
            </motion.h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-lg">{t.subtitle}</p>
          </div>

          <section aria-label={t.demo} className="mx-auto mt-10 max-w-6xl sm:mt-14">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-slate-300">
                <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
                {t.demo}
              </span>
              <span className="text-xs text-slate-400">{t.status} {step + 1} / {numberOfSteps}</span>
            </div>

            <div className={softPanel() + " p-4 sm:p-7"}>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.3fr)] lg:gap-10">
                <div className="lg:pt-7">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-300">
                      <Icon className="h-6 w-6" aria-hidden />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-300">{t.status} {step + 1}</span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div key={lang + "-" + step} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, y: -10 }} transition={{ duration: 0.27 }} aria-live="polite">
                      <h2 className="mt-7 text-2xl font-bold tracking-tight sm:text-3xl">{t.steps[step][0]}</h2>
                      <p className="mt-3 max-w-md text-sm leading-7 text-slate-300 sm:text-base">{t.steps[step][1]}</p>
                    </motion.div>
                  </AnimatePresence>

                  <div className="mt-7 hidden gap-2 lg:flex" aria-label={fr ? "Étapes de la démonstration" : "Demonstration stages"}>
                    {stages.map((StageIcon, index) => (
                      <button key={index} type="button" onClick={() => goTo(index)} aria-label={t.steps[index][0]} aria-current={step === index ? "step" : undefined}
                        className={"grid h-10 w-10 place-items-center rounded-xl border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 " +
                        (step === index ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-200" : "border-white/10 bg-white/[0.04] text-slate-500 hover:text-white")}>
                        <StageIcon className="h-4 w-4" aria-hidden />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative flex min-h-[350px] items-center justify-center overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#09172d] p-4 sm:min-h-[390px] sm:p-6">
                  <div className="pointer-events-none absolute inset-0 opacity-50" aria-hidden="true"
                    style={{ backgroundImage: "linear-gradient(rgba(125,183,238,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(125,183,238,0.06) 1px,transparent 1px)", backgroundSize: "26px 26px" }} />
                  <AnimatePresence mode="wait">
                    <motion.div key={step} className="relative z-10 w-full max-w-[430px]" initial={reduce ? false : { opacity: 0, scale: 0.97, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, scale: 0.97, y: -9 }}
                      transition={{ duration: 0.32 }}>
                      {step === 0 && (
                        <div className="rounded-2xl border border-white/15 bg-[#0e213f] p-4 shadow-2xl sm:p-6">
                          <div className="mb-5 flex items-center justify-between">
                            <strong className="flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4 text-cyan-300" />{t.calendar}</strong>
                            <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-300">{fr ? "Simulation" : "Demo"}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {[t.tues, t.wed, t.thurs].map((day) => <span key={day} className="pb-2 text-[10px] font-bold tracking-widest text-slate-400">{day}</span>)}
                            {Array.from({ length: 9 }, (_, i) => {
                              const busy = [0, 2, 4, 6, 7].includes(i);
                              return <motion.div key={i} initial={reduce ? false : { opacity: 0.3 }} animate={{ opacity: 1 }}
                                transition={{ delay: reduce ? 0 : i * 0.08 }}
                                className={"flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-xs " +
                                (busy ? "border-rose-400/20 bg-rose-400/10 text-rose-200" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200")}>
                                <span className="text-[11px] font-semibold">{i < 3 ? "9:00" : i < 6 ? "11:00" : "14:00"}</span>
                                <span className="text-[10px]">{busy ? t.busy : t.free}</span>
                              </motion.div>;
                            })}
                          </div>
                        </div>
                      )}

                      {step === 1 && (
                        <div className="space-y-6 rounded-2xl border border-white/15 bg-[#0e213f] p-5">
                          <div className="flex items-center justify-between text-xs font-bold text-white/90">
                            <span className="flex items-center gap-2"><Home className="h-5 w-5 text-cyan-300" />{t.base}</span>
                            <span className="flex items-center gap-2"><MapPin className="h-5 w-5 text-amber-300" />{t.house}</span>
                          </div>
                          <svg className="h-20 w-full" viewBox="0 0 350 80" role="img" aria-label={t.travel}>
                            <path d="M15 45 C75 45,85 12,145 19 S235 73,330 36" fill="none" stroke="rgba(186,209,233,.18)" strokeWidth="3" strokeLinecap="round" />
                            <motion.path d="M15 45 C75 45,85 12,145 19 S235 73,330 36" fill="none" stroke="#45C4FC" strokeWidth="3" strokeLinecap="round"
                              initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.8, ease: "easeInOut" }} />
                            <circle cx="15" cy="45" r="6" fill="#4DD0FF" />
                            <circle cx="330" cy="36" r="6" fill="#F9C26B" />
                          </svg>
                          <div className="grid grid-cols-3 gap-2">
                            {[[t.km, "18 km"], [t.eta, "28 min"], [t.margin, "+15 min"]].map(([key, value]) => (
                              <div key={key} className="rounded-xl border border-white/10 bg-white/[0.05] p-3 text-center">
                                <p className="text-[10px] text-slate-400">{key}</p>
                                <p className="mt-2 font-bold text-cyan-100 sm:text-lg">{value}</p>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] leading-4 text-slate-400">{t.simulated}</p>
                        </div>
                      )}

                      {step === 2 && (
                        <div className="space-y-3">
                          <p className="pb-1 text-xs font-medium text-slate-400">{t.select}</p>
                          {SLOT_LABELS.map((slot, index) => (
                            <button type="button" key={slot.fr} onClick={() => choose(index)}
                              className={"group flex min-h-[68px] w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 " +
                              (selected === index ? "border-cyan-300/60 bg-cyan-400/10" : "border-white/15 bg-white/[0.05] hover:border-cyan-300/40 hover:bg-white/10")}>
                              <span className="flex items-center gap-3">
                                <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Clock3 className="h-4 w-4" /></span>
                                <span className="min-w-0">
                                  <span className="block text-sm font-bold">{fr ? slot.fr : slot.en}</span>
                                  <span className="mt-0.5 block text-xs text-slate-400">{fr ? slot.tagFr : slot.tagEn}</span>
                                </span>
                              </span>
                              <ArrowRight className="h-4 w-4 shrink-0 text-cyan-300 transition-transform group-hover:translate-x-1" aria-hidden />
                            </button>
                          ))}
                          <p className="text-[10px] text-slate-400">{t.simulated}</p>
                        </div>
                      )}

                      {step === 3 && (
                        <div className="mx-auto max-w-sm text-center">
                          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-300">
                            <motion.div animate={reduce ? undefined : { scale: [0.9, 1.1, 1] }} transition={{ duration: 1.1 }}><CheckCheck className="h-10 w-10" /></motion.div>
                          </div>
                          <h3 className="mt-6 text-sm font-medium text-slate-300">{t.confirmed}</h3>
                          <p className="mt-2 text-2xl font-bold text-white">{currentTime}</p>
                          <p className="mt-4 text-xs text-slate-400">{t.selectionNote}</p>
                          <button type="button" onClick={() => goTo(4)}
                            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 text-sm font-bold text-[#07182b] hover:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                            {t.simulate} <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      {step === 4 && (
                        <div className="rounded-2xl border border-white/15 bg-[#102443] p-4 shadow-2xl sm:p-6">
                          <div className="mb-5 flex items-center justify-between gap-2">
                            <strong className="flex items-center gap-2 text-sm"><CalendarCheck2 className="h-5 w-5 text-cyan-300" />{t.contractor}</strong>
                            <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-[10px] text-amber-200">{fr ? "Illustration" : "Illustration"}</span>
                          </div>
                          <div className="space-y-2">
                            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-xs text-slate-400">08:30 – 09:30 · {fr ? "Période occupée" : "Busy period"}</div>
                            <motion.div initial={reduce ? false : { scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }}
                              transition={{ duration: 0.7, delay: 0.25 }} style={{ transformOrigin: "top" }}
                              className="rounded-xl border border-cyan-300/40 bg-gradient-to-r from-cyan-500/25 to-blue-500/15 p-4">
                              <p className="flex items-center gap-2 text-sm font-bold text-cyan-100"><Check className="h-4 w-4" />{t.appointment}</p>
                              <p className="mt-2 text-xs text-slate-200">{currentTime}</p>
                              <p className="mt-1 text-[11px] text-slate-400">{t.appointmentInfo}</p>
                            </motion.div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-xs text-slate-400">15:00 – 16:00 · {fr ? "Autre activité" : "Another activity"}</div>
                          </div>
                          <p className="mt-4 text-[10px] leading-4 text-slate-400">{t.calendarHint}</p>
                        </div>
                      )}

                      {step === 5 && (
                        <div className="mx-auto w-[252px] rounded-[2.6rem] border-[6px] border-[#294866] bg-[#030916] px-3 pb-5 pt-3 shadow-[0_28px_50px_rgba(0,0,0,.6)] sm:w-[270px]">
                          <div className="mx-auto mb-8 h-4 w-20 rounded-full bg-[#17263f]" />
                          <p className="mb-4 px-2 text-xs font-medium text-slate-300">{t.phone}</p>
                          <motion.div initial={reduce ? false : { opacity: 0, y: -22 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, type: "spring" }}
                            className="rounded-2xl border border-cyan-300/30 bg-[#19304e] p-3 shadow-xl">
                            <span className="flex items-center gap-2 text-[11px] font-bold text-cyan-200"><Bell className="h-4 w-4" />{t.phoneTitle}</span>
                            <p className="mt-2 text-xs leading-relaxed text-slate-100">{t.phoneBody}</p>
                            <p className="mt-3 text-[10px] text-slate-400">{t.phoneTime}</p>
                          </motion.div>
                          <div className="mx-auto mt-12 h-1 w-20 rounded-full bg-slate-500/60" />
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                <div className="flex items-center gap-1.5">
                  <button type="button" aria-label={t.prev} disabled={step === 0} onClick={() => goTo(step - 1)}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 text-slate-300 disabled:opacity-30 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button type="button" aria-label={t.next} disabled={step === numberOfSteps - 1} onClick={() => goTo(step + 1)}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 text-slate-300 disabled:opacity-30 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => { setPlaying(false); setStep(0); setSelected(0); }}
                    className="ml-2 grid h-11 w-11 place-items-center rounded-xl text-slate-300 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                    aria-label={t.replay}><RotateCcw className="h-4 w-4" /></button>
                </div>
                <button type="button" onClick={() => setPlaying(v => !v)} disabled={Boolean(reduce)}
                  aria-pressed={playing} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-xs font-bold text-white hover:bg-white/15 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {playing ? t.pause : t.play}
                </button>
              </div>
              <div className="mt-4 flex gap-1.5" aria-hidden="true">
                {Array.from({ length: numberOfSteps }, (_, i) => (
                  <div key={i} className={"h-1 flex-1 rounded-full transition-colors " + (i <= step ? "bg-cyan-400" : "bg-white/10")} />
                ))}
              </div>
            </div>
          </section>

          <section className="mx-auto mt-16 max-w-5xl text-center">
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-4xl">{t.sectionTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{t.sectionBody}</p>
            <div className="mt-9 grid gap-3 text-left sm:grid-cols-2">
              {[
                [CalendarDays, t.checkpoint1], [Navigation, t.checkpoint2],
                [ShieldCheck, t.checkpoint3], [Smartphone, t.checkpoint4],
              ].map(([Symbol, label]) => {
                const SymbolIcon = Symbol as typeof CalendarDays;
                return <div key={label as string} className="flex min-h-[78px] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <SymbolIcon className="h-6 w-6 shrink-0 text-cyan-300" aria-hidden />
                  <p className="text-sm font-semibold">{label as string}</p>
                </div>;
              })}
            </div>
            <p className="mx-auto mt-4 max-w-xl text-xs leading-6 text-slate-400">{t.phoneHint}</p>
          </section>

          <section className="mx-auto mt-16 max-w-4xl rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-transparent px-5 py-10 text-center sm:px-12 sm:py-12">
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-4xl">{t.ctaTitle}</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-200">{t.ctaText}</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={campaignLink("/entrepreneurs/audit-ia", search)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 font-bold text-[#07182b] transition-colors hover:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                {t.cta} <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/entrepreneurs" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-6 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                {t.homeCta}
              </Link>
            </div>
            <p className="mx-auto mt-6 max-w-2xl text-xs leading-relaxed text-slate-300">{t.ctaFoot}</p>
          </section>

          <footer className="mt-12 text-center text-[11px] text-slate-500">
            <p>{t.demo}. {t.incomplete}</p>
          </footer>
        </div>
      </main>
    </>
  );
}
