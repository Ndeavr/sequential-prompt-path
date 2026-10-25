/**
 * HomeLightSections — visual conversion surfaces over the existing verified routes.
 * Example visuals must never be mistaken for real homeowner scores or verified reviews.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  ClipboardList,
  Home,
  MessageSquare,
  Search,
  Wrench,
  Sparkles,
  CalendarCheck2,
  ShieldCheck,
  HeartHandshake,
  CircleHelp,
} from "lucide-react";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useAlexStore } from "@/features/alex/state/alexStore";
import kitchenPhoto from "@/assets/scenes/scene-3-kitchen.jpg";
import bathPhoto from "@/assets/hero-plomberie.jpg";
import icePhoto from "@/assets/ice-dam-roof.jpg";
import exteriorPhoto from "@/assets/hero-agrandissement.jpg";

function useStartAlex(surface: string) {
  const { openAlex } = useAlexVoice();
  return () => {
    useAlexStore.getState().markUserEngaged();
    openAlex(surface, "user_clicked_cta");
  };
}

function SectionWrap({ children, tone = "base" }: {
  children: React.ReactNode;
  tone?: "base" | "tinted";
}) {
  return (
    <section className={tone === "tinted" ? "unpro-home-tinted" : "bg-transparent"}>
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">{children}</div>
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{children}</p>;
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-3 text-[clamp(1.6rem,4vw,2.4rem)] font-semibold leading-tight tracking-[-0.02em] text-foreground">
      {children}
    </h2>
  );
}

/** Four real project entrances. The existing public project-intake route owns qualification. */
const PROJECTS = [
  { fr: "Cuisine", en: "Kitchen", image: kitchenPhoto, key: "cuisine" },
  { fr: "Salle de bain", en: "Bathroom", image: bathPhoto, key: "salle-de-bain" },
  { fr: "Barrages de glace", en: "Ice dams", image: icePhoto, key: "barrages-de-glace" },
  { fr: "Rénovation extérieure", en: "Exterior renovation", image: exteriorPhoto, key: "renovation-exterieure" },
] as const;

