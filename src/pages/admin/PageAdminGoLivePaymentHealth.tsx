import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PageAdminGoLivePaymentHealth() {
  const { toast } = useToast();
  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    supabase.from("runtime_payment_checks").select("*").order("checked_at", { ascending: false }).limit(20)
      .then(({ data }) => { setChecks(data || []); setLoading(false); });
  }, []);

  const runStripeTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-stripe-checkout-session", {
        body: { test: true, ping: true },
      });
      const result = {
        provider: "stripe", mode: "test",
        checkout_created: !error && (data?.session_id || data?.url),
        checkout_session_id: data?.session_id || null,
        webhook_received: false, activation_triggered: false,
        status: error ? "failed" : data?.session_id ? "passed" : "partial",
      };
      const { data: inserted } = await supabase.from("runtime_payment_checks").insert(result).select().single();
      if (inserted) setChecks(prev => [inserted, ...prev]);
      toast({ title: error ? "Échec Stripe" : "Test Stripe complété", description: error?.message || `Session: ${data?.session_id || "N/A"}` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Payment Health</h1>
        </div>
        <Button size="sm" onClick={runStripeTest} disabled={testing}>
          {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
          Test Stripe
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground animate-pulse">Chargement…</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {checks.length === 0 && (
            <Card><CardContent className="p-8 text-center text-xs text-muted-foreground">Aucun test de paiement</CardContent></Card>
          )}
          {checks.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-3 flex items-center gap-3">
                {c.status === "passed" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{c.provider}</span>
                    <Badge variant="outline" className="text-[10px]">{c.mode}</Badge>
                    <Badge variant={c.status === "passed" ? "default" : "destructive"} className="text-[10px]">{c.status}</Badge>
                  </div>
                  {c.checkout_session_id && <p className="text-[10px] text-muted-foreground font-mono truncate">{c.checkout_session_id}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(c.checked_at).toLocaleTimeString("fr-CA")}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
