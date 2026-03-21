import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DateSelectorProps {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  availableDays?: number[]; // 0-6 day of week
  horizonDays?: number;
  minNoticeHours?: number;
}

const DAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

export function DateSelector({
  selectedDate,
  onSelect,
  availableDays = [1, 2, 3, 4, 5],
  horizonDays = 30,
  minNoticeHours = 4,
}: DateSelectorProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const days = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      result.push(d);
    }
    return result;
  }, [weekStart]);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + horizonDays);

  const minDate = new Date();
  minDate.setHours(minDate.getHours() + minNoticeHours);

  const isAvailable = (d: Date) => {
    if (d < today) return false;
    if (d > maxDate) return false;
    return availableDays.includes(d.getDay());
  };

  const isSelected = (d: Date) =>
    selectedDate && d.toDateString() === selectedDate.toDateString();

  const isToday = (d: Date) => d.toDateString() === today.toDateString();

  return (
    <div>
      {/* Month + navigation */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-meta font-semibold text-foreground capitalize">
          {weekStart.toLocaleDateString("fr-CA", { month: "long", year: "numeric" })}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
            disabled={weekOffset === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            onClick={() => setWeekOffset(weekOffset + 1)}
            disabled={weekOffset >= Math.ceil(horizonDays / 7)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((label, i) => (
          <div key={i} className="text-center text-caption text-muted-foreground font-medium py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Day buttons */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const available = isAvailable(day);
          const selected = isSelected(day);
          const todayMark = isToday(day);

          return (
            <button
              key={i}
              disabled={!available}
              onClick={() => available && onSelect(day)}
              className={cn(
                "relative aspect-square rounded-xl flex items-center justify-center text-body transition-all",
                available
                  ? "hover:bg-primary/10 cursor-pointer"
                  : "opacity-30 cursor-not-allowed",
                selected && "bg-primary text-primary-foreground font-semibold shadow-sm",
                !selected && available && "text-foreground"
              )}
            >
              {day.getDate()}
              {todayMark && !selected && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
