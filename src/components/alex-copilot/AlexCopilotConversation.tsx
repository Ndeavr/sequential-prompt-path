/**
 * AlexCopilotConversation — Orb-first mobile sheet.
 *
 * Two display modes inside the sheet:
 *   - "action_menu" → voice-first big buttons. NO keyboard, NO composer focus.
 *   - "text_chat"   → traditional chat with a keyboard-aware sticky composer.
 *
 * Mobile keyboard handling:
 *   - visualViewport listener tracks keyboard height.
 *   - Composer translates up by keyboard offset.
 *   - Messages container reserves room for composer + keyboard.
 *   - Input is NEVER autofocused. Focus only happens when user taps the input.
 */
import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { ArrowLeft, MoreVertical, Plus, Send, ShieldCheck, Mic, Camera, FileText, BadgeCheck, HardHat, Pencil } from "lucide-react";
import { useCopilotConversationStore } from "@/stores/copilotConversationStore";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import AlexOrbPremium from "@/components/alex/AlexOrbPremium";
import CardRecommendedProSingle from "./CardRecommendedProSingle";
import ModalWhyThisPro from "./ModalWhyThisPro";
import SheetBookingMobile from "./SheetBookingMobile";

function timeLabel(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
}

/** Track mobile keyboard height via visualViewport. */
function useKeyboardOffset(): number {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const handler = () => {
      const diff = window.innerHeight - vv.height - vv.offsetTop;
      setOffset(diff > 40 ? diff : 0);
    };
    handler();
    vv.addEventListener("resize", handler);
    vv.addEventListener("scroll", handler);
    return () => {
      vv.removeEventListener("resize", handler);
      vv.removeEventListener("scroll", handler);
    };
  }, []);
  return offset;
}

