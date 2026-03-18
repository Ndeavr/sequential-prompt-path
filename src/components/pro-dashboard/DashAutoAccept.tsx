/**
 * Auto-Accept toggle
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface Props { plan: string; }

export default function DashAutoAccept({ plan }: Props) {
  const eligible = ["premium", "elite", "signature"].includes(plan);
  const [enabled, setEnabled] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
      className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">Auto-accepter</span>
            {!eligible && <Badge variant="outline" className="text-[9px]">Premium+</Badge>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {eligible
              ? "Recevez des rendez-vous instantanément sans intervention."
              : "Passez Premium pour activer l'auto-acceptation des rendez-vous."
            }
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          disabled={!eligible}
        />
      </div>
    </motion.div>
  );
}
