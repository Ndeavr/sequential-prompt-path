/**
 * HeroConciergeWarm — Warm Apple/Stripe-style "Conversational Homepage".
 *
 * The microphone IS the CTA. Alex orb only comes alive during interaction.
 * Voice/text plumbing is delegated to AlexHomepageConversation (hideComposer)
 * with a custom warm composer rendered here.
 *
 * Note: top header + bottom nav are provided by MainLayout. Do NOT render
 * additional headers or tab bars here — that creates duplicate menus.
 */
import { useRef, useState } from "react";
import { Send, ImageIcon, ShieldCheck, Lock, MapPin, Sparkles } from "lucide-react";
import AlexMicOrb, { type MicOrbState } from "./AlexMicOrb";
import TrustRow from "./TrustRow";
import AlexHomepageConversation, {
  type AlexHomepageConversationHandle,
} from "../home-orb/AlexHomepageConversation";

const GREETING =
  "Bonjour. Je suis Alex d'UNPRO. Quel problème puis-je vous aider à régler aujourd'hui?";

const TRUST_PILLS = [
  { icon: ShieldCheck, label: "RBQ vérifié" },
  { icon: Lock, label: "Pas de soumissions partagées" },
  { icon: MapPin, label: "Québec seulement" },
  { icon: Sparkles, label: "IA + humain" },
];

export default function HeroConciergeWarm() {
  const convoRef = useRef<AlexHomepageConversationHandle>(null);
  const [active, setActive] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [thinking] = useState(false);
  const [input, setInput] = useState("");

  const orbState: MicOrbState = speaking
    ? "speaking"
    : thinking
    ? "thinking"
    : active
    ? "listening"
    : "idle";

  const start = () => convoRef.current?.start();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t) {
      start();
      return;
    }
    convoRef.current?.send(t);
    setInput("");
  };

  return (
    <section
      className="relative isolate min-h-[100svh] text-[#0F1B2D]"
      style={{ background: "#F7F6F0" }}
      aria-label="Parlez à Alex — UNPRO"
    >
      {/* Soft warm dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(#0F1B2D 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Hero — top/bottom chrome supplied by MainLayout */}
      <div className="relative z-10 px-5 pt-6 pb-32 lg:pb-16 max-w-md mx-auto text-center">
        {/* Gold pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#C9A24A]/40 bg-[#C9A24A]/10 text-[#8a6e22] text-[11px] font-medium">
          <span className="text-[#C9A24A]">✦</span>
          #1 au Québec pour trouver le bon pro
        </div>

        {/* H1 */}
        <h1
          className="mt-4 text-[#0F1B2D] font-serif"
          style={{
            fontFamily: "'Instrument Serif', 'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(1.9rem, 8vw, 2.75rem)",
            lineHeight: 1.08,
            letterSpacing: "-0.01em",
          }}
        >
          Décrivez votre problème.
        </h1>
        <p className="mt-3 text-[#0F1B2D]/70 text-[15px] leading-snug">
          Alex trouve <span className="text-[#0E5E4E] font-semibold">le bon pro</span>. Un seul. Pas 3 soumissions.
        </p>

        {/* Mic orb */}
        <div className="mt-8 flex flex-col items-center">
          <AlexMicOrb state={orbState} onClick={start} />
          {!active && (
            <p className="mt-3 text-[#0F1B2D]/55 text-[13px] leading-snug max-w-[18rem]">
              Décrivez le problème. Alex s'occupe du reste.
            </p>
          )}
        </div>

        {/* Trust pills */}
        {!active && (
          <ul className="mt-5 flex flex-wrap justify-center gap-1.5">
            {TRUST_PILLS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#0F1B2D]/10 text-[11px] text-[#0F1B2D]/75"
              >
                <Icon className="w-3 h-3 text-[#0E5E4E]" strokeWidth={2} />
                {label}
              </li>
            ))}
          </ul>
        )}

        {/* Composer */}
        <form onSubmit={submit} className="mt-5 flex items-center gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-2 h-12 rounded-full bg-white border border-[#0F1B2D]/10 pl-4 pr-2 focus-within:border-[#0E5E4E]/40">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={start}
              placeholder="Décrivez votre projet, votre problème ou votre urgence…"
              className="flex-1 min-w-0 bg-transparent outline-none text-sm text-[#0F1B2D] placeholder:text-[#0F1B2D]/40"
            />
            <button
              type="button"
              aria-label="Joindre une photo"
              className="shrink-0 p-1.5 text-[#0F1B2D]/50 hover:text-[#0F1B2D]"
            >
              <ImageIcon className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
          <button
            type="submit"
            aria-label="Envoyer"
            className="shrink-0 w-12 h-12 rounded-full inline-flex items-center justify-center bg-[#0E5E4E] text-white shadow-sm disabled:opacity-40"
            disabled={!input.trim() && !active}
          >
            <Send className="w-4 h-4" strokeWidth={2} />
          </button>
        </form>

        {/* Inline transcript (mounts only after first interaction) */}
        <div className="mt-5 text-left">
          <AlexHomepageConversation
            ref={convoRef}
            greeting={GREETING}
            variant="warm"
            hideComposer
            onActivityChange={setActive}
            onAssistantSpeakingChange={(s) => {
              setSpeaking(s);
            }}
          />
        </div>

        {/* Detailed trust signals */}
        {!active && <TrustRow />}

        {/* Contractor CTA */}
        <a
          href="/entrepreneur"
          className="mt-6 inline-flex items-center justify-center w-full h-12 rounded-full border border-[#0F1B2D]/15 bg-white text-[#0F1B2D] text-sm font-semibold hover:bg-[#0F1B2D]/[0.03] transition"
        >
          Je suis entrepreneur →
        </a>

        <p className="mt-3 text-[#0F1B2D]/45 text-xs">
          Trouvez le bon pro. Ou devenez le pro recommandé.
        </p>
      </div>
    </section>
  );
}
