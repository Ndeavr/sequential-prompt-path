/**
 * UNPRO — Campaign funnel table (live).
 * Sent → Delivered → Clicked → Registered → Checkout → Paid, per campaign.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CampaignFunnelRow } from "@/hooks/useCampaignFunnel";

function pct(n: number, d: number) {
  if (!d) return "—";
  return `${Math.round((n / d) * 100)}%`;
}

export default function CampaignFunnelTable({
  rows,
  loading,
}: {
  rows: CampaignFunnelRow[];
  loading?: boolean;
}) {
  if (loading) {
    return <p className="text-xs text-muted-foreground">Chargement des campagnes…</p>;
  }
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">Aucune campagne mesurée.</p>;
  }

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="text-[10px] uppercase">
              <TableHead>Campagne</TableHead>
              <TableHead className="text-right">Envoyés</TableHead>
              <TableHead className="text-right">Livrés</TableHead>
              <TableHead className="text-right">Non livrés</TableHead>
              <TableHead className="text-right">Sans callback</TableHead>
              <TableHead className="text-right">Clics</TableHead>
              <TableHead className="text-right">Inscrits</TableHead>
              <TableHead className="text-right">Checkouts</TableHead>
              <TableHead className="text-right">Payés</TableHead>
              <TableHead className="text-right">Revenus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.campaign_id ?? "none"} className="text-xs">
                <TableCell className="font-medium">{r.campaign_name}</TableCell>
                <TableCell className="text-right tabular-nums">{r.sent}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.delivered}
                  <span className="text-muted-foreground"> · {pct(r.delivered, r.sent)}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums text-amber-400">
                  {r.undelivered + r.failed}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {r.no_callback}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.clicked}
                  <span className="text-muted-foreground"> · {pct(r.clicked, r.delivered)}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.registered}</TableCell>
                <TableCell className="text-right tabular-nums">{r.checkout_opened}</TableCell>
                <TableCell
                  className={`text-right tabular-nums ${r.paid > 0 ? "text-emerald-400 font-semibold" : ""}`}
                >
                  {r.paid}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {(r.revenue_cents / 100).toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
