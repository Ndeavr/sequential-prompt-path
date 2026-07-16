/**
 * IntegrityCard — Single pipeline health card.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface Props {
  title: string;
  metric: string;
  value: number | null | undefined;
  suffix?: string;
  breakdown?: Array<{ label: string; value: number | null | undefined }>;
  isLoading?: boolean;
}

export function IntegrityCard({ title, metric, value, suffix = "%", breakdown = [], isLoading }: Props) {
  const v = typeof value === "number" ? value : null;
  const status: "healthy" | "degraded" | "down" | "unknown" =
    v == null ? "unknown" : v >= 90 ? "healthy" : v >= 70 ? "degraded" : "down";

  const Icon = status === "healthy" ? CheckCircle2 : status === "degraded" ? AlertTriangle : XCircle;
  const color =
    status === "healthy" ? "text-emerald-500" :
    status === "degraded" ? "text-amber-500" :
    status === "down" ? "text-red-500" : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">{metric}</p>
          <p className={`text-3xl font-bold ${color}`}>
            {isLoading ? "…" : v == null ? "Non disponible" : `${v}${suffix}`}
          </p>
        </div>
        {breakdown.length > 0 && (
          <div className="space-y-1 text-xs text-muted-foreground">
            {breakdown.map((b) => (
              <div key={b.label} className="flex justify-between">
                <span>{b.label}</span>
                <span className="font-medium text-foreground">{b.value ?? 0}</span>
              </div>
            ))}
          </div>
        )}
        <Badge variant={status === "healthy" ? "default" : status === "degraded" ? "secondary" : "destructive"}>
          {status === "healthy" ? "Sain" : status === "degraded" ? "Dégradé" : status === "down" ? "Critique" : "Inconnu"}
        </Badge>
      </CardContent>
    </Card>
  );
}
