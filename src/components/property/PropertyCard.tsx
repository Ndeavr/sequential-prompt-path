import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, MapPin, Calendar, Ruler, ArrowRight } from "lucide-react";
import type { Property } from "@/types/property";
import { scoreLabel, scoreColor } from "@/types/property";

export default function PropertyCard({ property }: { property: Property }) {
  return (
    <Link to={`/dashboard/properties/${property.id}`} className="group block">
      <Card className="relative overflow-hidden border-border/40 bg-card/80 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        {/* Gradient accent */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60 opacity-0 transition-opacity group-hover:opacity-100" />

        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {property.property_type || "Propriété"}
                </Badge>
                {property.estimated_score != null && (
                  <Badge variant="outline" className={`text-xs ${scoreColor(property.estimated_score)}`}>
                    {Math.round(property.estimated_score)}/100
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-foreground truncate">
                {property.address}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {[property.city, property.province].filter(Boolean).join(", ") || "—"}
              </p>
            </div>

            {property.photo_url ? (
              <img
                src={property.photo_url}
                alt=""
                className="h-16 w-16 rounded-xl object-cover shrink-0 border border-border/40"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                <Home className="h-6 w-6 text-muted-foreground/50" />
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted/30 px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Superficie</p>
              <p className="text-sm font-medium text-foreground mt-0.5">
                {property.square_footage ? `${property.square_footage.toLocaleString()} pi²` : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Année</p>
              <p className="text-sm font-medium text-foreground mt-0.5">
                {property.year_built || "—"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</p>
              <p className={`text-sm font-medium mt-0.5 ${scoreColor(property.estimated_score)}`}>
                {scoreLabel(property.estimated_score)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Voir le passeport</span>
            <ArrowRight className="h-4 w-4 text-primary opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
