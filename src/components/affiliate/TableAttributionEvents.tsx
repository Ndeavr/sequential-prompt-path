/**
 * UNPRO — Attribution Events Table
 */
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AttributionEvent {
  id: string;
  referral_code: string;
  conversion_type: string | null;
  confirmation_status: string;
  confidence_score: number;
  source_type: string;
  created_at: string;
}

interface Props {
  events: AttributionEvent[];
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-amber-500/10 text-amber-600" },
  confirmed: { label: "Confirmé", className: "bg-emerald-500/10 text-emerald-600" },
  rejected: { label: "Rejeté", className: "bg-destructive/10 text-destructive" },
};

const TableAttributionEvents = ({ events }: Props) => {
  if (!events.length) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Aucun événement d'attribution enregistré.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Confiance</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((e) => {
          const badge = STATUS_BADGES[e.confirmation_status] || STATUS_BADGES.pending;
          return (
            <TableRow key={e.id}>
              <TableCell className="font-mono text-xs">{e.referral_code}</TableCell>
              <TableCell className="text-xs">{e.source_type || "—"}</TableCell>
              <TableCell>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                  {badge.label}
                </span>
              </TableCell>
              <TableCell className="text-sm">{e.confidence_score}%</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {format(new Date(e.created_at), "d MMM yyyy", { locale: fr })}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default TableAttributionEvents;
