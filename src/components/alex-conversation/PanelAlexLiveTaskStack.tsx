/**
 * PanelAlexLiveTaskStack — Visual step progress inline in chat.
 */
import { motion } from "framer-motion";
import { Check, Circle, Loader2, Lock } from "lucide-react";
import type { TaskProgressData } from "./types";

interface Props {
  data: TaskProgressData;
}

const STATUS_ICON = {
  done: <Check className="h-3.5 w-3.5 text-green-500" />,
  active: <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />,
  pending: <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />,
  blocked: <Lock className="h-3.5 w-3.5 text-destructive/60" />,
};

export default function PanelAlexLiveTaskStack({ data }: Props) {
  return (
    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Progression
      </h4>

      <div className="space-y-0">
        {data.tasks.map((task, i) => (
          <div key={task.key} className="flex items-start gap-3 relative">
            {/* Connector line */}
            {i < data.tasks.length - 1 && (
              <div className="absolute left-[7px] top-5 w-[1px] h-[calc(100%)] bg-border/50" />
            )}
            <div className="shrink-0 z-10 bg-card">{STATUS_ICON[task.status]}</div>
            <span className={`text-sm pb-3 ${
              task.status === "done" ? "text-muted-foreground line-through" :
              task.status === "active" ? "text-foreground font-medium" :
              "text-muted-foreground/60"
            }`}>
              {task.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
