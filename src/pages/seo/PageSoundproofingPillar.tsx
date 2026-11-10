/**
 * UNPRO — Page pilier « Insonorisation entre appartements et condos »
 * Routes : /insonorisation (fr-CA) et /en/soundproofing (en-CA), hreflang réciproques.
 * Réutilise MainLayout, SeoHead et SchemaStack (BreadcrumbList seulement).
 * FAQ en HTML visible, sans balisage FAQPage. Aucun prix, résultat,
 * norme garantie, avis ou disponibilité de professionnel n'est affirmé.
 */
import { Link } from "react-router-dom";
import { ArrowRight, Ear, Footprints, Waypoints, ShieldAlert, Building2, MessageCircle } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SchemaStack from "@/seo/components/SchemaStack";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const SOUNDPROOFING_FR_URL = "https://unpro.ca/insonorisation";
export const SOUNDPROOFING_EN_URL = "https://unpro.ca/en/soundproofing";

/** Clara répond en français : le message d'ouverture reste en français. */
export const SOUNDPROOFING_CLARA_HREF = `/conversation?q=${encodeURIComponent(
  "J'ai un problème de bruit entre logements et je cherche des solutions d'insonorisation.",
)}`;

type Lang = "fr" | "en";
type Section = { icon: typeof Ear; title: string; body: string[] };
type Faq = { q: string; a: string };

