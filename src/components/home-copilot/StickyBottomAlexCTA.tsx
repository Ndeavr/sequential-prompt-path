/**
 * StickyBottomAlexCTA — sticky mobile bottom bar that appears after 400px scroll.
 * Primary action: Créer mon Passeport Maison.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, ArrowRight } from "lucide-react";
import AlexOrbPremium from "@/components/alex/AlexOrbPremium";
import { useCopilotConversationStore } from "@/stores/copilotConversationStore";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";
import { PASSPORT_PRIMARY_CTA, PASSPORT_PRIMARY_HREF } from "@/lib/copy/passportPositioning";

export default function StickyBottomAlexCTA() {
  const [visible, setVisible] = useState(false);
  const openActionMenu = useCopilotConversationStore((s) => s.openActionMenu);
  const navigate = useNavigate();

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
          <div className="w-full h-14 rounded-2xl bg-[hsl(220_45%_8%/0.92)] border border-white/15 backdrop-blur-xl text-white flex items-center gap-2 px-2 shadow-[0_12px_30px_-6px_hsl(220_100%_30%/0.55)]">
            <button
              onClick={() => {
                trackCopilotEvent("alex_started", { mode: "sticky_orb" });
                openActionMenu();
              }}
              aria-label="Parler à Alex"
              className="flex-shrink-0 active:scale-95 transition"
            >
              <AlexOrbPremium size="sm" state="idle" />
            </button>
            <button
              onClick={() => {
                trackCopilotEvent("passport_cta_clicked", { placement: "sticky" });
                navigate(PASSPORT_PRIMARY_HREF);
              }}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[hsl(220_100%_55%)] to-[hsl(207_100%_60%)] flex items-center justify-center gap-1.5 text-[13px] font-semibold active:scale-[0.98] transition"
            >
              <ClipboardList className="w-4 h-4" />
              {PASSPORT_PRIMARY_CTA}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
