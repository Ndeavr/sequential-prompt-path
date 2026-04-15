import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Incident {
  id: string;
  component_name: string;
  severity: string;
  failure_type: string;
  failure_message: string;
  recommended_fix?: string | null;
  status: string;
  created_at: string;
}

export default function TableIncidentRegistry({ incidents }: { incidents: Incident[] }) {
  const sevColor: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Composant</TableHead>
            <TableHead className="text-xs w-20">Sévérité</TableHead>
            <TableHead className="text-xs">Message</TableHead>
            <TableHead className="text-xs w-20">Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidents.length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">Aucun incident</TableCell></TableRow>
          )}
          {incidents.map((inc) => (
            <TableRow key={inc.id}>
              <TableCell className="text-xs font-mono">{inc.component_name}</TableCell>
              <TableCell><Badge variant="outline" className={`text-[10px] ${sevColor[inc.severity] || ""}`}>{inc.severity}</Badge></TableCell>
              <TableCell className="text-xs">
                <div className="max-w-[300px]">
                  <p className="truncate">{inc.failure_message}</p>
                  {inc.recommended_fix && <p className="text-[10px] text-green-400/70 mt-0.5 truncate">Fix: {inc.recommended_fix}</p>}
                </div>
              </TableCell>
              <TableCell><Badge variant={inc.status === "open" ? "destructive" : "default"} className="text-[10px]">{inc.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
