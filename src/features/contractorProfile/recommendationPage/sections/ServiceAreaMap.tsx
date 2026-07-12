/**
 * ServiceAreaMap — Territories + travel radius. Static list (map = Phase 2).
 */
import { MapPin } from "lucide-react";

interface Props {
  areas: string[];
  radiusKm: number;
  primaryCity: string | null;
}

export default function ServiceAreaMap({ areas, radiusKm, primaryCity }: Props) {
  const territories = areas.length ? areas : primaryCity ? [primaryCity] : [];
  if (!territories.length) return null;

  return (
    <section aria-labelledby="area-heading" className="space-y-3">
      <h2 id="area-heading" className="text-lg font-semibold text-foreground">
        Zone desservie
      </h2>
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {territories.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs border border-primary/20"
            >
              <MapPin className="w-3 h-3" /> {t}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Distance maximale</span>
          <span className="font-semibold text-foreground">{radiusKm} km</span>
        </div>
      </div>
    </section>
  );
}
