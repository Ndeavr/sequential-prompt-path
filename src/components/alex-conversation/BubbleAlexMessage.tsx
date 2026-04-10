import { motion } from "framer-motion";
import { Bot } from "lucide-react";

interface Props {
  content: string;
}

export default function BubbleAlexMessage({ content }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex gap-2.5 items-start max-w-[85%]"
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="rounded-2xl rounded-tl-md bg-muted/60 backdrop-blur-sm border border-border/40 px-3.5 py-2.5">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </motion.div>
  );
}
