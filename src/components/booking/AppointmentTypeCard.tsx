import { Clock, Video, Phone, MapPin, Camera, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { AppointmentType } from "@/services/bookingSlotEngine";

interface AppointmentTypeCardProps {
  type: AppointmentType;
  isSelected?: boolean;
  onSelect: (type: AppointmentType) => void;
  recommended?: boolean;
}

const locationIcons: Record<string, React.ReactNode> = {
  client_address: <MapPin className="w-3.5 h-3.5" />,
  video: <Video className="w-3.5 h-3.5" />,
  phone: <Phone className="w-3.5 h-3.5" />,
  office: <MapPin className="w-3.5 h-3.5" />,
};

const locationLabels: Record<string, string> = {
  client_address: "Sur place",
  video: "Vidéo",
  phone: "Téléphone",
  office: "Au bureau",
};

function formatPrice(type: AppointmentType) {
  if (type.is_free) return "Gratuit";
  const amount = (type.price_amount / 100).toFixed(0);
  if (type.price_type === "starting_from") return `À partir de ${amount}$`;
  if (type.price_type === "fixed") return `${amount}$`;
  return "";
}

export function AppointmentTypeCard({
  type,
  isSelected,
  onSelect,
  recommended,
}: AppointmentTypeCardProps) {
  return (
    <button
      onClick={() => onSelect(type)}
      className={cn(
        "group relative w-full text-left rounded-2xl border p-4 md:p-5 transition-all duration-200",
        "hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5",
        isSelected
          ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
          : "border-border/60 bg-card"
      )}
    >
      {recommended && (
        <div className="absolute -top-2.5 left-4">
          <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 shadow-sm">
            Recommandé
          </Badge>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Color dot + title */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: type.color }}
            />
            <h3 className="text-body font-semibold text-foreground truncate">{type.title}</h3>
          </div>

          {type.short_description && (
            <p className="text-meta text-muted-foreground mt-1.5 line-clamp-2 pl-5.5">
              {type.short_description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-3 pl-5.5 flex-wrap">
            <div className="flex items-center gap-1 text-meta text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {type.duration_minutes} min
            </div>

            <div className="flex items-center gap-1 text-meta text-muted-foreground">
              {locationIcons[type.location_mode]}
              {locationLabels[type.location_mode] ?? type.location_mode}
            </div>

            {type.requires_photos && (
              <div className="flex items-center gap-1 text-meta text-muted-foreground">
                <Camera className="w-3.5 h-3.5" />
                Photos
              </div>
            )}

            {type.requires_documents && (
              <div className="flex items-center gap-1 text-meta text-muted-foreground">
                <FileText className="w-3.5 h-3.5" />
                Documents
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span
            className={cn(
              "text-meta font-semibold",
              type.is_free ? "text-success" : "text-foreground"
            )}
          >
            {formatPrice(type)}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </button>
  );
}
