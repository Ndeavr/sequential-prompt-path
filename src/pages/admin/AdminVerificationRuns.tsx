/**
 * UNPRO — Admin Verification Runs List
 * Table with filters, search, and status indicators.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { useAdminVerificationRuns, type VerificationRunFilter } from "@/hooks/useAdminVerification";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search, ShieldCheck, ShieldAlert, AlertTriangle, XCircle, Eye, Filter,
} from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  verified_internal_profile: { label: "Vérifié interne", className: "bg-success/10 text-success border-success/20" },
  verified_match: { label: "Confirmé", className: "bg-success/10 text-success border-success/20" },
  probable_match_needs_more_proof: { label: "Probable", className: "bg-warning/10 text-warning border-warning/20" },
  ambiguous_match: { label: "Ambigu", className: "bg-warning/10 text-warning border-warning/20" },
  no_reliable_match: { label: "Aucun match", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const REVIEW_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-warning/10 text-warning border-warning/20" },
  reviewed: { label: "Revu", className: "bg-success/10 text-success border-success/20" },
  needs_followup: { label: "Suivi requis", className: "bg-primary/10 text-primary border-primary/20" },
  insufficient_data: { label: "Données insuffisantes", className: "bg-muted text-muted-foreground border-border" },
  divergence_confirmed: { label: "Divergence", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const FILTER_OPTIONS = [
  { key: "all", label: "Tous" },
  { key: "pending", label: "En attente" },
  { key: "ambiguous", label: "Ambigus" },
  { key: "no_match", label: "Aucun match" },
  { key: "verified_internal", label: "Vérifiés" },
];

export default function AdminVerificationRuns() {
  const [filters, setFilters] = useState<VerificationRunFilter>({});
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const { data: runs, isLoading } = useAdminVerificationRuns({
    ...filters,
    search: search || undefined,
    status: activeFilter !== "all" ? activeFilter : undefined,
  });

  return (
    <AdminLayout>
      <PageHeader
        title="Vérifications"
        description="Console de vérification des entrepreneurs"
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, téléphone, RBQ, NEQ, ville…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map((f) => (
            <Button
              key={f.key}
              variant={activeFilter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(f.key)}
              className="text-xs"
            >
              {f.label}
            </Button>
          ))}
          <Button
            variant={filters.scoreDrop ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters((p) => ({ ...p, scoreDrop: !p.scoreDrop }))}
            className="text-xs gap-1"
          >
            <AlertTriangle className="h-3 w-3" /> Score drop
          </Button>
        </div>
      </div>

      {isLoading && <LoadingState />}

      {!isLoading && (!runs || runs.length === 0) && (
        <EmptyState message="Aucune vérification trouvée avec ces filtres." />
      )}

      {!isLoading && runs && runs.length > 0 && (
        <div className="border border-border/40 rounded-xl overflow-hidden bg-card/60">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Entrée principale</TableHead>
                  <TableHead className="text-xs">Entrepreneur</TableHead>
                  <TableHead className="text-xs">Résolution</TableHead>
                  <TableHead className="text-xs text-center">Identité</TableHead>
                  <TableHead className="text-xs text-center">Confiance</TableHead>
                  <TableHead className="text-xs text-center">Interne</TableHead>
                  <TableHead className="text-xs text-center">Delta</TableHead>
                  <TableHead className="text-xs">Revue</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run: any) => {
                  const mainInput = run.input_business_name || run.input_phone || run.input_rbq || "—";
                  const statusBadge = STATUS_BADGE[run.identity_resolution_status] ?? { label: run.identity_resolution_status || "—", className: "bg-muted text-muted-foreground" };
                  const reviewBadge = REVIEW_BADGE[run.admin_review_status] ?? { label: run.admin_review_status || "—", className: "bg-muted text-muted-foreground" };
                  const contractor = run.contractors as any;
                  const delta = run.live_risk_delta;

                  return (
                    <TableRow key={run.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(run.created_at).toLocaleDateString("fr-CA")}
                      </TableCell>
                      <TableCell className="text-sm font-medium max-w-[160px] truncate">
                        {mainInput}
                      </TableCell>
                      <TableCell className="text-sm">
                        {contractor?.business_name ? (
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[120px]">{contractor.business_name}</span>
                            {contractor.admin_verified && <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0" />}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">Non lié</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${statusBadge.className}`}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-sm font-semibold ${
                          (run.identity_confidence_score ?? 0) >= 70 ? "text-success" :
                          (run.identity_confidence_score ?? 0) >= 40 ? "text-warning" :
                          "text-destructive"
                        }`}>
                          {run.identity_confidence_score ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-sm font-semibold ${
                          (run.public_trust_score ?? 0) >= 70 ? "text-success" :
                          (run.public_trust_score ?? 0) >= 40 ? "text-warning" :
                          "text-destructive"
                        }`}>
                          {run.public_trust_score ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {contractor?.internal_verified_score ?? "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {delta != null ? (
                          <span className={`text-xs font-semibold ${delta < -10 ? "text-destructive" : delta > 0 ? "text-success" : "text-muted-foreground"}`}>
                            {delta > 0 ? "+" : ""}{delta}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${reviewBadge.className}`}>
                          {reviewBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link to={`/admin/verification/${run.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
