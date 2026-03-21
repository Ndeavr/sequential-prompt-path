import { useState } from "react";
import { Check, Sparkles, Zap, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { SlotCandidate, SlotBadge } from "@/services/bookingSlotEngine";

interface RankedTimeSlotGridProps {
  slots: SlotCandidate[];
  selectedSlot: SlotCandidate | null;
  onSelect: (slot: SlotCandidate) => void;
}

const badgeConfig: Record<SlotBadge, { label: string; icon: React.ReactNode; className: string }> = {
  best_overall: {
    label: "Meilleur choix",
    icon: <Sparkles className="w-3 h-3" />,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  fastest: {
    label: "Le plus rapide",
    icon: <Zap className="w-3 h-3" />,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  most_convenient: {
    label: "Pratique",
    icon: <Clock className="w-3 h-3" />,
    className: "bg-success/10 text-success border-success/20",
  },
  urgency_optimized: {
    label: "Urgence",
    icon: <Zap className="w-3 h-3" />,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  reduced_travel: {
    label: "Moins de déplacement",
    icon: <MapPin className="w-3 h-3" />,
    className: "bg-accent/10 text-accent border-accent/20",
  },
  recommended_by_alex: {
    label: "Alex recommande",
    icon: <Sparkles className="w-3 h-3" />,
    className: "bg-secondary/10 text-secondary border-secondary/20",
  },
};

function groupSlotsByDay(slots: SlotCandidate[]) {
  const groups: Record<string, SlotCandidate[]> = {};
  for (const slot of slots) {
    const dayKey = slot.start.toISOString().split("T")[0];
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(slot);
  }
  return groups;
}

function formatDayHeader(dateStr: string) {
  const date = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateStr === today.toISOString().split("T")[0]) return "Aujourd'hui";
  if (dateStr === tomorrow.toISOString().split("T")[0]) return "Demain";

  return date.toLocaleDateString("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function RankedTimeSlotGrid({ slots, selectedSlot, onSelect }: RankedTimeSlotGridProps) {
  const grouped = groupSlotsByDay(slots);
  const dayKeys = Object.keys(grouped).sort();

  if (slots.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-body text-muted-foreground">Aucune plage disponible pour cette période</p>
        <p className="text-meta text-muted-foreground mt-1">Essayez une autre date ou un autre type de rendez-vous</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dayKeys.map((dayKey) => (
        <div key={dayKey}>
          <h3 className="text-meta font-semibold text-foreground mb-3 capitalize">
            {formatDayHeader(dayKey)}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {grouped[dayKey].map((slot, i) => {
              const isSelected = selectedSlot?.start.getTime() === slot.start.getTime();
              return (
                <button
                  key={i}
                  onClick={() => onSelect(slot)}
                  className={cn(
                    "relative rounded-xl border p-3 text-left transition-all duration-150",
                    "hover:border-primary/40 hover:shadow-sm",
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border/60 bg-card",
                    slot.isRecommended && !isSelected && "border-primary/20 bg-primary/[0.02]"
                  )}
                >
                  {/* Time */}
                  <div className="flex items-center justify-between">
                    <span className="text-body font-semibold text-foreground">
                      {formatTime(slot.start)}
                    </span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>

                  <span className="text-caption text-muted-foreground">
                    → {formatTime(slot.end)}
                  </span>

                  {/* Badges */}
                  {slot.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {slot.badges.slice(0, 2).map((badge) => {
                        const cfg = badgeConfig[badge];
                        return (
                          <Badge
                            key={badge}
                            variant="outline"
                            className={cn("text-[9px] px-1.5 py-0 gap-0.5", cfg.className)}
                          >
                            {cfg.icon}
                            {cfg.label}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
