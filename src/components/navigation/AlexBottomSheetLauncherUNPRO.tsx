/**
 * UNPRO — Alex Bottom Nav Orb
 * Taps navigates directly to /alex and starts voice.
 * No popup/bottom sheet.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function AlexBottomSheetLauncherUNPRO() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/alex")}
      className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
      aria-label="Alex"
    >
      <motion.div
        className="w-12 h-12 -mt-6 rounded-full flex items-center justify-center relative"
        style={{
          background: "linear-gradient(135deg, hsl(222 100% 55%), hsl(252 100% 60%), hsl(195 100% 48%))",
          boxShadow: "0 4px 20px -2px hsl(222 100% 60% / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.15)",
        }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        whileTap={{ scale: 0.9 }}
      >
        <Sparkles className="w-5 h-5 text-white relative z-10" />
      </motion.div>
      <span className="text-[9px] font-semibold text-primary mt-0.5">Alex</span>
    </button>
  );
}
