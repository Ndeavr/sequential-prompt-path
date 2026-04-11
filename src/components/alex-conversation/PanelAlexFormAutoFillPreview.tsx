/**
 * PanelAlexFormAutoFillPreview — Shows prefilled data with "Vérifiez" CTA.
 */
import { motion } from "framer-motion";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FormAutoFillPreviewData } from "./types";

interface Props {
  data: FormAutoFillPreviewData;
  onConfirm?: () => void;
  onEdit?: () => void;
}

export default function PanelAlexFormAutoFillPreview({ data, onConfirm, onEdit }: Props) {
  return (
    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">{data.title}</h4>
      </div>

      <p className="text-xs text-muted-foreground">
        J'ai prérempli ce que je connais déjà. Vérifiez simplement.
      </p>

      <div className="space-y-1.5">
        {data.prefilledFields.map((field, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-1.5">
            <span className="text-xs text-muted-foreground">{field.label}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-foreground">{field.value}</span>
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                {field.source}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {data.missingCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {data.missingCount} champ{data.missingCount > 1 ? "s" : ""} à compléter
        </p>
      )}

      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-8 text-xs gap-1" onClick={onConfirm}>
          <Check className="h-3 w-3" /> Tout est bon
        </Button>
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={onEdit}>
          Modifier <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </motion.div>
  );
}
