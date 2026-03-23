/**
 * UNPRO Condos — Financials Page (Manager + Board)
 */
import CondoLayout from "@/layouts/CondoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, ArrowRight, PiggyBank, Receipt } from "lucide-react";

const mockFinancials = {
  balance: 42850,
  monthlyIncome: 8500,
  monthlyExpenses: 6200,
  reserveFund: 125000,
  recentTransactions: [
    { id: "1", description: "Cotisations mars 2026", amount: 8500, type: "income", date: "2026-03-01" },
    { id: "2", description: "Entretien ascenseur", amount: -1200, type: "expense", date: "2026-03-05" },
    { id: "3", description: "Assurance immeuble", amount: -3500, type: "expense", date: "2026-03-10" },
    { id: "4", description: "Réparation plomberie", amount: -800, type: "expense", date: "2026-03-15" },
  ],
};

export default function CondoFinancialsPage() {
  return (
    <CondoLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Finances</h1>
          <p className="text-sm text-muted-foreground mt-1">Vue globale des finances de l'immeuble</p>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Solde courant", value: `${mockFinancials.balance.toLocaleString()} $`, icon: DollarSign, color: "text-primary" },
            { label: "Revenus / mois", value: `${mockFinancials.monthlyIncome.toLocaleString()} $`, icon: TrendingUp, color: "text-green-500" },
            { label: "Dépenses / mois", value: `${mockFinancials.monthlyExpenses.toLocaleString()} $`, icon: TrendingDown, color: "text-destructive" },
            { label: "Fonds de prévoyance", value: `${mockFinancials.reserveFund.toLocaleString()} $`, icon: PiggyBank, color: "text-amber-500" },
          ].map((kpi) => (
            <Card key={kpi.label} className="border-border/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent transactions */}
        <Card className="border-border/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Transactions récentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockFinancials.recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{tx.date}</p>
                </div>
                <span className={`font-semibold text-sm ${tx.amount > 0 ? "text-green-500" : "text-destructive"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} $
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </CondoLayout>
  );
}
