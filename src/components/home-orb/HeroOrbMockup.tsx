/**
 * HeroOrbMockup — Premium homepage hero where Alex lives INLINE.
 *
 * Adapts to contractor mode: when `activeRole === "contractor"` the greeting,
 * CTAs and quick actions all switch to the entrepreneur narrative — without
 * leaving the homepage.
 */
import { useRef, useState } from "react";
import { Cpu, ShieldCheck, Sparkles, Users } from "lucide-react";
import AlexMorphingOrb, { type AlexOrbStateV2 } from "@/components/alex/AlexMorphingOrb";
import AlexHomepageConversation, {
  type AlexHomepageConversationHandle,
  type AlexState,
} from "./AlexHomepageConversation";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import ContractorModeBadge from "@/components/layout/ContractorModeBadge";

export default function HeroOrbMockup() {
  const convoRef = useRef<AlexHomepageConversationHandle>(null);
  const [alexState, setAlexState] = useState<AlexState>("idle");
  const { activeRole } = useActiveRole();
  const isContractor = activeRole === "contractor";

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

  const handleStart = () => convoRef.current?.start();

  const greeting = isContractor
    ? "Bonjour. Je suis Alex d'UNPRO. Voyons ensemble comment faire évoluer votre entreprise."
    : "Bonjour. Je suis Alex d'UNPRO. Quel problème puis-je vous aider à régler aujourd'hui?";

  const primaryCtaLabel = isContractor ? "Voir mon potentiel gratuit" : "Parler à Alex";
  const primaryCtaHref = isContractor ? "/entrepreneur" : undefined;
  const secondaryHref = isContractor ? "/leads" : "/entrepreneur";
  const secondaryLabel = isContractor ? "Mes leads" : "Je suis entrepreneur";
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

      {/* Top brand row */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-white">
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6"
            fill="none"
            stroke="hsl(212 100% 60%)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 11 12 3l9 8" />
            <path d="M5 10v10h14V10" />
          </svg>
          <span className="font-bold tracking-wide">UNPRO</span>
        </div>
        <div className="flex items-center gap-2">
          <ContractorModeBadge />
          {!isContractor && <span className="text-white/60 text-xs">Québec · IA</span>}
        </div>
      </div>

      {/* Sticky orb island — stays visible while transcript grows */}
      <div
        className={`relative z-10 mt-4 flex flex-col items-center ${
          !isIdle ? "sticky top-0 pt-3 pb-2 backdrop-blur-md" : ""
        }`}
        style={
          !isIdle
            ? {
                background:
                  "linear-gradient(180deg, hsl(222 70% 4% / 0.85), hsl(222 70% 4% / 0))",
              }
            : undefined
        }
      >
        <div className="mx-auto flex justify-center" style={{ maxWidth: 220 }}>
          <AlexMorphingOrb
            state={orbState}
            size="lg"
            onClick={handleStart}
            ariaLabel="Alex"
          />
        </div>

        <div className="mt-3 flex items-center gap-3">
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

      {/* Inline conversation — orb is the CTA; transcript appears only when Alex speaks */}
      <div className="relative z-10 mt-6 px-5 max-w-md mx-auto">
        <div
          className="relative rounded-3xl border border-white/10 px-4 py-4 text-left backdrop-blur-md"
          style={{
            background:
              "linear-gradient(180deg, hsl(220 50% 10% / 0.85), hsl(222 60% 6% / 0.85))",
            boxShadow:
              "0 30px 60px -20px hsl(212 100% 30% / 0.4), inset 0 0 0 1px hsl(212 100% 60% / 0.06)",
          }}
        >
          <AlexHomepageConversation
            ref={convoRef}
            greeting={greeting}
            onStateChange={setAlexState}
          />
        </div>
      </div>

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
    </section>
  );
}
