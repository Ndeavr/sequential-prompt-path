/**
 * UNPRO — Latest Verification Insights
 * Displays strengths, risks, inconsistencies from the latest snapshot.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";

interface LatestVerificationInsightsProps {
  strengths?: string[];
  risks?: string[];
  inconsistencies?: string[];
  missingProofs?: string[];
}

const SignalList = ({
  items,
  icon: Icon,
  iconClass,
  emptyText,
}: {
  items: string[];
  icon: React.ElementType;
  iconClass: string;
  emptyText: string;
}) => (
  items.length > 0 ? (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
          <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${iconClass}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-muted-foreground italic">{emptyText}</p>
  )
);

export const LatestVerificationInsights = ({
  strengths = [],
  risks = [],
  inconsistencies = [],
  missingProofs = [],
}: LatestVerificationInsightsProps) => {
  const hasData = strengths.length + risks.length + inconsistencies.length + missingProofs.length > 0;
  if (!hasData) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          Signaux de vérification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {strengths.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Forces détectées</p>
            <SignalList items={strengths} icon={CheckCircle} iconClass="text-success" emptyText="" />
          </div>
        )}
        {risks.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Risques identifiés</p>
            <SignalList items={risks} icon={AlertTriangle} iconClass="text-warning" emptyText="" />
          </div>
        )}
        {inconsistencies.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Incohérences</p>
            <SignalList items={inconsistencies} icon={XCircle} iconClass="text-destructive" emptyText="" />
          </div>
        )}
        {missingProofs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preuves manquantes</p>
            <SignalList items={missingProofs} icon={Info} iconClass="text-muted-foreground" emptyText="" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
