/**
 * UNPRO — Hot Leads Panel
 */
import { Flame, Phone, MessageSquare, Mail, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CommandCenterLead } from "@/services/dynamicPricingEngine";
import { getHeatLabelFr, getHeatColor, getActionLabelFr } from "@/services/dynamicPricingEngine";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}j`;
}

type Props = {
  leads: CommandCenterLead[];
  onSelect: (id: string) => void;
};

export default function HotLeadsPanel({ leads, onSelect }: Props) {
  if (leads.length === 0) return (
    <div className="rounded-xl border border-border/20 bg-card/20 p-6 text-center text-sm text-muted-foreground">
      Aucun lead chaud pour le moment.
    </div>
  );

  return (
    <div className="rounded-xl border border-border/20 bg-card/20 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/10">
        <Flame className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-semibold">Hot Leads</span>
        <Badge variant="outline" className="text-[10px] ml-auto">{leads.length}</Badge>
      </div>
      <div className="max-h-[420px] overflow-y-auto divide-y divide-border/10">
        {leads.map(lead => (
          <div
            key={lead.id}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/10 cursor-pointer transition-colors"
            onClick={() => onSelect(lead.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{lead.businessName}</div>
              <div className="text-[11px] text-muted-foreground">
                {lead.city}{lead.category ? ` · ${lead.category}` : ""} · {timeAgo(lead.lastActivityAt)}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs font-semibold ${getHeatColor(lead.heatLevel)}`}>
                {getHeatLabelFr(lead.heatLevel)} {lead.heatScore != null ? Math.round(lead.heatScore) : ""}
              </span>
              {lead.founderEligible && <Badge className="text-[9px] px-1.5 py-0">F</Badge>}
              <Badge variant="outline" className="text-[9px]">{getActionLabelFr(lead.recommendedAction)}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
