/**
 * UNPRO — SEO CTA Block
 * Reusable call-to-action section for SEO pages.
 */

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Upload, Search } from "lucide-react";

interface SeoCtaProps {
  searchUrl: string;
  cityName?: string;
  serviceName?: string;
}

const SeoCta = ({ searchUrl, cityName, serviceName }: SeoCtaProps) => {
  const location = cityName ? ` à ${cityName}` : "";
  const service = serviceName ? ` en ${serviceName.toLowerCase()}` : "";

  return (
    <section className="rounded-xl border bg-card p-6 md:p-8 space-y-4">
      <h2 className="text-xl font-bold text-foreground">
        Obtenez un rendez-vous garanti
      </h2>
      <p className="text-muted-foreground leading-relaxed">
        UNPRO remplace les soumissions multiples par un rendez-vous garanti avec le bon entrepreneur{service}{location}. 
        Jumelage précis, entrepreneurs vérifiés, aucun spam.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild>
          <Link to={searchUrl}>
            <Search className="mr-2 h-4 w-4" />
            Obtenir mon rendez-vous
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/comment-ca-marche">
            Comment ça fonctionne
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default SeoCta;
