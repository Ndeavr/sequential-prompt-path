/**
 * HeroOrbMockup — Premium glossy 3D Alex orb hero matching the dark mockup.
 *
 * Pure CSS sphere (no 3D libs). Mobile-first.
 * - Glossy black sphere with deep blue rim glow
 * - House icon at top inner
 * - Two pill-shaped LED eyes
 * - "ALEX" label + green ONLINE badge
 * - Live waveform synced to AlexVoiceContext state
 * - Floating mic button
 * - Transcript bubble below the orb
 * - 4 trust pills (AI-POWERED / SECURE / SMART / HUMAN+AI)
 */
import { useEffect, useState } from "react";
import { Mic, Cpu, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useAlexVoiceLockedStore } from "@/stores/alexVoiceLockedStore";
import AlexFloatingOrb, { type AlexOrbState } from "./AlexFloatingOrb";

type OrbState = AlexOrbState;

function useOrbState(): OrbState {
  const isOpen = useAlexVoiceLockedStore((s) => s.isOverlayOpen);
  return isOpen ? "speaking" : "idle";
}

function Waveform({ active }: { active: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = () => {
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const bars = 36;
  return (
    <svg
      viewBox={`0 0 ${bars * 6} 40`}
      className="w-full h-10"
      preserveAspectRatio="none"
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => {
        const seed = (Math.sin(i * 1.3 + tick * 0.15) + 1) / 2;
        const fall = 1 - Math.abs(i - bars / 2) / (bars / 2);
        const h = active ? 4 + seed * 30 * (0.4 + fall * 0.6) : 3 + (Math.sin(i) + 1) * 2;
        return (
          <rect
            key={i}
            x={i * 6 + 1}
            y={20 - h / 2}
            width="2.5"
            height={h}
            rx="1.25"
            fill="hsl(212 100% 60%)"
            opacity={active ? 0.9 : 0.55}
          />
        );
      })}
    </svg>
  );
}

// Inline orb removed — see AlexFloatingOrb component.

export default function HeroOrbMockup() {
  const { openAlex } = useAlexVoice();
  const state = useOrbState();
  const active = state !== "idle";

  const handleStart = () => openAlex("home_hero", "user_tapped_orb");

  const greeting = "Bonjour. Je suis Alex d'UNPRO.";
  const subline = "Quel problème puis-je vous aider à régler aujourd'hui?";

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
      {/* Subtle grid */}
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
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="hsl(212 100% 60%)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 11 12 3l9 8" />
            <path d="M5 10v10h14V10" />
          </svg>
          <span className="font-bold tracking-wide">UNPRO</span>
        </div>
        <span className="text-white/60 text-xs">Québec · IA</span>
      </div>

      {/* Orb */}
      <div className="relative z-10 mt-10 flex flex-col items-center">
        <Orb state={state} onClick={handleStart} />

        {/* ALEX label + ONLINE badge */}
        <div className="mt-6 flex items-center gap-3">
          <span className="text-white text-xl font-bold tracking-[0.35em]">ALEX</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Online</span>
          </span>
        </div>
      </div>

      {/* Transcript bubble */}
      <div className="relative z-10 mt-8 px-5 max-w-md mx-auto">
        <div
          className="relative rounded-3xl border border-white/10 px-5 py-5 text-left backdrop-blur-md"
          style={{
            background:
              "linear-gradient(180deg, hsl(220 50% 10% / 0.85), hsl(222 60% 6% / 0.85))",
            boxShadow:
              "0 30px 60px -20px hsl(212 100% 30% / 0.4), inset 0 0 0 1px hsl(212 100% 60% / 0.06)",
          }}
        >
          {/* Floating mic button */}
          <button
            onClick={handleStart}
            aria-label="Activer le micro"
            className="absolute -top-5 right-4 w-12 h-12 rounded-full flex items-center justify-center border border-blue-400/40 bg-[hsl(220_60%_8%)] text-blue-300 hover:text-white transition"
            style={{
              boxShadow:
                "0 0 0 4px hsl(212 100% 50% / 0.18), 0 12px 30px -10px hsl(212 100% 50% / 0.6)",
            }}
          >
            <Mic className="w-5 h-5" />
          </button>

          <p className="text-blue-300 font-semibold text-base">{greeting}</p>
          <p className="text-white/80 text-base mt-1.5 leading-snug">{subline}</p>

          <div className="mt-4">
            <Waveform active={active} />
          </div>
        </div>

        <p className="mt-4 text-white/55 text-xs">
          Touchez l'orb ou le micro pour commencer. Alex répond à la voix et au texte.
        </p>
      </div>

      {/* Primary CTAs */}
      <div className="relative z-10 mt-8 px-5 max-w-md mx-auto flex flex-col gap-3 pb-8">
        <button
          onClick={handleStart}
          className="w-full h-14 rounded-2xl font-semibold text-white text-base transition active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(180deg, hsl(212 100% 55%), hsl(220 100% 42%))",
            boxShadow:
              "0 14px 30px -8px hsl(212 100% 50% / 0.55), inset 0 1px 0 hsl(0 0% 100% / 0.25)",
          }}
        >
          Parler à Alex
        </button>
        <a
          href="/entrepreneur"
          className="w-full h-14 rounded-2xl font-semibold text-white/90 text-base inline-flex items-center justify-center border border-white/15 bg-white/[0.03] hover:bg-white/[0.07] transition"
        >
          Je suis entrepreneur
        </a>
        <p className="text-white/55 text-sm mt-1">
          Trouvez le bon pro. Ou devenez le pro recommandé.
        </p>
      </div>

      {/* Quick actions */}
      <div className="relative z-10 px-5 max-w-2xl mx-auto pb-8 grid grid-cols-2 gap-3">
        {[
          { label: "Problème maison", href: "/problemes" },
          { label: "Analyse soumission", href: "/quote-analyzer" },
          { label: "Vérifier un pro", href: "/verifier-pro" },
          { label: "Rejoindre UNPRO", href: "/entrepreneur" },
          { label: "Gestion condo", href: "/condo" },
        ].map((q) => (
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
            <div className="text-[10px] font-bold tracking-widest text-blue-300">{title}</div>
            <p className="text-white/60 text-xs mt-1 leading-snug">{body}</p>
          </div>
        ))}
      </div>

      {/* Local keyframes */}
      <style>{`
        @keyframes orb-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.025); }
        }
        @keyframes orb-pulse {
          0% { box-shadow: 0 0 0 0 hsl(212 100% 60% / 0.6), 0 0 60px hsl(212 100% 55% / 0.6); }
          100% { box-shadow: 0 0 0 30px hsl(212 100% 60% / 0), 0 0 80px hsl(212 100% 55% / 0); }
        }
      `}</style>
    </section>
  );
}
