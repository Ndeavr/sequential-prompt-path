/**
 * /allume — « Qu'est-ce qui vous allume? » seasonal service businesses landing.
 * One CTA into the canonical contractor Clara entry. No video, no offer quota.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import UnproLogo from "@/components/brand/UnproLogo";
import SiteFooterPremium from "@/components/layout/SiteFooterPremium";
import { supabase } from "@/integrations/supabase/client";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";
import {
  ALLUME_COPY as copy, ALLUME_UNIVERSES, allumeContractorPath, parseAllumeCity, parseAllumeService,
} from "@/data/allumeCampaign";

export default function PageAllume() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const visitorId = useRef<string>(crypto.randomUUID());
  const city = parseAllumeCity(params.get("ville"));
  const [service, setService] = useState<string | null>(parseAllumeService(params.get("service")));

  // Existing persisted CTA journal; keys only, no personal data.
  const log = useCallback((ctaKey: string) => {
    void supabase.from("entrepreneur_cta_events")
      .insert({ visitor_id: visitorId.current, cta_key: ctaKey, page_section: "allume" })
      .then(() => {});
  }, []);

  useEffect(() => { log("allume_view"); }, [log]);

  const go = () => {
    log(service ? `allume_cta_${service}` : "allume_cta");
    trackCopilotEvent("contractor_intent_detected", { campaign: "allume", service, city });
    navigate(allumeContractorPath(window.location.search, service));
  };

  return (
    <div className="alex-immersive min-h-screen bg-background text-foreground" lang="fr-CA">
      <Helmet>
        <title>{copy.title}</title>
        <meta name="description" content={copy.description} />
        <link rel="canonical" href="https://unpro.ca/allume" />
        <meta property="og:title" content={copy.headline} />
        <meta property="og:description" content={copy.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://unpro.ca/allume" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <header className="mx-auto flex max-w-5xl items-center px-5 pt-6">
        <Link to="/" aria-label="UNPRO" className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <UnproLogo size={92} variant="primary" tone="dark" animated={false} />
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 pt-10 sm:pt-16">
        <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-6xl">{copy.headline}</h1>
        {city && <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-accent">{city}</p>}
        {copy.intro.map((p) => (
          <p key={p} className="mt-5 text-lg leading-relaxed text-muted-foreground">{p}</p>
        ))}

        <section aria-labelledby="allume-services" className="mt-10">
          <h2 id="allume-services" className="text-base font-semibold">{copy.pickLabel}</h2>
          {ALLUME_UNIVERSES.map((u) => (
            <fieldset key={u.key} className="mt-5">
              <legend className="text-sm font-semibold text-muted-foreground">{u.label}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {u.services.map((s) => {
                  const active = service === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setService(active ? null : s.key)}
                      className={`min-h-11 rounded-full border px-4 text-left text-sm font-medium transition-colors duration-[420ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${active ? "border-primary bg-primary text-primary-foreground" : "border-primary/30 bg-card/70 text-foreground hover:border-primary/70"}`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </section>

        <Button size="lg" onClick={go} className="mt-10 h-auto min-h-14 w-full gap-2 whitespace-normal rounded-[18px] px-5 text-base font-semibold sm:w-auto">
          {copy.cta}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </Button>
      </main>

      <footer className="border-t border-border/60 px-5 py-8 text-center">
        <p className="font-semibold">{copy.signature}</p>
      </footer>
      <SiteFooterPremium />
    </div>
  );
}
