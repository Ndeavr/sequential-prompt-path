/**
 * UNPRO — Landing « Partenariat performance » (/partenariat-performance, /en/performance-partnership).
 * Destination publicitaire : partage des profits des seuls contrats attribuables, sur entente écrite.
 * Aucun taux, garantie, exclusivité ni montant affiché. Le rendez-vous réutilise FounderMeetingRequest
 * (agenda réel du fondateur si disponible, sinon demande en attente) avec le sujet « partenariat ».
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, CalendarDays, FileSignature, Handshake, Megaphone, MessageSquare, SearchCheck, Scale, Target } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SchemaStack from "@/seo/components/SchemaStack";
import { Button } from "@/components/ui/button";
import FounderMeetingRequest from "@/pages/entrepreneur/FounderMeetingRequest";
import { captureAttribution } from "@/lib/forms/utm";

export const PERF_FR_URL = "https://unpro.ca/partenariat-performance";
export const PERF_EN_URL = "https://unpro.ca/en/performance-partnership";
export const PERF_BOOKING_ID = "evaluer-mon-potentiel";
const HOW_ID = "comment-ca-fonctionne";

type Lang = "fr" | "en";

const C = {
  fr: {
    title: "Partenariat performance pour entrepreneurs | UNPRO",
    description: "Prenons une heure pour évaluer votre potentiel de croissance. Si nos entreprises sont compatibles, UNPRO est rémunérée sur les profits des contrats obtenus grâce à notre collaboration, selon une entente écrite.",
    eyebrow: "Partenariats sur invitation, selon admissibilité",
    h1: "Votre entreprise a du potentiel. Et si on partageait les profits de sa croissance ?",
    lead: "Vous gérez vos campagnes publicitaires vous-même ou avec une agence ? Prenons une heure pour évaluer vos objectifs, vos besoins et vos possibilités de croissance.",
    lead2: "Si nos entreprises sont compatibles, nous pourrions établir un partenariat où UNPRO est rémunérée uniquement sur les profits des contrats obtenus grâce à notre collaboration, selon une entente écrite.",
    cta: "Évaluer mon potentiel — prendre rendez-vous",
    cta2: "Comment fonctionne ce partenariat ?",
    investTitle: "Vous investissez déjà pour trouver des clients",
    invest: [
      { t: "Des campagnes à gérer", d: "Publicités faites à l'interne ou confiées à une agence : il faut du budget, du suivi et des ajustements constants." },
      { t: "Du temps en soumissions", d: "Chaque demande demande des appels, des visites et des soumissions, qu'elle se transforme en contrat ou non." },
      { t: "Des résultats à mesurer", d: "Savoir quelles dépenses mènent réellement à des contrats signés n'est pas toujours simple." },
    ],
    alignTitle: "Et si nos intérêts étaient alignés ?",
    align: "Dans ce partenariat, la rémunération d'UNPRO est reliée aux résultats réels attribuables à notre collaboration. Elle ne porte ni sur l'ensemble de vos revenus, ni sur vos contrats existants, ni sur des contrats qui ne nous sont pas attribuables.",
    alignListTitle: "L'entente écrite définit notamment :",
    alignList: [
      "ce qui constitue un profit admissible et les coûts imputables;",
      "la méthode d'attribution d'un contrat à la collaboration;",
      "la preuve du contrat et l'événement qui déclenche le paiement;",
      "le traitement des annulations et des remboursements;",
      "le taux et les autres modalités, convenus avec vous.",
    ],
    stepsTitle: "Trois étapes, sans engagement au départ",
    steps: [
      { t: "Une conversation exploratoire d'une heure", d: "Vos objectifs, vos services, votre territoire et votre façon actuelle d'obtenir des clients." },
      { t: "Une analyse de compatibilité et de potentiel", d: "Nous évaluons si une collaboration peut réellement créer de la valeur pour vous et pour nous." },
      { t: "Une entente sur mesure, si nous sommes alignés", d: "Les modalités sont écrites et acceptées par les deux parties avant tout début de collaboration." },
    ],
    whoTitle: "À qui s'adresse ce partenariat ?",
    who: "Il est offert à certaines entreprises de rénovation, de construction, d'entretien et de services, uniquement après examen et acceptation écrite. Nous examinons notamment vos services, votre territoire, votre capacité, ainsi que les permis et assurances applicables à vos travaux.",
    whoNote: "Ces éléments sont examinés pendant l'évaluation; leur mention ne constitue pas une vérification déjà faite. Aucune exclusivité ni aucun contrat n'est garanti.",
    detailsLink: "Voir les conditions détaillées du partenariat à la commission",
    faqTitle: "Questions fréquentes",
    faqs: [
      { q: "Dois-je arrêter mon agence ou mes publicités ?", a: "Non, pas automatiquement. Nous regardons ensemble ce que vous faites déjà; la place de chaque outil est discutée au cas par cas." },
      { q: "Est-ce un pourcentage de tout mon chiffre d'affaires ?", a: "Non. Seuls les profits des contrats attribuables à notre collaboration sont visés, selon les définitions de l'entente écrite." },
      { q: "Est-ce disponible pour toutes les entreprises ?", a: "Non. Le partenariat est offert à certaines entreprises, après évaluation et acceptation écrite." },
      { q: "Quel est le taux ?", a: "Il est convenu avec vous dans l'entente. Aucun taux n'est fixé d'avance sur cette page." },
      { q: "Est-ce que vous garantissez des contrats ?", a: "Non. Aucun contrat, aucun volume et aucune exclusivité ne sont garantis." },
    ],
    bookTitle: "Discutons de votre potentiel",
    durationNote: "Discussion prévue d'environ une heure; prévoir une plage de 90 minutes pour l'échange et les questions.",
    standard: "Vous préférez l'inscription standard ?",
    standardLink: "Voir l'inscription entrepreneur",
    crumbs: [{ name: "Accueil", url: "https://unpro.ca/" }, { name: "Entrepreneurs", url: "https://unpro.ca/entrepreneurs" }, { name: "Partenariat performance", url: PERF_FR_URL }],
    crumbHome: "Accueil", crumbPros: "Entrepreneurs", crumbHere: "Partenariat performance",
  },
  en: {
    title: "Performance partnership for contractors | UNPRO",
    description: "Let's take one hour to assess your growth potential. If our businesses are a fit, UNPRO is paid on the profits of contracts obtained through our collaboration, under a written agreement.",
    eyebrow: "Partnerships by invitation, subject to eligibility",
    h1: "Your business has potential. What if we shared the profits of its growth?",
    lead: "Do you run your ad campaigns yourself or with an agency? Let's take one hour to assess your goals, your needs and your growth opportunities.",
    lead2: "If our businesses are a fit, we could set up a partnership where UNPRO is paid only on the profits of contracts obtained through our collaboration, under a written agreement.",
    cta: "Assess my potential — book a meeting",
    cta2: "How does this partnership work?",
    investTitle: "You already invest to find clients",
    invest: [
      { t: "Campaigns to manage", d: "Ads run in-house or by an agency take budget, follow-up and constant adjustments." },
      { t: "Time spent on quotes", d: "Every request takes calls, visits and quotes, whether it becomes a contract or not." },
      { t: "Results to measure", d: "Knowing which spending actually leads to signed contracts is not always simple." },
    ],
    alignTitle: "What if our interests were aligned?",
    align: "In this partnership, UNPRO's pay is tied to real results attributable to our collaboration. It does not apply to all of your revenue, to your existing contracts, or to contracts not attributable to us.",
    alignListTitle: "The written agreement defines, among other things:",
    alignList: [
      "what counts as eligible profit and which costs are deductible;",
      "how a contract is attributed to the collaboration;",
      "proof of the contract and the event that triggers payment;",
      "how cancellations and refunds are handled;",
      "the rate and other terms, agreed with you.",
    ],
    stepsTitle: "Three steps, no commitment to start",
    steps: [
      { t: "A one-hour exploratory conversation", d: "Your goals, services, service area and how you get clients today." },
      { t: "A fit and potential review", d: "We assess whether a collaboration can truly create value for you and for us." },
      { t: "A tailored agreement, if we are aligned", d: "Terms are written and accepted by both parties before any collaboration starts." },
    ],
    whoTitle: "Who is this partnership for?",
    who: "It is offered to certain renovation, construction, maintenance and service businesses, only after review and written acceptance. We look at your services, service area, capacity, and the licences and insurance applicable to your work.",
    whoNote: "These items are reviewed during the evaluation; listing them does not mean any check has been done. No exclusivity or contract is guaranteed.",
    detailsLink: "See the detailed terms of the commission partnership",
    faqTitle: "Frequently asked questions",
    faqs: [
      { q: "Do I have to stop my agency or my ads?", a: "No, not automatically. We look at what you already do together; the role of each tool is discussed case by case." },
      { q: "Is it a percentage of all my revenue?", a: "No. Only the profits of contracts attributable to our collaboration are covered, as defined in the written agreement." },
      { q: "Is it available to every business?", a: "No. The partnership is offered to certain businesses, after review and written acceptance." },
      { q: "What is the rate?", a: "It is agreed with you in the agreement. No rate is set in advance on this page." },
      { q: "Do you guarantee contracts?", a: "No. No contracts, volume or exclusivity are guaranteed." },
    ],
    bookTitle: "Let's talk about your potential",
    durationNote: "The discussion is planned for about one hour; please set aside a 90-minute slot for the conversation and questions.",
    standard: "Prefer the standard registration?",
    standardLink: "See contractor registration",
    crumbs: [{ name: "Home", url: "https://unpro.ca/" }, { name: "Contractors", url: "https://unpro.ca/entrepreneurs" }, { name: "Performance partnership", url: PERF_EN_URL }],
    crumbHome: "Home", crumbPros: "Contractors", crumbHere: "Performance partnership",
  },
} as const;

/** Source enregistrée avec la demande : page + UTM éventuels (aucune donnée personnelle). */
export function performanceSource(lang: Lang): string {
  const a = captureAttribution();
  const utm = [a.utm_source && `utm_source=${a.utm_source}`, a.utm_medium && `utm_medium=${a.utm_medium}`, a.utm_campaign && `utm_campaign=${a.utm_campaign}`]
    .filter(Boolean).join(" ");
  return [lang === "fr" ? "/partenariat-performance" : "/en/performance-partnership", utm].filter(Boolean).join(" · ").slice(0, 200);
}

