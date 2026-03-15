/**
 * VerificationSummaryCard — Shows the final recommendation and explanation.
 */
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  finalRecommendation: string;
  identitySummary?: string;
  loading?: boolean;
}

export default function VerificationSummaryCard({ finalRecommendation, identitySummary, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/80 p-5 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recommandation
        </h3>
      </div>
      <p className="text-sm text-foreground leading-relaxed">{finalRecommendation}</p>
      {identitySummary && identitySummary !== finalRecommendation && (
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{identitySummary}</p>
      )}
    </motion.div>
  );
}
