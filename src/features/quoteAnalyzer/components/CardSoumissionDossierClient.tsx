import { FileText, Calendar, DollarSign, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import BadgeSourceSoumission from "./BadgeSourceSoumission";
import BadgeUsageSoumission from "./BadgeUsageSoumission";

interface Props {
  quote: {
    id: string;
    quote_title: string;
    quote_amount?: number | null;
    quote_date?: string | null;
    quote_status: string;
    source_type: string;
    contractor_name?: string;
  };
  onClick?: () => void;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "text-muted-foreground" },
  submitted: { label: "Soumise", className: "text-blue-600" },
  viewed: { label: "Consultée", className: "text-purple-600" },
  accepted: { label: "Acceptée", className: "text-emerald-600" },
  rejected: { label: "Refusée", className: "text-destructive" },
  expired: { label: "Expirée", className: "text-muted-foreground" },
  archived: { label: "Archivée", className: "text-muted-foreground" },
};

export default function CardSoumissionDossierClient({ quote, onClick }: Props) {
  const status = STATUS_LABELS[quote.quote_status] || STATUS_LABELS.draft;

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:border-primary/30 transition-all group"
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate">{quote.quote_title}</h4>
            {quote.contractor_name && (
              <p className="text-xs text-muted-foreground">{quote.contractor_name}</p>
            )}
          </div>
          <MoreVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {quote.quote_amount != null && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span className="font-medium text-foreground">{quote.quote_amount.toLocaleString("fr-CA")} $</span>
            </div>
          )}
          {quote.quote_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(quote.quote_date).toLocaleDateString("fr-CA")}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-medium ${status.className}`}>{status.label}</span>
          <BadgeSourceSoumission source={quote.source_type as any} />
          <BadgeUsageSoumission type="record" />
        </div>
      </CardContent>
    </Card>
  );
}
