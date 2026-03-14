/**
 * UNPRO — TrustSummaryCard
 * Reusable trust explanation card for contractor profiles.
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, Shield, Building, Lock, Star, BadgeCheck, Clock, AlertCircle } from "lucide-react";
import { getContractorTrustSummary, type TrustSignal } from "@/services/contractor/trustSummaryService";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const ICON_MAP: Record<string, React.ReactNode> = {
  "shield-check": <ShieldCheck className="h-4 w-4" />,
  building: <Building className="h-4 w-4" />,
  shield: <Shield className="h-4 w-4" />,
  lock: <Lock className="h-4 w-4" />,
  star: <Star className="h-4 w-4" />,
  "badge-check": <BadgeCheck className="h-4 w-4" />,
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  verified: { bg: "bg-success/10", text: "text-success", label: "Vérifié" },
  pending: { bg: "bg-warning/10", text: "text-warning", label: "En attente" },
  missing: { bg: "bg-muted/50", text: "text-muted-foreground", label: "Non fourni" },
};

function SignalRow({ signal }: { signal: TrustSignal }) {
  const style = STATUS_STYLES[signal.status] ?? STATUS_STYLES.missing;

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2.5">
        <div className={`h-8 w-8 rounded-lg ${style.bg} flex items-center justify-center ${style.text}`}>
          {ICON_MAP[signal.icon] ?? <Shield className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{signal.label_fr}</p>
          {signal.checked_at && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              Vérifié le {new Date(signal.checked_at).toLocaleDateString("fr-CA")}
            </p>
          )}
        </div>
      </div>
      <Badge variant="outline" className={`text-[10px] ${style.text} border-current/20`}>
        {style.label}
      </Badge>
    </div>
  );
}

interface TrustSummaryCardProps {
  contractorId: string;
  compact?: boolean;
}

export default function TrustSummaryCard({ contractorId, compact = false }: TrustSummaryCardProps) {
  const { data: trust, isLoading } = useQuery({
    queryKey: ["contractor-trust-summary", contractorId],
    queryFn: () => getContractorTrustSummary(contractorId),
    enabled: !!contractorId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <Skeleton className="h-48 rounded-2xl" />;
  }

  if (!trust) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="glass-card border-0 shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Confiance & conformité
            </CardTitle>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">{trust.trust_score}</div>
              <div className="text-[10px] text-muted-foreground">{trust.trust_label}</div>
            </div>
          </div>
          <Progress value={trust.trust_score} className="h-1.5 mt-2" />
          <p className="text-[10px] text-muted-foreground mt-1">
            {trust.verified_count}/{trust.total_checks} vérifications confirmées
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {compact ? (
            <div className="flex flex-wrap gap-1.5">
              {trust.signals.map((s) => {
                const style = STATUS_STYLES[s.status];
                return (
                  <span key={s.key} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
                    {ICON_MAP[s.icon]}
                    {s.label_fr}
                  </span>
                );
              })}
            </div>
          ) : (
            <>
              <div className="divide-y divide-border/40">
                {trust.signals.map((s) => (
                  <SignalRow key={s.key} signal={s} />
                ))}
              </div>
              <div className="mt-3 p-3 rounded-xl bg-muted/30 flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {trust.explanation_fr}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
