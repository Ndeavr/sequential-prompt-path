
import { motion } from "framer-motion";

interface Props {
  remaining: number;
  total: number;
  label?: string;
}

export default function CounterLiveSpots({ remaining, total, label }: Props) {
  const pct = ((total - remaining) / total) * 100;
  const urgencyColor = remaining <= 5 ? "from-destructive to-destructive/70" : remaining <= 15 ? "from-warning to-warning/70" : "from-primary to-primary/70";

  return (
    <div className="space-y-2 w-full max-w-xs">
      {label && <p className="text-xs text-muted-foreground text-center">{label}</p>}
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-foreground">{remaining} / {total}</span>
        <span className="text-muted-foreground">places restantes</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted/30 overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${urgencyColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
