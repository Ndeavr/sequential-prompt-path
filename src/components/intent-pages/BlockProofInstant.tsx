/**
 * BlockProofInstant — Quick proof block with a stat + label.
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProofItem {
  stat: string;
  label: string;
}

interface Props {
  items: ProofItem[];
  className?: string;
}

export default function BlockProofInstant({ items, className }: Props) {
  return (
    <div className={cn("flex items-center justify-center gap-6 sm:gap-10 px-5", className)}>
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className="text-center"
        >
          <p className="text-lg sm:text-2xl font-bold text-primary tabular-nums">{item.stat}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground">{item.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
