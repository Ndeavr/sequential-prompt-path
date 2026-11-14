/**
 * Campagne « Ça dépend! » — deux pages marketing, sans nouveau formulaire ni paiement.
 * Les CTA redirigent vers les parcours canoniques et conservent l'attribution permise.
 */
import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, CheckCircle2, HardHat, House, MessageCircle } from "lucide-react";
import UnproLogo from "@/components/brand/UnproLogo";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { campaignLink } from "@/lib/contractorCampaignLinks";

type Audience = "homeowner" | "contractor";

const COPY = {
  fr: {
    homeowner: {
      meta: "Un gros projet le mois prochain? Découvrez une meilleure façon de trouver le bon entrepreneur pour vos travaux.",
      eyebrow: "Rénovation · Construction · Entretien · Services",
      title: "« J'ai un gros projet le mois prochain. Vous êtes disponible? »",
      intro: "Un entrepreneur trop occupé pour un projet peut être disponible pour un autre. Encore faut-il savoir de quoi on parle.",
      client1: "Bonjour! J'ai un gros projet le mois prochain. Vous êtes disponible?",
      pro1: "Ouf… on est pas mal occupés.",
      client2: "Pas de problème. Je vais faire affaire avec quelqu'un d'autre.",
      pro2: "Attendez… ça dépend! C'est quoi, votre projet?",
      punch: "Le bon entrepreneur ne se trouve pas toujours avec une simple question de disponibilité.",
      sub: "Décrivez votre projet à Clara : nature des travaux, lieu, échéancier et priorités. UNPRO peut alors chercher une compatibilité avec des professionnels admissibles, selon leurs préférences et leurs disponibilités confirmées.",
      steps: ["Décrivez votre projet, à votre rythme.", "Clara clarifie ce qui compte vraiment.", "UNPRO cherche un professionnel compatible et admissible; le rendez-vous dépend de la disponibilité réelle."],
      cta: "Décrire mon projet à Clara",
      secondary: "Je suis entrepreneur",
      note: "Aucune disponibilité ou recommandation n'est garantie avant vérification.",
    },
    contractor: {
      meta: "Trop occupé? Ça dépend pour quel contrat. Faites connaître vos spécialités et vos préférences à Clara sur UNPRO.",
      eyebrow: "Pour les entrepreneurs et les professionnels",
      title: "« Vous êtes disponible? » — « Ça dépend! »",
      intro: "Vous n'avez peut-être pas besoin de plus de demandes. Vous avez besoin de projets qui correspondent vraiment à votre entreprise.",
      client1: "J'ai un gros projet à réaliser le mois prochain. Vous êtes disponible?",
      pro1: "On est pas mal occupés…",
      client2: "D'accord, je vais appeler ailleurs.",
      pro2: "Attendez… ça dépend! Quel genre de projet?",
      punch: "Un horaire chargé ne signifie pas que tous les bons projets sont à refuser.",
      sub: "Expliquez à Clara les mandats que vous recherchez, ceux que vous évitez, vos secteurs, votre capacité et vos préférences. UNPRO utilise ces informations pour améliorer la compatibilité des jumelages, sous réserve de l'admissibilité et des disponibilités réelles.",
      steps: ["Précisez les projets qui vous intéressent.", "Indiquez votre territoire, vos contraintes et vos exclusions.", "Préparez votre profil UNPRO pour être considéré lors de demandes compatibles."],
      cta: "Préparer mon profil avec Clara",
      secondary: "Voir la présence IA à 350 $",
      note: "L'activation de 350 $ + taxes couvre le profil et 12 mois de présence UNPRO. Aucun rendez-vous n'est inclus par défaut; les options sont présentées séparément avant paiement.",
    },
  },
  en: {
    homeowner: {
      meta: "A major project next month? Discover a better way to find the right professional.",
      eyebrow: "Renovation · Construction · Maintenance · Services",
      title: "“I have a big project next month. Are you available?”",
      intro: "A contractor may be booked for one kind of project and open to another. The details make all the difference.",
      client1: "Hi! I have a big project next month. Are you available?",
      pro1: "We're pretty busy right now…",
      client2: "No problem. I'll call someone else.",
      pro2: "Wait… it depends! What kind of project?",
      punch: "The right contractor isn't found by asking about availability alone.",
      sub: "Tell Clara about your project, location, timeline and priorities. UNPRO can then look for eligible professionals whose preferences fit, subject to confirmed availability.",
      steps: ["Describe your project in your own words.", "Clara helps clarify what matters.", "UNPRO looks for an eligible, compatible professional; appointments depend on actual availability."],
      cta: "Tell Clara about my project",
      secondary: "I'm a contractor",
      note: "Availability and recommendations are never guaranteed before verification.",
    },
    contractor: {
      meta: "Fully booked? It depends on the project. Tell Clara what kinds of work fit your business.",
      eyebrow: "For contractors and professionals",
      title: "“Are you available?” — “It depends!”",
      intro: "You might not need more inquiries. You need projects that actually fit your business.",
      client1: "I have a big project next month. Are you available?",
      pro1: "We're pretty busy…",
      client2: "Okay, I'll call someone else.",
      pro2: "Wait… it depends! What kind of project?",
      punch: "A full calendar doesn't mean every promising project must be declined.",
      sub: "Tell Clara about the work you want, exclusions, service area, capacity and preferences. UNPRO uses these signals to improve matching, subject to eligibility and real availability.",
      steps: ["Describe the projects you want.", "Set your territory, constraints and exclusions.", "Prepare your UNPRO profile for consideration when compatible requests arrive."],
      cta: "Prepare my profile with Clara",
      secondary: "See the $350 AI-presence offer",
      note: "$350 + applicable taxes covers your profile and 12 months on UNPRO. Appointments are not included by default; any add-ons are disclosed separately before payment.",
    },
  },
} as const;

