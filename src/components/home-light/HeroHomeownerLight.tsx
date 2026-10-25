/**
 * HeroHomeownerLight — Premium homeowner-first homepage.
 * One Clara conversation, no duplicate assistant or fabricated social proof.
 * Both palettes share this layout; semantic tokens provide light/dark contrast.
 */
import { useState } from "react";
import { ArrowRight, CalendarCheck2, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/ui/LanguageToggle";
import ClaraConversationBox from "@/components/home-light/ClaraConversationBox";
import heroHouse from "@/assets/hero-house.jpg";

export default function HeroHomeownerLight() {
  const { lang } = useLanguage();
  const english = lang === "en";
  const [isConversationActive, setIsConversationActive] = useState(false);

  return (
    <section className={"home-glossy-hero unpro-home-hero relative isolate overflow-hidden" + (isConversationActive ? " is-conversation-active" : "")} aria-label={english ? "Home renovation" : "Votre projet de rénovation"}>
      <div className="unpro-home-hero-atmosphere pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-9 sm:px-6 md:pb-12 md:pt-14 lg:px-8 lg:pt-16">
        {!isConversationActive && <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,1fr)] lg:gap-7">
          <div className="unpro-home-intro relative z-10 min-w-0">
            <p className="unpro-home-eyebrow inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold sm:text-sm">
              <Sparkles className="h-4 w-4" aria-hidden />
              {english ? "Smarter projects. Less time wasted." : "Des projets plus simples, sans perte de temps"}
            </p>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="unpro-home-headline mt-5 max-w-[650px] text-[clamp(2.45rem,5.7vw,4.75rem)] font-bold leading-[1.04] tracking-[-0.05em]"
            >
              {english ? "Planning a " : "Un projet de "}
              <span className="unpro-home-gradient-word">{english ? "renovation" : "rénovation"}</span>
              {english ? " project?" : " en tête?"}
            </motion.h1>

            <p className="unpro-home-subtitle mt-5 max-w-[520px] text-base leading-relaxed sm:text-lg lg:text-xl">
              {english
                ? "Clara helps you find the right contractor, at the right time."
                : "Clara vous aide à trouver le bon entrepreneur, au bon moment."}
            </p>

            <div className="unpro-home-benefits mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 shrink-0" aria-hidden />
                <span>{english ? "Matched to your criteria" : "Selon vos critères"}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="h-6 w-6 shrink-0" aria-hidden />
                <span>{english ? "Exclusive appointments" : "Rendez-vous exclusifs"}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 shrink-0" aria-hidden />
                <span>{english ? "Licensing checks as required" : "Vérifications selon le métier"}</span>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a className="unpro-home-primary-cta inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl px-6 py-3 text-sm font-semibold text-white sm:text-base"
                href="#clara-conversation">
                <MessageCircle className="h-5 w-5" aria-hidden />
                {english ? "Chat with Clara" : "Discuter avec Clara"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <a className="unpro-home-secondary-cta inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold"
                href="#comment-ca-marche">
                {english ? "How it works" : "Voir comment ça marche"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {english ? "Free for homeowners. No obligation." : "Gratuit pour les propriétaires. Sans obligation."}
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="unpro-home-house-stage relative min-w-0"
          >
            <div className="unpro-home-house-frame relative overflow-hidden rounded-[32px]">
              <img
                src={heroHouse}
                alt={english ? "Contemporary home in warm evening light" : "Maison contemporaine éclairée en soirée"}
                className="h-full w-full object-cover"
                width={1024}
                height={1024}
                decoding="async"
                fetchPriority="high"
              />
              <div className="unpro-home-house-fade pointer-events-none absolute inset-0" aria-hidden="true" />
            </div>
            <div className="unpro-home-clara-bubble absolute right-3 top-4 max-w-[205px] rounded-2xl px-4 py-3 text-sm leading-snug shadow-lg sm:right-5 sm:top-8">
              {english ? "Hello! What would you like to improve, renovate or repair?" : "Bonjour! Que voulez-vous améliorer, rénover ou réparer?"}
            </div>
            <a href="#clara-conversation" className="unpro-home-clara-chip absolute bottom-4 right-3 flex items-center gap-3 rounded-full px-3 py-2 pr-5 shadow-xl sm:bottom-6 sm:right-6" aria-label={english ? "Open Clara chat" : "Ouvrir la conversation avec Clara"}>
              <span className="unpro-home-clara-orb flex h-12 w-12 items-center justify-center rounded-full" aria-hidden="true">
                <Sparkles className="h-6 w-6 text-white" />
              </span>
              <span className="text-left">
                <strong className="block text-sm font-bold">Clara</strong>
                <small className="block text-xs">{english ? "Your AI assistant" : "Votre assistante IA"}</small>
              </span>
            </a>
          </motion.div>
        </div>}

        <div id="clara-conversation" className="unpro-home-conversation mx-auto mt-7 max-w-4xl scroll-mt-28 sm:mt-10">
          <ClaraConversationBox surface="home" onConversationActiveChange={setIsConversationActive} />
        </div>
      </div>
    </section>
  );
}
