/**
 * MissingProofsCard — Shows missing proofs and recommended next inputs.
 * More prominent when identity_confidence_score < 60.
 */
import { motion } from "framer-motion";
import { Info, ArrowRight, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  missingProofs: string[];
  recommendedNextInputs: string[];
  identityConfidenceScore: number;
  onUploadEvidence?: () => void;
  loading?: boolean;
}

export default function MissingProofsCard({
  missingProofs,
  recommendedNextInputs,
  identityConfidenceScore,
  onUploadEvidence,
  loading,
}: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/80 p-5 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    );
  }

  if (missingProofs.length === 0 && recommendedNextInputs.length === 0) return null;

  const isProminent = identityConfidenceScore < 60;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className={`rounded-2xl border p-5 ${
        isProminent
          ? "border-primary/30 bg-primary/5 ring-1 ring-primary/10"
          : "border-border/50 bg-card/80 backdrop-blur-sm"
      }`}
    >
      {missingProofs.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> Preuves manquantes
          </h3>
          <ul className="space-y-1.5">
            {missingProofs.map((p, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommendedNextInputs.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Pour améliorer la correspondance, fournissez :
          </h3>
          <div className="flex flex-wrap gap-2">
            {recommendedNextInputs.map((n, i) => (
              <Badge key={i} variant="outline" className="text-xs">{n}</Badge>
            ))}
          </div>
        </div>
      )}

      {onUploadEvidence && (
        <Button onClick={onUploadEvidence} variant="outline" size="sm" className="mt-4 gap-2">
          <Upload className="w-3.5 h-3.5" /> Ajouter une preuve
        </Button>
      )}
    </motion.div>
  );
}
