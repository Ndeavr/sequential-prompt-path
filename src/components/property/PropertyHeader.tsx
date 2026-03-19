import type { Property } from "@/types/property";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Ruler, Home, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PropertyHeader({ property }: { property: Property }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 via-card to-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard/properties">
            <ArrowLeft className="h-4 w-4 mr-1" /> Mes propriétés
          </Link>
        </Button>
        <Badge variant="outline" className="text-xs">
          {property.certification_status === "certified" ? "✓ Certifié UNPRO" : "Passeport Maison"}
        </Badge>
      </div>

      <div className="flex items-start gap-4">
        {property.photo_url ? (
          <img src={property.photo_url} alt="" className="h-20 w-20 rounded-xl object-cover shrink-0 border border-border/40" />
        ) : (
          <div className="h-20 w-20 rounded-xl bg-muted/30 flex items-center justify-center shrink-0">
            <Home className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
            {property.address}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="h-3.5 w-3.5" />
            {[property.city, property.province, property.postal_code].filter(Boolean).join(", ")}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <InfoPill icon={Home} label="Type" value={property.property_type || "—"} />
        <InfoPill icon={Calendar} label="Année" value={property.year_built?.toString() || "—"} />
        <InfoPill icon={Ruler} label="Superficie" value={property.square_footage ? `${property.square_footage.toLocaleString()} pi²` : "—"} />
        <InfoPill icon={Ruler} label="Terrain" value={property.lot_size ? `${property.lot_size.toLocaleString()} pi²` : "—"} />
      </div>
    </div>
  );
}

function InfoPill({ icon: Icon, label, value }: { icon: typeof Home; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/30 bg-background/50 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
