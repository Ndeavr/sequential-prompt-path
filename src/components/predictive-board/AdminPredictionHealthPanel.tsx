/**
 * UNPRO — Prediction Health Panel
 */
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface Props {
  leads: any[];
  isLoading: boolean;
}

export default function AdminPredictionHealthPanel({ leads, isLoading }: Props) {
  if (isLoading) return <Skeleton className="h-44 w-full rounded-2xl" />;

  const withPred = leads.filter((l: any) => l.pred);
  const total = leads.length || 1;
  const coverage = Math.round((withPred.length / total) * 100);
  const highConf = withPred.filter((l: any) => (l.pred?.confidence_score || 0) >= 70).length;
  const lowConf = withPred.filter((l: any) => (l.pred?.confidence_score || 0) < 40).length;
  const noAction = leads.filter((l: any) => !l.action).length;

  const items = [
    { label: "Couverture prédictions", value: `${coverage}%`, icon: Activity, ok: coverage >= 80 },
    { label: "Haute confiance (≥70)", value: highConf, icon: CheckCircle, ok: true },
    { label: "Basse confiance (<40)", value: lowConf, icon: AlertTriangle, ok: lowConf === 0 },
    { label: "Sans action assignée", value: noAction, icon: XCircle, ok: noAction === 0 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/30 bg-card/60 p-4 space-y-3"
    >
      <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-primary" />
        Santé des prédictions
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-start gap-2">
            <item.icon className={`h-4 w-4 mt-0.5 ${item.ok ? "text-emerald-400" : "text-orange-400"}`} />
            <div>
              <p className="text-sm font-bold text-foreground">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
