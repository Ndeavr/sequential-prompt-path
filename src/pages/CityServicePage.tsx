import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Users, ArrowRight, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import PageHero from "@/components/shared/PageHero";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import CTASection from "@/components/shared/CTASection";
import FAQSection from "@/components/shared/FAQSection";
import ContractorCard from "@/components/shared/ContractorCard";
import RelatedLinksSection from "@/components/shared/RelatedLinksSection";
import { MOCK_CITIES } from "@/data/mockCities";
import { MOCK_CONTRACTORS } from "@/data/mockContractors";
import { MOCK_PROBLEM_CATEGORIES } from "@/data/mockProblems";
import { useEffect } from "react";
import { injectJsonLd, breadcrumbSchema, faqSchema, serviceSchema, localBusinessSchema } from "@/lib/seoSchema";

const CITY_FAQS: Record<string, { question: string; answer: string }[]> = {
  laval: [
    { question: "Combien coûte une rénovation de cuisine à Laval?", answer: "En moyenne entre 15 000 $ et 45 000 $ selon l'ampleur. Les cuisines IKEA avec installation pro débutent autour de 12 000 $." },
    { question: "Comment trouver un entrepreneur fiable à Laval?", answer: "UNPRO vérifie les licences RBQ, assurances et historique de chaque entrepreneur. Vous obtenez un rendez-vous garanti avec un professionnel qualifié." },
    { question: "Quels sont les problèmes de maison les plus courants à Laval?", answer: "L'isolation déficiente, les drains français bouchés et les problèmes de thermopompe sont les plus fréquents dans les bungalows des années 70-80." },
    { question: "Est-ce que UNPRO dessert tout Laval?", answer: "Oui, nous couvrons l'ensemble du territoire de Laval, de Sainte-Dorothée à Saint-François." },
    { question: "Faut-il un permis pour rénover à Laval?", answer: "La plupart des rénovations intérieures ne nécessitent pas de permis. Par contre, les modifications structurales, l'ajout de fenêtres et les travaux extérieurs majeurs en requièrent un." },
  ],
  terrebonne: [
    { question: "Quels sont les problèmes fréquents dans les maisons de Terrebonne?", answer: "L'isolation des greniers, les fissures de fondation et les problèmes de ventilation sont très courants dans les constructions des années 80-90." },
    { question: "Comment fonctionne UNPRO à Terrebonne?", answer: "Décrivez votre projet et nous vous jumelerons avec un entrepreneur vérifié de votre région. Un rendez-vous garanti, sans soumissions multiples." },
    { question: "Combien coûte une inspection de toiture à Terrebonne?", answer: "Entre 200 $ et 500 $ selon la taille de la toiture. Certains entrepreneurs offrent l'inspection gratuite avec les travaux." },
    { question: "Y a-t-il des subventions pour les rénovations à Terrebonne?", answer: "Oui, plusieurs programmes municipaux et provinciaux existent pour l'isolation, les thermopompes et l'efficacité énergétique." },
    { question: "Quelle est la meilleure période pour rénover à Terrebonne?", answer: "Le printemps et l'été sont idéaux pour les travaux extérieurs. Les rénovations intérieures peuvent se faire toute l'année." },
  ],
};

const SERVICE_CATEGORIES = ["Toiture", "Isolation", "Fondation", "Plomberie", "Électricité", "Fenêtres", "Cuisine", "Salle de bain", "Thermopompe", "Rénovation générale"];

