/**
 * /admin/test-sms — Phase 5.
 * Direct Twilio send. Bypass agents / queues / orchestrators. Truth or nothing.
 */
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { sendDirectSms } from "@/services/systemHealthService";

export default function PageTestSMS() {
  const [phone, setPhone] = useState("+15142499522");
  const [body, setBody] = useState("Test UNPRO — ce message confirme que Twilio fonctionne.");
  const [result, setResult] = useState<any>(null);
  const send = useMutation({
    mutationFn: () => sendDirectSms(phone, body),
    onSuccess: (d) => setResult(d),
    onError: (e: any) => setResult({ ok: false, error: String(e?.message ?? e) }),
  });

  return (
    <DashboardLayout>
      <Helmet><title>Test SMS Direct — UNPRO</title></Helmet>
      <div className="admin-theme min-h-screen p-6 max-w-2xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Test SMS Direct</h1>
          <p className="text-sm text-muted-foreground">Bypass complet : pas d'agent, pas de queue, pas d'orchestrator. Twilio only.</p>
        </header>

        <div className="space-y-3 rounded-2xl border border-border/40 p-4 bg-card/40">
          <label className="block text-xs font-semibold uppercase tracking-wider">Téléphone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm font-mono" placeholder="+1514…" />

          <label className="block text-xs font-semibold uppercase tracking-wider">Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm" />

          <Button disabled={send.isPending} onClick={() => send.mutate()} className="w-full">
            {send.isPending ? "Envoi…" : "Envoyer via Twilio (bypass)"}
          </Button>
        </div>

        {result && (
          <div className={`rounded-2xl border p-4 ${result.ok ? "border-emerald-500/50 bg-emerald-500/10" : "border-destructive/50 bg-destructive/10"}`}>
            <div className={`font-bold text-sm ${result.ok ? "text-emerald-500" : "text-destructive"}`}>{result.ok ? "✅ SMS envoyé" : "❌ Échec"}</div>
            <pre className="text-[10px] mt-2 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
