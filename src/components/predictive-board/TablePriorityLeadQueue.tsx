/**
 * UNPRO — Priority Lead Queue Table
 */
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Target, DollarSign, TrendingUp, AlertTriangle, Zap, Clock } from "lucide-react";

interface Props {
  leads: any[];
  isLoading: boolean;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

const qualityColor = (s: number) =>
  s >= 75 ? "text-emerald-400" : s >= 55 ? "text-blue-400" : s >= 35 ? "text-yellow-400" : "text-red-400";

const riskBadge = (level: string) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    low: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Faible" },
    medium: { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Moyen" },
    high: { bg: "bg-red-500/10", text: "text-red-400", label: "Élevé" },
  };
  const r = map[level] || map.medium;
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${r.bg} ${r.text}`}>{r.label}</span>;
};

const actionBadge = (action: string) => {
  const colors: Record<string, string> = {
    call: "bg-primary/15 text-primary",
    nurture: "bg-blue-500/10 text-blue-400",
    visit: "bg-emerald-500/10 text-emerald-400",
    follow_up: "bg-violet-500/10 text-violet-400",
    qualify: "bg-orange-500/10 text-orange-400",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${colors[action] || "bg-muted text-muted-foreground"} capitalize`}>
      {action?.replace(/_/g, " ") || "—"}
    </span>
  );
};

export default function TablePriorityLeadQueue({ leads, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  if (!leads.length) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/40 p-8 text-center">
        <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Aucun lead dans la file prioritaire.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        File prioritaire ({leads.length})
      </h2>

      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl border border-border/30 bg-card/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/20 bg-muted/20">
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">#</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Lead</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Qualité</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Valeur</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Profit</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Close %</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Risque</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Prix dyn.</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Action</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Confiance</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead: any, i: number) => (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-border/10 hover:bg-muted/10 transition-colors"
                >
                  <td className="px-3 py-2.5 text-muted-foreground font-mono">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div>
                      <p className="font-medium text-foreground capitalize">{lead.trade_slug || "—"}</p>
                      <p className="text-muted-foreground text-[10px] capitalize">{lead.city_slug} · {lead.source || "direct"}</p>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`font-bold ${qualityColor(lead.pred?.predicted_lead_quality_score || 0)}`}>
                      {lead.pred?.predicted_lead_quality_score || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-foreground">
                    {lead.pred?.predicted_contract_value ? fmt(lead.pred.predicted_contract_value) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-emerald-400 font-medium">
                    {lead.pred?.predicted_profit_value ? fmt(lead.pred.predicted_profit_value) : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {lead.pred?.predicted_close_probability != null
                      ? `${Math.round(lead.pred.predicted_close_probability * 100)}%`
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5">{riskBadge(lead.risk?.overall_risk_level || "medium")}</td>
                  <td className="px-3 py-2.5 text-primary font-semibold">
                    {lead.price?.final_price_cents ? `${(lead.price.final_price_cents / 100).toFixed(0)} $` : "—"}
                  </td>
                  <td className="px-3 py-2.5">{actionBadge(lead.action?.action_type)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${lead.pred?.confidence_score || 0}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground text-[10px]">{lead.pred?.confidence_score || 0}%</span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {leads.slice(0, 30).map((lead: any, i: number) => (
          <motion.div
            key={lead.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="rounded-xl border border-border/20 bg-card/50 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-mono">#{i + 1}</span>
                <span className="text-xs font-semibold text-foreground capitalize">{lead.trade_slug} · {lead.city_slug}</span>
              </div>
              {riskBadge(lead.risk?.overall_risk_level || "medium")}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className={`text-sm font-bold ${qualityColor(lead.pred?.predicted_lead_quality_score || 0)}`}>
                  {lead.pred?.predicted_lead_quality_score || "—"}
                </p>
                <p className="text-[9px] text-muted-foreground">Qualité</p>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {lead.pred?.predicted_contract_value ? fmt(lead.pred.predicted_contract_value) : "—"}
                </p>
                <p className="text-[9px] text-muted-foreground">Valeur</p>
              </div>
              <div>
                <p className="text-sm font-bold text-primary">
                  {lead.price?.final_price_cents ? `${(lead.price.final_price_cents / 100).toFixed(0)} $` : "—"}
                </p>
                <p className="text-[9px] text-muted-foreground">Prix dyn.</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              {actionBadge(lead.action?.action_type)}
              <span className="text-[10px] text-muted-foreground">{lead.pred?.confidence_score || 0}% confiance</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
