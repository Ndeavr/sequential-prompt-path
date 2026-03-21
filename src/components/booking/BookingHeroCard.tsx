import { Star, Shield, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BookingHeroCardProps {
  companyName: string;
  specialty?: string;
  city?: string;
  logoUrl?: string;
  rating?: number;
  reviewCount?: number;
  aippScore?: number;
  isVerified?: boolean;
}

export function BookingHeroCard({
  companyName,
  specialty,
  city,
  logoUrl,
  rating,
  reviewCount,
  aippScore,
  isVerified,
}: BookingHeroCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card to-secondary/5 border border-border/50 p-6 md:p-8">
      {/* Decorative gradient blob */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />

      <div className="relative flex items-start gap-4">
        {/* Logo */}
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-card border border-border/50 flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt={companyName} className="w-full h-full object-cover rounded-2xl" />
          ) : (
            <span className="text-2xl font-bold text-primary">{companyName.charAt(0)}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-title text-foreground truncate">{companyName}</h1>
            {isVerified && (
              <Badge variant="secondary" className="gap-1 text-xs bg-success/10 text-success border-0">
                <Shield className="w-3 h-3" />
                Vérifié
              </Badge>
            )}
          </div>

          {specialty && (
            <p className="text-body text-muted-foreground mt-1">{specialty}</p>
          )}

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {rating != null && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-warning fill-warning" />
                <span className="text-meta font-semibold text-foreground">{rating.toFixed(1)}</span>
                {reviewCount != null && (
                  <span className="text-meta text-muted-foreground">({reviewCount})</span>
                )}
              </div>
            )}

            {city && (
              <div className="flex items-center gap-1 text-meta text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                {city}
              </div>
            )}

            {aippScore != null && (
              <Badge variant="outline" className="text-xs gap-1">
                AIPP {aippScore}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
