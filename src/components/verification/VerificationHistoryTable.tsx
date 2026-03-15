/**
 * UNPRO — Verification History Table
 * Displays past verification runs linked to a contractor.
 */
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, ExternalLink } from "lucide-react";

interface VerificationRun {
  id: string;
  created_at: string;
  identity_resolution_status: string | null;
  identity_confidence_score: number | null;
  public_trust_score: number | null;
  live_risk_delta: number | null;
  admin_review_status: string | null;
  input_business_name: string | null;
  input_phone: string | null;
}

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "outline" | "secondary" | "destructive" }> = {
  verified_internal_profile: { label: "Interne", variant: "default" },
  verified_match: { label: "Vérifié", variant: "default" },
  probable_match_needs_more_proof: { label: "Probable", variant: "secondary" },
  ambiguous_match: { label: "Ambigu", variant: "outline" },
  no_reliable_match: { label: "Aucun", variant: "destructive" },
};

export const VerificationHistoryTable = ({ runs }: { runs: VerificationRun[] }) => {
  if (!runs.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Historique des vérifications</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune vérification liée à cet entrepreneur.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Historique des vérifications ({runs.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Certitude</TableHead>
              <TableHead>Confiance</TableHead>
              <TableHead>Δ Risque</TableHead>
              <TableHead>Revue</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => {
              const sb = STATUS_BADGES[run.identity_resolution_status ?? ""] ?? { label: run.identity_resolution_status ?? "—", variant: "outline" as const };
              return (
                <TableRow key={run.id}>
                  <TableCell className="text-sm">{new Date(run.created_at).toLocaleDateString("fr-CA")}</TableCell>
                  <TableCell><Badge variant={sb.variant} className="text-[10px]">{sb.label}</Badge></TableCell>
                  <TableCell className="text-sm font-medium">{run.identity_confidence_score ?? "—"}%</TableCell>
                  <TableCell className="text-sm">{run.public_trust_score ?? "—"}/100</TableCell>
                  <TableCell className={`text-sm font-medium ${(run.live_risk_delta ?? 0) < -10 ? "text-destructive" : ""}`}>
                    {run.live_risk_delta != null ? `${run.live_risk_delta > 0 ? "+" : ""}${run.live_risk_delta}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{run.admin_review_status ?? "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Link to={`/admin/verification/${run.id}`} className="text-primary hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
