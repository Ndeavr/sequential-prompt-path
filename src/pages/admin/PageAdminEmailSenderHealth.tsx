import { useEmailSenderHealth, useRunDailySelftest, type HealthLevel } from "@/hooks/useEmailSenderHealth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Loader2, SendHorizonal, ShieldCheck, XCircle, HelpCircle } from "lucide-react";
import { toast } from "sonner";

const fmt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("fr-CA") : "—");
const pct = (n: number | undefined) => (typeof n === "number" ? `${(n * 100).toFixed(1)}%` : "—");

const LABEL: Record<HealthLevel, string> = {
  ok: "OK",
  warn: "DÉGRADÉ",
  blocked: "BLOQUÉ",
  unknown: "INCONNU",
};

function LevelIcon({ level }: { level: HealthLevel }) {
  if (level === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (level === "warn") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  if (level === "blocked") return <XCircle className="h-4 w-4 text-destructive" />;
  return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
}

function LevelBadge({ level }: { level: HealthLevel }) {
  return (
    <Badge variant={level === "ok" ? "default" : level === "blocked" ? "destructive" : "secondary"}>
      {LABEL[level]}
    </Badge>
  );
}

function Dimension({
  title,
  level,
  detail,
  children,
}: {
  title: string;
  level: HealthLevel;
  detail?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <LevelIcon level={level} />
          {title}
        </CardTitle>
        <LevelBadge level={level} />
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        {detail && <p className="text-muted-foreground break-words">{detail}</p>}
        {children}
      </CardContent>
    </Card>
  );
}

export default function PageAdminEmailSenderHealth() {
  const { data, isLoading, refetch } = useEmailSenderHealth();
  const selftest = useRunDailySelftest();

  const overall = data?.overall?.level ?? "unknown";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Email Sender Health</h1>
          <p className="text-sm text-muted-foreground">
            Chemin canonique : <code>outreach-resend-send</code> depuis <code>alex@mail.unpro.ca</code>. Chaque
            dimension est évaluée séparément — un sender configuré n'est jamais une preuve de conformité.
          </p>
        </header>

        <Card className={overall === "ok" ? "border-emerald-500/40" : overall === "blocked" ? "border-destructive/60" : "border-amber-500/40"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className={overall === "ok" ? "text-emerald-500" : overall === "blocked" ? "text-destructive" : "text-amber-500"} />
              État global
            </CardTitle>
            <LevelBadge level={overall} />
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>{data?.overall?.reason ?? "—"}</p>
            {data?.overall?.remediation && (
              <p className="text-muted-foreground">Remédiation : {data.overall.remediation}</p>
            )}
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          <Dimension
            title="Sender configuré"
            level={data?.configured_sender?.level ?? "unknown"}
            detail={data?.configured_sender?.note}
          >
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">From</span>
              <code className="text-xs">{data?.configured_sender?.active ?? "—"}</code>
            </div>
          </Dimension>

          <Dimension
            title="Autorisation du domaine"
            level={data?.domain?.level ?? "unknown"}
            detail={data?.domain?.detail}
          />

          <Dimension
            title="Santé requête API (provider)"
            level={data?.api_request?.level ?? "unknown"}
            detail={data?.api_request?.detail}
          >
            <div className="flex justify-between"><span className="text-muted-foreground">Route</span><code className="text-xs">{data?.api_request?.route ?? "—"}</code></div>
            <div className="flex justify-between"><span className="text-muted-foreground">HTTP</span><span>{data?.api_request?.http_status ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Clé</span><code className="text-xs">{data?.api_request?.key_prefix ?? "—"}…</code></div>
          </Dimension>

          <Dimension
            title="Acceptation provider (succès réel)"
            level={data?.provider_acceptance?.level ?? "unknown"}
            detail="Uniquement un envoi accepté avec identifiant provider retourné."
          >
            <div className="flex justify-between"><span className="text-muted-foreground">Dernier succès</span><span>{fmt(data?.provider_acceptance?.last_accepted_at)}</span></div>
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Provider ID</span><code className="text-xs break-all">{data?.provider_acceptance?.last_provider_id ?? "—"}</code></div>
          </Dimension>

          <Dimension title="Livraison (7 j)" level={data?.delivery?.level ?? "unknown"}>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="font-semibold">{pct(data?.delivery?.delivery_rate)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Bounce</span><span className="font-semibold">{pct(data?.delivery?.bounce_rate)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Échecs</span><span className="font-semibold">{pct(data?.delivery?.failed_rate)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Dernier envoi</span><span>{fmt(data?.last_send_at)}</span></div>
          </Dimension>

          <Dimension
            title="Dernier échec"
            level={data?.last_failure ? "warn" : "ok"}
            detail={data?.last_failure?.message ?? "Aucun échec récent."}
          >
            {data?.last_failure && (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Quand</span><span>{fmt(data.last_failure.at)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Canal</span><code className="text-xs">{data.last_failure.channel ?? "—"}</code></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Template</span><code className="text-xs">{data.last_failure.template_name ?? "—"}</code></div>
              </>
            )}
          </Dimension>
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
