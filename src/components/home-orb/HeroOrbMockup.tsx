/**
 * HeroOrbMockup — Premium homepage hero where Alex lives INLINE.
 *
 * Adapts to contractor mode: when `activeRole === "contractor"` the greeting,
 * CTAs and quick actions all switch to the entrepreneur narrative — without
 * leaving the homepage.
 */
import { useEffect, useRef, useState } from "react";
import { Cpu, ShieldCheck, Sparkles, Users } from "lucide-react";
import AlexMorphingOrb, { type AlexOrbStateV2 } from "@/components/alex/AlexMorphingOrb";
import AlexHomepageConversation, {
  type AlexHomepageConversationHandle,
  type AlexState,
} from "./AlexHomepageConversation";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { buildCheckoutUrl } from "@/lib/checkoutUrl";
import FounderNoteConsent from "./FounderNoteConsent";

import { useAlexVoice } from "@/contexts/AlexVoiceContext";

export default function HeroOrbMockup() {
  const convoRef = useRef<AlexHomepageConversationHandle>(null);
  const [alexState, setAlexState] = useState<AlexState>("idle");
  const { activeRole } = useActiveRole();
  const { openAlex } = useAlexVoice();
  const isContractor = activeRole === "contractor";

  const [philosophyAccepted, setPhilosophyAccepted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("unpro_philosophy_accepted") === "true";
  });

  useEffect(() => {
    const onAccepted = () => setPhilosophyAccepted(true);
    window.addEventListener("unpro:philosophy-accepted", onAccepted);
    return () => window.removeEventListener("unpro:philosophy-accepted", onAccepted);
  }, []);

  const isIdle = alexState === "idle";
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
      ? "Parle"
      : alexState === "listening"
      ? "Écoute"
      : alexState === "thinking"
      ? "Réfléchit"
      : alexState === "error"
      ? "Pause"
      : "Online";

  const handleStart = () => {
    const feature = isContractor ? "contractor" : "homeowner";
    // Internal feature key only — no human-facing label leaks into the greeting.
    openAlex(feature);
  };

  const greeting = isContractor
    ? "Bonjour. Je suis Alex d'UNPRO. Voyons ensemble comment faire évoluer votre entreprise."
    : "Bonjour. Je suis Alex d'UNPRO. Quel problème puis-je vous aider à régler aujourd'hui?";

  const tagline = isContractor
    ? "Recevez des rendez-vous qualifiés. Votre profil IA travaille 24/7."
    : "Trouvez le bon pro. Ou devenez le pro recommandé.";

  const quickActions = isContractor
    ? [
        { label: "Voir mon AIPP", href: "/entrepreneur" },
        { label: "Mes rendez-vous", href: "/contractor/calendar" },
        { label: "Activer mon profil", href: "/entrepreneur/checkout" },
        { label: "Mon plan recommandé", href: "/entrepreneur" },
      ]
    : [
        { label: "Problème maison", href: "/problemes" },
        { label: "Projet à développer", href: "/projet" },
        { label: "Analyse soumission", href: "/quote-analyzer" },
        { label: "Vérifier un pro", href: "/verifier-pro" },
        { label: "Rejoindre UNPRO", href: "/entrepreneur" },
        { label: "Gestion condo", href: "/condo" },
      ];

  return (
    <section
      className="relative isolate text-center overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, hsl(220 60% 8%), hsl(222 70% 4%) 60%, #02060d 100%)",
        minHeight: "calc(100svh - 56px)",
      }}
      aria-label="Alex — copilote IA UNPRO"
    >
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(hsl(212 100% 60%) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden
      />

      {/* Top row removed — redundant with global header */}

      {/* Orb island — floats freely, no card, no backdrop */}
      <div className="relative z-10 mt-8 flex flex-col items-center px-5">
        {/* Generous breathing room so the aura never clips */}
        <div className="relative flex items-center justify-center w-full" style={{ minHeight: 280 }}>
          <AlexMorphingOrb
            state={orbState}
            size="lg"
            onClick={handleStart}
            ariaLabel="Alex"
          />
        </div>

        <div className="mt-2 flex items-center gap-3">
          <span className="text-white text-lg font-bold tracking-[0.35em]">
            ALEX
          </span>
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

      {/* Founder note + philosophy consent gate */}
      <FounderNoteConsent />

      {/* Gated content — hidden until philosophy accepted */}
      <div
        aria-hidden={!philosophyAccepted}
        {...(!philosophyAccepted ? { inert: "" as unknown as boolean } : {})}
        className={
          philosophyAccepted
            ? "opacity-100 transition-opacity duration-500"
            : "opacity-0 max-h-0 overflow-hidden pointer-events-none select-none"
        }
      >
        {/* Tagline only — orb is the unique Alex entry */}
        <div className="relative z-10 mt-6 px-5 max-w-md mx-auto pb-2">
          <p className="text-white/55 text-sm text-center">{tagline}</p>
        </div>

        {/* Quick actions */}
        <div className="relative z-10 px-5 max-w-2xl mx-auto pb-8 grid grid-cols-2 gap-3">
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

        {/* Feature strip */}
        <div className="relative z-10 px-5 max-w-2xl mx-auto pb-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Cpu, title: "AI-POWERED", body: "Solutions intelligentes pour chaque projet." },
            { icon: ShieldCheck, title: "SÉCURISÉ", body: "Conçu avec la sécurité à chaque couche." },
            { icon: Sparkles, title: "AUTOMATION", body: "Automatisez, gérez, gagnez du temps." },
            { icon: Users, title: "HUMAIN + IA", body: "Alex travaille avec vous, à chaque étape." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="text-center">
              <div className="mx-auto mb-2 w-10 h-10 rounded-xl flex items-center justify-center border border-blue-400/25 bg-blue-500/5">
                <Icon className="w-5 h-5 text-blue-300" />
              </div>
              <div className="text-[10px] font-bold tracking-widest text-blue-300">
                {title}
              </div>
              <p className="text-white/60 text-xs mt-1 leading-snug">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
