import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useIntentRules } from "@/hooks/useAlexVoiceEngine";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, MapPin, Camera, FileText, Calendar } from "lucide-react";

export default function TableIntentRoutingRules() {
  const { data: rules = [], isLoading } = useIntentRules();

  if (isLoading) return <Skeleton className="h-60" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Règles de détection d'intention
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rules.map((r: any) => (
            <div key={r.id} className="p-3 rounded-lg border hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="text-xs bg-primary/20 text-primary">{r.intent_code}</Badge>
                <span className="font-medium text-sm">{r.label}</span>
                {r.trade_target && (
                  <Badge variant="outline" className="text-xs ml-auto">{r.trade_target}</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {(r.keywords as string[])?.slice(0, 5).map((kw: string, i: number) => (
                  <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded">{kw}</span>
                ))}
                {(r.keywords as string[])?.length > 5 && (
                  <span className="text-xs text-muted-foreground">+{(r.keywords as string[]).length - 5}</span>
                )}
              </div>
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                {r.requires_location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Localisation</span>}
                {r.requires_photo && <span className="flex items-center gap-1"><Camera className="w-3 h-3" /> Photo</span>}
                {r.requires_quote && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Soumission</span>}
                {r.requires_booking_offer && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Rendez-vous</span>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
