/**
 * UNPRO — SEO Directory Page
 * Landing page listing all SEO content by category.
 * Route: /services, /problems, or unified /explore
 */

import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import { SEO_SERVICES } from "@/seo/data/services";
import { SEO_PROBLEMS } from "@/seo/data/problems";
import { SEO_CITIES } from "@/seo/data/cities";
import { SEO_GUIDES } from "@/seo/data/guides";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, AlertTriangle, BookOpen, MapPin } from "lucide-react";

const SeoDirectoryPage = () => {
  return (
    <MainLayout>
      <SeoHead
        title="Services, problèmes et guides résidentiels | UNPRO"
        description="Explorez nos ressources sur les services résidentiels, problèmes courants et guides pratiques pour propriétaires au Québec."
      />

      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-12">
        <header>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Ressources pour propriétaires
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Guides, services et solutions pour entretenir et améliorer votre propriété au Québec.
          </p>
        </header>

        {/* Services */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Services
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SEO_SERVICES.map((service) => (
              <Card key={service.slug}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{service.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {service.shortDescription}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {SEO_CITIES.slice(0, 4).map((city) => (
                      <Badge key={city.slug} variant="outline" asChild>
                        <Link to={`/services/${service.slug}/${city.slug}`}>
                          {city.name}
                        </Link>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Problems */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Problèmes courants
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SEO_PROBLEMS.map((problem) => (
              <Card key={problem.slug}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{problem.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {problem.shortDescription}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {SEO_CITIES.slice(0, 4).map((city) => (
                      <Badge key={city.slug} variant="outline" asChild>
                        <Link to={`/problems/${problem.slug}/${city.slug}`}>
                          {city.name}
                        </Link>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Guides */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Guides pratiques
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SEO_GUIDES.map((guide) => (
              <Card key={guide.slug} asChild>
                <Link to={`/guides/${guide.slug}`}>
                  <CardHeader>
                    <CardTitle className="text-base">{guide.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {guide.metaDescription}
                    </p>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        </section>

        {/* Cities index */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Villes couvertes
          </h2>
          <div className="flex flex-wrap gap-2">
            {SEO_CITIES.map((city) => (
              <Badge key={city.slug} variant="secondary" className="text-sm">
                {city.name} ({city.region})
              </Badge>
            ))}
          </div>
        </section>
      </div>
    </MainLayout>
  );
};

export default SeoDirectoryPage;
