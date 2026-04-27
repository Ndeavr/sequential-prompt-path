/**
 * StickyBottomAlexCTA — sticky mobile bottom bar that appears after 400px scroll.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import AlexOrbPremium from "@/components/alex/AlexOrbPremium";
import { useCopilotConversationStore } from "@/stores/copilotConversationStore";

export default function StickyBottomAlexCTA() {
  const [visible, setVisible] = useState(false);
  const openActionMenu = useCopilotConversationStore((s) => s.openActionMenu);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-3 left-3 right-3 z-50 md:hidden"
        >
          <button
            onClick={() => openActionMenu()}
            className="w-full h-14 rounded-2xl bg-[hsl(220_45%_8%/0.92)] border border-white/15 backdrop-blur-xl text-white flex items-center gap-3 px-3 shadow-[0_12px_30px_-6px_hsl(220_100%_30%/0.55)] active:scale-[0.98] transition"
          >
            <AlexOrbPremium size="sm" state="idle" />
            <span className="flex-1 text-left text-[14px] font-semibold">Parler à Alex</span>
            <span className="px-3 h-9 rounded-xl bg-gradient-to-r from-[hsl(220_100%_55%)] to-[hsl(207_100%_60%)] flex items-center gap-1.5 text-[12.5px] font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Démarrer
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
