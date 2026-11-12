/**
 * UNPRO — Page « 100 % à la commission » (/commission, /en/commission).
 * Formule négociée au cas par cas : aucun prix, taux, garantie ou droit automatique affiché.
 * CTA vers l'agenda du fondateur seulement si FOUNDER_BOOKING_URL est validée; sinon défilement vers
 * la section « Choisir un moment pour discuter » (horaires proposés, demande enregistrée, confirmation ensuite).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, FileSignature, Handshake, MessageSquare, SearchCheck, ShieldCheck } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SchemaStack from "@/seo/components/SchemaStack";
import { Button } from "@/components/ui/button";
import { resolveFounderBookingUrl } from "@/config/founderBooking";
import FounderMeetingRequest, { type MeetingTopic } from "@/pages/entrepreneur/FounderMeetingRequest";

export const COMMISSION_FR_URL = "https://unpro.ca/commission";
export const COMMISSION_EN_URL = "https://unpro.ca/en/commission";

type Lang = "fr" | "en";

const C = {
  fr: {
    title: "Partenariat 100 % à la commission pour entrepreneurs | UNPRO",
    description: "Une formule de collaboration rémunérée uniquement par commission, réservée à certains entrepreneurs après évaluation et entente écrite. Discutons-en.",
    eyebrow: "Formule sur entente",
    h1: "100 % à la commission. Une formule réservée à certains entrepreneurs.",
    lead: "UNPRO étudie, au cas par cas, des collaborations fondées sur la commission plutôt que sur un forfait standard. Cette formule n'est pas offerte à toutes les entreprises et nécessite une évaluation et une entente spécifique.",
    nuance: "« 100 % à la commission » décrit le mode de rémunération de cette collaboration : UNPRO est rémunérée par une commission convenue, plutôt que par un forfait. Il ne s'agit pas d'un taux de commission de 100 %.",
    bookCta: "Prendre rendez-vous pour en discuter",
    contactCta: "Choisir un moment pour discuter",
    contactNote: "Trois horaires de 90 minutes vous sont proposés plus bas, sous réserve de confirmation.",
    whoTitle: "À qui s'adresse cette formule ?",
    whoIntro: "Les entreprises admissibles sont déterminées après examen. Nous évaluons notamment :",
    who: [
      "la compatibilité de vos services et de vos territoires avec les besoins des propriétaires;",
      "votre capacité et la qualité de votre service;",
      "les permis et les assurances applicables à vos travaux;",
      "votre disponibilité réelle;",
      "votre transparence et votre acceptation des conditions du partenariat.",
    ],
    whoNote: "Ces critères sont examinés lors de l'évaluation; leur mention ici ne constitue pas une vérification déjà accomplie.",
    howTitle: "Comment ça fonctionne ?",
    steps: [
      { t: "Entretien exploratoire", d: "Nous discutons de votre entreprise, de vos objectifs et de ce que vous attendez d'une collaboration." },
      { t: "Évaluation du dossier", d: "Nous examinons la compatibilité, la capacité, les permis et assurances applicables, et la disponibilité." },
      { t: "Accord écrit", d: "Les modalités sont précisées par écrit : assiette de la commission, événement déclencheur, attribution, annulations et responsabilités de chacun." },
      { t: "Mise en œuvre", d: "La collaboration commence seulement après l'approbation de l'entente par les deux parties." },
    ],
    termsTitle: "Taux et conditions",
    terms: "Les taux et les conditions sont déterminés par accord individuel. Cette formule ne donne aucun droit automatique et ne garantit ni contrats, ni exclusivité, ni recommandations par des outils d'IA tiers. Rien n'est payé en ligne pour cette formule.",
    standard: "Vous préférez la formule standard ?",
    standardLink: "Voir l'inscription entrepreneur",
    partnerTitle: "Vous avez une proposition de partenariat ?",
    partner: "Nous sommes ouverts aux propositions sérieuses, qu'elles viennent d'un entrepreneur, d'un fournisseur de services ou d'un partenaire stratégique. Présentez-nous votre idée.",
    partnerCta: "Discuter d'un partenariat",
    partnerContact: "Proposer un moment pour discuter d'un partenariat",
    faqTitle: "Questions fréquentes",
    faqs: [
      { q: "Est-ce que toutes les entreprises peuvent y accéder ?", a: "Non. La formule est réservée à certaines entreprises, après évaluation et entente écrite." },
      { q: "« 100 % à la commission » veut-il dire que vous prenez 100 % ?", a: "Non. L'expression décrit un modèle où la rémunération d'UNPRO prend la forme d'une commission négociée, plutôt que d'un forfait. Le taux est convenu par écrit." },
      { q: "Quel est le taux de commission ?", a: "Il est déterminé au cas par cas, selon l'entente conclue. Aucun taux n'est fixé d'avance sur cette page." },
      { q: "Des contrats ou une exclusivité sont-ils garantis ?", a: "Non. Aucun contrat, aucune exclusivité et aucune recommandation par des outils d'IA tiers ne sont garantis." },
    ],
    crumbs: [{ name: "Accueil", url: "https://unpro.ca/" }, { name: "Entrepreneurs", url: "https://unpro.ca/entrepreneurs" }, { name: "100 % à la commission", url: COMMISSION_FR_URL }],
    crumbHome: "Accueil", crumbPros: "Entrepreneurs", crumbHere: "100 % à la commission",
    external: "(nouvel onglet)",
  },
  en: {
    title: "100% commission partnership for contractors | UNPRO",
    description: "A collaboration paid only through commission, reserved for certain contractors after review and a written agreement. Let's talk about it.",
    eyebrow: "By agreement",
    h1: "100% commission. A formula reserved for certain contractors.",
    lead: "UNPRO considers, case by case, collaborations based on commission rather than a standard package. This formula is not offered to every business and requires a review and a specific agreement.",
    nuance: "\"100% commission\" describes how this collaboration is paid: UNPRO earns an agreed commission instead of a package fee. It does not mean a 100% commission rate.",
    bookCta: "Book an appointment to discuss it",
    contactCta: "Choose a time to talk",
    contactNote: "Three 90-minute times are proposed below, subject to confirmation.",
    whoTitle: "Who is this formula for?",
    whoIntro: "Eligible businesses are determined after review. We look at:",
    who: [
      "how well your services and service areas fit homeowner needs;",
      "your capacity and quality of service;",
      "the licences and insurance applicable to your work;",
      "your actual availability;",
      "your transparency and acceptance of the partnership terms.",
    ],
    whoNote: "These criteria are reviewed during the evaluation; listing them here does not mean any check has already been done.",
    howTitle: "How does it work?",
    steps: [
      { t: "Exploratory meeting", d: "We talk about your business, your goals and what you expect from a collaboration." },
      { t: "File review", d: "We review fit, capacity, applicable licences and insurance, and availability." },
      { t: "Written agreement", d: "Terms are set in writing: commission base, triggering event, attribution, cancellations and each party's responsibilities." },
      { t: "Implementation", d: "The collaboration starts only after both parties approve the agreement." },
    ],
    termsTitle: "Rates and terms",
    terms: "Rates and terms are set by individual agreement. This formula grants no automatic right and guarantees no contracts, exclusivity or recommendations by third-party AI tools. Nothing is paid online for this formula.",
    standard: "Prefer the standard formula?",
    standardLink: "See contractor registration",
    partnerTitle: "Do you have a partnership proposal?",
    partner: "We are open to serious proposals, whether they come from a contractor, a service provider or a strategic partner. Tell us about your idea.",
    partnerCta: "Discuss a partnership",
    partnerContact: "Propose a time to discuss a partnership",
    faqTitle: "Frequently asked questions",
    faqs: [
      { q: "Can every business access it?", a: "No. The formula is reserved for certain businesses, after review and a written agreement." },
      { q: "Does \"100% commission\" mean you take 100%?", a: "No. It describes a model where UNPRO is paid through a negotiated commission instead of a package fee. The rate is agreed in writing." },
      { q: "What is the commission rate?", a: "It is set case by case under the agreement reached. No rate is fixed in advance on this page." },
      { q: "Are contracts or exclusivity guaranteed?", a: "No. No contracts, exclusivity or recommendations by third-party AI tools are guaranteed." },
    ],
    crumbs: [{ name: "Home", url: "https://unpro.ca/" }, { name: "Contractors", url: "https://unpro.ca/entrepreneurs" }, { name: "100% commission", url: COMMISSION_EN_URL }],
    crumbHome: "Home", crumbPros: "Contractors", crumbHere: "100% commission",
    external: "(new tab)",
  },
} as const;

export const MEETING_SECTION_ID = "choisir-un-moment";

function FounderCta({ bookingUrl, bookLabel, contactLabel, external, onPick, variant = "default" }: {
  bookingUrl: string | null; bookLabel: string; contactLabel: string; external: string; onPick: () => void; variant?: "default" | "outline";
}) {
  const cls = "h-auto min-h-12 whitespace-normal rounded-button px-6 text-base";
  if (bookingUrl) {
    return (
      <Button asChild variant={variant} className={cls}>
        <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />{bookLabel}<span className="sr-only"> {external}</span>
        </a>
      </Button>
    );
  }
  return (
    <Button asChild variant={variant} className={cls}>
      <a href={`#${MEETING_SECTION_ID}`} onClick={(e) => { e.preventDefault(); onPick(); }}>
        <CalendarDays className="h-4 w-4" aria-hidden="true" />{contactLabel}
      </a>
    </Button>
  );
}

export default function PageCommissionPartnership({ lang = "fr" }: { lang?: Lang }) {
  const c = C[lang];
  const isFr = lang === "fr";
  const bookingUrl = resolveFounderBookingUrl();
  const stepIcons = [MessageSquare, SearchCheck, FileSignature, ShieldCheck];
  const [topic, setTopic] = useState<MeetingTopic>("commission");
  const pick = (t: MeetingTopic) => () => {
    setTopic(t);
    const el = document.getElementById(MEETING_SECTION_ID);
    el?.scrollIntoView?.({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    (document.getElementById("meeting-title") as HTMLElement | null)?.focus({ preventScroll: true });
  };

  return (
    <MainLayout>
      <SeoHead
        title={c.title}
        description={c.description}
        canonical={isFr ? COMMISSION_FR_URL : COMMISSION_EN_URL}
        frenchCanonical={COMMISSION_FR_URL}
        englishCanonical={COMMISSION_EN_URL}
        lang={isFr ? "fr-CA" : "en-CA"}
      />
      <SchemaStack breadcrumbs={[...c.crumbs]} />

      <div className="mx-auto max-w-4xl space-y-14 px-5 py-8 md:py-14">
        <nav aria-label={isFr ? "Fil d'Ariane" : "Breadcrumb"} className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1">
            <li><Link to="/" className="underline-offset-4 hover:text-foreground hover:underline">{c.crumbHome}</Link></li>
            <li className="flex items-center gap-1"><span aria-hidden="true">/</span><Link to="/entrepreneurs" className="underline-offset-4 hover:text-foreground hover:underline">{c.crumbPros}</Link></li>
            <li className="flex items-center gap-1"><span aria-hidden="true">/</span><span aria-current="page" className="text-foreground">{c.crumbHere}</span></li>
          </ol>
        </nav>

        <header className="space-y-6 rounded-[28px] border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Handshake className="h-4 w-4" aria-hidden="true" />{c.eyebrow}
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">{c.h1}</h1>
          <p className="text-lg text-foreground/90">{c.lead}</p>
          <p className="rounded-2xl border border-border bg-background/60 p-4 text-base text-muted-foreground">{c.nuance}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <FounderCta bookingUrl={bookingUrl} bookLabel={c.bookCta} contactLabel={c.contactCta} external={c.external} onPick={pick("commission")} />
          </div>
          {!bookingUrl && <p className="text-sm text-muted-foreground">{c.contactNote}</p>}
        </header>

        <section aria-labelledby="who" className="space-y-4">
          <h2 id="who" className="text-2xl font-semibold text-foreground md:text-3xl">{c.whoTitle}</h2>
          <p className="text-base text-muted-foreground">{c.whoIntro}</p>
          <ul className="space-y-3">
            {c.who.map((w) => (
              <li key={w} className="flex gap-3 rounded-2xl border border-border bg-card p-4 text-base text-foreground">
                <SearchCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />{w}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">{c.whoNote}</p>
        </section>

        <section aria-labelledby="how" className="space-y-4">
          <h2 id="how" className="text-2xl font-semibold text-foreground md:text-3xl">{c.howTitle}</h2>
          <ol className="grid gap-4 md:grid-cols-2">
            {c.steps.map((s, i) => {
              const Icon = stepIcons[i];
              return (
                <li key={s.t} className="rounded-[28px] border border-border bg-card p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">{i + 1}</span>
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-foreground">{s.t}</h3>
                  <p className="mt-1 text-base text-muted-foreground">{s.d}</p>
                </li>
              );
            })}
          </ol>
          <div className="rounded-2xl border border-border bg-muted/40 p-5">
            <h3 className="text-lg font-semibold text-foreground">{c.termsTitle}</h3>
            <p className="mt-2 text-base text-muted-foreground">{c.terms}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              {c.standard}{" "}
              <Link to="/entrepreneurs" className="font-semibold text-primary underline underline-offset-4">{c.standardLink}</Link>
            </p>
          </div>
        </section>

        <section aria-labelledby="partner" className="space-y-4 rounded-[28px] border border-border bg-card p-6 md:p-8">
          <h2 id="partner" className="text-2xl font-semibold text-foreground md:text-3xl">{c.partnerTitle}</h2>
          <p className="text-base text-muted-foreground">{c.partner}</p>
          <FounderCta bookingUrl={bookingUrl} bookLabel={c.partnerCta} contactLabel={c.partnerContact} external={c.external} onPick={pick("partnership")} variant="outline" />
        </section>

        <section id={MEETING_SECTION_ID} aria-labelledby="meeting-title" className="scroll-mt-24 space-y-4 rounded-[28px] border border-primary/20 bg-card p-6 md:p-8">
          <h2 id="meeting-title" tabIndex={-1} className="text-2xl font-semibold text-foreground focus:outline-none md:text-3xl">{isFr ? "Choisir un moment pour discuter" : "Choose a time to talk"}</h2>
          <FounderMeetingRequest lang={lang} topic={topic} onTopicChange={setTopic} />
        </section>

        <section aria-labelledby="faq" className="space-y-3">
          <h2 id="faq" className="text-2xl font-semibold text-foreground md:text-3xl">{c.faqTitle}</h2>
          {c.faqs.map((f) => (
            <details key={f.q} className="rounded-2xl border border-border bg-card px-5 py-4">
              <summary className="cursor-pointer text-base font-semibold text-foreground">{f.q}</summary>
              <p className="mt-3 text-base text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </section>

        <div className="flex justify-center">
          <Link to="/entrepreneurs" className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">
            {c.standardLink}<ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
