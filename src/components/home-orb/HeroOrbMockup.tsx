/**
 * HeroOrbMockup — Homepage hero: "LA FIN DES 3 SOUMISSIONS."
 *
 * The promise is written first (visible without scroll on mobile), Alex lives
 * inline right under it. Adapts to contractor mode via ActiveRoleContext.
 * Copy comes from src/lib/copy/homeFin3.ts (FR/EN).
 */
import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import AlexMorphingOrb, { type AlexOrbStateV2 } from "@/components/alex/AlexMorphingOrb";
import AlexHomepageConversation, {
  type AlexHomepageConversationHandle,
  type AlexState,
} from "./AlexHomepageConversation";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { buildCheckoutUrl } from "@/lib/checkoutUrl";
import FounderNoteConsent from "./FounderNoteConsent";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { useHomeFin3Copy } from "@/lib/copy/homeFin3";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

import { useAlexVoice } from "@/contexts/AlexVoiceContext";

export default function HeroOrbMockup() {
  const convoRef = useRef<AlexHomepageConversationHandle>(null);
  const [alexState, setAlexState] = useState<AlexState>("idle");
  const { activeRole } = useActiveRole();
  const { openAlex } = useAlexVoice();
  const { lang } = useLanguage();
  const copy = useHomeFin3Copy(lang);
  const isContractor = activeRole === "contractor";

  const orbState: AlexOrbStateV2 =
    alexState === "speaking"
      ? "speaking"
      : alexState === "listening"
      ? "listening"
      : alexState === "thinking"
      ? "thinking"
      : alexState === "error"
      ? "error"
      : "idle";

  const badgeLabel =
    alexState === "speaking"
      ? lang === "en" ? "Speaking" : "Parle"
      : alexState === "listening"
      ? lang === "en" ? "Listening" : "Écoute"
      : alexState === "thinking"
      ? lang === "en" ? "Thinking" : "Réfléchit"
      : alexState === "error"
      ? "Pause"
      : "Online";

  const handleStart = () => {
    const feature = isContractor ? "contractor" : "homeowner";
    trackCopilotEvent("hero_find_pro_click", { role: feature });
    trackCopilotEvent("alex_started", { source: "home_hero" });
    // Internal feature key only — no human-facing label leaks into the greeting.
    openAlex(feature);
  };

  const greeting = isContractor
    ? "Bonjour. Je suis Alex d'UNPRO. Voyons ensemble comment faire évoluer votre entreprise."
    : "Bonjour. Je suis Alex d'UNPRO. Quel problème puis-je vous aider à régler aujourd'hui?";

  const quickActions = isContractor
    ? [
        { label: lang === "en" ? "My AI profile" : "Voir mon profil IA", href: "/entrepreneur" },
        { label: lang === "en" ? "My appointments" : "Mes rendez-vous", href: "/contractor/calendar" },
        { label: lang === "en" ? "Activate my profile" : "Activer mon profil", href: buildCheckoutUrl() },
        { label: lang === "en" ? "My recommended plan" : "Mon plan recommandé", href: "/entrepreneur" },
      ]
    : [
        { label: lang === "en" ? "Home problem" : "Problème maison", href: "/problemes" },
        { label: lang === "en" ? "Project to plan" : "Projet à développer", href: "/projet" },
        { label: lang === "en" ? "Quote analysis" : "Analyse soumission", href: "/analyse-soumissions" },
        { label: lang === "en" ? "Verify a pro" : "Vérifier un pro", href: "/verifier-pro" },
        { label: lang === "en" ? "Join UNPRO" : "Rejoindre UNPRO", href: "/entrepreneur" },
        { label: lang === "en" ? "Condo management" : "Gestion condo", href: "/condo" },
      ];

  return (
    <section
      className="relative isolate text-center overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, hsl(220 60% 8%), hsl(222 70% 4%) 60%, #02060d 100%)",
      }}
      aria-label="UNPRO — La fin des 3 soumissions"
    >
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(hsl(212 100% 60%) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden
      />

      {/* Promise block — first thing visible on mobile */}
      <div className="relative z-10 px-5 pt-7 md:pt-12 max-w-2xl mx-auto">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
          {copy.hero.eyebrow}
        </p>
        <h1 className="mt-3 text-[clamp(2rem,8.2vw,3.6rem)] font-bold leading-[0.98] tracking-[-0.04em] text-white">
          {copy.hero.title}
        </h1>
        <p className="mt-3 text-[clamp(1rem,4.2vw,1.25rem)] font-semibold text-white/80">
          {copy.hero.subtitle}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-center gap-3">
          <button
            type="button"
            onClick={handleStart}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#05070d] transition-transform duration-300 hover:-translate-y-0.5"
          >
            {copy.hero.ctaPrimary}
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link
            to="/analyse-soumissions/importer"
            onClick={() => trackCopilotEvent("hero_compare_quotes_click")}
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-7 py-3.5 text-sm font-bold text-white transition-transform duration-300 hover:-translate-y-0.5"
          >
            {copy.hero.ctaSecondary}
          </Link>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-white/45">{copy.hero.microcopy}</p>

        <p className="mt-5 text-[13px] leading-relaxed text-white/60 max-w-xl mx-auto">
          {copy.hero.body}
        </p>
      </div>

      {/* Orb island — floats freely, no card, no backdrop */}
      <div className="relative z-10 mt-6 flex flex-col items-center px-5">
        <div
          className="relative flex items-center justify-center w-full"
          style={{ minHeight: 220 }}
        >
          <AlexMorphingOrb state={orbState} size="lg" onClick={handleStart} ariaLabel="Alex" />
        </div>

        <div className="mt-2 flex items-center gap-3">
          <span className="text-white text-lg font-bold tracking-[0.35em]">ALEX</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              {badgeLabel}
            </span>
          </span>
        </div>
      </div>

      {/* Inline conversation — transparent, no card chrome around the orb */}
      <div className="relative z-10 mt-6 px-5 max-w-md mx-auto">
        <div className="relative px-1 py-2 text-left">
          <AlexHomepageConversation
            ref={convoRef}
            greeting={greeting}
            onStateChange={setAlexState}
          />
        </div>
      </div>

      {/* Founder note + philosophy consent */}
      <FounderNoteConsent />

      {/* Quick actions — existing routes only */}
      <div className="relative z-10 px-5 max-w-2xl mx-auto pt-6 pb-12 grid grid-cols-2 gap-3">
        {quickActions.map((q) => (
          <a
            key={q.label}
            href={q.href}
            className="rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] backdrop-blur-sm px-4 py-4 text-left text-white/90 text-sm font-medium transition"
          >
            {q.label}
          </a>
        ))}
      </div>
    </section>
  );
}
