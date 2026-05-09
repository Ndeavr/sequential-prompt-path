/**
 * UNPRO — /solution/:service/:city  (and /:neighborhood depth)
 * Core money page. AEO-ready.
 */
import { useParams } from "react-router-dom";
import AeoServicePageTemplate from "@/seo/components/AeoServicePageTemplate";
import { getServiceBySlug } from "@/seo/data/services";
import { SEO_CITIES } from "@/seo/data/cities";
import { canonicals } from "@/seo/services/canonicalManager";
import NotFound from "@/pages/NotFound";

const POSTAL_PREFIX: Record<string, string> = {
  montreal: "H", laval: "H7", longueuil: "J4", brossard: "J4Z",
  terrebonne: "J6W", quebec: "G1", gatineau: "J8", sherbrooke: "J1",
};

export default function SolutionServiceCityPage() {
  const { service, city, neighborhood } = useParams<{ service: string; city: string; neighborhood?: string }>();
  const svc = service ? getServiceBySlug(service) : undefined;
  const ctyData = SEO_CITIES.find((c) => c.slug === city);
  if (!svc || !ctyData) return <NotFound />;

  const cityName = ctyData.name;
  const canonical = canonicals.solution(svc.slug, ctyData.slug, neighborhood);
  const year = new Date().getFullYear();

  const h1 = `${svc.name} à ${cityName}${neighborhood ? ` — ${neighborhood}` : ""} — ${year}`;
  const title = `${svc.name} ${cityName} — Prix & Entrepreneurs Certifiés ${year} | UNPRO`;
  const description = `Prix, conseils et entrepreneurs vérifiés pour ${svc.name.toLowerCase()} à ${cityName}. Recommandation IA en moins de 5 secondes.`.slice(0, 155);

  const question = `Combien coûte ${svc.name.toLowerCase()} à ${cityName} en ${year}?`;
  const answer = `À ${cityName}, ${svc.name.toLowerCase()} coûte généralement entre ${svc.costEstimate.low.toLocaleString("fr-CA")} $ et ${svc.costEstimate.high.toLocaleString("fr-CA")} $ par ${svc.costEstimate.unit}. ${svc.shortDescription}`;

  const priceTable = [
    { label: `${svc.name} — entrée de gamme`, range: `${svc.costEstimate.low.toLocaleString("fr-CA")} $` },
    { label: `${svc.name} — moyenne`, range: `${Math.round((svc.costEstimate.low + svc.costEstimate.high) / 2).toLocaleString("fr-CA")} $` },
    { label: `${svc.name} — haut de gamme`, range: `${svc.costEstimate.high.toLocaleString("fr-CA")} $` },
  ];

  const faqs = [
    { question: `Combien coûte ${svc.name.toLowerCase()} à ${cityName}?`,
      answer: `En ${year}, prévoir entre ${svc.costEstimate.low.toLocaleString("fr-CA")} $ et ${svc.costEstimate.high.toLocaleString("fr-CA")} $ selon l'ampleur du projet et la qualité des matériaux.` },
    { question: `Quels sont les facteurs qui influencent le prix?`,
      answer: svc.pricingFactors.join(". ") + "." },
    { question: `Quand devrais-je faire faire ${svc.name.toLowerCase()}?`,
      answer: svc.whenToAct.join(". ") + "." },
    { question: `Pourquoi ${svc.name.toLowerCase()} est-il important?`, answer: svc.whyItMatters },
    { question: `Comment trouver un entrepreneur fiable à ${cityName}?`,
      answer: `UNPRO recommande un seul professionnel pré-vérifié (RBQ, assurances, score AIPP, avis) plutôt que de demander 3 soumissions. Vous économisez du temps et obtenez une recommandation alignée sur votre besoin.` },
  ];

  const breadcrumbs = [
    { name: "Accueil", url: "https://unpro.ca" },
    { name: "Solutions", url: "https://unpro.ca/solution" },
    { name: svc.name, url: `https://unpro.ca/solution/${svc.slug}` },
    { name: cityName, url: canonical },
  ];

  const internalLinks = [
    ...svc.relatedServices.slice(0, 3).map((s) => ({ to: `/solution/${s}/${ctyData.slug}`, label: `${s.replace(/-/g, " ")} à ${cityName}` })),
    { to: `/guide/comment-choisir-${svc.contractorType}`, label: `Guide : comment choisir un ${svc.contractorType}` },
    { to: `/ville/${ctyData.slug}`, label: `Tous les services à ${cityName}` },
  ];

  return (
    <AeoServicePageTemplate
      title={title}
      description={description}
      canonical={canonical}
      h1={h1}
      question={question}
      answer={answer}
      service={svc.name}
      city={cityName}
      region={ctyData.region}
      postalPrefix={POSTAL_PREFIX[ctyData.slug]}
      neighborhood={neighborhood}
      priceTable={priceTable}
      faqs={faqs}
      internalLinks={internalLinks}
      breadcrumbs={breadcrumbs}
    />
  );
}
