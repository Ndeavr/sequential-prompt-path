import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface AlexCheck {
  label: string;
  status: "passed" | "failed" | "partial";
  detail: string;
}

export default function PanelAlexFrenchFirstValidation() {
  const [checks, setChecks] = useState<AlexCheck[]>([]);
  const [running, setRunning] = useState(false);

  const runTest = async () => {
    setRunning(true);
    const results: AlexCheck[] = [];

    // 1. Test alex-chat responds
    try {
      const { data, error } = await supabase.functions.invoke("alex-chat", {
        body: { message: "Bonjour, je cherche un entrepreneur", language: "fr", test: true },
      });
      const response = data?.reply || data?.message || data?.response || "";
      const isFrench = /[àâéèêëïîôùûüç]|bonjour|bienvenue|comment|aide|entrepreneur/i.test(response);
      results.push({
        label: "Alex répond en français",
        status: error ? "failed" : isFrench ? "passed" : "partial",
        detail: error ? error.message : isFrench ? `"${response.substring(0, 80)}…"` : `Réponse non-FR détectée: "${response.substring(0, 80)}"`,
      });
    } catch (err: any) {
      results.push({ label: "Alex répond en français", status: "failed", detail: err?.message || "Unreachable" });
    }

    // 2. Test alex-start-session
    try {
      const { data, error } = await supabase.functions.invoke("alex-start-session", {
        body: { surface: "onboarding", language: "fr", test: true },
      });
      results.push({
        label: "Session Alex démarrable",
        status: error ? "failed" : "passed",
        detail: error ? error.message : `Session: ${data?.session_id || "OK"}`,
      });
    } catch (err: any) {
      results.push({ label: "Session Alex démarrable", status: "failed", detail: err?.message || "Unreachable" });
    }

    // 3. Test alex-voice-get-config
    try {
      const { data, error } = await supabase.functions.invoke("alex-voice-get-config", {
        body: { test: true },
      });
      const lang = data?.language || data?.config?.language || "unknown";
      results.push({
        label: "Config voix: langue défaut",
        status: error ? "failed" : lang === "fr" || lang === "fr-CA" ? "passed" : "partial",
        detail: error ? error.message : `Langue: ${lang}`,
      });
    } catch (err: any) {
      results.push({ label: "Config voix: langue défaut", status: "failed", detail: err?.message || "Unreachable" });
    }

    // 4. Check alex_session_state table
    try {
      const { error } = await (supabase as any).from("alex_session_state").select("id", { count: "exact", head: true });
      results.push({
        label: "Table alex_session_state",
        status: error ? "failed" : "passed",
        detail: error ? error.message : "Accessible",
      });
    } catch {
      results.push({ label: "Table alex_session_state", status: "failed", detail: "Inaccessible" });
    }

    // 5. Verify FR greeting content
    try {
      const { data } = await supabase.functions.invoke("alex-system-prompt-resolver", {
        body: { surface: "onboarding", role: "entrepreneur", language: "fr" },
      });
      const prompt = data?.system_prompt || data?.prompt || "";
      const hasFr = /français|québec|bonjour|entrepreneur/i.test(prompt);
      results.push({
        label: "Prompt système FR-first",
        status: hasFr ? "passed" : "partial",
        detail: hasFr ? "Prompt contient instructions FR" : "Prompt sans marqueur FR explicite",
      });
    } catch {
      results.push({ label: "Prompt système FR-first", status: "partial", detail: "Resolver non testé" });
    }

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
          <MessageCircle className="h-4 w-4 text-primary" />
          Alex FR-First
          {total > 0 && <Badge variant={passed === total ? "default" : passed > 0 ? "secondary" : "destructive"} className="text-[10px]">{passed}/{total}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button size="sm" onClick={runTest} disabled={running} className="h-7 text-xs gap-1">
          <MessageCircle className="h-3 w-3" />
          {running ? "Test…" : "Tester Alex FR"}
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
