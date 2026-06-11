import { motion } from "framer-motion";
import type { TimelinePoint } from "../types";

interface Props {
  timeline: {
    now?: TimelinePoint;
    y1?: TimelinePoint;
    y3?: TimelinePoint;
    y5?: TimelinePoint;
  };
}

const STEPS: { key: keyof Props["timeline"]; label: string }[] = [
  { key: "now", label: "Aujourd'hui" },
  { key: "y1", label: "1 an" },
  { key: "y3", label: "3 ans" },
  { key: "y5", label: "5 ans" },
];

const Metric = ({ label, value }: { label: string; value?: number }) => (
  <div className="flex justify-between gap-2 text-[11px]">
    <span className="text-readable-secondary">{label}</span>
    <span className="text-readable font-medium tabular-nums">{value ?? "—"}</span>
  </div>
);

export default function VisionTimeline({ timeline }: Props) {
  return (
    <div className="w-full overflow-x-auto -mx-2 px-2">
      <div className="flex gap-3 min-w-max">
        {STEPS.map((step, i) => {
          const point = timeline[step.key];
          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong rounded-2xl p-4 min-w-[160px] flex-1"
            >
              <div className="text-xs uppercase tracking-wider text-readable-muted mb-3">
                {step.label}
              </div>
              <div className="space-y-1.5">
                <Metric label="Réputation" value={point?.reputation} />
                <Metric label="Visibilité" value={point?.visibility} />
                <Metric label="Reco. IA" value={point?.ai_recommendations} />
                <Metric label="Croissance" value={point?.growth_potential} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
