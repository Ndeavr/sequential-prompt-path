/**
 * UNPRO × Entrepreneur — page d'atterrissage co-marquée par intention de recherche.
 * Route: /c/:contractorSlug/:intentSlug
 * Réutilise le système entrepreneur canonique (profil public + demande de rendez-vous).
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SeoHead from "@/seo/components/SeoHead";
import { ShieldCheck, Clock, MapPin, CheckCircle2 } from "lucide-react";

interface Campaign {
  id: string;
  contractor_id: string;
  contractor_slug: string;
  intent_slug: string;
  headline: string;
  subheadline: string | null;
  cta_label: string;
  service_area: string | null;
  bullets: string[];
}

export default function PageContractorCampaignLanding() {
  const { contractorSlug = "", intentSlug = "" } = useParams();
  const [params] = useSearchParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  const attribution = useMemo(
    () => ({
      gclid: params.get("gclid"),
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_term: params.get("utm_term"),
      utm_content: params.get("utm_content"),
    }),
    [params],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("contractor_campaigns")
        .select("*")
        .eq("contractor_slug", contractorSlug)
        .eq("intent_slug", intentSlug)
        .eq("active", true)
        .maybeSingle();
      if (cancelled) return;
      const row = data as any;
      setCampaign(row ? { ...row, bullets: Array.isArray(row.bullets) ? row.bullets : [] } : null);
      setLoading(false);
      if (row) {
        let sessionId = sessionStorage.getItem("unpro_campaign_session");
        if (!sessionId) {
          sessionId = crypto.randomUUID();
          sessionStorage.setItem("unpro_campaign_session", sessionId);
        }
        sessionStorage.setItem(
          "unpro_campaign_attribution",
          JSON.stringify({ ...attribution, campaign_id: row.id, contractor_slug: contractorSlug, intent_slug: intentSlug }),
        );
        await supabase.from("campaign_attributions").insert({
          campaign_id: row.id,
          contractor_id: row.contractor_id,
          contractor_slug: contractorSlug,
          intent_slug: intentSlug,
          ...attribution,
          landing_url: window.location.href,
          referrer: document.referrer || null,
          session_id: sessionId,
        } as any);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contractorSlug, intentSlug, attribution]);

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!campaign) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold text-foreground">Cette page n'est plus disponible</h1>
          <p className="text-muted-foreground">Découvrez les entreprises recommandées près de chez vous.</p>
          <Button asChild size="lg">
            <Link to="/">Retour à l'accueil UNPRO</Link>
          </Button>
        </div>
      </main>
    );
  }

  const ctaHref = `/entrepreneur/${campaign.contractor_slug}${window.location.search}`;

  return (
    <main className="min-h-screen bg-background">
      <SeoHead
        title={`${campaign.headline} | UNPRO`}
        description={campaign.subheadline ?? campaign.headline}
        noindex
      />
      <section className="mx-auto w-full max-w-3xl px-5 py-10 md:py-16 space-y-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Partenaire vérifié UNPRO
        </p>
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-foreground">{campaign.headline}</h1>
        {campaign.subheadline && (
          <p className="text-lg text-muted-foreground max-w-2xl">{campaign.subheadline}</p>
        )}

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Entreprise vérifiée</span>
          <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" /> Réponse rapide</span>
          {campaign.service_area && (
            <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" /> {campaign.service_area}</span>
          )}
        </div>

        <Button asChild size="lg" className="w-full md:w-auto text-base">
          <Link to={ctaHref}>{campaign.cta_label}</Link>
        </Button>
        <p className="text-sm text-muted-foreground">Un seul entrepreneur. Jamais un lead partagé.</p>

        {campaign.bullets.length > 0 && (
          <Card className="p-5 space-y-3">
            {campaign.bullets.map((b) => (
              <div key={b} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                <span className="text-foreground">{b}</span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </main>
  );
}
