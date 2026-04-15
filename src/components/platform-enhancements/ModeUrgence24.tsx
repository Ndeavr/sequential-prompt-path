/**
 * ModeUrgence24 — Emergency button for instant no-friction booking.
 */
import { motion } from "framer-motion";
import { Zap, Phone } from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

export default function ModeUrgence24() {
  const { openAlex } = useAlexVoice();

  return (
    <motion.button
      onClick={() => openAlex("urgence_24h", "Mode urgence activé")}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className="w-full py-4 rounded-2xl font-semibold text-sm
        bg-gradient-to-r from-red-600 to-red-500 text-white
        flex items-center justify-center gap-3
        shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_50px_rgba(239,68,68,0.4)]
        transition-shadow duration-300"
    >
      <Zap className="w-5 h-5" />
      Urgence 24h — Intervention immédiate
      <Phone className="w-4 h-4" />
    </motion.button>
  );
}