const scrollTo = (id: string, focusId?: string) => {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "start" });
  if (focusId) (document.getElementById(focusId) as HTMLElement | null)?.focus({ preventScroll: true });
};

export default function PagePerformancePartnership({ lang = "fr" }: { lang?: Lang }) {
  const c = C[lang];
  const isFr = lang === "fr";
  const source = useMemo(() => performanceSource(lang), [lang]);
  const investIcons = [Megaphone, MessageSquare, Target];
  const stepIcons = [MessageSquare, SearchCheck, FileSignature];
  const btn = "h-auto min-h-12 whitespace-normal rounded-button px-6 text-base";

  const BookCta = ({ label, variant = "default" }: { label: string; variant?: "default" | "outline" }) => (
    <Button asChild variant={variant} className={btn}>
      <a href={`#${PERF_BOOKING_ID}`} onClick={(e) => { e.preventDefault(); scrollTo(PERF_BOOKING_ID, "perf-book-title"); }}>
        <CalendarDays className="h-4 w-4" aria-hidden="true" />{label}
      </a>
    </Button>
  );

  return (
    <MainLayout>
      <SeoHead
        title={c.title}
        description={c.description}
        canonical={isFr ? PERF_FR_URL : PERF_EN_URL}
        frenchCanonical={PERF_FR_URL}
        englishCanonical={PERF_EN_URL}
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

        <header className="space-y-6 rounded-[28px] border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-6 shadow-sm md:p-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Handshake className="h-4 w-4" aria-hidden="true" />{c.eyebrow}
          </span>
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-foreground md:text-5xl">{c.h1}</h1>
          <p className="text-base text-foreground/90 md:text-lg">{c.lead}</p>
          <p className="text-base text-foreground/90 md:text-lg">{c.lead2}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <BookCta label={c.cta} />
            <Button asChild variant="outline" className={btn}>
              <a href={`#${HOW_ID}`} onClick={(e) => { e.preventDefault(); scrollTo(HOW_ID); }}>
                <ArrowDown className="h-4 w-4" aria-hidden="true" />{c.cta2}
              </a>
            </Button>
          </div>
        </header>

        <section aria-labelledby="perf-invest" className="space-y-4">
          <h2 id="perf-invest" className="text-2xl font-semibold text-foreground md:text-3xl">{c.investTitle}</h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {c.invest.map((x, i) => {
              const Icon = investIcons[i];
              return (
                <li key={x.t} className="rounded-[28px] border border-border bg-card p-5">
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 text-lg font-semibold text-foreground">{x.t}</h3>
                  <p className="mt-1 text-base text-muted-foreground">{x.d}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <section id={HOW_ID} aria-labelledby="perf-align" className="scroll-mt-24 space-y-4 rounded-[28px] border border-primary/20 bg-card p-6 md:p-8">
          <div className="flex items-center gap-3">
            <Scale className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 id="perf-align" className="text-2xl font-semibold text-foreground md:text-3xl">{c.alignTitle}</h2>
          </div>
          <p className="text-base text-foreground/90">{c.align}</p>
          <p className="text-base font-semibold text-foreground">{c.alignListTitle}</p>
          <ul className="space-y-2">
            {c.alignList.map((x) => (
              <li key={x} className="flex gap-3 text-base text-muted-foreground"><SearchCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />{x}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="perf-steps" className="space-y-4">
          <h2 id="perf-steps" className="text-2xl font-semibold text-foreground md:text-3xl">{c.stepsTitle}</h2>
          <ol className="grid gap-4 md:grid-cols-3">
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
          <BookCta label={c.cta} variant="outline" />
        </section>

        <section aria-labelledby="perf-who" className="space-y-3 rounded-2xl border border-border bg-muted/40 p-5 md:p-6">
          <h2 id="perf-who" className="text-2xl font-semibold text-foreground md:text-3xl">{c.whoTitle}</h2>
          <p className="text-base text-foreground/90">{c.who}</p>
          <p className="text-sm text-muted-foreground">{c.whoNote}</p>
          <Link to={isFr ? "/commission" : "/en/commission"} className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">
            {c.detailsLink}<ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        <section aria-labelledby="perf-faq" className="space-y-3">
          <h2 id="perf-faq" className="text-2xl font-semibold text-foreground md:text-3xl">{c.faqTitle}</h2>
          {c.faqs.map((f) => (
            <details key={f.q} className="rounded-2xl border border-border bg-card px-5 py-4">
              <summary className="cursor-pointer text-base font-semibold text-foreground">{f.q}</summary>
              <p className="mt-3 text-base text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </section>

        <section id={PERF_BOOKING_ID} aria-labelledby="perf-book-title" className="scroll-mt-24 space-y-4 rounded-[28px] border border-primary/30 bg-card p-6 shadow-sm md:p-8">
          <h2 id="perf-book-title" tabIndex={-1} className="text-2xl font-semibold text-foreground focus:outline-none md:text-3xl">{c.bookTitle}</h2>
          <FounderMeetingRequest lang={lang} topic="partnership" onTopicChange={() => {}} source={source} note={c.durationNote} hideTopic />
        </section>

        <p className="text-center text-sm text-muted-foreground">
          {c.standard}{" "}
          <Link to="/entrepreneurs" className="font-semibold text-primary underline underline-offset-4">{c.standardLink}</Link>
        </p>
      </div>
    </MainLayout>
  );
}
