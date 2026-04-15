/**
 * BubbleUserMessage — Premium user message bubble.
 */
import { motion } from "framer-motion";

interface Props {
  content: string;
}

export default function BubbleUserMessage({ content }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex justify-end"
    >
      <div
        className="max-w-[80%] rounded-2xl rounded-tr-md px-4 py-3"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.9), hsl(var(--primary)))",
        }}
      >
        <p className="text-sm text-primary-foreground leading-relaxed">{content}</p>
      </div>
    </motion.div>
  );
}