export function SectionProjectTiles() {
  const { lang } = useLanguage();
  return (
    <section className="unpro-home-projects">
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {PROJECTS.map((p) => (
            <Link
              key={p.key}
              to="/decrire-mon-projet"
              state={{ suggestedCategory: p.key }}
              aria-label={lang === "en" ? "Plan a " + p.en + " project" : "Parler de mon projet : " + p.fr}
              className="unpro-home-project-tile group overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
            >
              <div className="aspect-[1.48] overflow-hidden">
                <img src={p.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
              </div>
              <div className="flex min-h-12 items-center justify-between gap-2 px-3 py-3 sm:px-4">
                <span className="text-xs font-semibold sm:text-sm">{lang === "en" ? p.en : p.fr}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Public calculator, no made-up homeowner score. */
export function SectionHomeScore() {
  const { lang } = useLanguage();
  const en = lang === "en";
  return (
    <section className="unpro-home-score">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="unpro-home-score-panel grid items-center gap-8 rounded-[28px] border p-6 shadow-sm md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:px-10 md:py-9">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><Sparkles className="h-5 w-5" aria-hidden /> {en ? "Your home, understood" : "Votre propriété, mieux comprise"}</span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">{en ? "Discover your home AI score" : "Découvrez votre score IA"}</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              {en ? "Explore the condition of your property and find useful next steps. Your actual results require your property information." : "Explorez les éléments de votre propriété et les améliorations possibles. Votre véritable score nécessite vos informations."}
            </p>
            <Link to="/score-maison" className="unpro-home-primary-cta mt-5 inline-flex min-h-12 items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white">
              {en ? "Discover my score" : "Découvrir mon score IA"} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="unpro-home-score-illustration mx-auto flex w-full max-w-sm items-center justify-center gap-5 rounded-2xl border p-5" aria-label={en ? "Illustrative evaluation categories, no actual score" : "Catégories d’évaluation illustratives, aucun score réel"}>
            <div className="unpro-home-score-ring flex h-28 w-28 shrink-0 items-center justify-center rounded-full">
              <div className="unpro-home-score-ring-inside flex h-20 w-20 items-center justify-center rounded-full text-4xl font-bold text-primary"><CircleHelp className="h-10 w-10" /></div>
            </div>
            <div className="space-y-2 text-sm text-foreground">
              <p>{en ? "Insulation" : "Isolation"}</p>
              <p>{en ? "Ventilation" : "Ventilation"}</p>
              <p>{en ? "Roof" : "Toiture"}</p>
              <p className="text-xs text-muted-foreground">{en ? "Illustration only" : "Exemple illustratif"}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Two conversion journeys. Contractor button only opens the real funnel. */
export function SectionTwoPaths() {
  const { lang } = useLanguage();
  const en = lang === "en";
  return (
    <SectionWrap>
      <div className="grid gap-5 md:grid-cols-2">
        <article className="unpro-home-path-card relative overflow-hidden rounded-[28px] border p-7 md:p-8">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Home className="h-7 w-7" aria-hidden /></div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{en ? "I'm a homeowner" : "Je suis propriétaire"}</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            {en ? "Share your project and get guidance tailored to your needs and location." : "Expliquez votre projet à Clara. UNPRO tient compte de vos besoins, de votre budget et de votre secteur."}
          </p>
          <a href="#clara-conversation" className="unpro-home-primary-cta mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white">
            {en ? "Start my project" : "Commencer mon projet"} <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><BadgeCheck className="h-4 w-4 text-primary" aria-hidden />{en ? "Free. No obligation." : "Gratuit. Sans obligation."}</p>
        </article>
        <article className="unpro-home-path-card relative overflow-hidden rounded-[28px] border p-7 md:p-8">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Wrench className="h-7 w-7" aria-hidden /></div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{en ? "I'm a contractor" : "Je suis entrepreneur"}</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            {en ? "Present your business and the types of projects that suit your services, territory and goals." : "Présentez votre entreprise et les types de projets qui correspondent à vos services, à votre territoire et à vos objectifs."}
          </p>
          <Link to="/entrepreneur" className="unpro-home-primary-cta mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white">
            {en ? "Activate my profile — $350" : "Activer mon profil — 350 $"} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {en ? "Base activation + applicable taxes; 12 months of AI presence. See terms before paying." : "Activation de base + taxes applicables; 12 mois de présence IA. Conditions présentées avant paiement."}
          </p>
        </article>
      </div>
    </SectionWrap>
  );
}

/* ── 2. Comment ça fonctionne — 4 étapes propriétaire ────────── */
const STEPS = [
  {
    icon: MessageSquare,
    title: "Décrivez votre situation",
    body: "Clara comprend le problème, le risque et l'urgence à partir de vos mots — jamais un long formulaire.",
  },
  {
    icon: Camera,
    title: "Montrez, c'est tout",
    body: "Ajoutez une photo ou une soumission reçue. Clara l'analyse et vous explique ce qu'elle contient.",
  },
  {
    icon: Search,
    title: "Comprenez avant de décider",
    body: "Ordre de grandeur, options et prochaines étapes utiles — avec la provenance de chaque information.",
  },
  {
    icon: BadgeCheck,
    title: "Un pro, au bon moment",
    body: "Quand c'est clair, UNPRO vous propose le professionnel qui correspond à votre projet et à votre secteur.",
  },
];

export function SectionHowItWorks() {
  return (
    <section id="comment-ca-marche" className="unpro-home-tinted scroll-mt-24">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
      <div className="text-center">
        <Eyebrow>Comment ça fonctionne</Eyebrow>
        <Title>Quatre étapes, aucune course aux soumissions</Title>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="rounded-3xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold"
                style={{ background: "hsl(var(--sun) / 0.25)", color: "hsl(var(--sun-foreground))" }}
              >
                {i + 1}
              </span>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                <s.icon className="h-4.5 w-4.5" />
              </div>
            </div>
            <h3 className="mt-4 text-[16px] font-semibold text-foreground">{s.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{s.body}</p>
          </motion.div>
        ))}
      </div>
      </div>
    </section>
  );
}

/* ── 3. Transparence des données ─────────────────────────────── */
const PROVENANCE = [
  { label: "Vérifié", body: "Confirmé auprès d'une source officielle ou par notre équipe." },
  { label: "Déclaré", body: "Fourni par l'entreprise elle-même, sans vérification indépendante." },
  { label: "Déduit", body: "Estimé à partir de sources publiques. Peut contenir des erreurs." },
  { label: "En attente", body: "Information demandée, pas encore obtenue." },
];

export function SectionTransparency() {
  return (
    <SectionWrap>
      <div className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:items-center">
        <div>
          <Eyebrow>Transparence</Eyebrow>
          <Title>Vous voyez d'où vient chaque information</Title>
          <p className="mt-4 text-[15.5px] leading-relaxed text-muted-foreground">
            UNPRO n'invente ni note, ni certification, ni disponibilité. Chaque
            donnée affichée porte son niveau de provenance.
          </p>
        </div>

        <div className="grid gap-3">
          {PROVENANCE.map((p) => (
            <div
              key={p.label}
              className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <span className="mt-0.5 shrink-0 rounded-full bg-secondary px-3 py-1 text-[12px] font-semibold text-secondary-foreground">
                {p.label}
              </span>
              <p className="text-[14.5px] leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionWrap>
  );
}

/* ── 4. Passeport Maison ─────────────────────────────────────── */
export function SectionPasseport() {
  return (
    <SectionWrap tone="tinted">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <Eyebrow>Passeport Maison</Eyebrow>
          <Title>La mémoire documentée de votre propriété</Title>
          <p className="mt-4 text-[15.5px] leading-relaxed text-muted-foreground">
            Conservez vos travaux, vos soumissions et vos documents au même
            endroit. Chaque intervention enrichit l'historique de la maison et
            aide Clara à mieux vous conseiller la prochaine fois.
          </p>
          <Link
            to="/proprietaires/passeport-maison"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Découvrir le Passeport <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-3xl border border-border bg-card p-7">
          <ul className="space-y-4">
            {[
              { icon: ClipboardList, t: "Travaux et soumissions archivés" },
              { icon: Search, t: "Documents analysés et résumés" },
              { icon: BadgeCheck, t: "Historique conservé pour la revente" },
            ].map((r) => (
              <li key={r.t} className="flex items-center gap-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <r.icon className="h-4.5 w-4.5" />
                </span>
                <span className="text-[15px] text-foreground">{r.t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionWrap>
  );
}

/* ── 5. CTA final ────────────────────────────────────────────── */
export function SectionFinalCta() {
  const startAlex = useStartAlex("home_final_cta");
  return (
    <SectionWrap>
      <div className="rounded-[32px] border border-border bg-card px-6 py-14 text-center md:px-12 md:py-20">
        <h2 className="mx-auto max-w-2xl text-[clamp(1.6rem,4vw,2.4rem)] font-semibold leading-tight tracking-[-0.02em] text-foreground">
          Commencez par une seule question.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-muted-foreground">
          Clara vous répond en français, comprend votre situation et vous guide
          vers la prochaine étape utile.
        </p>
        <button
          onClick={startAlex}
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-primary px-7 py-4 text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
        >
          Parler à Clara <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </SectionWrap>
  );
}
