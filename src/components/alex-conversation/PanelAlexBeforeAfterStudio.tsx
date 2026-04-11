/**
 * PanelAlexBeforeAfterStudio — Before/after image comparison inline.
 */
import { motion } from "framer-motion";
import { ArrowRight, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BeforeAfterData } from "./types";

interface Props {
  data: BeforeAfterData;
  onRegenerate?: () => void;
  onUseStyle?: (style: string) => void;
}

export default function PanelAlexBeforeAfterStudio({ data, onRegenerate, onUseStyle }: Props) {
  if (data.generating) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 text-center">
        <Wand2 className="h-8 w-8 text-primary mx-auto mb-3 animate-pulse" />
        <p className="text-sm font-medium text-foreground">Génération en cours…</p>
        <p className="text-xs text-muted-foreground mt-1">Transformation {data.roomType || "de l'espace"}</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          Avant / Après {data.roomType && `— ${data.roomType}`}
        </h4>
      </div>

      <div className="flex gap-2 items-center">
        <div className="flex-1 rounded-xl overflow-hidden border border-border/30 aspect-[4/3] bg-muted">
          <img src={data.beforeUrl} alt="Avant" className="w-full h-full object-cover" />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 rounded-xl overflow-hidden border border-primary/20 aspect-[4/3] bg-muted">
          {data.afterUrl ? (
            <img src={data.afterUrl} alt="Après" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          )}
        </div>
      </div>

      {data.style && (
        <p className="text-xs text-muted-foreground">Style : {data.style}</p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={onRegenerate}>
          <RefreshCw className="h-3 w-3" /> Régénérer
        </Button>
        {data.style && (
          <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => onUseStyle?.(data.style!)}>
            Utiliser ce style
          </Button>
        )}
      </div>
    </motion.div>
  );
}
