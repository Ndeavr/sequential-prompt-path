import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface StripeCheck {
  label: string;
  status: "passed" | "failed" | "partial";
  detail: string;
  isMock?: boolean;
}

export default function PanelRealStripeValidation() {
  const [checks, setChecks] = useState<StripeCheck[]>([]);
  const [running, setRunning] = useState(false);

  const runTest = async () => {
    setRunning(true);
    const results: StripeCheck[] = [];

    // 1. Test create-stripe-checkout-session responds
    try {
      const start = Date.now();
      const { data, error } = await supabase.functions.invoke("create-stripe-checkout-session", {
        body: { test: true, ping: true },
      });
      const latency = Date.now() - start;
      const hasSession = data?.session_id || data?.url || data?.checkout_url;
      results.push({
        label: "Checkout session creation",
        status: error ? "failed" : hasSession ? "passed" : "partial",
        detail: error ? error.message : hasSession ? `Session créée en ${latency}ms` : `Fonction répond (${latency}ms) mais pas de session test`,
        isMock: !hasSession,
      });
    } catch (err: any) {
      results.push({ label: "Checkout session creation", status: "failed", detail: err?.message || "Unreachable" });
    }

    // 2. Test activate-contractor-plan responds
    try {
      const { data, error } = await supabase.functions.invoke("activate-contractor-plan", {
        body: { test: true, ping: true },
      });
      results.push({
        label: "Activation plan",
        status: error ? "partial" : "passed",
        detail: error ? `Réponse: ${error.message}` : "Fonction déployée",
      });
    } catch (err: any) {
      results.push({ label: "Activation plan", status: "failed", detail: err?.message || "Unreachable" });
    }

    // 3. Check payment_events table
    try {
      const { count, error } = await (supabase as any).from("payment_events").select("*", { count: "exact", head: true });
      results.push({
        label: "Table payment_events",
        status: error ? "failed" : "passed",
        detail: error ? error.message : `Accessible (${count ?? 0} events)`,
      });
    } catch {
      results.push({ label: "Table payment_events", status: "failed", detail: "Inaccessible" });
    }

    // 4. Check plan_catalog table
    try {
      const { data, error } = await supabase.from("plan_catalog").select("plan_code, name, is_active").limit(10);
      const active = data?.filter((p: any) => p.is_active)?.length || 0;
      results.push({
        label: "Catalogue de plans",
        status: error ? "failed" : active > 0 ? "passed" : "partial",
        detail: error ? error.message : `${active} plan(s) actif(s)`,
      });
    } catch {
      results.push({ label: "Catalogue de plans", status: "failed", detail: "Table inaccessible" });
    }

    // 5. Check runtime_payment_checks writable
    try {
      const { error } = await supabase.from("runtime_payment_checks").insert({
        provider: "stripe",
        mode: "test",
        checkout_created: false,
        status: "test_probe",
      });
      results.push({
        label: "runtime_payment_checks writable",
        status: error ? "failed" : "passed",
        detail: error ? error.message : "Insertion OK",
      });
    } catch {
      results.push({ label: "runtime_payment_checks writable", status: "failed", detail: "Écriture impossible" });
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
          <CreditCard className="h-4 w-4 text-primary" />
          Stripe Validation
          {total > 0 && <Badge variant={passed === total ? "default" : "destructive"} className="text-[10px]">{passed}/{total}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button size="sm" onClick={runTest} disabled={running} className="h-7 text-xs gap-1">
          <CreditCard className="h-3 w-3" />
          {running ? "Test…" : "Tester Stripe"}
        </Button>
        {checks.length > 0 && (
          <div className="space-y-1">
            {checks.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                {icon(c.status)}
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{c.label}</span>
                  {c.isMock && <Badge variant="outline" className="text-[9px] text-amber-500 border-amber-500/30">MOCK</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground">{c.detail}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
