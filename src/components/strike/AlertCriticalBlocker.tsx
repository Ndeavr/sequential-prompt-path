import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  status: string;
  openRate?: number;
  hoursLeft?: number;
}

export default function AlertCriticalBlocker({ status, openRate = 0, hoursLeft = 36 }: Props) {
  if (status !== "critical" && openRate >= 0.15 && hoursLeft > 6) return null;

  const messages: string[] = [];
  if (status === "critical") messages.push("Session critique — objectif non atteint, temps limité");
  if (openRate < 0.15 && openRate > 0) messages.push(`Taux d'ouverture critique: ${(openRate * 100).toFixed(1)}%`);
  if (hoursLeft < 6 && hoursLeft > 0) messages.push(`Moins de ${Math.ceil(hoursLeft)}h restantes`);

  if (!messages.length) return null;

  return (
    <Alert className="border-red-500/40 bg-red-500/5">
      <AlertTriangle className="h-4 w-4 text-red-400" />
      <AlertDescription className="text-xs text-red-300">
        {messages.map((m, i) => (
          <div key={i}>⚠ {m}</div>
        ))}
      </AlertDescription>
    </Alert>
  );
}
