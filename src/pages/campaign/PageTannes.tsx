/**
 * /tannes — "Vous êtes pas tannés?" campaign landing.
 * Two personas, one focused branch, one CTA into an existing flow.
 */
import { useCallback, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Hammer, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import UnproLogo from "@/components/brand/UnproLogo";
import SiteFooterPremium from "@/components/layout/SiteFooterPremium";
import LanguageToggle, { useLanguage } from "@/components/ui/LanguageToggle";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { supabase } from "@/integrations/supabase/client";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";
import {
  TANNES_CHOICE_PARAM, TANNES_COPY, parseTannesChoice, readTannesChoice, rememberTannesChoice,
  tannesChoiceValue, tannesContractorPath, tannesHomeownerPath, type TannesPersona,
} from "@/data/tannesCampaign";

const ICONS = { homeowner: Home, contractor: Hammer } as const;

export default function PageTannes() {
  const { lang, setLang } = useLanguage();
  const copy = TANNES_COPY[lang];
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { activeRole, setActiveRole } = useActiveRole();
  const visitorId = useRef<string>(crypto.randomUUID());
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const choice = parseTannesChoice(params.get(TANNES_CHOICE_PARAM));

  // Existing persisted CTA journal; keys only, no personal data.
  const log = useCallback((ctaKey: string) => {
    void supabase.from("entrepreneur_cta_events")
      .insert({ visitor_id: visitorId.current, cta_key: ctaKey, page_section: "tannes" })
      .then(() => {});
  }, []);

  useEffect(() => { log("tannes_view"); }, [log]);

  // Restore a previous choice (same tab) when the URL has none.
  useEffect(() => {
    if (choice || params.has(TANNES_CHOICE_PARAM)) return;
    const saved = readTannesChoice();
    if (saved) {
      const next = new URLSearchParams(params);
      next.set(TANNES_CHOICE_PARAM, tannesChoiceValue(saved));
      setParams(next, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (choice) detailHeading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [choice]);

  const choose = (persona: TannesPersona | null) => {
    rememberTannesChoice(persona);
    const next = new URLSearchParams(params);
    if (persona) {
      next.set(TANNES_CHOICE_PARAM, tannesChoiceValue(persona));
      log(`tannes_choose_${persona}`);
      trackCopilotEvent(persona === "homeowner" ? "hero_find_pro_click" : "contractor_entry_click", { campaign: "tannes" });
    } else next.delete(TANNES_CHOICE_PARAM);
    setParams(next);
  };

  const go = (persona: TannesPersona) => {
    log(`tannes_cta_${persona}`);
    const search = window.location.search;
    if (persona === "homeowner") {
      // A stale contractor UI mode must not follow a homeowner into Clara.
      if (activeRole === "contractor") setActiveRole("homeowner");
      trackCopilotEvent("project_started", { campaign: "tannes" });
      navigate(tannesHomeownerPath(search));
    } else {
      trackCopilotEvent("contractor_intent_detected", { campaign: "tannes" });
      navigate(tannesContractorPath(search, lang));
    }
  };

  const other: TannesPersona | null = choice === "homeowner" ? "contractor" : choice === "contractor" ? "homeowner" : null;
  const branch = choice ? copy[choice] : null;
  const BranchIcon = choice ? ICONS[choice] : null;

  return (
    <div className="alex-immersive min-h-screen bg-background text-foreground" lang={lang === "fr" ? "fr-CA" : "en-CA"}>
      <Helmet>
        <title>{copy.title}</title>
        <meta name="description" content={copy.description} />
        <link rel="canonical" href="https://unpro.ca/tannes" />
        <meta property="og:title" content={copy.title} />
        <meta property="og:description" content={copy.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://unpro.ca/tannes" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 pt-6">
        <Link to="/" aria-label="UNPRO" className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <UnproLogo size={92} variant="primary" tone="dark" animated={false} />
        </Link>
        <LanguageToggle lang={lang} onChange={setLang} />
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16 pt-10 sm:pt-16">
        {!choice || !branch || !BranchIcon || !other ? (
          <section aria-labelledby="tannes-title" className="motion-safe:animate-fade-in">
            <h1 id="tannes-title" className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-6xl">
              {copy.headline}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">{copy.subhead}</p>

            <h2 className="sr-only">{copy.chooseLabel}</h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2" aria-label={copy.chooseLabel}>
              {(["homeowner", "contractor"] as const).map((persona) => {
                const card = copy[persona];
                const Icon = ICONS[persona];
                return (
                  <li key={persona}>
                    <button
                      type="button"
                      onClick={() => choose(persona)}
                      className="tannes-card group flex h-full w-full flex-col rounded-[28px] border border-primary/30 bg-card/70 p-6 text-left transition-[transform,border-color,box-shadow] duration-[420ms] ease-[cubic-bezier(.22,1,.36,1)] hover:border-primary/70 motion-safe:hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-ring sm:p-8"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15">
                          <Icon className="h-5 w-5 text-primary" aria-hidden />
                        </span>
                        <span className="text-xl font-semibold sm:text-2xl">{card.label}</span>
                      </span>
                      <span className="mt-4 block text-base leading-relaxed text-muted-foreground">{card.pain}</span>
                      <span className="mt-3 block text-lg font-semibold text-foreground">{card.payoff}</span>
                      <span className="mt-6 inline-flex min-h-12 items-center gap-2 self-start rounded-[18px] bg-primary px-5 text-base font-semibold text-primary-foreground">
                        {card.choose}
                        <ArrowRight className="h-4 w-4 transition-transform duration-[420ms] motion-safe:group-hover:translate-x-1" aria-hidden />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <section aria-labelledby="tannes-detail" className="mx-auto max-w-2xl motion-safe:animate-fade-in">
            <Button variant="ghost" onClick={() => choose(null)} className="-ml-3 mb-6 min-h-11 gap-2">
              <ArrowLeft className="h-4 w-4" aria-hidden />{copy.change}
            </Button>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent">
              <BranchIcon className="h-4 w-4" aria-hidden />{branch.label}
            </p>
            <h1 id="tannes-detail" ref={detailHeading} tabIndex={-1} className="mt-3 font-display text-3xl font-bold leading-tight tracking-[-0.03em] outline-none sm:text-5xl">
              {branch.detailTitle}
            </h1>
            {branch.detail.map((paragraph) => (
              <p key={paragraph} className="mt-5 text-lg leading-relaxed text-muted-foreground">{paragraph}</p>
            ))}
            <Button size="lg" onClick={() => go(choice)} className="mt-8 h-auto min-h-14 w-full gap-2 whitespace-normal rounded-[18px] px-5 text-base font-semibold sm:w-auto">
              {branch.cta}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Button>
            <p className="mt-8 text-base">
              <button type="button" onClick={() => choose(other)} className="min-h-11 font-semibold text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                {copy.switchTo[choice]}
              </button>
            </p>
          </section>
        )}
      </main>

      <footer className="border-t border-border/60 px-5 py-8 text-center">
        <p className="font-semibold">{copy.signature}</p>
        <p className="mt-1 text-muted-foreground">{copy.tagline}</p>
      </footer>
      <SiteFooterPremium />
    </div>
  );
}