export default function CityServicePage() {
  const { city: citySlug } = useParams<{ city: string }>();
  const city = MOCK_CITIES.find((c) => c.slug === citySlug);
  const cityName = city?.name || (citySlug ? citySlug.charAt(0).toUpperCase() + citySlug.slice(1) : "");
  const faqs = CITY_FAQS[citySlug || ""] || CITY_FAQS.laval;
  const localContractors = MOCK_CONTRACTORS.filter((c) => c.city.toLowerCase() === cityName.toLowerCase()).slice(0, 4);
  const localProblems = MOCK_PROBLEM_CATEGORIES.slice(0, 5);

  useEffect(() => {
    const cleanups = [
      injectJsonLd(breadcrumbSchema([
        { name: "Accueil", url: "https://unpro.ca" },
        { name: "Villes desservies", url: "https://unpro.ca/villes-desservies" },
        { name: `Services à ${cityName}`, url: `https://unpro.ca/services/${citySlug}` },
      ])),
      injectJsonLd(faqSchema(faqs)),
      injectJsonLd(serviceSchema(`Entrepreneurs vérifiés à ${cityName}`, `Trouvez des professionnels qualifiés à ${cityName}, Québec`, cityName)),
      injectJsonLd(localBusinessSchema(`UNPRO ${cityName}`, cityName)),
    ];
    return () => cleanups.forEach((c) => c());
  }, [citySlug, cityName]);

  return (
    <>
      <Helmet>
        <title>{`Services pour propriétaires à ${cityName} | UNPRO`}</title>
        <meta name="description" content={`Trouvez des entrepreneurs vérifiés à ${cityName}. Toiture, isolation, plomberie, fondation — rendez-vous garanti avec le bon professionnel.`} />
        <link rel="canonical" href={`https://unpro.ca/services/${citySlug}`} />
        <meta property="og:title" content={`Services à ${cityName} | UNPRO`} />
      </Helmet>

      <Breadcrumbs items={[
        { label: "Villes desservies", to: "/villes-desservies" },
        { label: `Services à ${cityName}` },
      ]} />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-12">
        <PageHero
          title={`Services pour propriétaires à ${cityName}`}
          subtitle={city?.intro || `Trouvez des entrepreneurs vérifiés et des professionnels qualifiés à ${cityName}.`}
          compact
        />

        {/* Service categories */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground font-display">Services disponibles</h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            {SERVICE_CATEGORIES.map((s) => (
              <Link key={s} to={`/trouver-un-entrepreneur`}>
                <Card className="hover:border-primary/30 hover:shadow-md transition-all group">
                  <CardContent className="p-4 text-center">
                    <Wrench className="h-5 w-5 text-primary mx-auto mb-1" />
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{s}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Local problems */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground font-display">Problèmes fréquents à {cityName}</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {localProblems.flatMap((c) => c.items.slice(0, 2).map((item) => (
              <Link key={`${c.slug}-${item.title}`} to={`/probleme/${c.slug}`} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-all group">
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                <span className="text-sm text-foreground">{item.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${
                  item.urgency === "critical" ? "bg-destructive/10 text-destructive" :
                  item.urgency === "high" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                }`}>{item.urgency === "critical" ? "Critique" : item.urgency === "high" ? "Élevé" : "Moyen"}</span>
              </Link>
            )))}
          </div>
        </section>

        {/* Featured contractors */}
        {localContractors.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground font-display">Professionnels en vedette</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {localContractors.map((c) => <ContractorCard key={c.id} {...c} />)}
            </div>
          </section>
        )}

        <FAQSection items={faqs} />

        <CTASection
          title={`Besoin d'un professionnel à ${cityName}?`}
          description="Décrivez votre projet et obtenez un rendez-vous garanti avec un entrepreneur vérifié."
          primaryCta={{ label: "Décrire mon projet", to: "/decrire-mon-projet" }}
          secondaryCta={{ label: "Parler à Alex", to: "/parler-a-alex" }}
          variant="accent"
        />

        <RelatedLinksSection links={[
          { to: "/problemes-maison", label: "Problèmes maison" },
          { to: "/blog", label: "Blog" },
          { to: "/trouver-un-entrepreneur", label: "Trouver un entrepreneur" },
          { to: "/villes-desservies", label: "Autres villes" },
        ]} />
      </div>
    </>
  );
}