const CONTENT: Record<Lang, {
  title: string; description: string; h1: string; lead: string;
  quickTitle: string; quick: string[];
  claraCta: string; claraNote: string; secondaryPro: string;
  kindsTitle: string; kinds: Section[];
  placesTitle: string; places: Section[];
  solutionsTitle: string; solutionsIntro: string; solutions: { name: string; text: string }[];
  constraintsTitle: string; constraints: Section[];
  claraTitle: string; claraSteps: string[]; claraHonest: string;
  faqTitle: string; faqs: Faq[];
  proTitle: string; proText: string; proCta: string;
  crumbs: { name: string; url: string }[]; crumbHome: string; crumbServices?: string;
}> = {
  fr: {
    title: "Insonorisation appartement et condo : murs, planchers, plafonds | UNPRO",
    description: "Réduire le bruit entre deux logements : bruits aériens, pas, transmissions latérales, murs, planchers et plafonds. Solutions à valider et règles en condo.",
    h1: "Insonorisation entre appartements et condos",
    lead: "Pour réduire le bruit entre deux logements, il faut d'abord savoir quel bruit passe et par où. Ensuite, on combine les bons principes selon l'assemblage réel : étanchéité, masse, absorption et désolidarisation.",
    quickTitle: "En bref : comment réduire le bruit entre deux logements",
    quick: [
      "Identifiez le type de bruit : voix, télé ou musique (bruit aérien) ou pas et chocs (bruit d'impact).",
      "Repérez par où il passe : mur mitoyen, plancher, plafond, mais aussi prises, conduits et jonctions (transmissions latérales).",
      "Bouchez d'abord les fuites d'air et de son, puis ajoutez masse et désolidarisation là où c'est utile.",
      "Traitez les bruits de pas à la source quand c'est possible : le plancher du logement du dessus.",
      "Faites confirmer la solution selon l'assemblage, la séparation coupe-feu et les autorisations requises (propriétaire, syndicat).",
    ],
    claraCta: "Expliquer mon problème à Clara",
    claraNote: "Clara vous pose une question à la fois pour bien comprendre votre situation.",
    secondaryPro: "Vous faites de l'insonorisation? Présentez votre entreprise",
    kindsTitle: "Trois façons dont le bruit voyage",
    kinds: [
      { icon: Ear, title: "Bruits aériens", body: ["Voix, télévision, musique, chien qui aboie : le son voyage dans l'air et fait vibrer les parois.", "Les fuites comptent énormément : une prise électrique dos à dos, un joint ouvert ou un conduit partagé laisse passer beaucoup de son. Les professionnels comparent les assemblages avec l'indice ITS (STC en anglais)."] },
      { icon: Footprints, title: "Bruits d'impact", body: ["Pas, talons, chaises qu'on tire, objets qui tombent : le choc est transmis directement dans la structure.", "Ces bruits se corrigent surtout au plancher où ils se produisent. Les assemblages de plancher se comparent avec l'indice IIC."] },
      { icon: Waypoints, title: "Transmissions latérales", body: ["Le son contourne la paroi traitée : par le plancher continu sous un mur, les solives, les murs extérieurs, la plomberie ou la ventilation.", "C'est souvent pourquoi un mur refait donne un résultat décevant. Il faut regarder l'ensemble des chemins, pas une seule surface."] },
    ],
    placesTitle: "Selon votre situation",
    places: [
      { icon: Building2, title: "Mur mitoyen entre appartements", body: ["Vérifiez d'abord les prises, interrupteurs et jonctions avec le plancher et le plafond.", "Une contre-cloison désolidarisée ou une couche de gypse supplémentaire sur fixations antivibratiles peut aider, au prix d'un peu d'espace."] },
      { icon: Building2, title: "Plancher et plafond", body: ["Pour les bruits de pas, une sous-couche acoustique sous le revêtement du logement du dessus est généralement la piste la plus efficace.", "Du côté du dessous, un plafond suspendu désolidarisé avec absorbant peut réduire les bruits aériens et une partie des impacts."] },
      { icon: Building2, title: "Logement locatif", body: ["Au Québec, un locataire ne peut pas modifier le logement sans l'accord du propriétaire.", "Notez quand et comment le bruit se produit : ces détails aident à discuter d'une correction avec le propriétaire."] },
      { icon: Building2, title: "Duplex et triplex", body: ["Dans plusieurs plex plus anciens, des planchers de bois et des solives continues entre les logements transmettent facilement les pas.", "Un propriétaire occupant peut parfois intervenir des deux côtés, ce qui ouvre plus d'options."] },
      { icon: Building2, title: "Copropriété et condos", body: ["La déclaration de copropriété et les règlements encadrent souvent les revêtements de plancher et les sous-couches.", "Les murs et dalles entre unités sont souvent des parties communes : les travaux qui les touchent demandent l'autorisation du syndicat."] },
    ],
    solutionsTitle: "Solutions possibles, à faire confirmer",
    solutionsIntro: "Aucune solution ne convient à tous les bâtiments. Celles-ci se combinent selon l'assemblage existant, le type de bruit et l'accès disponible.",
    solutions: [
      { name: "Étanchéité acoustique", text: "Sceller les fuites aux prises, cadres, jonctions et traverses de tuyaux avec des produits adaptés. Souvent la première étape et la moins invasive." },
      { name: "Désolidarisation", text: "Séparer le nouveau parement de la structure (barres résilientes, attaches antivibratiles, ossature indépendante) pour couper la transmission des vibrations. Mal installée, elle perd son efficacité." },
      { name: "Laine minérale", text: "Placée dans une cavité, elle absorbe le son et améliore la performance de l'assemblage, surtout combinée à la masse et à la désolidarisation." },
      { name: "Gypse", text: "Ajouter de la masse avec une ou plusieurs couches de gypse, parfois de type acoustique ou coupe-feu selon l'assemblage requis." },
      { name: "Sous-couche acoustique", text: "Sous le revêtement de plancher, elle réduit les bruits d'impact à la source. En condo, elle doit souvent respecter les exigences du syndicat." },
      { name: "Plafond suspendu", text: "Un plafond désolidarisé du plancher du dessus, avec absorbant dans le vide, réduit la transmission. Il abaisse la hauteur de la pièce." },
    ],
    constraintsTitle: "Contraintes à vérifier avant les travaux",
    constraints: [
      { icon: ShieldAlert, title: "Séparation coupe-feu", body: ["Les murs et planchers entre logements sont généralement des séparations coupe-feu. Toute ouverture, boîtier ou luminaire encastré doit préserver leur résistance au feu.", "Utilisez un assemblage reconnu et faites appel à un entrepreneur titulaire de la licence RBQ appropriée."] },
      { icon: ShieldAlert, title: "Autorisations", body: ["Locataire : accord du propriétaire. Copropriétaire : autorisation du syndicat pour les parties communes et respect des règlements sur les planchers.", "Obtenez ces accords par écrit avant de commencer."] },
      { icon: ShieldAlert, title: "Accessibilité et espace", body: ["Une contre-cloison réduit la superficie, un plafond suspendu réduit la hauteur et un nouveau plancher peut créer un seuil aux portes.", "Tenez-en compte si une personne du logement utilise une aide à la mobilité."] },
    ],
    claraTitle: "Comment Clara vous aide",
    claraSteps: [
      "Elle distingue d'abord l'isolation sonore de l'isolation thermique (chaleur, froid).",
      "Elle précise la surface en cause, le type de bruit, le type de logement et votre secteur.",
      "Elle vérifie l'accès possible et les autorisations nécessaires, une question à la fois.",
    ],
    claraHonest: "Si aucun professionnel vérifié ne correspond à votre situation, Clara vous le dit franchement plutôt que de vous proposer un nom au hasard.",
    faqTitle: "Questions fréquentes",
    faqs: [
      { q: "La laine isolante seule suffit-elle à insonoriser?", a: "Rarement. La laine minérale absorbe le son dans une cavité, mais si le gypse reste fixé directement à la structure et que des fuites demeurent (prises, jonctions), le gain reste limité. Les meilleurs résultats combinent étanchéité, masse, absorption et désolidarisation." },
      { q: "Peut-on insonoriser sans tout démolir?", a: "Souvent, oui, en partie. On peut sceller les fuites, ajouter une couche de gypse sur fixations antivibratiles, construire une contre-cloison ou un plafond suspendu désolidarisé. Ces options prennent un peu d'espace et doivent préserver la séparation coupe-feu." },
      { q: "Comment réduire les bruits de pas du voisin d'en haut?", a: "La solution la plus efficace se trouve au plancher du dessus : une sous-couche acoustique sous le revêtement. De votre côté, un plafond suspendu désolidarisé peut atténuer une partie du bruit, sans l'éliminer complètement." },
      { q: "Faut-il une autorisation pour insonoriser un condo?", a: "Généralement, oui, pour tout ce qui touche les parties communes (murs mitoyens, dalles, structure) et pour changer un revêtement de plancher. Consultez la déclaration de copropriété et obtenez l'autorisation écrite du syndicat avant les travaux." },
      { q: "Combien coûte l'insonorisation entre deux logements?", a: "Il n'existe pas de prix fiable sans connaître l'assemblage existant. Le coût dépend de la surface, du type de bruit, de l'accès, de la démolition nécessaire, des exigences coupe-feu, des finitions et des règles de l'immeuble. Une évaluation sur place permet de chiffrer le bon scénario." },
    ],
    proTitle: "Vous faites de l'insonorisation?",
    proText: "Présentez votre entreprise, vos spécialités et votre territoire. UNPRO vérifie les informations avant toute recommandation.",
    proCta: "Présenter mon entreprise",
    crumbHome: "Accueil", crumbServices: "Services",
    crumbs: [
      { name: "Accueil", url: "https://unpro.ca/" },
      { name: "Services", url: "https://unpro.ca/services" },
      { name: "Insonorisation entre appartements et condos", url: SOUNDPROOFING_FR_URL },
    ],
  },
  en: {
    title: "Apartment and Condo Soundproofing: Walls, Floors, Ceilings | UNPRO",
    description: "Reduce noise between two units: airborne noise, footsteps, flanking paths, walls, floors and ceilings. Options to validate and condo rules in Quebec.",
    h1: "Soundproofing between apartments and condos",
    lead: "To reduce noise between two units, first identify which noise travels and through which path. Then combine the right principles for the actual assembly: sealing, mass, absorption and decoupling.",
    quickTitle: "In short: how to reduce noise between two units",
    quick: [
      "Identify the type of noise: voices, TV or music (airborne) or footsteps and knocks (impact).",
      "Find the path: shared wall, floor, ceiling, but also outlets, ducts and junctions (flanking paths).",
      "Seal air and sound leaks first, then add mass and decoupling where useful.",
      "Treat footsteps at the source when possible: the floor of the unit above.",
      "Have the solution confirmed for the assembly, the fire separation and the required approvals (landlord, syndicate).",
    ],
    claraCta: "Explain my problem to Clara",
    claraNote: "Clara currently replies in French and asks one question at a time.",
    secondaryPro: "Do you do soundproofing? Present your business",
    kindsTitle: "Three ways noise travels",
    kinds: [
      { icon: Ear, title: "Airborne noise", body: ["Voices, TV, music, a barking dog: sound travels through the air and makes walls vibrate.", "Leaks matter a lot: back-to-back outlets, open joints or shared ducts let a lot of sound through. Professionals compare assemblies using STC ratings."] },
      { icon: Footprints, title: "Impact noise", body: ["Footsteps, heels, chairs being dragged, dropped objects: the impact goes straight into the structure.", "These noises are mostly corrected at the floor where they occur. Floor assemblies are compared using IIC ratings."] },
      { icon: Waypoints, title: "Flanking paths", body: ["Sound bypasses the treated surface: through a continuous floor under a wall, joists, exterior walls, plumbing or ventilation.", "This is often why a rebuilt wall gives disappointing results. Look at every path, not just one surface."] },
    ],
    placesTitle: "Depending on your situation",
    places: [
      { icon: Building2, title: "Shared wall between apartments", body: ["Check outlets, switches and junctions with the floor and ceiling first.", "A decoupled furring wall or an extra drywall layer on isolation clips can help, at the cost of some space."] },
      { icon: Building2, title: "Floor and ceiling", body: ["For footsteps, an acoustic underlayment under the flooring of the unit above is generally the most effective option.", "From below, a decoupled suspended ceiling with absorption can reduce airborne noise and part of the impacts."] },
      { icon: Building2, title: "Rental unit", body: ["In Quebec, a tenant cannot alter the dwelling without the landlord's consent.", "Note when and how the noise happens: these details help when discussing a fix with the landlord."] },
      { icon: Building2, title: "Duplex and triplex", body: ["In many older plexes, wood floors and continuous joists between units easily transmit footsteps.", "An owner-occupant can sometimes work on both sides, which opens more options."] },
      { icon: Building2, title: "Condominiums", body: ["The declaration of co-ownership and building by-laws often regulate flooring and underlayments.", "Walls and slabs between units are often common portions: work affecting them requires the syndicate's approval."] },
    ],
    solutionsTitle: "Possible solutions, to be confirmed",
    solutionsIntro: "No solution fits every building. These are combined according to the existing assembly, the type of noise and the available access.",
    solutions: [
      { name: "Acoustic sealing", text: "Seal leaks at outlets, frames, junctions and pipe penetrations with suitable products. Often the first and least invasive step." },
      { name: "Decoupling", text: "Separate the new finish from the structure (resilient channels, isolation clips, independent framing) to cut vibration transfer. Poorly installed, it loses its effect." },
      { name: "Mineral wool", text: "Placed in a cavity, it absorbs sound and improves the assembly, especially combined with mass and decoupling." },
      { name: "Drywall", text: "Add mass with one or more drywall layers, sometimes acoustic or fire-rated depending on the required assembly." },
      { name: "Acoustic underlayment", text: "Under the flooring, it reduces impact noise at the source. In condos, it often must meet the syndicate's requirements." },
      { name: "Suspended ceiling", text: "A ceiling decoupled from the floor above, with absorption in the cavity, reduces transmission. It lowers the room height." },
    ],
    constraintsTitle: "Constraints to check before work",
    constraints: [
      { icon: ShieldAlert, title: "Fire separation", body: ["Walls and floors between units are generally fire separations. Any opening, box or recessed light must preserve their fire resistance.", "Use a recognized assembly and hire a contractor holding the appropriate RBQ licence."] },
      { icon: ShieldAlert, title: "Approvals", body: ["Tenant: landlord's consent. Condo owner: syndicate approval for common portions and compliance with flooring by-laws.", "Get these approvals in writing before starting."] },
      { icon: ShieldAlert, title: "Accessibility and space", body: ["A furring wall reduces floor area, a suspended ceiling reduces height and new flooring can create a threshold at doors.", "Keep this in mind if someone in the unit uses a mobility aid."] },
    ],
    claraTitle: "How Clara helps",
    claraSteps: [
      "She first separates soundproofing from thermal insulation (heat, cold).",
      "She clarifies the surface involved, the type of noise, the type of unit and your area.",
      "She checks possible access and the approvals needed, one question at a time.",
    ],
    claraHonest: "If no verified professional matches your situation, Clara says so plainly rather than suggesting a random name.",
    faqTitle: "Frequently asked questions",
    faqs: [
      { q: "Is insulation alone enough to soundproof?", a: "Rarely. Mineral wool absorbs sound in a cavity, but if the drywall stays fastened directly to the structure and leaks remain (outlets, junctions), the gain is limited. The best results combine sealing, mass, absorption and decoupling." },
      { q: "Can you soundproof without demolishing everything?", a: "Often, partly. You can seal leaks, add a drywall layer on isolation clips, or build a decoupled furring wall or suspended ceiling. These options take some space and must preserve the fire separation." },
      { q: "How do I reduce footsteps from the upstairs neighbour?", a: "The most effective fix is at the floor above: an acoustic underlayment under the flooring. From your side, a decoupled suspended ceiling can reduce part of the noise, without eliminating it." },
      { q: "Do I need approval to soundproof a condo?", a: "Generally yes, for anything affecting common portions (shared walls, slabs, structure) and to change flooring. Check the declaration of co-ownership and get the syndicate's written approval before work." },
      { q: "How much does soundproofing between two units cost?", a: "There is no reliable price without knowing the existing assembly. Cost depends on the area, type of noise, access, demolition needed, fire requirements, finishes and building rules. An on-site assessment is needed to price the right scenario." },
    ],
    proTitle: "Do you do soundproofing?",
    proText: "Present your business, specialties and service area. UNPRO verifies the information before any recommendation.",
    proCta: "Present my business",
    crumbHome: "Home",
    crumbs: [
      { name: "Home", url: "https://unpro.ca/" },
      { name: "Soundproofing between apartments and condos", url: SOUNDPROOFING_EN_URL },
    ],
  },
};

