/**
 * UNPRO — Rep Action Queue
 */
import { Zap, Phone, MessageSquare, Mail, Send, Eye, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RepActionItem, RecommendedActionCode } from "@/services/dynamicPricingEngine";
import { getActionLabelFr } from "@/services/dynamicPricingEngine";

const ACTION_ICONS: Record<RecommendedActionCode, React.ElementType> = {
  call_now: Phone,
  sms_now: MessageSquare,
  send_email: Mail,
  send_first_touch: Send,
  resend: Send,
  review_audit: Eye,
  push_checkout: ShoppingCart,
  pause: Zap,
};

const URGENCY_COLORS: Record<string, string> = {
  high: "text-red-400 bg-red-400/10 border-red-400/20",
  medium: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  low: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

const URGENCY_LABELS: Record<string, string> = { high: "Élevée", medium: "Moyenne", low: "Basse" };

type Props = {
  actions: RepActionItem[];
  onSelect: (id: string) => void;
};

export default function RepActionQueue({ actions, onSelect }: Props) {
  return (
    <div className="rounded-xl border border-border/20 bg-card/20 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/10">
        <Zap className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Prochaines actions</span>
        <Badge variant="outline" className="text-[10px] ml-auto">{actions.length}</Badge>
      </div>
      <div className="max-h-[420px] overflow-y-auto divide-y divide-border/10">
        {actions.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">Aucune action en attente.</div>
        )}
        {actions.map(a => {
          const Icon = ACTION_ICONS[a.action] || Zap;
          return (
            <div key={a.id} className="px-4 py-2.5 hover:bg-muted/10 cursor-pointer" onClick={() => onSelect(a.id)}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{a.businessName}</span>
                <Badge className={`text-[9px] ${URGENCY_COLORS[a.urgency]}`}>{URGENCY_LABELS[a.urgency]}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mb-1.5">{a.reason}</p>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[9px] gap-1">
                  <Icon className="w-3 h-3" /> {getActionLabelFr(a.action)}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
