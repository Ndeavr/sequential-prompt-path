import { Card, CardContent } from "@/components/ui/card";
import { Database, CheckCircle, XCircle, Clock } from "lucide-react";

interface Source {
  id: string;
  source_name: string;
  status: string;
  last_sync_at: string | null;
}

export default function WidgetSourceHealth({ sources }: { sources: Source[] }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Sources</p>
        {sources.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{s.source_name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {s.status === "active" ? (
                <CheckCircle className="w-3.5 h-3.5 text-success" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-destructive" />
              )}
              {s.last_sync_at && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {new Date(s.last_sync_at).toLocaleDateString("fr-CA")}
                </span>
              )}
            </div>
          </div>
        ))}
        {sources.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">Aucune source configurée</p>
        )}
      </CardContent>
    </Card>
  );
}
