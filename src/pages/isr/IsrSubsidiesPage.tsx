import { Link } from "react-router-dom";
import SeoHead from "@/seo/components/SeoHead";
import atticPhoto from "@/assets/seo/isolation-grenier-hero.jpg";

export const ISR_SUBSIDIES_PATH = "/c/isolation-solution-royal/subventions-renoclimat-logisvert";
const canonical = `https://unpro.ca${ISR_SUBSIDIES_PATH}`;
const reno = "https://www.quebec.ca/habitation-territoire/chauffage-consommation-energie/aide-financiere-renovation-ecoenergetique/renoclimat/nouveautes-adaptation-inondations";
const guide = "https://cdn-contenu.quebec.ca/cdn-contenu/environnement/transition-energetique/residentiel-renoclimat/renoclimat-guide-participant.pdf";
const logis = "https://www.hydroquebec.com/residentiel/mieux-consommer/aides-financieres/logisvert/residentiel.html";
const faqs = [
  ["R-50 ou R-60 : quelle isolation viser?", "LogisVert exige au moins R-50 pour la mesure isolation du toit et calfeutrage. Le nouveau parcours Rénoclimat vise R-60 dans le grenier, avec un ajout minimal de R-20 sur au moins 300 pi². L’isolant existant et la superficie permettent de préparer le bon projet."],
  ["L’inspection gratuite ISR est-elle une évaluation Rénoclimat?", "L’inspection ISR sert à examiner votre entretoit et à définir les travaux. L’évaluation énergétique Rénoclimat est une démarche distincte auprès d’un organisme reconnu. Elle est recommandée, mais facultative dans le nouveau parcours."],
  ["Peut-on additionner les deux subventions?", "Comparez les programmes avant de calculer votre budget. Le cumul dépend des règles applicables à chaque mesure et à votre dossier : les montants présentés ici ne constituent pas une offre combinée de 3 500 $."],
];
function BookingLink() {
  return <div className="mt-6"><Link className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 py-4 text-center font-semibold text-primary-foreground focus-visible:outline focus-visible:outline-2" to="/c/isolation-solution-royal/isolation-entretoit?utm_source=unpro&utm_medium=organic&utm_campaign=subventions">Prenez rendez-vous maintenant →</Link><p className="mt-3 text-sm text-muted-foreground">Inspection gratuite · Prévoyez 60 minutes</p></div>;
}
export default function IsrSubsidiesPage() {
  return <main className="min-h-screen bg-background text-foreground">
    <SeoHead title="Subventions isolation : Rénoclimat et LogisVert | ISR" description="Isolation d’entretoit : comparez Rénoclimat et LogisVert, les montants et les critères R-50/R-60. Inspection gratuite ISR de 60 minutes." canonical={canonical} ogType="article" ogImage={`https://unpro.ca${atticPhoto}`} includeAlternates={false} />
    <script type="application/ld+json">{JSON.stringify({"@context":"https://schema.org", "@graph":[{"@type":"Article",headline:"Subventions Rénoclimat et LogisVert pour l’isolation de votre entretoit",datePublished:"2026-11-07",dateModified:"2026-11-07",inLanguage:"fr-CA",mainEntityOfPage:canonical,image:`https://unpro.ca${atticPhoto}`,author:{"@type":"Organization",name:"UNPRO",url:"https://unpro.ca"}},{"@type":"FAQPage",mainEntity:faqs.map(([name,text])=>({"@type":"Question",name,acceptedAnswer:{"@type":"Answer",text}}))}]})}</script>
    <header className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-6"><img src="/brands/isr/isr-logo-square.svg" alt="" width="48" height="48"/><span className="font-semibold">Isolation Solution Royal <span className="text-muted-foreground">× UNPRO</span></span></header>
    <article className="mx-auto max-w-4xl px-5 pb-12">
      <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-primary">Isolation d’entretoit · Subventions au Québec</p>
      <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">Un entretoit mieux isolé. Des subventions pour alléger votre facture.</h1>
      <p className="mt-5 text-lg text-muted-foreground">Rénoclimat et LogisVert soutiennent des travaux d’isolation admissibles. Avec Isolation Solution Royal, commencez par une inspection de votre entretoit pour préciser les travaux et comparer les critères des programmes.</p>
      <BookingLink/>
      <img src={atticPhoto} alt="Isolation en fibre de verre dans un entretoit résidentiel" width="1280" height="720" className="mt-8 aspect-video w-full rounded-2xl object-cover" decoding="async"/>
      <p className="mt-3 text-xs text-muted-foreground">Critères officiels consultés le 7 novembre 2026.</p>
      <h2 className="mb-5 mt-10 text-2xl font-bold">Quelle aide pour votre projet?</h2>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6"><h3 className="text-xl font-semibold">Rénoclimat</h3><p className="my-3 text-3xl font-bold text-primary">Jusqu’à 2 000 $</p><p>Pour l’isolation du toit d’une maison, à 1,75 $/pi² admissible. Le plafond atteint 5 000 $ pour un duplex, triplex ou immeuble résidentiel à logements multiples admissible.</p><p className="mt-4">Dans un grenier : atteindre R-60, ajouter au moins R-20 et traiter au moins 300 pi².</p><a href={guide} className="mt-5 inline-block underline">Consulter les critères Rénoclimat →</a></section>
        <section className="rounded-2xl border border-border bg-card p-6"><h3 className="text-xl font-semibold">LogisVert · Hydro-Québec</h3><p className="my-3 text-3xl font-bold text-primary">1 500 $</p><p>Pour l’isolation du toit combinée aux travaux de calfeutrage requis, dans une maison admissible chauffée principalement à l’électricité.</p><p className="mt-4">Isoler 100 % de la surface du toit à au moins R-50 et réaliser le calfeutrage prescrit, notamment aux portes, fenêtres et trappes d’accès. Les deux travaux sont nécessaires.</p><a href={logis} className="mt-5 inline-block underline">Consulter les critères LogisVert →</a></section>
      </div>
      <section className="mt-10 space-y-4"><h2 className="text-2xl font-bold">Rénoclimat : les nouveautés depuis le 1er octobre 2026</h2><p>L’évaluation énergétique avant travaux devient facultative dans le nouveau parcours. Les travaux doivent respecter les critères techniques et être effectués par un entrepreneur détenant les licences appropriées. Conservez les factures et l’attestation de conformité signée par l’entrepreneur.</p><p>Un dossier commencé sous les anciennes modalités suit des règles transitoires : l’évaluation après travaux doit être réalisée au plus tard le 31 mars 2027. Vérifiez votre parcours avant de commencer.</p><a className="inline-block underline" href={reno}>Voir les nouvelles modalités et l’accès au portail officiel →</a></section>
      <section className="mt-10 space-y-4"><h2 className="text-2xl font-bold">Préparez votre inspection gratuite de 60 minutes</h2><p>Prévoyez l’adresse de la propriété, l’accès à l’entretoit, les photos disponibles et tout dossier Rénoclimat déjà ouvert. L’inspection aide à examiner l’isolation, la ventilation et les points à améliorer avant de définir les travaux.</p><p>ISR offre l’isolation d’entretoit en fibre de verre soufflée, la ventilation et le calfeutrage. Secteurs desservis : Montréal, Laval, Terrebonne, Repentigny et plusieurs villes des Laurentides et de Lanaudière, selon l’adresse.</p><BookingLink/></section>
      <section className="mt-10"><h2 className="mb-5 text-2xl font-bold">Questions fréquentes</h2>{faqs.map(([q,a])=><details key={q} className="border-b border-border py-5"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-3 text-muted-foreground">{a}</p></details>)}</section>
      <p className="mt-8 text-sm text-muted-foreground">L’admissibilité et l’aide accordée sont déterminées par le programme choisi, selon votre habitation, vos travaux et vos pièces justificatives.</p>
    </article>
    <footer className="mx-auto max-w-4xl px-5 pb-8 text-sm text-muted-foreground"><Link to="/">UNPRO</Link> · <a href="https://isroyal.ca">Isolation Solution Royal</a></footer>
  </main>;
}
