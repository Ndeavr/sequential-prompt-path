/**
 * WidgetCalendarAvailabilityPreview — mock preview of next compatible slots.
 */
import { Clock } from "lucide-react";
import { useMemo } from "react";

export default function WidgetCalendarAvailabilityPreview({ role }: { role: string }) {
  const slots = useMemo(() => {
    const base = new Date();
    base.setMinutes(0, 0, 0);
    return Array.from({ length: 4 }).map((_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i + 1);
      d.setHours(9 + (i * 2));
      return d;
    });
  }, []);

  const fmt = (d: Date) => d.toLocaleDateString("fr-CA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-xl border border-border/30 bg-card/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          {role === "contractor" ? "Plages détectées entre vos chantiers" : "Heures qui marchent pour vous"}
        </h4>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {slots.map((s) => (
          <div key={s.toISOString()} className="rounded-lg bg-muted/20 border border-border/20 px-3 py-2">
            <p className="text-xs text-foreground capitalize">{fmt(s)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
