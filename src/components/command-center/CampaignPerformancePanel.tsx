/**
 * UNPRO — Campaign Performance Panel
 */
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CampaignPerformanceRow } from "@/services/dynamicPricingEngine";

export default function CampaignPerformancePanel({ rows }: { rows: CampaignPerformanceRow[] }) {
  if (rows.length === 0) return (
    <div className="rounded-xl border border-border/20 bg-card/20 p-6 text-center text-sm text-muted-foreground">
      Aucune campagne active.
    </div>
  );

  return (
    <div className="rounded-xl border border-border/20 bg-card/20 backdrop-blur-sm">
      <div className="px-4 py-3 border-b border-border/10">
        <span className="text-sm font-semibold">Campagnes</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="text-[10px] uppercase">
              <TableHead>Campagne</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead className="text-right">Envoyés</TableHead>
              <TableHead className="text-right">Clics</TableHead>
              <TableHead className="text-right">Audits</TableHead>
              <TableHead className="text-right">Checkouts</TableHead>
              <TableHead className="text-right">Convertis</TableHead>
              <TableHead className="text-right">Revenus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => {
              const clickRate = r.sent > 0 ? r.clicks / r.sent : 0;
              const color = clickRate >= 0.15 ? "text-green-400" : clickRate >= 0.05 ? "text-foreground" : "text-red-400";
              return (
                <TableRow key={i} className="text-xs">
                  <TableCell className="font-medium">{r.campaignName}</TableCell>
                  <TableCell>{r.channel}</TableCell>
                  <TableCell className="text-right">{r.sent}</TableCell>
                  <TableCell className={`text-right ${color}`}>{r.clicks}</TableCell>
                  <TableCell className="text-right">{r.auditStarts}</TableCell>
                  <TableCell className="text-right">{r.checkoutStarts}</TableCell>
                  <TableCell className="text-right">{r.conversions}</TableCell>
                  <TableCell className="text-right font-medium">{r.revenue.toLocaleString("fr-CA")} $</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
