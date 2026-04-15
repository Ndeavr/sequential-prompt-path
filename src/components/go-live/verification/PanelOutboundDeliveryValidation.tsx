import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface CheckResult {
  label: string;
  status: "passed" | "failed" | "partial" | "not_tested";
  detail: string;
}

export default function PanelOutboundDeliveryValidation() {
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);

  const runTest = async () => {
    setRunning(true);
    const results: CheckResult[] = [];

    // 1. Check outbound_sequences table accessible
    try {
      const { count, error } = await supabase.from("outbound_sequences").select("*", { count: "exact", head: true });
      results.push({
        label: "Table outbound_sequences",
        status: error ? "failed" : "passed",
        detail: error ? error.message : `Accessible (${count ?? 0} entrées)`,
      });
    } catch { results.push({ label: "Table outbound_sequences", status: "failed", detail: "Unreachable" }); }

    // 2. Check outbound_messages table
    try {
      const { count, error } = await supabase.from("outbound_messages").select("*", { count: "exact", head: true });
      results.push({
        label: "Table outbound_messages",
        status: error ? "failed" : "passed",
        detail: error ? error.message : `Accessible (${count ?? 0} messages)`,
      });
    } catch { results.push({ label: "Table outbound_messages", status: "failed", detail: "Unreachable" }); }

    // 3. Check process-outbound-queue function
    try {
      const { error } = await supabase.functions.invoke("process-outbound-queue", { body: { test: true, ping: true } });
      results.push({
        label: "Edge: process-outbound-queue",
        status: error ? "partial" : "passed",
        detail: error ? `Réponse avec erreur: ${error.message}` : "Fonction déployée et active",
      });
    } catch (err: any) {
      results.push({ label: "Edge: process-outbound-queue", status: "failed", detail: err?.message || "Unreachable" });
    }

    // 4. Check send-transactional-email function
    try {
      const { error } = await supabase.functions.invoke("send-transactional-email", { body: { test: true, ping: true } });
      results.push({
        label: "Edge: send-transactional-email",
        status: error ? "partial" : "passed",
        detail: error ? `Réponse: ${error.message}` : "Fonction déployée",
      });
    } catch (err: any) {
      results.push({ label: "Edge: send-transactional-email", status: "failed", detail: err?.message || "Unreachable" });
    }

    // 5. Check email_send_log table
    try {
      const { count, error } = await supabase.from("email_send_log").select("*", { count: "exact", head: true });
      results.push({
        label: "Table email_send_log",
        status: error ? "failed" : "passed",
        detail: error ? error.message : `Accessible (${count ?? 0} logs)`,
      });
    } catch { results.push({ label: "Table email_send_log", status: "failed", detail: "Unreachable" }); }

    // 6. Check email templates
    try {
      const { data, error } = await supabase.from("email_templates").select("id, name, is_active").limit(10);
      const active = data?.filter((t: any) => t.is_active)?.length || 0;
      results.push({
        label: "Templates email actifs",
        status: error ? "failed" : active > 0 ? "passed" : "partial",
        detail: error ? error.message : `${active} template(s) actif(s) sur ${data?.length || 0}`,
      });
    } catch { results.push({ label: "Templates email actifs", status: "failed", detail: "Table inaccessible" }); }

    setChecks(results);
    setRunning(false);
  };

  const passed = checks.filter(c => c.status === "passed").length;
  const total = checks.length;
  const icon = (s: string) => s === "passed" ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : s === "failed" ? <XCircle className="h-3 w-3 text-destructive" /> : <AlertTriangle className="h-3 w-3 text-amber-500" />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Validation Outbound
          {total > 0 && <Badge variant={passed === total ? "default" : "destructive"} className="text-[10px]">{passed}/{total}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button size="sm" onClick={runTest} disabled={running} className="h-7 text-xs gap-1">
          <Mail className="h-3 w-3" />
          {running ? "Test en cours…" : "Lancer diagnostic outbound"}
        </Button>
        {checks.length > 0 && (
          <div className="space-y-1">
            {checks.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                {icon(c.status)}
                <div>
                  <span className="font-medium">{c.label}</span>
                  <p className="text-[10px] text-muted-foreground">{c.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
