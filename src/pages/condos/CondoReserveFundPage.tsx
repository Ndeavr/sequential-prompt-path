/**
 * UNPRO Condos — Reserve Fund Dashboard
 */
import CondoLayout from "@/layouts/CondoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { PiggyBank, TrendingUp, AlertTriangle, ArrowRight, Lock, BarChart3 } from "lucide-react";

const projections = [
  { year: 2026, balance: 385000, expenses: 15000, contribution: 48000 },
  { year: 2027, balance: 418000, expenses: 25000, contribution: 48000 },
  { year: 2028, balance: 441000, expenses: 10000, contribution: 48000 },
  { year: 2029, balance: 294000, expenses: 185000, contribution: 48000 },
  { year: 2030, balance: 332000, expenses: 0, contribution: 48000 },
  { year: 2031, balance: 370000, expenses: 0, contribution: 48000 },
];

const CondoReserveFundPage = () => {
  const currentBalance = projections[0].balance;
  const maxBar = Math.max(...projections.map(p => p.balance));

  return (
    <CondoLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold">Fonds de prévoyance</h1>
          <p className="text-sm text-muted-foreground">Projections et suivi financier</p>
        </div>
        <Badge variant="outline" className="bg-success/10 text-success border-success/20 self-start">
          <TrendingUp className="h-3 w-3 mr-1" /> Santé : Adéquat
        </Badge>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Solde actuel", value: `${(currentBalance / 1000).toFixed(0)}k $`, icon: PiggyBank, color: "text-success" },
          { label: "Contribution annuelle", value: "48 000 $", icon: TrendingUp, color: "text-primary" },
          { label: "Prochain gros travaux", value: "2029", icon: AlertTriangle, color: "text-warning" },
          { label: "Coût estimé", value: "185 000 $", icon: BarChart3, color: "text-destructive" },
        ].map((s, i) => (
          <Card key={i} className="border-border/40 bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="font-display font-bold text-lg">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Projections chart (simplified bar chart) */}
      <Card className="border-border/40 bg-card/80 mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Projections sur 6 ans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {projections.map((p, i) => (
              <motion.div key={p.year} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono w-10 text-muted-foreground">{p.year}</span>
                  <div className="flex-1 h-6 bg-muted/40 rounded-lg overflow-hidden relative">
                    <div
                      className={`h-full rounded-lg transition-all ${p.expenses > 100000 ? "bg-warning/70" : "bg-primary/60"}`}
                      style={{ width: `${(p.balance / maxBar) * 100}%` }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold">
                      {(p.balance / 1000).toFixed(0)}k $
                    </span>
                  </div>
                  {p.expenses > 0 && (
                    <span className="text-[10px] text-destructive font-medium w-16 text-right">-{(p.expenses / 1000).toFixed(0)}k $</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Premium upsell */}
      <Card className="border-primary/20 bg-primary/3">
        <CardContent className="p-5 flex items-center gap-4">
          <Lock className="h-8 w-8 text-primary/50 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-0.5">Projections avancées (Premium)</h3>
            <p className="text-xs text-muted-foreground">Accédez aux projections sur 25 ans, au simulateur de cotisations et aux alertes de sous-capitalisation.</p>
          </div>
          <Button size="sm" className="rounded-xl flex-shrink-0">
            Passer au Premium
          </Button>
        </CardContent>
      </Card>
    </CondoLayout>
  );
};

export default CondoReserveFundPage;
