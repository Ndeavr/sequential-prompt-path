/**
 * Vérifications professionnelles — compact, mobile-first, truth-only.
 * Shows ONLY real data available for the professional. Never fabricates a
 * licence, a status or a verification date, and never upgrades a state.
 */
import { ShieldCheck, FileText, Clock, AlertTriangle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfessionalCredentials, useComplianceRule } from "@/hooks/useProfessionCompliance";
import {
  CREDENTIAL_STATUS_LABELS,
  VERIFICATION_STATE_LABELS,
  type CredentialStatus,
  type VerificationState,
} from "@/lib/compliance/professionCompliance";

interface Props {
  contractorId: string;
  professionCode?: string | null;
  /** Business/identity facts already verified elsewhere in the profile. */
  businessName?: string | null;
  neq?: string | null;
  className?: string;
}

const stateTone: Record<VerificationState, string> = {
  VERIFIED: "bg-success/10 text-success border-success/30",
  DECLARED: "bg-muted text-muted-foreground border-border",
  INFERRED: "bg-muted text-muted-foreground border-border",
  PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

const statusTone: Record<CredentialStatus, string> = {
  ACTIVE: "bg-success/10 text-success border-success/30",
  EXPIRED: "bg-destructive/10 text-destructive border-destructive/30",
  SUSPENDED: "bg-destructive/10 text-destructive border-destructive/30",
  UNVERIFIED: "bg-muted text-muted-foreground border-border",
  PENDING_REVIEW: "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

function formatDate(value?: string | null) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return null;
  }
}

export function ProfessionalVerificationsCard({
  contractorId,
  professionCode,
  businessName,
  neq,
  className,
}: Props) {
  const { data: credentials, isLoading } = useProfessionalCredentials(contractorId);
  const { data: rule } = useComplianceRule(professionCode);

  const hasAnything = (credentials?.length ?? 0) > 0 || !!businessName || !!neq;
  if (!isLoading && !hasAnything) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Vérifications professionnelles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <Skeleton className="h-16 w-full" />}

        {!isLoading && (businessName || neq) && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-foreground">{businessName ?? "Entreprise"}</span>
            {neq && <span className="text-muted-foreground">NEQ {neq}</span>}
          </div>
        )}

        {!isLoading &&
          (credentials ?? []).map((c) => {
            const state = (c.effective_verification_state ?? c.verification_state) as VerificationState;
            const status = (c.effective_status ?? c.credential_status) as CredentialStatus;
            const lastCheck = formatDate(c.source_last_verified_at ?? c.verified_at);
            return (
              <div key={c.id} className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {c.credential_type ?? "Titre professionnel"}
                    {c.credential_value ? ` · ${c.credential_value}` : ""}
                  </span>
                  <Badge variant="outline" className={`text-[10px] ${stateTone[state] ?? stateTone.PENDING}`}>
                    {VERIFICATION_STATE_LABELS[state] ?? "En attente"}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${statusTone[status] ?? statusTone.UNVERIFIED}`}>
                    {CREDENTIAL_STATUS_LABELS[status] ?? "Non vérifié"}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {c.issuer && <span>{c.issuer}</span>}
                  {c.expires_at && <span>Échéance : {formatDate(c.expires_at)}</span>}
                  {lastCheck && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Dernière vérification : {lastCheck}
                    </span>
                  )}
                  {status === "EXPIRED" && (
                    <span className="inline-flex items-center gap-1 text-destructive">
                      <AlertTriangle className="h-3 w-3" /> Titre échu
                    </span>
                  )}
                </div>
              </div>
            );
          })}

        {!isLoading && (credentials?.length ?? 0) === 0 && (
          <p className="text-xs text-muted-foreground">
            Aucun titre professionnel vérifié n'est disponible pour ce professionnel.
          </p>
        )}

        {rule?.regulator_name && (
          <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            Encadrement : {rule.regulator_name}
            {rule.regulator_url && (
              <a
                href={rule.regulator_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
              >
                registre officiel <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default ProfessionalVerificationsCard;
