/**
 * PanelAlexContractorPicker — Selectable contractor cards inline in chat.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Star, MapPin, Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ContractorPickerData, MockContractor } from "./types";

interface Props {
  data: ContractorPickerData;
  onSelect?: (contractor: MockContractor) => void;
  onCompare?: () => void;
  onViewProfile?: (contractor: MockContractor) => void;
}

export default function PanelAlexContractorPicker({ data, onSelect, onCompare, onViewProfile }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3">
      {data.reason && (
        <p className="text-xs text-muted-foreground">{data.reason}</p>
      )}
      <h4 className="text-sm font-semibold text-foreground">
        Meilleurs professionnels pour votre projet
      </h4>

      <div className="space-y-2">
        {data.contractors.map((c, i) => (
          <motion.button
            key={c.id}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => { setSelected(c.id); onSelect?.(c); }}
            className={`w-full text-left rounded-xl border p-3 transition-all ${
              selected === c.id
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border/50 bg-background/50 hover:border-primary/30"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                  {i === 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary">
                      Recommandé
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{c.specialty}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    {c.score}/100
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />{c.city}
                  </span>
                </div>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {c.badges.map(b => (
                    <Badge key={b} variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                      <Shield className="h-2.5 w-2.5" />{b}
                    </Badge>
                  ))}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            </div>
          </motion.button>
        ))}
      </div>

      <div className="flex gap-2">
        {data.contractors.length > 1 && (
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={onCompare}>
            Comparer
          </Button>
        )}
        {selected && (
          <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => {
            const c = data.contractors.find(x => x.id === selected);
            if (c) onViewProfile?.(c);
          }}>
            Voir le profil
          </Button>
        )}
      </div>
    </motion.div>
  );
}
