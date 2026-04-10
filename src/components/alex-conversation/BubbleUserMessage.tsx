import { motion } from "framer-motion";

interface Props {
  content: string;
}

export default function BubbleUserMessage({ content }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex justify-end"
    >
      <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-primary/90 px-3.5 py-2.5">
        <p className="text-sm text-primary-foreground leading-relaxed">{content}</p>
      </div>
    </motion.div>
  );
}
