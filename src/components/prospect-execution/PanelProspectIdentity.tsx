import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Globe, MapPin, Phone, Mail } from "lucide-react";
import WidgetLeadSourceBadge from "./WidgetLeadSourceBadge";

interface Prospect {
  company_name?: string | null;
  domain?: string | null;
  email?: string | null;
  phone?: string | null;
  city_primary?: string | null;
  category_primary?: string | null;
  lead_source?: string | null;
  status: string;
  contact_confidence_score?: number | null;
}

export default function PanelProspectIdentity({ prospect }: { prospect: Prospect | null }) {
  if (!prospect) {
    return (
      <Card>
        <CardHeader><CardTitle>Prospect</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Chargement…</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          {prospect.company_name || "Prospect"}
          {prospect.lead_source && <WidgetLeadSourceBadge source={prospect.lead_source} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {prospect.domain && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            <a href={`https://${prospect.domain}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              {prospect.domain}
            </a>
          </div>
        )}
        {prospect.city_primary && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {prospect.city_primary}
          </div>
        )}
        {prospect.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5" /> {prospect.phone}
          </div>
        )}
        {prospect.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3.5 w-3.5" /> {prospect.email}
          </div>
        )}
        {prospect.category_primary && (
          <div className="text-xs text-muted-foreground mt-2">
            Catégorie : <span className="text-foreground">{prospect.category_primary}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
