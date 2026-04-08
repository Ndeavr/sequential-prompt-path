/**
 * CardEntryVoicePrimary — Large voice CTA to start Alex conversation.
 */
import { motion } from "framer-motion";
import { Mic } from "lucide-react";

interface Props {
  onClick: () => void;
}

export default function CardEntryVoicePrimary({ onClick }: Props) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="w-full py-5 rounded-2xl font-semibold text-body-lg
        bg-gradient-to-r from-primary to-accent text-primary-foreground
        flex items-center justify-center gap-3
        shadow-[var(--shadow-glow)] hover:shadow-[var(--shadow-glow-lg)]
        transition-shadow duration-300"
    >
      <Mic className="w-5 h-5" />
      Parler à Alex
    </motion.button>
  );
}
