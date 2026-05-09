/**
 * UNPRO — /solution/:service  (service hub, lists cities)
 */
import { useParams, Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SchemaStack from "@/seo/components/SchemaStack";
import { getServiceBySlug } from "@/seo/data/services";
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
      </article>
    </MainLayout>
  );
}
