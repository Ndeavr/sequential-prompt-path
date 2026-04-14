import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Mail, Phone, MapPin, Star } from "lucide-react";

interface Props {
  prospect: any;
  onClick?: () => void;
}

const tierColors: Record<string, string> = {
  tier_1: "bg-primary/20 text-primary",
  tier_2: "bg-accent/20 text-accent-foreground",
  tier_3: "bg-muted text-muted-foreground",
};

export default function CardProspectIdentity({ prospect, onClick }: Props) {
  const name = prospect.legal_name || prospect.business_name || "Sans nom";
  const score = prospect.aipp_score ?? prospect.ai_score ?? null;

  return (
    <Card
      className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm truncate">{name}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {score !== null && (
              <Badge variant="outline" className="text-xs gap-1">
                <Star className="w-3 h-3" />
                {Math.round(score)}
              </Badge>
            )}
            <Badge className={`text-xs ${tierColors[prospect.priority_tier] ?? tierColors.tier_3}`}>
              {prospect.priority_tier?.replace("_", " ") ?? "—"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {prospect.city && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {prospect.city}
            </span>
          )}
          {prospect.email && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" /> {prospect.email}
            </span>
          )}
          {prospect.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" /> {prospect.phone}
            </span>
          )}
        </div>

        {prospect.domain && (
          <div className="text-xs text-muted-foreground truncate">
            {prospect.domain}
          </div>
        )}

        <Badge
          variant="outline"
          className={`text-xs ${
            prospect.status === "approved"
              ? "border-green-500/30 text-green-600"
              : prospect.status === "rejected"
              ? "border-destructive/30 text-destructive"
              : "border-muted"
          }`}
        >
          {prospect.status}
        </Badge>
      </CardContent>
    </Card>
  );
}