export default function AlexCopilotConversation() {
  const {
    isOpen,
    displayMode,
    setDisplayMode,
    close,
    messages,
    thinking,
    sendMessage,
    requestAlternative,
    openBooking,
    bookingOpen,
    closeBooking,
    selectedPro,
    whyOpen,
    openWhy,
    closeWhy,
    proPool,
    currentProIndex,
  } = useCopilotConversationStore();

  const { openAlex } = useAlexVoice();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboardOffset = useKeyboardOffset();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, thinking, keyboardOffset, displayMode]);

  const handleSend = () => {
    if (!text.trim()) return;
    void sendMessage(text);
    setText("");
  };

  const switchToTextChat = () => {
    setDisplayMode("text_chat");
    // Defer focus so the sheet animation completes before keyboard opens
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const triggerVoice = () => {
    close();
    openAlex("home_copilot_voice");
  };

  const triggerUpload = () => {
    const input = document.getElementById("alex-file-input") as HTMLInputElement | null;
    input?.click();
    setDisplayMode("text_chat");
  };

  const hasAlternative = currentProIndex >= 0 && currentProIndex + 1 < proPool.length;

  const isActionMenu = displayMode === "action_menu";

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(v) => !v && close()}>
        <SheetContent
          side="bottom"
          className="bg-[hsl(220_45%_5%)] border-t border-white/10 text-white p-0 h-[100dvh] max-h-[100dvh] rounded-none flex flex-col [&>button]:hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[hsl(220_45%_6%)] shrink-0">
            <button onClick={close} aria-label="Retour" className="p-2 -ml-2 text-white/80 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <AlexOrbPremium size="sm" state={thinking ? "thinking" : "idle"} />
              <div className="leading-tight">
                <p className="text-[15px] font-bold">Alex</p>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> En ligne
                </p>
              </div>
            </div>
            <button aria-label="Plus" className="p-2 -mr-2 text-white/60">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          {isActionMenu ? (
            <ActionMenu
              onDescribe={switchToTextChat}
              onVoice={triggerVoice}
              onUpload={triggerUpload}
              onQuotes={() => {
                void sendMessage("J'ai déjà une soumission à analyser.");
                setDisplayMode("text_chat");
              }}
              onVerify={() => {
                void sendMessage("Je veux vérifier un entrepreneur.");
                setDisplayMode("text_chat");
              }}
              onPro={() => {
                void sendMessage("Je suis entrepreneur et je veux recevoir des clients.");
                setDisplayMode("text_chat");
              }}
            />
          ) : (
            <>
              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                style={{ paddingBottom: `calc(96px + ${keyboardOffset}px + env(safe-area-inset-bottom))` }}
              >
                {messages.map((m) => {
                  if (m.role === "user") {
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-end"
                      >
                        <div className="max-w-[78%]">
                          <div className="rounded-2xl rounded-tr-md px-4 py-2.5 bg-gradient-to-br from-[hsl(220_100%_55%)] to-[hsl(207_100%_58%)] text-white text-[14px] shadow-lg">
                            {m.text}
                          </div>
                          <p className="text-[10px] text-white/40 mt-1 text-right">{timeLabel(m.createdAt)}</p>
                        </div>
                      </motion.div>
                    );
                  }
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-end gap-2"
                    >
                      <div className="flex-shrink-0 mb-1">
                        <AlexOrbPremium size="sm" state={m.loading ? "thinking" : "idle"} />
                      </div>
                      <div className="max-w-[82%] space-y-2">
                        {m.text && (
                          <div className="rounded-2xl rounded-tl-md px-4 py-2.5 bg-white/8 border border-white/10 text-white text-[14px]">
                            {m.text}
                            {m.loading && <span className="ml-1 inline-flex gap-0.5"><Dot /><Dot delay={0.2} /><Dot delay={0.4} /></span>}
                          </div>
                        )}
                        {m.pro && (
                          <CardRecommendedProSingle
                            pro={m.pro}
                            onBook={() => openBooking(m.pro)}
                            onViewSlots={() => openBooking(m.pro)}
                            onWhy={() => {
                              openWhy(m.pro!);
                            }}
                            onAlternative={() => void requestAlternative()}
                            hasAlternative={hasAlternative}
                          />
                        )}
                        <p className="text-[10px] text-white/40">{timeLabel(m.createdAt)}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Sticky composer — translates up with keyboard */}
              <div
                className="absolute left-0 right-0 bottom-0 px-3 py-3 border-t border-white/10 bg-[hsl(220_45%_6%)] flex items-center gap-2 transition-transform duration-150 ease-out"
                style={{
                  transform: `translateY(-${keyboardOffset}px)`,
                  paddingBottom: keyboardOffset > 0 ? "0.75rem" : "max(env(safe-area-inset-bottom), 0.75rem)",
                  zIndex: 50,
                }}
              >
                <button
                  type="button"
                  onClick={triggerUpload}
                  aria-label="Joindre"
                  className="w-10 h-10 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-white/70 hover:text-white shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Écrivez votre message..."
                  className="flex-1 h-11 px-4 rounded-full bg-white/8 border border-white/10 text-[14px] text-white placeholder:text-white/40 outline-none focus:border-sky-400/50 min-w-0"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  aria-label="Envoyer"
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-[hsl(220_100%_55%)] to-[hsl(207_100%_60%)] flex items-center justify-center text-white shadow-[0_4px_14px_-2px_hsl(220_100%_50%/0.6)] active:scale-95 transition shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* Trust footer (only in text_chat, sits above composer when no keyboard) */}
          {!isActionMenu && keyboardOffset === 0 && (
            <div
              className="absolute left-0 right-0 px-4 py-2 flex items-center justify-center gap-1.5 text-[11px] text-white/50 border-t border-white/5 bg-[hsl(220_45%_5%)]"
              style={{ bottom: "76px", paddingBottom: "calc(env(safe-area-inset-bottom) * 0.4)" }}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400/70" />
              UNPRO protège vos projets — vos données ne sont jamais partagées.
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ModalWhyThisPro
        open={whyOpen}
        pro={selectedPro}
        onClose={closeWhy}
        onBook={() => {
          closeWhy();
          openBooking(selectedPro || undefined);
        }}
      />
      <SheetBookingMobile open={bookingOpen} pro={selectedPro} onClose={closeBooking} />
    </>
  );
}

/* ── Action menu ──────────────────────────────────────────────── */

interface ActionMenuProps {
  onDescribe: () => void;
  onVoice: () => void;
  onUpload: () => void;
  onQuotes: () => void;
  onVerify: () => void;
  onPro: () => void;
}

function ActionMenu({ onDescribe, onVoice, onUpload, onQuotes, onVerify, onPro }: ActionMenuProps) {
  const lastAlex = useCopilotConversationStore((s) =>
    [...s.messages].reverse().find((m) => m.role === "alex" && m.text)
  );

  const items: { id: string; label: string; icon: typeof Mic; onClick: () => void; primary?: boolean }[] = [
    { id: "voice", label: "Parler à Alex", icon: Mic, onClick: onVoice, primary: true },
    { id: "describe", label: "Décrire mon projet", icon: Pencil, onClick: onDescribe },
    { id: "photo", label: "Téléverser une photo", icon: Camera, onClick: onUpload },
    { id: "quotes", label: "Analyser mes soumissions", icon: FileText, onClick: onQuotes },
    { id: "verify", label: "Vérifier un entrepreneur", icon: BadgeCheck, onClick: onVerify },
    { id: "pro", label: "Je suis entrepreneur", icon: HardHat, onClick: onPro },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-4 pb-8 flex flex-col">
      <div className="flex flex-col items-center text-center mb-6">
        <AlexOrbPremium size="xl" state="idle" />
        <p className="mt-4 text-[15px] text-white/85 leading-relaxed max-w-sm">
          {lastAlex?.text ??
            "Bonjour. Je peux vous aider à analyser un projet, vérifier un entrepreneur, comparer des soumissions ou démarrer une fiche pro."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              type="button"
              onClick={it.onClick}
              className={
                it.primary
                  ? "h-14 rounded-2xl bg-gradient-to-r from-[hsl(220_100%_55%)] to-[hsl(207_100%_58%)] text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-[0_10px_30px_-8px_hsl(220_100%_50%/0.7)] active:scale-[0.98] transition"
                  : "h-14 rounded-2xl bg-white/6 border border-white/10 text-white text-[14px] font-medium flex items-center gap-3 px-4 hover:bg-white/10 active:scale-[0.98] transition"
              }
            >
              <Icon className={it.primary ? "w-5 h-5" : "w-5 h-5 text-sky-400"} />
              <span className={it.primary ? "" : "flex-1 text-left"}>{it.label}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-center text-[11px] text-white/45 inline-flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-sky-400/70" />
        Vos données restent confidentielles.
      </p>
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span
      className="inline-block w-1 h-1 rounded-full bg-white/60"
      animate={{ opacity: [0.2, 1, 0.2] }}
      transition={{ duration: 1, repeat: Infinity, delay }}
    />
  );
}
