import { Building2, Globe, Phone, Mail, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import BadgeApprovalState from "./BadgeApprovalState";

interface Props {
  company: {
    id: string;
    legal_name: string | null;
    display_name: string | null;
    neq_number: string | null;
    rbq_number: string | null;
    website: string | null;
    primary_email: string | null;
    primary_phone: string | null;
    status: string;
    city_name?: string;
    domain_name?: string;
  };
  onClick?: () => void;
}

export default function CardCompanyIdentity({ company, onClick }: Props) {
  const name = company.legal_name || company.display_name || "Sans nom";

  return (
    <Card
      className={`cursor-pointer hover:border-primary/40 transition-colors ${onClick ? "" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 text-primary shrink-0" />
            <h3 className="text-sm font-semibold text-foreground truncate">{name}</h3>
          </div>
          <BadgeApprovalState status={company.status} />
        </div>

        {company.neq_number && (
          <p className="text-[11px] text-muted-foreground">NEQ: {company.neq_number}</p>
        )}
        {company.rbq_number && (
          <p className="text-[11px] text-muted-foreground">RBQ: {company.rbq_number}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {company.city_name && (
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{company.city_name}</span>
          )}
          {company.domain_name && (
            <span className="text-primary/80">{company.domain_name}</span>
          )}
          {company.website && (
            <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{new URL(company.website).hostname}</span>
          )}
          {company.primary_phone && (
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{company.primary_phone}</span>
          )}
          {company.primary_email && (
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{company.primary_email}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
