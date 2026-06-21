// @content-guard:internal
/**
 * Admin cockpit — Internal Content Guard.
 * Manage forbidden patterns and review audit runs.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/layouts/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ShieldAlert, PlayCircle, RefreshCw } from "lucide-react";

type Rule = {
  id: string;
  pattern: string;
  match_type: "plain" | "regex";
  severity: "block" | "warn";
  category: string;
  description: string | null;
  enabled: boolean;
};

type Run = {
  id: string;
  ran_at: string;
  violations_count: number;
  blocking_count: number;
  status: string;
  source: string;
  report: any;
};

export default function PageAdminContentGuard() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: rules = [] } = useQuery({
    queryKey: ["content_visibility_rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_visibility_rules" as any)
        .select("*")
        .order("severity", { ascending: true })
        .order("category", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Rule[];
    },
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["content_audit_runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_audit_runs" as any)
        .select("*")
        .order("ran_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as Run[];
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("content_visibility_rules" as any)
        .update({ enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_visibility_rules"] });
      toast.success("Règle mise à jour");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  async function rescan() {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("content-audit-run", { body: {} });
      if (error) throw error;
      toast.success(`Scan: ${data?.status} — ${data?.violations_count ?? 0} violation(s)`);
      qc.invalidateQueries({ queryKey: ["content_audit_runs"] });
    } catch (e: any) {
      toast.error(e.message ?? "Échec scan");
    } finally {
      setRunning(false);
    }
  }

  const blocking = rules.filter((r) => r.severity === "block");
  const warning = rules.filter((r) => r.severity === "warn");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldAlert className="h-6 w-6" /> Internal Content Guard
            </h1>
            <p className="text-sm text-muted-foreground">
              Empêche les instructions IA, prompts internes et jargon de fuiter dans les surfaces propriétaire / entrepreneur.
            </p>
          </div>
          <Button onClick={rescan} disabled={running} className="gap-2">
            {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Rescan CMS
          </Button>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Règles bloquantes" value={blocking.length} />
          <Stat label="Avertissements" value={warning.length} />
          <Stat label="Derniers runs" value={runs.length} />
          <Stat
            label="Dernier statut"
            value={runs[0]?.status ?? "—"}
            tone={runs[0]?.status === "ok" ? "ok" : runs[0]?.status === "fail" ? "bad" : "warn"}
          />
        </div>

        <Card>
          <CardHeader><CardTitle>Règles actives</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {rules.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 border-b last:border-b-0 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.pattern}</code>
                    <Badge variant={r.severity === "block" ? "destructive" : "secondary"} className="text-[10px]">
                      {r.severity}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                    <Badge variant="outline" className="text-[10px]">{r.match_type}</Badge>
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                </div>
                <Switch
                  checked={r.enabled}
                  onCheckedChange={(v) => toggleRule.mutate({ id: r.id, enabled: v })}
                />
              </div>
            ))}
            {rules.length === 0 && <p className="text-sm text-muted-foreground">Aucune règle.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Derniers scans CMS</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {runs.map((run) => (
              <div key={run.id} className="flex items-center justify-between text-sm border-b last:border-b-0 py-2">
                <div className="flex items-center gap-2">
                  <Badge variant={run.status === "ok" ? "default" : run.status === "fail" ? "destructive" : "secondary"}>
                    {run.status}
                  </Badge>
                  <span className="text-muted-foreground">{new Date(run.ran_at).toLocaleString("fr-CA")}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {run.violations_count} violation(s) · {run.blocking_count} bloquante(s)
                </div>
              </div>
            ))}
            {runs.length === 0 && <p className="text-sm text-muted-foreground">Aucun scan exécuté.</p>}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "ok" | "bad" | "warn" }) {
  const color = tone === "bad" ? "text-red-600" : tone === "warn" ? "text-orange-600" : tone === "ok" ? "text-emerald-600" : "";
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
