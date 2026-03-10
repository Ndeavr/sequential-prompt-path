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
        Comment UNPRO peut vous aider
      </h2>
      <p className="text-muted-foreground leading-relaxed">
        UNPRO vous aide à trouver des entrepreneurs vérifiés{service}{location}, 
        comparer les soumissions et prendre des décisions éclairées pour vos travaux.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild>
          <Link to={searchUrl}>
            <Search className="mr-2 h-4 w-4" />
            Trouver un entrepreneur
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/dashboard/quotes/upload">
            <Upload className="mr-2 h-4 w-4" />
            Analyser une soumission
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default SeoCta;
