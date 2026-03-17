/**
 * UNPRO — Property Type × City × Problem SEO Page
 * Route: /:city/:type/:problem
 * Deep-intent page with costs, solutions, contractor matching, and cross-links.
 */
import { useParams, Link } from "react-router-dom";
import { useEffect } from "react";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SeoCta from "@/seo/components/SeoCta";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import SeoInternalLinks from "@/seo/components/SeoInternalLinks";
import { buildPropertyTypeProblemPage } from "@/seo/services/propertyTypeContentService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, Eye, ShieldAlert, CheckCircle, MapPin,
  DollarSign, Shield, ArrowRight, Calendar, Camera, Wrench,
} from "lucide-react";
import NotFound from "@/pages/NotFound";
import GrowthCtaBlock from "@/components/growth/GrowthCtaBlock";
import ContractorLandingCta from "@/components/growth/ContractorLandingCta";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const urgencyColor: Record<string, string> = {
  low: "bg-secondary/10 text-secondary",
  medium: "bg-accent/10 text-accent-foreground",
  high: "bg-destructive/10 text-destructive",
};

const PropertyTypeProblemPage = () => {
  const { city, type, problem: problemSlug } = useParams<{ city: string; type: string; problem: string }>();
  const data = type && city && problemSlug ? buildPropertyTypeProblemPage(type, city, problemSlug) : null;

  useEffect(() => {
    if (!data?.jsonLd) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(data.jsonLd);
    script.id = "seo-pt-problem-jsonld";
    document.getElementById("seo-pt-problem-jsonld")?.remove();
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [data?.jsonLd]);

  if (!data) return <NotFound />;
  const { propertyType: pt, city: cityData, problem } = data;
  const urgencyLevel = problem.urgencyScore >= 8 ? "high" : problem.urgencyScore >= 5 ? "medium" : "low";

  return (
    <MainLayout>
      <SeoHead title={data.metaTitle} description={data.metaDescription} canonical={`/${cityData.slug}/${pt.urlSlug}/${problem.slug}`} />

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-primary/5 via-background to-background pt-12 pb-10">
        <div className="container max-w-4xl mx-auto px-4">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <Link to={`/ville/${cityData.slug}`} className="hover:text-foreground transition-colors">{cityData.name}</Link>
              <span>/</span>
              <Link to={`/${cityData.slug}/${pt.urlSlug}`} className="hover:text-foreground transition-colors">{pt.nameFr}</Link>
              <span>/</span>
              <span className="text-foreground font-medium">{problem.nameFr}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
              {data.h1}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
              {data.intro}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge className={urgencyColor[urgencyLevel]}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Urgence {problem.urgencyScore}/10
              </Badge>
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" />
                {cityData.name}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {problem.bestSeason}
              </Badge>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Answer + Cost */}
      <section className="container max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5 space-y-2">
              <h2 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Coût estimé au Québec
              </h2>
              <p className="text-2xl font-bold text-foreground">
                {data.costRange.low.toLocaleString()}$ — {data.costRange.high.toLocaleString()}$
              </p>
              <p className="text-xs text-muted-foreground">par {data.costRange.unit}</p>
            </CardContent>
          </Card>
          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="p-5 space-y-2">
              <h2 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                <Wrench className="h-4 w-4 text-accent" />
                Entrepreneur recommandé
              </h2>
              <p className="text-lg font-semibold text-foreground capitalize">
                {data.contractorCategory.replace(/_/g, " ")}
              </p>
              <Button asChild size="sm" variant="outline" className="gap-1 mt-1">
                <Link to={`/search?specialty=${data.contractorCategory}&city=${cityData.name}`}>
                  Trouver <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Why it happens */}
      <section className="container max-w-4xl mx-auto px-4 py-6 space-y-4">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <h2 className="font-display text-xl font-bold text-foreground">
            Pourquoi ce problème arrive
          </h2>
          <p className="text-muted-foreground leading-relaxed mt-2">{data.whyItHappens}</p>
        </motion.div>
      </section>

      {/* Signs + Risks side by side */}
      <section className="container max-w-4xl mx-auto px-4 py-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <Card className="h-full">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  Signes à surveiller
                </h3>
                <ul className="space-y-2">
                  {data.signsToWatch.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <Card className="h-full">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  Risques si non traité
                </h3>
                <ul className="space-y-2">
                  {data.risksIfIgnored.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Solutions */}
      <section className="container max-w-4xl mx-auto px-4 py-6 space-y-4">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <h2 className="font-display text-xl font-bold text-foreground">Solutions recommandées</h2>
          <ol className="mt-3 space-y-3">
            {data.solutions.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </motion.div>
      </section>

      {/* Local context */}
      <section className="container max-w-4xl mx-auto px-4 py-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <h2 className="font-display text-base font-semibold text-foreground flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-primary" />
              Contexte local — {cityData.name}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.localContext}</p>
          </CardContent>
        </Card>
      </section>

      {/* Sticky CTA */}
      <section className="container max-w-4xl mx-auto px-4 py-8">
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="p-6 text-center space-y-4">
            <Shield className="h-8 w-8 text-primary mx-auto" />
            <h3 className="font-display text-xl font-bold text-foreground">
              Besoin d'aide avec votre {pt.nameFr.toLowerCase()} ?
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Rendez-vous exclusifs. Jamais de leads partagés. Entrepreneurs vérifiés par IA.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link to="/describe-project">
                  Décrire mon projet <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link to={`/search?specialty=${data.contractorCategory}&city=${cityData.name}`}>
                  <Camera className="h-4 w-4" /> Trouver un entrepreneur
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Internal Links */}
      <section className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <SeoInternalLinks heading={`${problem.nameFr} dans les villes voisines`} links={data.nearbyCityLinks} />
        <SeoInternalLinks heading={`Autres problèmes — ${pt.nameFr} à ${cityData.name}`} links={data.otherProblemLinks} />
        <div className="flex flex-wrap gap-3">
          <Link to={data.parentTypeLink.to}>
            <Badge variant="outline" className="hover:bg-primary/5 cursor-pointer">{data.parentTypeLink.label}</Badge>
          </Link>
          <Link to={data.familyHubLink.to}>
            <Badge variant="outline" className="hover:bg-primary/5 cursor-pointer">{data.familyHubLink.label}</Badge>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      {data.faqs.length > 0 && (
        <section className="container max-w-4xl mx-auto px-4 py-8">
          <SeoFaqSection faqs={data.faqs} heading={`FAQ — ${problem.nameFr} ${pt.nameFr}`} />
        </section>
      )}

      <section className="container max-w-4xl mx-auto px-4 py-10">
        <GrowthCtaBlock />
      </section>
      <ContractorLandingCta />
      <SeoCta />
    </MainLayout>
  );
};

export default PropertyTypeProblemPage;
