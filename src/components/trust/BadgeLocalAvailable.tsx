/**
 * UNPRO — BadgeLocalAvailable
 * Shows local availability for a city.
 */
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  city: string;
  className?: string;
}

export default function BadgeLocalAvailable({ city, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-medium",
        className,
      )}
    >
      <MapPin className="h-3 w-3" />
      Disponible à {city}
    </span>
  );
}
