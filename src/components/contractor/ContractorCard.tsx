import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, ShieldCheck, TrendingUp } from "lucide-react";

interface ContractorCardProps {
  contractor: {
    id: string;
    business_name: string;
    specialty: string | null;
    city: string | null;
    province: string | null;
    description: string | null;
    verification_status: string | null;
    aipp_score: number | null;
    rating: number | null;
    review_count: number | null;
    logo_url: string | null;
  };
}

const ContractorCard = ({ contractor }: ContractorCardProps) => {
  const isVerified = contractor.verification_status === "verified";

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex gap-4">
          {/* Logo / Avatar */}
          <div className="h-14 w-14 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            {contractor.logo_url ? (
              <img src={contractor.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-muted-foreground">
                {contractor.business_name.charAt(0)}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Name + badges */}
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground truncate">
                {contractor.business_name}
              </h3>
              {isVerified && (
                <Badge variant="secondary" className="gap-1 text-xs shrink-0">
                  <ShieldCheck className="h-3 w-3" />
                  Vérifié
                </Badge>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {contractor.specialty && (
                <span>{contractor.specialty}</span>
              )}
              {contractor.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {contractor.city}{contractor.province ? `, ${contractor.province}` : ""}
                </span>
              )}
            </div>

            {/* Scores row */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {contractor.aipp_score != null && contractor.aipp_score > 0 && (
                <span className="flex items-center gap-1 text-primary font-medium">
                  <TrendingUp className="h-3 w-3" />
                  AIPP {contractor.aipp_score}
                </span>
              )}
              {contractor.rating != null && contractor.rating > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Star className="h-3 w-3 fill-current" />
                  {contractor.rating.toFixed(1)}
                </span>
              )}
              {contractor.review_count != null && contractor.review_count > 0 && (
                <span className="text-muted-foreground">
                  {contractor.review_count} avis
                </span>
              )}
            </div>

            {/* Description */}
            {contractor.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {contractor.description}
              </p>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-4 flex justify-end">
          <Button asChild size="sm" variant="outline">
            <Link to={`/contractors/${contractor.id}`}>Voir le profil</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractorCard;
