/**
 * BannerSwitchInputMode — Soft transition banner between input modes.
 */
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface Props {
  currentMode: "chat" | "form";
  message: string;
  onSwitch: () => void;
}

export default function BannerSwitchInputMode({ message }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mx-auto max-w-lg flex items-center gap-2 rounded-xl bg-accent/10 border border-accent/20 px-4 py-2.5"
    >
      <Sparkles className="h-4 w-4 text-accent flex-shrink-0" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </motion.div>
  );
}
