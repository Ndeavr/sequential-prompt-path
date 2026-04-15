import { useRecruitmentPayments } from "@/hooks/useRecruitmentPayments";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, DollarSign, ArrowUpRight } from "lucide-react";

export default function PageAdminRecruitmentPayments() {
  const { payments, conversions } = useRecruitmentPayments();

  const totalRevenue = payments.data?.filter((p) => p.payment_status === "paid").reduce((s, p) => s + (p.amount_total || 0), 0) || 0;
  const paidCount = payments.data?.filter((p) => p.payment_status === "paid").length || 0;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Paiements</h1>
          <p className="text-sm text-muted-foreground">Suivi des paiements et conversions</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="bg-card/80 backdrop-blur">
            <CardContent className="p-4">
              <DollarSign className="h-5 w-5 text-green-500 mb-1" />
              <p className="text-2xl font-bold">${(totalRevenue / 100).toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Revenu total</p>
            </CardContent>
          </Card>
          <Card className="bg-card/80 backdrop-blur">
            <CardContent className="p-4">
              <CreditCard className="h-5 w-5 text-primary mb-1" />
              <p className="text-2xl font-bold">{paidCount}</p>
              <p className="text-xs text-muted-foreground">Paiements confirmés</p>
            </CardContent>
          </Card>
          <Card className="bg-card/80 backdrop-blur">
            <CardContent className="p-4">
              <ArrowUpRight className="h-5 w-5 text-emerald-500 mb-1" />
              <p className="text-2xl font-bold">{conversions.data?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Conversions</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/80 backdrop-blur border-border/50 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Historique des paiements</CardTitle>
          </CardHeader>
          {payments.isLoading ? (
            <CardContent><Skeleton className="h-40" /></CardContent>
          ) : payments.data?.length === 0 ? (
            <CardContent className="py-8 text-center text-muted-foreground text-sm">Aucun paiement enregistré</CardContent>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.data?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm font-medium">{(p as any).contractor_prospects?.business_name || "—"}</TableCell>
                      <TableCell className="text-sm">${((p.amount_total || 0) / 100).toFixed(2)} {p.currency?.toUpperCase()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={p.payment_status === "paid" ? "text-green-500 border-green-500/30" : ""}>
                          {p.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.paid_at ? new Date(p.paid_at).toLocaleDateString("fr-CA") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
