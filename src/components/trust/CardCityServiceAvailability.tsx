/**
 * UNPRO — CardCityServiceAvailability
 * Shows service availability in a specific city.
 */
import { MapPin, Users, Clock } from "lucide-react";
import BadgeLocalAvailable from "./BadgeLocalAvailable";

interface Props {
  city: string;
  service: string;
  contractorsCount: number;
  avgResponseTimeHours?: number;
}

export default function CardCityServiceAvailability({
  city,
  service,
  contractorsCount,
  avgResponseTimeHours,
}: Props) {
  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-1.5 bg-primary/10">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{city}</h4>
            <p className="text-[10px] text-muted-foreground">{service}</p>
          </div>
        </div>
        <BadgeLocalAvailable city={city} />
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {contractorsCount} entrepreneur{contractorsCount > 1 ? "s" : ""}
        </span>
        {avgResponseTimeHours != null && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {avgResponseTimeHours < 1
              ? `${Math.round(avgResponseTimeHours * 60)} min`
              : `${avgResponseTimeHours}h`}
          </span>
        )}
      </div>
    </div>
  );
}
