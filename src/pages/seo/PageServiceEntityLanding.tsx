/**
 * PageServiceEntityLanding — Dynamic AEO service entity page
 * Route: /services/:entitySlug/:citySlug
 * Fetches from content_pages + service_entity_master + service_entity_city
 */
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SeoHead from "@/seo/components/SeoHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar, ArrowRight, AlertTriangle, DollarSign, Shield, MapPin, Clock, Star, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const URGENCY_CONFIG: Record<string, { color: string; label: string; icon: typeof AlertTriangle }> = {
  critical: { color: "text-red-500", label: "Urgence élevée", icon: AlertTriangle },
  high: { color: "text-orange-500", label: "À traiter rapidement", icon: Clock },
  medium: { color: "text-yellow-600", label: "Priorité moyenne", icon: Clock },
  low: { color: "text-green-600", label: "Non urgent", icon: Clock },
};

export default function PageServiceEntityLanding() {
  const { entitySlug, citySlug } = useParams<{ entitySlug: string; citySlug: string }>();
  const navigate = useNavigate();

  const { data: entity, isLoading: loadingEntity } = useQuery({
    queryKey: ["service-entity", entitySlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_entity_master")
        .select("*")
        .eq("slug", entitySlug!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!entitySlug,
  });

  const { data: cityData } = useQuery({
    queryKey: ["service-entity-city", entity?.id, citySlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_entity_city")
        .select("*")
        .eq("entity_id", entity!.id)
        .eq("city_slug", citySlug!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!entity?.id && !!citySlug,
  });

  const { data: contentPage } = useQuery({
    queryKey: ["content-page", entity?.id, citySlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_pages")
        .select("*")
        .eq("entity_id", entity!.id)
        .eq("city_slug", citySlug!)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!entity?.id && !!citySlug,
  });

  const { data: relatedEntities } = useQuery({
    queryKey: ["related-entities", entity?.category],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_entity_master")
        .select("id, name, slug, category")
        .eq("category", entity!.category)
        .eq("is_active", true)
        .neq("id", entity!.id)
        .limit(6);
      return data ?? [];
    },
    enabled: !!entity?.id,
  });

  if (loadingEntity) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 p-6">
        <h1 className="text-xl font-bold">Service non trouvé</h1>
        <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
      </div>
    );
  }

  const cityName = cityData?.city ?? citySlug?.replace(/-/g, " ") ?? "";
  const h1 = contentPage?.h1 ?? `${entity.name} à ${cityName}`;
  const metaTitle = contentPage?.title ?? `${entity.name} ${cityName} — UNPRO`;
  const metaDesc = contentPage?.meta_description ?? `Trouvez un entrepreneur fiable pour ${entity.name.toLowerCase()} à ${cityName}. Rendez-vous confirmé avec un professionnel qualifié.`;

  const priceLow = cityData?.avg_price_low_local ?? entity.avg_price_low ?? 500;
  const priceHigh = cityData?.avg_price_high_local ?? entity.avg_price_high ?? 5000;

  const urgency = URGENCY_CONFIG[entity.urgency_level] ?? URGENCY_CONFIG.medium;
  const UrgencyIcon = urgency.icon;

  const faqs = (contentPage?.faq_json as Array<{ question: string; answer: string }>) ?? [];
  const contentJson = (contentPage?.content_json as Record<string, string>) ?? {};

  const handleBooking = () => {
    const contractorTypes = (entity.contractor_types_json as string[]) ?? [];
    const specialty = contractorTypes[0] ?? "renovation";
    navigate(`/search?specialty=${encodeURIComponent(specialty)}&city=${encodeURIComponent(cityName)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SeoHead title={metaTitle} description={metaDesc} canonical={`https://unpro.ca/services/${entitySlug}/${citySlug}`} />

      {/* JSON-LD */}
      {contentPage?.schema_json && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(contentPage.schema_json) }}
        />
      )}

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 to-accent/5 pt-12 pb-8 px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>{cityName}</span>
            <ChevronRight className="w-3 h-3" />
            <span>{entity.category}</span>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-black text-foreground leading-tight"
          >
            {h1}
          </motion.h1>

          {entity.description_fr && (
            <p className="text-sm text-muted-foreground leading-relaxed">{entity.description_fr}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={urgency.color}>
              <UrgencyIcon className="w-3 h-3 mr-1" /> {urgency.label}
            </Badge>
            {entity.seasonality_qc && entity.seasonality_qc !== "all_year" && (
              <Badge variant="secondary">{entity.seasonality_qc}</Badge>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Price Estimate */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold">Estimation de prix</h2>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-primary">
                {priceLow.toLocaleString("fr-CA")}$ — {priceHigh.toLocaleString("fr-CA")}$
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Fourchette estimée pour {entity.name.toLowerCase()} à {cityName}. Le prix final dépend de la complexité du projet.
            </p>
          </CardContent>
        </Card>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Button
            onClick={handleBooking}
            className="w-full h-14 rounded-2xl text-base font-bold bg-gradient-to-r from-primary to-accent text-primary-foreground gap-2"
            size="lg"
          >
            <Calendar className="w-5 h-5" />
            Trouver un entrepreneur qualifié
            <ArrowRight className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Content sections */}
        {contentJson.solution && (
          <section className="space-y-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Solution recommandée
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{contentJson.solution}</p>
          </section>
        )}

        {contentJson.local_context && (
          <section className="space-y-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Contexte local — {cityName}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{contentJson.local_context}</p>
          </section>
        )}

        {cityData?.local_context_fr && !contentJson.local_context && (
          <section className="space-y-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Contexte local — {cityName}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{cityData.local_context_fr}</p>
          </section>
        )}

        {/* Trust Signals */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Shield, label: "Entrepreneurs vérifiés" },
            { icon: Star, label: "Avis authentiques" },
            { icon: Calendar, label: "RDV garanti" },
          ].map(({ icon: Icon, label }) => (
            <Card key={label} className="text-center">
              <CardContent className="p-3 space-y-1">
                <Icon className="w-5 h-5 mx-auto text-primary" />
                <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ AEO */}
        {faqs.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold">Questions fréquentes</h2>
            <Accordion type="single" collapsible className="space-y-1">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl px-3">
                  <AccordionTrigger className="text-sm font-medium text-left py-3">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-3">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}

        {/* Related entities */}
        {relatedEntities && relatedEntities.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold">Services connexes</h2>
            <div className="grid grid-cols-2 gap-2">
              {relatedEntities.map((r) => (
                <Card
                  key={r.id}
                  className="cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => navigate(`/services/${r.slug}/${citySlug}`)}
                >
                  <CardContent className="p-3">
                    <p className="text-xs font-semibold">{r.name}</p>
                    <p className="text-[10px] text-muted-foreground">{cityName}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <Button
          onClick={handleBooking}
          variant="outline"
          className="w-full h-12 rounded-xl font-bold gap-2"
        >
          <Calendar className="w-4 h-4" />
          Voir les entrepreneurs disponibles
        </Button>
      </div>
    </div>
  );
}
