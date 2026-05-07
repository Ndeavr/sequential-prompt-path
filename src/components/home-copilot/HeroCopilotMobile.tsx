/**
 * HeroCopilotMobile — Orb-first mobile hero.
 *
 * UX rules:
 *  - Alex Orb is the primary entry. No autofocus. Keyboard never opens on load.
 *  - "Parler à Alex" → opens action menu (voice-first, no keyboard).
 *  - Compact text input below: tapping it opens the chat in text mode (focus only
 *    happens AFTER user explicitly taps the input or the send button).
 *  - Quick chips trigger the corresponding Alex action inside the chat sheet.
 */
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUp, ShieldCheck, Sparkles, Search, Calculator, BadgeCheck, FileText, Camera, HardHat } from "lucide-react";
import AlexOrbPremium from "@/components/alex/AlexOrbPremium";
import { useCopilotConversationStore } from "@/stores/copilotConversationStore";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

const CHIPS = [
  { id: "find", label: "Trouver un pro", icon: Search, intent: "Je cherche un pro pour un projet maison." },
  { id: "estimate", label: "Estimer le coût", icon: Calculator, intent: "Je veux estimer le coût d'un projet." },
  { id: "verify", label: "Vérifier un pro", icon: BadgeCheck, intent: "Je veux vérifier un entrepreneur." },
  { id: "quote", label: "Analyser soumission", icon: FileText, intent: "J'ai déjà une soumission à analyser." },
  { id: "photo", label: "Téléverser photos", icon: Camera, intent: "Je veux téléverser des photos de mon problème." },
  { id: "pro", label: "Je suis entrepreneur", icon: HardHat, intent: "Je suis entrepreneur et je veux recevoir des clients." },
];

export default function HeroCopilotMobile() {
  const [text, setText] = useState("");
  const open = useCopilotConversationStore((s) => s.open);
  const openActionMenu = useCopilotConversationStore((s) => s.openActionMenu);
  const { openAlex } = useAlexVoice();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) {
      // No text? Treat as "Parler à Alex" — open action menu.
      openActionMenu();
      return;
    }
    open(text.trim());
    setText("");
    // Drop focus so keyboard collapses; chat sheet handles its own composer.
    textareaRef.current?.blur();
  };

  const handleOrbTap = () => {
    trackCopilotEvent("alex_started", { mode: "orb_tap" });
    openActionMenu();
  };

  const handleVoice = () => {
    trackCopilotEvent("alex_started", { mode: "voice" });
    openAlex("home_copilot_voice");
  };

  return (
    <section className="relative min-h-[100dvh] flex flex-col bg-[hsl(220_50%_4%)] text-white overflow-hidden">
      {/* Aurora background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-[hsl(220_100%_50%/0.18)] blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[480px] h-[480px] rounded-full bg-[hsl(207_100%_55%/0.12)] blur-[120px]" />
        <div className="absolute top-0 left-0 w-[320px] h-[320px] rounded-full bg-[hsl(252_100%_60%/0.10)] blur-[100px]" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-start px-5 pt-8 pb-8 text-center">
        {/* Orb is the hero — tappable */}
        <motion.button
          type="button"
          onClick={handleOrbTap}
          aria-label="Parler à Alex"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 active:scale-95 transition"
        >
          <AlexOrbPremium size="xl" state="idle" showLabel />
        </motion.button>

        <h1 className="mt-6 text-[28px] sm:text-[34px] font-bold leading-[1.15] tracking-tight max-w-md">
          Quel est votre projet{" "}
          <span className="bg-gradient-to-r from-[hsl(207_100%_70%)] to-[hsl(198_100%_78%)] bg-clip-text text-transparent">
            aujourd'hui?
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-3 text-[14px] text-white/70 max-w-sm leading-relaxed"
        >
          Touchez l'orb d'Alex pour démarrer. Voix, photo, soumission ou texte — vous choisissez.
        </motion.p>

        {/* Primary CTA — Parler à Alex (voice-first, no keyboard) */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          onClick={handleVoice}
          className="w-full max-w-md mt-6 h-14 rounded-2xl bg-gradient-to-r from-[hsl(220_100%_55%)] to-[hsl(207_100%_58%)] text-white text-[16px] font-semibold flex items-center justify-center gap-2 shadow-[0_10px_30px_-8px_hsl(220_100%_50%/0.7)] active:scale-[0.98] transition"
        >
          <Sparkles className="w-5 h-5" />
          Parler à Alex
        </motion.button>

        <p className="mt-3 text-[12px] text-white/55 inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400/70" />
          Gratuit • Sans engagement • Réponse rapide
        </p>

        {/* Compact text input — secondary entry, NEVER autofocused */}
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          onSubmit={handleSubmit}
          className="w-full max-w-md mt-5"
        >
          <div className="relative rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)] focus-within:border-sky-400/50 transition">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={1}
              inputMode="text"
              placeholder="Ou écrivez ici…"
              className="w-full bg-transparent resize-none px-4 py-3 pr-14 text-[14px] text-white placeholder:text-white/45 outline-none rounded-2xl"
            />
            <button
              type="submit"
              aria-label="Envoyer à Alex"
              className="absolute right-2 bottom-2 w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(220_100%_55%)] to-[hsl(207_100%_60%)] flex items-center justify-center text-white shadow-[0_4px_14px_-2px_hsl(220_100%_50%/0.6)] active:scale-95 transition"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </motion.form>

        {/* Chips */}
        <p className="mt-7 text-[12px] uppercase tracking-wider text-white/45 font-semibold">
          Ou choisissez un raccourci
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 w-full max-w-md">
          {CHIPS.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => {
                  trackCopilotEvent("chip_clicked", { id: c.id });
                  open(c.intent);
                }}
                className="flex flex-col items-center justify-center gap-1.5 h-20 rounded-xl bg-white/5 border border-white/10 text-white/85 hover:bg-white/8 hover:border-white/20 active:scale-[0.97] transition"
              >
                <Icon className="w-5 h-5 text-sky-400" />
                <span className="text-[11px] leading-tight font-medium px-1 text-center">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
