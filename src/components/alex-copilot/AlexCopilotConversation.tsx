/**
 * AlexCopilotConversation — full-screen mobile chat sheet.
 * Copilot-style: alternating bubbles, timestamps, sticky composer.
 * One pro recommendation at a time. Never a list.
 */
import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MoreVertical, Plus, Send, ShieldCheck } from "lucide-react";
import { useCopilotConversationStore } from "@/stores/copilotConversationStore";
import AlexOrbPremium from "@/components/alex/AlexOrbPremium";
import CardRecommendedProSingle from "./CardRecommendedProSingle";
import ModalWhyThisPro from "./ModalWhyThisPro";
import SheetBookingMobile from "./SheetBookingMobile";

function timeLabel(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
}

export default function AlexCopilotConversation() {
  const {
    isOpen,
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

  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, thinking]);

  const handleSend = () => {
    if (!text.trim()) return;
    void sendMessage(text);
    setText("");
  };

  const hasAlternative = currentProIndex >= 0 && currentProIndex + 1 < proPool.length;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(v) => !v && close()}>
        <SheetContent
          side="bottom"
          className="bg-[hsl(220_45%_5%)] border-t border-white/10 text-white p-0 h-[100dvh] max-h-[100dvh] rounded-none flex flex-col [&>button]:hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[hsl(220_45%_6%)]">
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

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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

          {/* Trust footer */}
          <div className="px-4 py-2 border-t border-white/5 flex items-center justify-center gap-1.5 text-[11px] text-white/50">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400/70" />
            UNPRO protège vos projets — vos données ne sont jamais partagées.
          </div>

          {/* Composer */}
          <div className="px-3 py-3 border-t border-white/10 bg-[hsl(220_45%_6%)] flex items-center gap-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
            <button
              aria-label="Joindre"
              className="w-10 h-10 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-white/70 hover:text-white"
            >
              <Plus className="w-5 h-5" />
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Écrivez votre message..."
              className="flex-1 h-11 px-4 rounded-full bg-white/8 border border-white/10 text-[14px] text-white placeholder:text-white/40 outline-none focus:border-sky-400/50"
            />
            <button
              onClick={handleSend}
              aria-label="Envoyer"
              className="w-11 h-11 rounded-full bg-gradient-to-br from-[hsl(220_100%_55%)] to-[hsl(207_100%_60%)] flex items-center justify-center text-white shadow-[0_4px_14px_-2px_hsl(220_100%_50%/0.6)] active:scale-95 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
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

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span
      className="inline-block w-1 h-1 rounded-full bg-white/60"
      animate={{ opacity: [0.2, 1, 0.2] }}
      transition={{ duration: 1, repeat: Infinity, delay }}
    />
  );
}
