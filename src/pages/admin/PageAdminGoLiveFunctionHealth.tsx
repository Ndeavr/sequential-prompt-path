import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PanelFunctionHealthMatrix from "@/components/go-live/verification/PanelFunctionHealthMatrix";
import { Activity, RefreshCw } from "lucide-react";

const ALL_FUNCTIONS = [
  "search-google-business", "import-business-profile", "enrich-business-profile",
  "compute-plan-recommendation", "create-stripe-checkout-session", "activate-contractor-plan",
];

export default function PageAdminGoLiveFunctionHealth() {
  const [health, setHealth] = useState<any[]>([]);
  const [testing, setTesting] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);

  const testFunction = useCallback(async (name: string) => {
    setTesting(name);
    const start = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke(name, { body: { test: true, ping: true } });
      const latency = Date.now() - start;
      const result = {
        function_name: name, http_status: error ? 500 : 200, latency_ms: latency,
        health_status: error ? "unhealthy" : "healthy",
        response_excerpt: error ? error.message : JSON.stringify(data)?.substring(0, 200),
        checked_at: new Date().toISOString(),
      };
      setHealth(prev => [...prev.filter(h => h.function_name !== name), result]);
      await supabase.from("runtime_function_health").insert(result);
    } catch (err: any) {
      setHealth(prev => [...prev.filter(h => h.function_name !== name), {
        function_name: name, http_status: 0, latency_ms: Date.now() - start,
        health_status: "unreachable", response_excerpt: err?.message, checked_at: new Date().toISOString(),
      }]);
    } finally {
      setTesting(null);
    }
  }, []);

  const testAll = async () => {
    setIsRunningAll(true);
    for (const fn of ALL_FUNCTIONS) {
      await testFunction(fn);
    }
    setIsRunningAll(false);
  };

  useEffect(() => {
    supabase.from("runtime_function_health").select("*").order("checked_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setHealth(data); });
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Function Health</h1>
        </div>
        <Button size="sm" onClick={testAll} disabled={isRunningAll}>
          {isRunningAll ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
          Tester tout
        </Button>
      </div>
      <PanelFunctionHealthMatrix functions={health} onTest={testFunction} testing={testing} />
    </div>
  );
}
