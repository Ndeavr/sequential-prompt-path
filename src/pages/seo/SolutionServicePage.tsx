/**
 * UNPRO — /solution/:service  (service hub, lists cities)
 */
import { useParams, Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SchemaStack from "@/seo/components/SchemaStack";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import { getServiceBySlug } from "@/seo/data/services";
import { getFaqsByTopics } from "@/seo/data/faqs";
import { SEO_CITIES } from "@/seo/data/cities";
import { canonicals } from "@/seo/services/canonicalManager";
import NotFound from "@/pages/NotFound";
import { ArrowRight, MapPin } from "lucide-react";

export default function SolutionServicePage() {
  const { service } = useParams<{ service: string }>();
  const svc = service ? getServiceBySlug(service) : undefined;
  if (!svc) return <NotFound />;

  const canonical = canonicals.solution(svc.slug);
  const year = new Date().getFullYear();
  const title = `${svc.name} au Québec — Prix, Guide & Entrepreneurs ${year} | UNPRO`;
  const description = `Tout savoir sur ${svc.name.toLowerCase()} au Québec : prix moyens, facteurs de coût, signes d'alerte. Recommandation IA d'entrepreneur en 5 secondes.`.slice(0, 155);

  const breadcrumbs = [
    { name: "Accueil", url: "https://unpro.ca" },
    { name: "Solutions", url: "https://unpro.ca/solution" },
    { name: svc.name, url: canonical },
  ];

  const relatedFaqs = getFaqsByTopics([svc.slug, svc.contractorType], 5);

  return (
    <MainLayout>
      <SeoHead title={title} description={description} canonical={canonical} />
      <SchemaStack breadcrumbs={breadcrumbs} />

      <article className="max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">{svc.name} — Guide complet {year}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">{svc.shortDescription}</p>
        </header>

        <section className="bg-card border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground">Coût moyen au Québec</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {svc.costEstimate.low.toLocaleString("fr-CA")} $ – {svc.costEstimate.high.toLocaleString("fr-CA")} $ <span className="text-sm font-normal text-muted-foreground">/ {svc.costEstimate.unit}</span>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">Pourquoi c'est important</h2>
          <p className="text-muted-foreground leading-relaxed">{svc.whyItMatters}</p>
        </section>

        {svc.pricingFactors.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">Ce qui influence le prix et le devis</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
              {svc.pricingFactors.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </section>
        )}

        {svc.whenToAct.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">Quand faire appel à un professionnel</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
              {svc.whenToAct.map((w) => <li key={w}>{w}</li>)}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">Comment UNPRO recommande un prestataire</h2>
          <p className="text-muted-foreground leading-relaxed">
            Clara clarifie d'abord votre situation : la nature et le volume des travaux, l'accès aux lieux
            (étages, escaliers, stationnement), la date souhaitée, le budget visé et votre façon de communiquer.
            UNPRO recommande ensuite le prestataire le plus compatible avec votre projet selon les informations
            disponibles — jamais le plus proche ni le moins cher par défaut.
          </p>
        </section>

        {relatedFaqs.length > 0 && <SeoFaqSection faqs={relatedFaqs} />}

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">Choisir une ville</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {SEO_CITIES.map((c) => (
              <Link key={c.slug} to={`/solution/${svc.slug}/${c.slug}`}
                    className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition text-sm text-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="flex-1">{c.name}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>

        {svc.relatedServices.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Services liés</h2>
            <div className="flex flex-wrap gap-2">
              {svc.relatedServices.map((rs) => (
                <Link key={rs} to={`/solution/${rs}`}
                      className="px-3 py-1.5 rounded-full border border-border text-sm text-foreground hover:border-primary hover:bg-primary/5 transition">
                  {rs.replace(/-/g, " ")}
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </MainLayout>
  );
}
