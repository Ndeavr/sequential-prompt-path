/**
 * PanelAlexNextBestActionCard — Proactive suggestion card.
 */
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Camera, Users, Calendar, CreditCard, MapPin, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NextBestActionData } from "./types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  camera: Camera,
  users: Users,
  calendar: Calendar,
  payment: CreditCard,
  address: MapPin,
  document: FileText,
  default: Sparkles,
};

interface Props {
  data: NextBestActionData;
  onAccept?: (actionKey: string) => void;
  onDismiss?: () => void;
}

export default function PanelAlexNextBestActionCard({ data, onAccept, onDismiss }: Props) {
  const Icon = ICON_MAP[data.icon || "default"] || Sparkles;

  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm p-4"
    >
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{data.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{data.description}</p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <Button size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => onAccept?.(data.actionKey)}>
          Continuer <ArrowRight className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={onDismiss}>
          Plus tard
        </Button>
      </div>
    </motion.div>
  );
}
