/**
 * UNPRO — Personalized Contractor Landing Page
 * Dynamic /contractor/:slug route parsing trade+city from URL.
 * Resolves prospect data from war_prospects for personalization.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Shield, Star, Zap, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import CardGlass from "@/components/unpro/CardGlass";
import SectionContainer from "@/components/unpro/SectionContainer";
import UnproLogo from "@/components/brand/UnproLogo";
import { supabase } from "@/integrations/supabase/client";
import { trackFunnelEvent } from "@/utils/trackFunnelEvent";
import { fadeUp, staggerContainer } from "@/lib/motion";

interface ProspectData {
  business_name?: string;
  city?: string;
  trade?: string;
  website?: string;
  rating?: number;
  review_count?: number;
}

function parseSlug(slug: string): { trade: string; city: string } {
  const parts = slug.split("-");
  // Try to find city at the end (common patterns: plombier-montreal, couvreur-laval)
  if (parts.length >= 2) {
    const city = parts[parts.length - 1];
    const trade = parts.slice(0, -1).join("-");
    return { trade, city };
  }
  return { trade: slug, city: "" };
}

export default function PageContractorPersonalizedLanding() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [prospect, setProspect] = useState<ProspectData | null>(null);
  const [loading, setLoading] = useState(true);

  const { trade, city } = parseSlug(slug || "");

  useEffect(() => {
    trackFunnelEvent("landing_viewed", { slug, trade, city });

    const loadProspect = async () => {
      if (!slug) { setLoading(false); return; }

      // Try to find prospect by slug in war_prospects
      const { data } = await supabase
        .from("war_prospects" as any)
        .select("business_name, city, trade, website, rating, review_count")
        .eq("slug", slug)
        .limit(1)
        .maybeSingle();

      if (data) {
        setProspect(data as any);
      }
      setLoading(false);
    };

    loadProspect();
  }, [slug, trade, city]);

  const displayName = prospect?.business_name || "";
  const displayCity = prospect?.city || city.charAt(0).toUpperCase() + city.slice(1);
  const displayTrade = prospect?.trade || trade.replace(/-/g, " ");

  const headline = displayName
    ? `${displayName} pourrait obtenir plus de contrats`
    : `Plus de contrats grâce à l'intelligence artificielle`;

  const subheadline = displayCity
    ? `Opportunités détectées pour ${displayTrade} à ${displayCity}`
    : `Découvrez votre potentiel de croissance`;

  return (
    <>
      <Helmet>
        <title>{headline} | UNPRO</title>
        <meta name="description" content={`${displayTrade} à ${displayCity} — Découvrez comment UNPRO peut vous aider à obtenir plus de contrats.`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
            <UnproLogo size={100} variant="primary" animated={false} showWordmark={false} />
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-xs"
              onClick={() => navigate("/entrepreneur/activer")}
            >
              Se connecter
            </Button>
          </div>
        </div>

        <SectionContainer width="narrow">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="py-8 sm:py-16 space-y-8"
          >
            {/* Hero */}
            <motion.div variants={fadeUp} className="text-center">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-display text-foreground leading-tight mb-3">
                {headline}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
                {subheadline}
              </p>
            </motion.div>

            {/* Opportunity Cards */}
            <motion.div variants={staggerContainer} className="grid grid-cols-2 gap-3">
              {[
                { icon: TrendingUp, label: "Demande locale", value: "Élevée", color: "text-success" },
                { icon: Shield, label: "Confiance IA", value: "Optimisable", color: "text-primary" },
                { icon: Star, label: "Visibilité", value: "À améliorer", color: "text-warning" },
                { icon: Zap, label: "Potentiel", value: "Fort", color: "text-secondary" },
              ].map((item) => (
                <motion.div key={item.label} variants={fadeUp}>
                  <CardGlass noAnimation hoverable className="text-center py-4">
                    <item.icon className={`h-5 w-5 mx-auto mb-2 ${item.color}`} />
                    <p className="text-lg font-bold font-display text-foreground">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </CardGlass>
                </motion.div>
              ))}
            </motion.div>

            {/* Rating if available */}
            {prospect?.rating && (
              <motion.div variants={fadeUp}>
                <CardGlass noAnimation className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Note Google actuelle</p>
                  <p className="text-3xl font-bold text-foreground">
                    {prospect.rating}
                    <span className="text-sm text-muted-foreground">/5</span>
                  </p>
                  {prospect.review_count && (
                    <p className="text-xs text-muted-foreground mt-1">{prospect.review_count} avis</p>
                  )}
                </CardGlass>
              </motion.div>
            )}

            {/* CTAs */}
            <motion.div variants={fadeUp} className="space-y-3">
              <Button
                size="lg"
                className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-[var(--shadow-glow)]"
                onClick={() => {
                  trackFunnelEvent("signup_started", { slug, source: "personalized_landing" });
                  navigate("/entrepreneur/activer");
                }}
              >
                Voir mon potentiel gratuit
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="w-full h-12 rounded-xl border-primary/30"
                onClick={() => {
                  trackFunnelEvent("alex_started", { slug, source: "personalized_landing" });
                  navigate("/alex");
                }}
              >
                <Bot className="mr-2 h-5 w-5 text-primary" />
                Parler à Alex
              </Button>
            </motion.div>

            {/* Trust */}
            <motion.div variants={fadeUp} className="text-center">
              <p className="text-xs text-muted-foreground">
                Rejoint par 500+ entrepreneurs au Québec · Aucune carte requise
              </p>
            </motion.div>
          </motion.div>
        </SectionContainer>
      </div>
    </>
  );
}
