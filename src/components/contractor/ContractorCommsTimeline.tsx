import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Mail, MousePointerClick, CreditCard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type TimelineRow = {
  occurred_at: string;
  kind: string;
  status: string | null;
  detail: string | null;
  reference: string | null;
};

const KIND_ICON: Record<string, JSX.Element> = {
  sms: <MessageSquare className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  landing_view: <MousePointerClick className="w-4 h-4" />,
  activation: <CheckCircle2 className="w-4 h-4" />,
  checkout: <CreditCard className="w-4 h-4" />,
};

const STATUS_TONE: Record<string, string> = {
  delivered: "bg-primary/15 text-primary border-primary/30",
  sent: "bg-primary/10 text-primary border-primary/20",
  sending: "bg-muted text-muted-foreground border-border",
  queued: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  undelivered: "bg-destructive/15 text-destructive border-destructive/30",
  invalid_phone: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function ContractorCommsTimeline({ contractorId }: { contractorId: string }) {
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_contractor_comms_timeline" as any, {
        p_contractor_id: contractorId,
      });
      if (cancelled) return;
      if (error) setError(error.message);
      else setRows((data ?? []) as TimelineRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [contractorId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Historique des communications
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Chargement…
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="w-3 h-3" /> {error}
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <p className="text-xs text-muted-foreground">Aucune communication encore.</p>
        )}
        <ol className="relative border-l border-border ml-2 space-y-3">
          {rows.map((r, i) => {
            const tone = STATUS_TONE[r.status ?? ""] ?? "bg-muted text-muted-foreground border-border";
            const icon = KIND_ICON[r.kind] ?? <MessageSquare className="w-4 h-4" />;
            return (
              <li key={`${r.occurred_at}-${i}`} className="ml-3 pl-3">
                <span className="absolute -left-[7px] mt-1 w-3 h-3 rounded-full bg-background border border-primary" />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-foreground">
                    {icon}
                    <span className="font-medium capitalize">{r.kind.replace("_", " ")}</span>
                    {r.status && (
                      <Badge variant="outline" className={`text-[10px] ${tone}`}>{r.status}</Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(r.occurred_at).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                {r.detail && <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{r.detail}</p>}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
