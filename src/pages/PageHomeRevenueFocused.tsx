/**
 * UNPRO — Homepage Revenue-Focused
 * Single hero + trust strip. ≤1 viewport. Two CTAs only.
 */
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Calendar, MapPin } from "lucide-react";
import PublicLayout from "@/layouts/PublicLayout";
import AlexOrb from "@/components/alex/AlexOrb";
import { Button } from "@/components/ui/button";

export default function PageHomeRevenueFocused() {
  return (
    <PublicLayout>
      <Helmet>
        <title>UNPRO — Le bon entrepreneur. Dès la première fois.</title>
        <meta
          name="description"
          content="Décrivez votre besoin. Alex vous guide et recommande les meilleurs pros selon votre situation. Rendez-vous garanti."
        />
        <link rel="canonical" href="https://unpro.ca" />
      </Helmet>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-2xl mx-auto text-center flex flex-col items-center gap-7">
          <div className="mt-2">
            <AlexOrb size="md" />
          </div>

          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-foreground leading-[1.05]">
            Le bon entrepreneur.
            <br />
            <span className="text-primary">Dès la première fois.</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-md leading-relaxed">
            Décrivez votre besoin. Alex vous guide et recommande les meilleurs
            pros selon votre situation.
          </p>

          <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md mt-2">
            <Button asChild size="lg" className="h-12 text-base font-medium gap-2">
              <Link to="/alex-match">
                Trouver maintenant
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 text-base font-medium border-white/15 bg-white/5 hover:bg-white/10"
            >
              <Link to="/join">Je suis entrepreneur</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-3xl px-5 py-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs sm:text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Entrepreneurs vérifiés
          </span>
          <span className="inline-flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Disponibilité confirmée
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Partout au Québec
          </span>
        </div>
      </section>
    </PublicLayout>
  );
}
