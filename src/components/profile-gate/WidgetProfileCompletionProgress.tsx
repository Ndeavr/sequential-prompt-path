import { motion } from "framer-motion";

interface Props {
  score: number;
}

export default function WidgetProfileCompletionProgress({ score }: Props) {
  const color =
    score >= 100 ? "bg-green-500" : score >= 50 ? "bg-primary" : "bg-orange-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Complétion</span>
        <span className="font-medium text-foreground">{score}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}
