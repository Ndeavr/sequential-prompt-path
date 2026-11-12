/**
 * UNPRO — Landing « Partenariat performance » (/partenariat-performance, /en/performance-partnership).
 * Destination publicitaire : formules de partage négociables (profits globaux, profits de certains contrats,
 * revenus supplémentaires, bonus sur objectifs), seules ou combinées, toujours sur entente écrite.
 * Aucun taux, garantie, exclusivité ni montant affiché. Le rendez-vous réutilise FounderMeetingRequest
 * (agenda réel du fondateur si disponible, sinon demande en attente) avec le sujet « partenariat ».
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, CalendarDays, FileCheck2, FileSignature, Handshake, Megaphone, MessageSquare, PieChart, SearchCheck, Scale, Target, TrendingUp, Trophy } from "lucide-react";
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
    description: "Prenons une heure pour évaluer votre potentiel de croissance. Si nous sommes compatibles, trouvons ensemble une formule de partage qui aligne nos intérêts, selon une entente personnalisée.",
    eyebrow: "Partenariats sur invitation, selon admissibilité",
    h1: "Votre entreprise a du potentiel. Et si on partageait les profits de sa croissance ?",
    lead: "Vous gérez vos campagnes publicitaires vous-même ou avec une agence ? Prenons une heure pour évaluer vos objectifs, vos besoins et vos possibilités de croissance.",
    lead2: "Si nous sommes compatibles, trouvons ensemble une formule qui aligne nos intérêts : partage des profits globaux, des profits sur certains contrats ou des revenus supplémentaires, ou bonus à l'atteinte d'objectifs — selon une entente personnalisée.",
    modelsTitle: "Plusieurs façons de partager la croissance",
    modelsIntro: "Voici des exemples de formules envisageables. Ce ne sont ni des offres automatiques ni des conditions fixes : aucun modèle n'est imposé, et ils peuvent être retenus seuls ou combinés, selon votre situation.",
    models: [
      { t: "Profits globaux", d: "Un partage des profits de l'entreprise ou d'un périmètre convenu (par exemple une division, un service ou un territoire)." },
      { t: "Profits sur certains contrats", d: "Un partage des profits des contrats obtenus ou attribués à la collaboration, selon une méthode d'attribution convenue." },
      { t: "Revenus supplémentaires", d: "Un partage de la croissance incrémentale attribuable au partenariat, mesurée par rapport à une période de référence." },
      { t: "Bonus à l'atteinte d'objectifs", d: "Une prime versée seulement si des objectifs convenus d'avance et mesurables sont atteints : par exemple ventes incrémentales, contrats conclus ou croissance." },
    ],
    modelsNote: "Exemples seulement : rien n'est garanti et aucun taux n'est fixé d'avance.",
    cta: "Évaluer mon potentiel — prendre rendez-vous",
    cta2: "Comment fonctionne ce partenariat ?",
    investTitle: "Vous investissez déjà pour trouver des clients",
    invest: [
      { t: "Des campagnes à gérer", d: "Publicités faites à l'interne ou confiées à une agence : il faut du budget, du suivi et des ajustements constants." },
      { t: "Du temps en soumissions", d: "Chaque demande demande des appels, des visites et des soumissions, qu'elle se transforme en contrat ou non." },
      { t: "Des résultats à mesurer", d: "Savoir quelles dépenses mènent réellement à des contrats signés n'est pas toujours simple." },
    ],
    alignTitle: "Des intérêts alignés, des règles claires",
    align: "Quelle que soit la formule, la rémunération d'UNPRO suit la croissance de votre entreprise. Tout est défini par écrit et accepté par les deux parties avant le début de la collaboration.",
    alignListTitle: "L'entente écrite précise notamment :",
    alignList: [
      "la base de calcul : profits nets ou bruts, revenus additionnels, périmètre et période de référence;",
      "les coûts imputables et, si la formule en dépend, la méthode d'attribution;",
      "pour un bonus : les objectifs, leur mesure, la période et le contrôle des résultats;",
      "les seuils, la durée et les obligations de chacun;",
      "les preuves requises, l'événement qui déclenche le paiement, les annulations et les remboursements;",
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
      { q: "Est-ce un pourcentage de tout mon chiffre d'affaires ?", a: "Pas nécessairement. Selon la formule retenue, la rémunération peut porter sur les profits globaux d'un périmètre convenu, sur les profits de certains contrats, sur les revenus supplémentaires ou prendre la forme d'un bonus sur objectifs mesurables. La base de calcul est définie par écrit." },
      { q: "Quelle formule me convient ?", a: "Nous en discutons lors de la rencontre. La formule dépend de vos objectifs, de vos données disponibles et de ce qui peut être mesuré de façon fiable." },
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
    description: "Let's take one hour to assess your growth potential. If we are a fit, let's find a sharing formula together that aligns our interests, under a tailored agreement.",
    eyebrow: "Partnerships by invitation, subject to eligibility",
    h1: "Your business has potential. What if we shared the profits of its growth?",
    lead: "Do you run your ad campaigns yourself or with an agency? Let's take one hour to assess your goals, your needs and your growth opportunities.",
    lead2: "If we are a fit, let's find a formula together that aligns our interests: sharing overall profits, profits on certain contracts or additional revenue, or a bonus for reaching goals — under a tailored agreement.",
    modelsTitle: "Several ways to share growth",
    modelsIntro: "Here are examples of possible formulas. They are neither automatic offers nor fixed conditions: no model is imposed, and they can be used alone or combined, based on your situation.",
    models: [
      { t: "Overall profits", d: "Sharing the profits of the business or of an agreed scope (for example a division, a service or a service area)." },
      { t: "Profits on certain contracts", d: "Sharing the profits of contracts obtained through or attributed to the collaboration, using an agreed attribution method." },
      { t: "Additional revenue", d: "Sharing the incremental growth attributable to the partnership, measured against a reference period." },
      { t: "Goal-based bonus", d: "A bonus paid only if measurable goals agreed in advance are reached: for example incremental sales, contracts signed or growth." },
    ],
    modelsNote: "Examples only: nothing is guaranteed and no rate is set in advance.",
    cta: "Assess my potential — book a meeting",
    cta2: "How does this partnership work?",
    investTitle: "You already invest to find clients",
    invest: [
      { t: "Campaigns to manage", d: "Ads run in-house or by an agency take budget, follow-up and constant adjustments." },
      { t: "Time spent on quotes", d: "Every request takes calls, visits and quotes, whether it becomes a contract or not." },
      { t: "Results to measure", d: "Knowing which spending actually leads to signed contracts is not always simple." },
    ],
    alignTitle: "Aligned interests, clear rules",
    align: "Whatever the formula, UNPRO's pay follows your business's growth. Everything is defined in writing and accepted by both parties before the collaboration starts.",
    alignListTitle: "The written agreement specifies, among other things:",
    alignList: [
      "the calculation base: net or gross profits, additional revenue, scope and reference period;",
      "deductible costs and, when the formula depends on it, the attribution method;",
      "for a bonus: the goals, how they are measured, the period and how results are verified;",
      "thresholds, duration and each party's obligations;",
      "required proof, the event that triggers payment, cancellations and refunds;",
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
      { q: "Is it a percentage of all my revenue?", a: "Not necessarily. Depending on the formula chosen, pay may be based on overall profits of an agreed scope, profits on certain contracts, additional revenue, or take the form of a bonus on measurable goals. The calculation base is defined in writing." },
      { q: "Which formula suits me?", a: "We discuss it during the meeting. It depends on your goals, your available data and what can be measured reliably." },
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
  const modelIcons = [PieChart, FileCheck2, TrendingUp, Trophy];
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

        <section id={HOW_ID} aria-labelledby="perf-models" className="scroll-mt-24 space-y-4">
          <h2 id="perf-models" className="text-2xl font-semibold text-foreground md:text-3xl">{c.modelsTitle}</h2>
          <p className="text-base text-muted-foreground">{c.modelsIntro}</p>
          <ul className="grid gap-4 md:grid-cols-2">
            {c.models.map((m, i) => {
              const Icon = modelIcons[i];
              return (
                <li key={m.t} className="rounded-[28px] border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                    <h3 className="text-lg font-semibold text-foreground">{m.t}</h3>
                  </div>
                  <p className="mt-3 text-base text-muted-foreground">{m.d}</p>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-muted-foreground">{c.modelsNote}</p>
        </section>

        <section aria-labelledby="perf-align" className="space-y-4 rounded-[28px] border border-primary/20 bg-card p-6 md:p-8">
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
