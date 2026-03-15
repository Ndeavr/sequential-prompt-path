/**
 * ScoreDetailsDrawer — Expandable details showing confirmed/unconfirmed signals.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { VerificationDetail } from "@/types/verification";

interface Props {
  verification: VerificationDetail;
  strengths: string[];
  missingProofs: string[];
  recommendedNextInputs: string[];
}

export default function ScoreDetailsDrawer({ verification, strengths, missingProofs, recommendedNextInputs }: Props) {
  const [open, setOpen] = useState(false);

  const detailRows = [
    { label: "RBQ", value: verification.rbq_status },
    { label: "NEQ", value: verification.neq_status },
    { label: "Présence web", value: verification.web_presence },
    { label: "Avis", value: verification.reviews_summary },
    { label: "Authenticité des avis", value: verification.review_authenticity_signal },
    { label: "Cohérence visuelle", value: verification.visual_consistency },
  ];

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="w-full gap-2 text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        Voir les détails du score
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 mt-2 space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Détails de vérification
              </h3>

              <div className="space-y-2">
                {detailRows.map((row) => (
                  <div key={row.label} className="flex items-start gap-3 text-sm">
                    <span className="text-muted-foreground w-32 shrink-0 text-xs">{row.label}</span>
                    <span className="text-foreground">{row.value || "Non évalué"}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">Ce qui a été confirmé</p>
                <ul className="space-y-1">
                  {strengths.length > 0
                    ? strengths.map((s, i) => <li key={i} className="text-xs text-foreground">✓ {s}</li>)
                    : <li className="text-xs text-muted-foreground italic">Aucun élément confirmé</li>
                  }
                </ul>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">Ce qui reste non confirmé</p>
                <ul className="space-y-1">
                  {missingProofs.length > 0
                    ? missingProofs.map((p, i) => <li key={i} className="text-xs text-foreground">— {p}</li>)
                    : <li className="text-xs text-muted-foreground italic">Tout a été vérifié</li>
                  }
                </ul>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">Ce qui améliorerait la certitude</p>
                <ul className="space-y-1">
                  {recommendedNextInputs.length > 0
                    ? recommendedNextInputs.map((n, i) => <li key={i} className="text-xs text-foreground">→ {n}</li>)
                    : <li className="text-xs text-muted-foreground italic">Aucune action requise</li>
                  }
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