function PageCaDepend({ audience }: { audience: Audience }) {
  const { lang } = useLanguage();
  const { search } = useLocation();
  const fr = lang === "fr";
  const copy = COPY[fr ? "fr" : "en"][audience];
  const owner = audience === "homeowner";
  const canonical = owner ? "https://unpro.ca/ca-depend" : "https://unpro.ca/entrepreneurs/ca-depend";
  const primary = campaignLink(owner ? "/" : "/entrepreneurs/rejoindre", search, {
    from: owner ? "ca_depend_homeowner" : "ca_depend_contractor",
  });
  const secondary = campaignLink(owner ? "/entrepreneurs/rejoindre" : "/entrepreneurs/activation-350", search, {
    from: owner ? "ca_depend_owner_to_pro" : "ca_depend_offer",
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{copy.title} | UNPRO</title>
        <meta name="description" content={copy.meta} />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <Link to="/" aria-label="UNPRO — accueil" className="inline-flex min-h-11 items-center">
          <UnproLogo size={112} variant="primary" animated={false} />
        </Link>
        <section className="mt-7 grid items-start gap-9 md:grid-cols-[1.05fr_0.95fr] md:gap-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{copy.eyebrow}</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{copy.title}</h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{copy.intro}</p>
            <p className="mt-5 text-xl font-semibold leading-snug">{copy.punch}</p>
            <div className="mt-7 flex flex-col gap-3 sm:items-start">
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-center font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                to={primary}
                data-testid="ca-depend-primary-cta"
              >
                {copy.cta}<ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
              </Link>
              <Link className="inline-flex min-h-11 items-center gap-2 py-2 font-medium text-primary underline underline-offset-4" to={secondary}>
                {copy.secondary}
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-4 shadow-lg sm:p-6" aria-label={fr ? "Exemple de conversation" : "Example conversation"}>
            <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
              <MessageCircle className="h-5 w-5 text-primary" aria-hidden />
              <span className="text-sm font-semibold">Ça dépend! / It depends!</span>
            </div>
            <div className="space-y-4 text-sm leading-relaxed sm:text-base">
              <p className="mr-8 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">{copy.client1}</p>
              <p className="ml-8 rounded-2xl rounded-tr-sm border border-border px-4 py-3">{copy.pro1}</p>
              <p className="mr-8 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">{copy.client2}</p>
              <p className="ml-8 rounded-2xl rounded-tr-sm border border-primary/50 bg-primary/10 px-4 py-3 font-bold">{copy.pro2}</p>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">{fr ? "Dialogue fictif pour illustrer une situation courante." : "Fictional dialogue illustrating a common situation."}</p>
          </div>
        </section>
        <section className="mt-12 rounded-3xl border border-border bg-card p-5 sm:p-8">
          <div className="flex items-center gap-3">
            {owner ? <House className="h-6 w-6 text-primary" aria-hidden /> : <HardHat className="h-6 w-6 text-primary" aria-hidden />}
            <h2 className="text-2xl font-bold">{fr ? "Ce que Clara peut changer" : "How Clara can help"}</h2>
          </div>
          <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">{copy.sub}</p>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {copy.steps.map((step, i) => (
              <li key={step} className="rounded-2xl bg-muted/60 p-4">
                <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
                <p className="font-medium">{step}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>{copy.note}</span>
          </p>
        </section>
      </div>
    </main>
  );
}

export function PageCaDependHomeowner() { return <PageCaDepend audience="homeowner" />; }
export function PageCaDependContractor() { return <PageCaDepend audience="contractor" />; }
