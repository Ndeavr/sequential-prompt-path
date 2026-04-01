/**
 * UNPRO — TimelineRoadmapFeatures
 * Visual roadmap timeline grouped by status.
 */
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Clock, Rocket } from "lucide-react";
import { staggerContainer, fadeUp, viewportOnce } from "@/lib/motion";

interface Feature {
  id: string;
  title: string;
  description?: string;
  status: "live" | "in_progress" | "upcoming";
  category?: string;
}

interface Props {
  features: Feature[];
}

const STATUS_CONFIG = {
  live: {
    label: "Déployé",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  in_progress: {
    label: "En cours",
    icon: Loader2,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
  upcoming: {
    label: "Bientôt",
    icon: Clock,
    color: "text-muted-foreground",
    bg: "bg-muted/30",
    border: "border-muted-foreground/20",
    dot: "bg-muted-foreground/50",
  },
};

export default function TimelineRoadmapFeatures({ features }: Props) {
  const groups = (["live", "in_progress", "upcoming"] as const).map((status) => ({
    ...STATUS_CONFIG[status],
    status,
    items: features.filter((f) => f.status === status),
  }));

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      className="space-y-8"
    >
      {groups.map(
        (group) =>
          group.items.length > 0 && (
            <motion.div key={group.status} variants={fadeUp} className="space-y-3">
              <div className="flex items-center gap-2">
                <group.icon
                  className={`h-4 w-4 ${group.color} ${
                    group.status === "in_progress" ? "animate-spin" : ""
                  }`}
                />
                <h3 className={`text-sm font-bold ${group.color}`}>{group.label}</h3>
                <span className="text-[10px] text-muted-foreground">
                  ({group.items.length})
                </span>
              </div>

              <div className="relative ml-2 border-l border-border/40 pl-6 space-y-4">
                {group.items.map((feature) => (
                  <div key={feature.id} className="relative">
                    <div
                      className={`absolute -left-[25px] top-1.5 h-2 w-2 rounded-full ${group.dot}`}
                    />
                    <div className={`glass-card rounded-xl p-4 border ${group.border}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {feature.category && (
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            {feature.category}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">{feature.title}</h4>
                      {feature.description && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {feature.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ),
      )}
    </motion.div>
  );
}
