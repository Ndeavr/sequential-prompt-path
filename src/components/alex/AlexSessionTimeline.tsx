/**
 * AlexSessionTimeline — Visual timeline of current session interactions.
 */
import { motion } from "framer-motion";
import { Check, Camera, BarChart3, CalendarCheck, MessageSquare, Sparkles } from "lucide-react";

interface TimelineEvent {
  id: string;
  type: "message" | "photo" | "score" | "booking" | "action" | "decision";
  label: string;
  timestamp: Date;
  completed?: boolean;
}

const EVENT_ICONS = {
  message: MessageSquare,
  photo: Camera,
  score: BarChart3,
  booking: CalendarCheck,
  action: Sparkles,
  decision: Sparkles,
};

interface AlexSessionTimelineProps {
  events: TimelineEvent[];
  maxVisible?: number;
}

export default function AlexSessionTimeline({ events, maxVisible = 6 }: AlexSessionTimelineProps) {
  const visible = events.slice(-maxVisible);

  if (visible.length === 0) return null;

  return (
    <div className="space-y-1 px-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Session
      </p>
      <div className="relative">
        {/* Line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/40" />

        {visible.map((event, i) => {
          const Icon = EVENT_ICONS[event.type] || MessageSquare;
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 py-1.5 relative"
            >
              <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                event.completed
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                {event.completed ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
              </div>
              <span className={`text-xs truncate ${
                event.completed ? "text-foreground" : "text-muted-foreground"
              }`}>
                {event.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export type { TimelineEvent };
