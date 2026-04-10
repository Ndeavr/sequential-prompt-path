/**
 * UNPRO Condos — Financials Page (wired to Supabase)
 */
import { useState } from "react";
import CondoLayout from "@/layouts/CondoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, Receipt, Plus } from "lucide-react";
import { useSyndicates } from "@/hooks/useSyndicate";
import { useInvoices, useCreateInvoice, useBudgets, useExpenses } from "@/hooks/useCondoData";
import { EmptyState } from "@/components/shared";
import { toast } from "sonner";

function formatCents(cents: number): string {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 }).format(cents / 100);
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  paid: "bg-success/10 text-success border-success/20",
  disputed: "bg-destructive/10 text-destructive border-destructive/20",
};

const categoryLabels: Record<string, string> = {
  general: "Général",
  maintenance: "Entretien",
  insurance: "Assurance",
  management: "Gestion",
  utilities: "Services publics",
  legal: "Juridique",
  reserve_fund: "Fonds de prévoyance",
};

export default function CondoFinancialsPage() {
  const { data: syndicates } = useSyndicates();
  const syndicateId = syndicates?.[0]?.id;
  const { data: invoices, isLoading: invLoading } = useInvoices(syndicateId);
  const { data: budgets } = useBudgets(syndicateId);
  const { data: expenses } = useExpenses(syndicateId);
  const createInvoice = useCreateInvoice();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    supplier_name: "",
    description: "",
    amount: "",
    category: "general",
  });

  const activeBudget = budgets?.[0];
  const totalExpenses = expenses?.reduce((sum: number, e: any) => sum + (e.amount_cents || 0), 0) ?? 0;
  const totalPending = invoices?.filter((i: any) => i.status === "pending").reduce((sum: number, i: any) => sum + (i.total_cents || i.amount_cents || 0), 0) ?? 0;

  const handleCreateInvoice = async () => {
    if (!form.supplier_name || !form.amount || !syndicateId) return;
    try {
      await createInvoice.mutateAsync({
        syndicate_id: syndicateId,
        supplier_name: form.supplier_name,
        description: form.description,
        amount_cents: Math.round(parseFloat(form.amount) * 100),
        category: form.category,
      });
      toast.success("Facture ajoutée");
      setDialogOpen(false);
      setForm({ supplier_name: "", description: "", amount: "", category: "general" });
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <CondoLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Finances</h1>
            <p className="text-sm text-muted-foreground mt-1">Vue globale des finances de l'immeuble</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl gap-2">
                <Plus className="h-4 w-4" /> Ajouter facture
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle facture</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Fournisseur</label>
                  <Input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} placeholder="Nom du fournisseur" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Entretien ascenseur" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Montant ($)</label>
                  <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="1200.00" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Catégorie</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleCreateInvoice} disabled={createInvoice.isPending || !form.supplier_name || !form.amount} className="w-full rounded-xl">
                  {createInvoice.isPending ? "Ajout…" : "Ajouter la facture"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Budget annuel", value: activeBudget ? formatCents(activeBudget.total_budget_cents || 0) : "—", icon: DollarSign, color: "text-primary" },
            { label: "Dépenses YTD", value: formatCents(totalExpenses), icon: TrendingDown, color: "text-destructive" },
            { label: "Factures en attente", value: formatCents(totalPending), icon: Receipt, color: "text-warning" },
            { label: "Fonds de prévoyance", value: activeBudget ? formatCents(activeBudget.reserve_fund_balance_cents || 0) : "—", icon: PiggyBank, color: "text-amber-500" },
          ].map((kpi) => (
            <Card key={kpi.label} className="border-border/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Invoices list */}
        <Card className="border-border/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Factures récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : !invoices?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune facture enregistrée</p>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{inv.supplier_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{inv.invoice_date}</span>
                        {inv.category && (
                          <Badge variant="outline" className="text-[10px]">{categoryLabels[inv.category] || inv.category}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="font-semibold text-sm">{formatCents(inv.total_cents || inv.amount_cents)}</span>
                      <Badge variant="outline" className={`text-[10px] ${statusColors[inv.status] || ""}`}>
                        {inv.status === "paid" ? "Payée" : inv.status === "pending" ? "En attente" : inv.status === "approved" ? "Approuvée" : inv.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CondoLayout>
  );
}
