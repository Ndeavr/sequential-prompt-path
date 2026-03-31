/**
 * CardBeforeAfterProfile — Visual comparison of contractor profile before/after UNPRO optimization.
 */
import { motion } from "framer-motion";
import { X, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileState {
  label: string;
  items: { text: string; status: "good" | "bad" | "neutral" }[];
  score: number;
}

interface Props {
  before: ProfileState;
  after: ProfileState;
  className?: string;
}

export default function CardBeforeAfterProfile({ before, after, className }: Props) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {/* Before */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-card rounded-xl p-4 border-destructive/20 space-y-3"
      >
        <div className="text-center">
          <span className="text-[10px] uppercase tracking-wider text-destructive font-bold">Avant</span>
          <div className="text-2xl font-bold text-destructive mt-1">{before.score}</div>
          <div className="text-[10px] text-muted-foreground">Score AIPP</div>
        </div>
        <div className="space-y-1.5">
          {before.items.map((item, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              {item.status === "bad" ? (
                <X className="w-3 h-3 text-destructive flex-shrink-0 mt-0.5" />
              ) : (
                <Check className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
              )}
              <span className={item.status === "bad" ? "text-destructive/80" : "text-muted-foreground"}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* After */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl p-4 border-green-500/20 space-y-3"
      >
        <div className="text-center">
          <span className="text-[10px] uppercase tracking-wider text-green-500 font-bold">Après</span>
          <div className="text-2xl font-bold text-green-500 mt-1">{after.score}</div>
          <div className="text-[10px] text-muted-foreground">Score AIPP</div>
        </div>
        <div className="space-y-1.5">
          {after.items.map((item, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <Check className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-foreground/80">{item.text}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
