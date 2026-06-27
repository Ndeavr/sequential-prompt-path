import { useEmailSenderHealth, useRunDailySelftest } from "@/hooks/useEmailSenderHealth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Loader2, SendHorizonal, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-CA") : "—");
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function PageAdminEmailSenderHealth() {
  const { data, isLoading, refetch } = useEmailSenderHealth();
  const selftest = useRunDailySelftest();

  const senderOk = data?.sender.valid !== false;
  const resendOk = data?.resend.status === "ok";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Email Sender Health</h1>
          <p className="text-sm text-muted-foreground">
            Source of truth pour le sender outbound. Tout envoi qui ne vient pas de <code>alex@mail.unpro.ca</code> est bloqué et loggé <code>EMAIL_SENDER_MISMATCH</code>.
          </p>
        </header>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className={senderOk && resendOk ? "text-emerald-500" : "text-amber-500"} />
              <CardTitle className="text-base">Sender actif</CardTitle>
            </div>
            <Badge variant={senderOk ? "default" : "destructive"}>
              {senderOk ? "Conforme" : "Mismatch"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Adresse</span><code>{data?.sender.address ?? "alex@mail.unpro.ca"}</code></div>
            <div className="flex justify-between"><span className="text-muted-foreground">From complet</span><code>{data?.sender.active ?? "Alex d'UNPRO <alex@mail.unpro.ca>"}</code></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Resend API</span>
              <span className="flex items-center gap-2">
                {resendOk ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                {data?.resend.status ?? "—"} {data?.resend.http_status ? `(HTTP ${data.resend.http_status})` : ""}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Dernier envoi</CardTitle></CardHeader><CardContent className="text-sm">{fmt(data?.last_send_at ?? null)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Dernier succès Resend</CardTitle></CardHeader><CardContent className="text-sm">{fmt(data?.last_success_at ?? null)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Dernière erreur</CardTitle></CardHeader><CardContent className="text-sm space-y-1"><div>{fmt(data?.last_error_at ?? null)}</div>{data?.last_error && <div className="text-destructive text-xs">{data.last_error}</div>}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Code Resend dernier ping</CardTitle></CardHeader><CardContent className="text-sm">{data?.last_resend_code ?? "—"}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Delivery rate (7j)</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{data ? pct(data.delivery_rate) : "—"}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Bounce rate (7j)</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{data ? pct(data.bounce_rate) : "—"}</CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm">Selftest quotidien</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data?.last_selftest ? (
              <div className="flex items-center justify-between">
                <div>
                  <div>{fmt(data.last_selftest.ran_at)}</div>
                  <div className="text-xs text-muted-foreground">message_id: <code>{data.last_selftest.provider_message_id ?? "—"}</code></div>
                </div>
                <Badge variant={data.last_selftest.passed ? "default" : "destructive"}>{data.last_selftest.passed ? "PASS" : "FAIL"}</Badge>
              </div>
            ) : <div className="text-muted-foreground">Aucun selftest enregistré.</div>}
            <Button
              onClick={() => selftest.mutate(undefined, {
                onSuccess: (r) => { toast.success(r.ok ? "Selftest envoyé" : "Selftest échoué"); refetch(); },
                onError: () => toast.error("Erreur selftest"),
              })}
              disabled={selftest.isPending}
              className="w-full gap-2"
            >
              {selftest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
              Envoyer un selftest maintenant
            </Button>
          </CardContent>
        </Card>

        {data?.sender_mismatches && data.sender_mismatches.length > 0 && (
          <Card className="border-amber-500/40">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> EMAIL_SENDER_MISMATCH récents</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              {data.sender_mismatches.map((m, i) => (
                <div key={i} className="border rounded p-2">
                  <div className="text-muted-foreground">{fmt(m.created_at)}</div>
                  <pre className="overflow-x-auto">{JSON.stringify(m.payload, null, 2)}</pre>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {isLoading && <div className="text-center text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin mr-2" />Chargement…</div>}
      </div>
    </div>
  );
}
