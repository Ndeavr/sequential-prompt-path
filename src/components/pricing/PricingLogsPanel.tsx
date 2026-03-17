/**
 * UNPRO — Dynamic Pricing Logs + Revenue Panel (Admin)
 */
import { motion } from "framer-motion";
import { TrendingUp, Receipt, Wallet } from "lucide-react";
import { useDynamicPricingLogs, usePricingTransactions, useContractorWallets } from "@/hooks/useDynamicPricing";
import { formatCents } from "@/services/appointmentPricingEngine";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function PricingLogsPanel() {
  const { data: logs } = useDynamicPricingLogs(15);
  const { data: transactions } = usePricingTransactions(15);
  const { data: wallets } = useContractorWallets(10);

  const totalRevenue = (transactions ?? [])
    .filter((t: any) => t.transaction_type !== "refund" && t.transaction_type !== "credit")
    .reduce((sum: number, t: any) => sum + (t.amount_cents ?? 0), 0);

  const totalWalletBalance = (wallets ?? []).reduce((sum: number, w: any) => sum + (w.balance_cents ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Revenue KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: "Revenus récents", value: formatCents(totalRevenue), icon: TrendingUp, color: "text-success" },
          { label: "Transactions", value: String(transactions?.length ?? 0), icon: Receipt, color: "text-primary" },
          { label: "Wallets actifs", value: String(wallets?.length ?? 0), icon: Wallet, color: "text-accent" },
          { label: "Soldes total", value: formatCents(totalWalletBalance), icon: Wallet, color: "text-secondary" },
        ].map((kpi, i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-3.5 text-center">
            <kpi.icon className={`w-4 h-4 mx-auto mb-1.5 ${kpi.color}`} />
            <p className="text-lg font-bold font-display text-foreground">{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Pricing Logs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Logs tarification dynamique</h2>
        </div>

        {!logs?.length ? (
          <p className="text-xs text-muted-foreground">Aucun log disponible</p>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {logs.map((l: any) => {
              const multipliers = l.multipliers_json as any;
              return (
                <div key={l.id} className="rounded-lg bg-muted/10 border border-border/20 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {formatCents(l.base_price_cents)} → {formatCents(l.final_price_cents)}
                      </span>
                      {l.sla_tier && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-primary/10 text-primary">
                          SLA {l.sla_tier}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                    {multipliers && typeof multipliers === "object" && Object.entries(multipliers).map(([k, v]) => (
                      <span key={k} className="px-1.5 py-0.5 rounded bg-muted/20 border border-border/20">
                        {k}: ×{String(v)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-4 h-4 text-accent" />
          <h2 className="font-display text-sm font-semibold text-foreground">Transactions récentes</h2>
        </div>

        {!transactions?.length ? (
          <p className="text-xs text-muted-foreground">Aucune transaction</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 text-muted-foreground font-medium">Type</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Montant</th>
                  <th className="text-left py-2 pl-3 text-muted-foreground font-medium">Statut</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t: any) => (
                  <tr key={t.id} className="border-b border-border/10">
                    <td className="py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                        t.transaction_type === "lead" ? "bg-primary/10 text-primary" :
                        t.transaction_type === "sla" ? "bg-warning/10 text-warning" :
                        t.transaction_type === "boost" ? "bg-secondary/10 text-secondary" :
                        t.transaction_type === "refund" ? "bg-destructive/10 text-destructive" :
                        "bg-muted/20 text-muted-foreground"
                      }`}>
                        {t.transaction_type}
                      </span>
                    </td>
                    <td className={`py-2 text-right tabular-nums font-semibold ${
                      t.transaction_type === "refund" || t.transaction_type === "credit"
                        ? "text-success"
                        : "text-foreground"
                    }`}>
                      {t.transaction_type === "refund" || t.transaction_type === "credit" ? "+" : ""}
                      {formatCents(t.amount_cents)}
                    </td>
                    <td className="py-2 pl-3 text-muted-foreground">{t.status}</td>
                    <td className="py-2 text-right text-muted-foreground">
                      {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: fr })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
