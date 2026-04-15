import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Camera, Zap, Check, Clock, AlertCircle } from "lucide-react";

interface TimelineStep {
  type: "score" | "email" | "sms" | "screenshot" | "engagement";
  label: string;
  status: "done" | "pending" | "error" | "active";
  detail?: string;
  time?: string;
}

const iconMap = {
  score: Zap,
  email: Mail,
  sms: MessageSquare,
  screenshot: Camera,
  engagement: Check,
};

const statusStyles = {
  done: "bg-emerald-500 border-emerald-500",
  pending: "bg-muted border-muted-foreground/30",
  error: "bg-red-500 border-red-500",
  active: "bg-primary border-primary animate-pulse",
};

export default function PanelTimelineSequence({ steps }: { steps: TimelineStep[] }) {
  if (steps.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Timeline Séquence</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune activité pour ce prospect.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Timeline Séquence</CardTitle></CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {steps.map((step, i) => {
            const Icon = iconMap[step.type] || Zap;
            const isLast = i === steps.length - 1;

            return (
              <div key={i} className="flex gap-3 relative">
                {!isLast && (
                  <div className="absolute left-[11px] top-6 w-0.5 h-[calc(100%-4px)] bg-border/50" />
                )}
                <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${statusStyles[step.status]}`}>
                  {step.status === "done" ? (
                    <Check className="h-3 w-3 text-white" />
                  ) : step.status === "error" ? (
                    <AlertCircle className="h-3 w-3 text-white" />
                  ) : step.status === "active" ? (
                    <Icon className="h-3 w-3 text-primary-foreground" />
                  ) : (
                    <Clock className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <div className="pb-4 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{step.label}</span>
                    <Badge variant="outline" className="text-[10px]">{step.type}</Badge>
                  </div>
                  {step.detail && <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>}
                  {step.time && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{step.time}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
