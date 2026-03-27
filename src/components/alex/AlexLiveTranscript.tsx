/**
 * AlexLiveTranscript — Shows real-time voice transcription with typing effect.
 */
import { motion } from "framer-motion";

interface AlexLiveTranscriptProps {
  text: string;
  className?: string;
}

export default function AlexLiveTranscript({ text, className = "" }: AlexLiveTranscriptProps) {
  if (!text) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={`flex justify-end ${className}`}
    >
      <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-primary/10 border border-primary/20">
        <p className="text-sm text-foreground/70 italic">
          {text}
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="inline-block ml-0.5 w-0.5 h-4 bg-primary/50 align-middle"
          />
        </p>
      </div>
    </motion.div>
  );
}