export default function PageSoundproofingPillar({ lang = "fr" }: { lang?: Lang }) {
  const c = CONTENT[lang];
  const isFr = lang === "fr";
  const canonical = isFr ? SOUNDPROOFING_FR_URL : SOUNDPROOFING_EN_URL;

  const CtaRow = ({ id }: { id: string }) => (
    <div className="flex flex-col sm:flex-row gap-3" data-cta-row={id}>
      <Button asChild size="lg" className="min-h-11">
        <Link to={SOUNDPROOFING_CLARA_HREF}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {c.claraCta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="min-h-11">
        <Link to="/entrepreneurs">{c.secondaryPro}</Link>
      </Button>
    </div>
  );

  return (
    <MainLayout>
      <SeoHead
        title={c.title}
        description={c.description}
        canonical={canonical}
        frenchCanonical={SOUNDPROOFING_FR_URL}
        englishCanonical={SOUNDPROOFING_EN_URL}
        lang={isFr ? "fr-CA" : "en-CA"}
        ogType="article"
      />
      <SchemaStack breadcrumbs={c.crumbs} />

      <article className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-12">
        <nav aria-label={isFr ? "Fil d'Ariane" : "Breadcrumb"} className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1">
            <li><Link to={isFr ? "/" : "/"} className="hover:text-foreground underline-offset-4 hover:underline">{c.crumbHome}</Link></li>
            {c.crumbServices && (
              <li className="flex items-center gap-1"><span aria-hidden="true">/</span><Link to="/services" className="hover:text-foreground underline-offset-4 hover:underline">{c.crumbServices}</Link></li>
            )}
            <li className="flex items-center gap-1"><span aria-hidden="true">/</span><span aria-current="page" className="text-foreground">{c.h1}</span></li>
          </ol>
        </nav>

        <header className="space-y-5">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">{c.h1}</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">{c.lead}</p>
          <CtaRow id="top" />
          <p className="text-sm text-muted-foreground">{c.claraNote}</p>
          <p className="text-sm">
            <Link to={isFr ? "/en/soundproofing" : "/insonorisation"} hrefLang={isFr ? "en-CA" : "fr-CA"} className="text-primary underline-offset-4 hover:underline">
              {isFr ? "English version" : "Version française"}
            </Link>
          </p>
        </header>

        <section aria-labelledby="quick" className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 id="quick" className="text-xl md:text-2xl font-bold text-foreground mb-4">{c.quickTitle}</h2>
          <ol className="list-decimal pl-5 space-y-2 text-foreground">
            {c.quick.map((q) => <li key={q}>{q}</li>)}
          </ol>
        </section>

        <section aria-labelledby="kinds" className="space-y-4">
          <h2 id="kinds" className="text-2xl font-bold text-foreground">{c.kindsTitle}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {c.kinds.map((k) => (
              <Card key={k.title}><CardContent className="pt-6 space-y-2">
                <k.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="font-semibold text-foreground">{k.title}</h3>
                {k.body.map((b) => <p key={b} className="text-sm text-muted-foreground">{b}</p>)}
              </CardContent></Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="places" className="space-y-4">
          <h2 id="places" className="text-2xl font-bold text-foreground">{c.placesTitle}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {c.places.map((p) => (
              <div key={p.title} className="rounded-2xl border border-border p-5 space-y-2">
                <h3 className="font-semibold text-foreground">{p.title}</h3>
                {p.body.map((b) => <p key={b} className="text-sm text-muted-foreground">{b}</p>)}
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="solutions" className="space-y-4">
          <h2 id="solutions" className="text-2xl font-bold text-foreground">{c.solutionsTitle}</h2>
          <p className="text-muted-foreground">{c.solutionsIntro}</p>
          <dl className="grid gap-4 md:grid-cols-2">
            {c.solutions.map((s) => (
              <div key={s.name} className="rounded-2xl border border-border p-5">
                <dt className="font-semibold text-foreground">{s.name}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{s.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="constraints" className="space-y-4">
          <h2 id="constraints" className="text-2xl font-bold text-foreground">{c.constraintsTitle}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {c.constraints.map((k) => (
              <Card key={k.title}><CardContent className="pt-6 space-y-2">
                <k.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="font-semibold text-foreground">{k.title}</h3>
                {k.body.map((b) => <p key={b} className="text-sm text-muted-foreground">{b}</p>)}
              </CardContent></Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="clara" className="rounded-2xl border border-primary/40 bg-card p-5 md:p-6 space-y-4">
          <h2 id="clara" className="text-2xl font-bold text-foreground">{c.claraTitle}</h2>
          <ul className="list-disc pl-5 space-y-2 text-foreground">
            {c.claraSteps.map((s) => <li key={s}>{s}</li>)}
          </ul>
          <p className="text-sm text-muted-foreground">{c.claraHonest}</p>
          <Button asChild size="lg" className="min-h-11">
            <Link to={SOUNDPROOFING_CLARA_HREF}><MessageCircle className="h-4 w-4" aria-hidden="true" />{c.claraCta}</Link>
          </Button>
        </section>

        <section aria-labelledby="faq" className="space-y-4">
          <h2 id="faq" className="text-2xl font-bold text-foreground">{c.faqTitle}</h2>
          <div className="space-y-5">
            {c.faqs.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-foreground">{f.q}</h3>
                <p className="mt-1 text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="pro" className="rounded-2xl border border-border p-5 md:p-6 space-y-3">
          <h2 id="pro" className="text-xl font-bold text-foreground">{c.proTitle}</h2>
          <p className="text-muted-foreground">{c.proText}</p>
          <Button asChild variant="outline" className="min-h-11">
            <Link to="/entrepreneurs">{c.proCta}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </Button>
        </section>
      </article>

      {/* CTA Clara toujours visible sur mobile */}
      <div className="md:hidden sticky bottom-20 z-30 px-4 pb-2">
        <Button asChild size="lg" className="w-full min-h-12 shadow-lg">
          <Link to={SOUNDPROOFING_CLARA_HREF}><MessageCircle className="h-4 w-4" aria-hidden="true" />{c.claraCta}</Link>
        </Button>
      </div>
    </MainLayout>
  );
}
