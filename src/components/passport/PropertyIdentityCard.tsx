/**
 * UNPRO — Property Identity Card
 * Displays core property attributes with missing data indicators.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Calendar, Ruler, Building, Layers, Info,
} from "lucide-react";

interface Props {
  property: {
    address: string;
    full_address?: string | null;
    city?: string | null;
    province?: string | null;
    postal_code?: string | null;
    property_type?: string | null;
    year_built?: number | null;
    square_footage?: number | null;
    lot_size?: number | null;
    condition?: string | null;
    photo_url?: string | null;
  };
  sectionData: Record<string, unknown>;
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  house: "Maison unifamiliale",
  condo: "Condo",
  duplex: "Duplex",
  triplex: "Triplex",
  townhouse: "Maison de ville",
  semi_detached: "Jumelé",
  cottage: "Chalet",
  multiplex: "Multiplex",
};

function FieldRow({ label, value, icon: Icon }: { label: string; value?: string | number | null; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
      <Icon className={`w-4 h-4 shrink-0 ${value ? "text-primary" : "text-muted-foreground/40"}`} />
      <span className="text-sm text-muted-foreground flex-1">{label}</span>
      {value ? (
        <span className="text-sm font-medium text-foreground">{value}</span>
      ) : (
        <span className="text-xs text-muted-foreground italic flex items-center gap-1">
          <Info className="w-3 h-3" /> Non disponible
        </span>
      )}
    </div>
  );
}

export default function PropertyIdentityCard({ property, sectionData }: Props) {
  const numFloors = sectionData.number_of_floors as number | null;

  return (
    <div className="space-y-3">
      <h3 className="font-display text-base font-semibold text-foreground">
        Identité de la propriété
      </h3>

      <Card className="border-border/30">
        <CardContent className="p-4">
          <FieldRow label="Adresse" value={property.full_address || property.address} icon={MapPin} />
          <FieldRow label="Ville" value={property.city} icon={MapPin} />
          <FieldRow label="Province" value={property.province} icon={MapPin} />
          <FieldRow label="Code postal" value={property.postal_code} icon={MapPin} />
          <FieldRow
            label="Type de propriété"
            value={property.property_type ? PROPERTY_TYPE_LABELS[property.property_type] || property.property_type : null}
            icon={Building}
          />
          <FieldRow label="Année de construction" value={property.year_built} icon={Calendar} />
          <FieldRow
            label="Superficie habitable"
            value={property.square_footage ? `${property.square_footage.toLocaleString("fr-CA")} pi²` : null}
            icon={Ruler}
          />
          <FieldRow label="Nombre d'étages" value={numFloors} icon={Layers} />
          <FieldRow
            label="Taille du terrain"
            value={property.lot_size ? `${property.lot_size.toLocaleString("fr-CA")} pi²` : null}
            icon={Ruler}
          />
        </CardContent>
      </Card>
    </div>
  );
}
