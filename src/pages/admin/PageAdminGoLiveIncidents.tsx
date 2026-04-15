import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TableIncidentRegistry from "@/components/go-live/verification/TableIncidentRegistry";
import { AlertTriangle } from "lucide-react";

export default function PageAdminGoLiveIncidents() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("verification_failures")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setIncidents(data || []);
      setLoading(false);
    })();
  }, []);

  const critical = incidents.filter(i => i.severity === "critical" && i.status === "open");

  return (
    <div className="min-h-screen bg-background p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Incidents Go-Live</h1>
        {critical.length > 0 && <Badge variant="destructive" className="text-xs">{critical.length} critiques</Badge>}
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground animate-pulse">Chargement…</CardContent></Card>
      ) : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Registre des incidents ({incidents.length})</CardTitle></CardHeader>
          <CardContent><TableIncidentRegistry incidents={incidents} /></CardContent>
        </Card>
      )}
    </div>
  );
}
