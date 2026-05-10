import { useState } from "react";
import { useOutboundHealth, useTestOutboundSend, useTriggerOutboundHealthCheck, type OutboundMailboxHealth } from "@/hooks/useOutboundHealth";
import { Mail, Activity, AlertTriangle, Clock, Inbox, RefreshCw, CheckCircle2, XCircle, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${ok ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/15 text-destructive"}`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {label}
    </span>
  );
}

function TestSendDialog({ mailbox }: { mailbox: OutboundMailboxHealth }) {
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const mut = useTestOutboundSend();

  const submit = async () => {
    try {
      const res = await mut.mutateAsync({ mailboxId: mailbox.id, recipient });
      if (res.ok) toast.success(`Envoi réussi · ${res.latency} ms`);
      else toast.error(`Échec: ${res.error ?? "inconnu"}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]">
          <Send className="h-3 w-3 mr-1" /> Tester l'envoi
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Test depuis {mailbox.email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Destinataire</Label>
            <Input type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="vous@unpro.ca" />
          </div>
          {mut.data && (
            <div className="rounded-md border p-2 text-xs space-y-1">
              <div>Statut · <strong>{mut.data.ok ? "succès" : "échec"}</strong></div>
              <div>Latence · {mut.data.latency} ms</div>
              {mut.data.error && <div className="text-destructive">Erreur · {mut.data.error}</div>}
              {mut.data.providerResponse && (
                <pre className="text-[10px] bg-muted p-1 rounded max-h-24 overflow-auto">{JSON.stringify(mut.data.providerResponse, null, 2)}</pre>
              )}
            </div>
          )}
          <Button size="sm" disabled={!recipient || mut.isPending} onClick={submit} className="w-full">
            {mut.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
            Envoyer le test
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PanelLiveKPIs() {
  const { data: health, refetch, isFetching, dataUpdatedAt } = useOutboundHealth();
  const trigger = useTriggerOutboundHealthCheck();

  const totalSentToday = health?.mailboxes?.reduce((s, m) => s + (m.sentToday ?? 0), 0) ?? 0;
  const totalCap = health?.mailboxes?.reduce((s, m) => s + (m.dailyLimit ?? 0), 0) ?? 0;
  const verifiedCount = health?.mailboxes?.filter((m) => m.authStatus === "connected" && m.lastTestAt).length ?? 0;
  const connectedCount = health?.mailboxes?.filter((m) => m.authStatus === "connected").length ?? 0;
  const secondsSinceSync = dataUpdatedAt ? Math.max(0, Math.floor((Date.now() - dataUpdatedAt) / 1000)) : null;
  const provider = health?.provider ?? "—";

  // Traffic light
  const light = !health ? "gray" : health.sendingHealthy ? "green" : connectedCount > 0 ? "yellow" : "red";
  const lightStyles = {
    green: "bg-emerald-500/10 border-emerald-500/40 text-emerald-500",
    yellow: "bg-amber-500/10 border-amber-500/40 text-amber-500",
    red: "bg-destructive/10 border-destructive/40 text-destructive",
    gray: "bg-muted/30 border-border/30 text-muted-foreground",
  }[light];
  const lightLabel = {
    green: "Outbound opérationnel",
    yellow: "Mailbox connectée — non vérifiée",
    red: "Aucune mailbox connectée",
    gray: "En attente de vérification",
  }[light];

  const kpis = [
    { label: "Envoyés aujourd'hui", value: `${totalSentToday}/${totalCap}`, icon: Mail },
    { label: "Mailboxes vérifiées", value: `${verifiedCount}/${health?.mailboxes?.length ?? 0}`, icon: Inbox },
    { label: "Provider", value: provider, icon: Activity },
    { label: "Domaine", value: health?.domainConfigured ? "OK" : "À corriger", icon: AlertTriangle },
    { label: "Dernier sync", value: secondsSinceSync === null ? "—" : `${secondsSinceSync}s`, icon: Clock },
  ];

  return (
    <div className="space-y-3">
      <div className={`rounded-lg border p-3 flex items-center justify-between ${lightStyles}`}>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${light === "green" ? "bg-emerald-500" : light === "yellow" ? "bg-amber-500" : light === "red" ? "bg-destructive" : "bg-muted-foreground"} ${light === "green" ? "animate-pulse" : ""}`} />
          <span className="text-xs font-semibold">{lightLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          {health && (
            <>
              <StatusPill ok={health.spfValid} label="SPF" />
              <StatusPill ok={health.dkimValid} label="DKIM" />
              <StatusPill ok={health.mxValid} label="MX" />
            </>
          )}
          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => { trigger.mutate(); refetch(); }} disabled={trigger.isPending || isFetching}>
            <RefreshCw className={`h-3 w-3 ${trigger.isPending || isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-md bg-background/10 border border-current/10 px-2 py-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-current/70 uppercase tracking-wide">
              <k.icon className="h-3 w-3" /> {k.label}
            </div>
            <div className="text-sm font-bold mt-0.5 truncate">{k.value}</div>
          </div>
        ))}
      </div>

      {health?.mailboxes && health.mailboxes.length > 0 && (
        <div className="rounded-md border border-current/10 divide-y divide-current/10">
          {health.mailboxes.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-2 py-1.5 text-xs">
              <div className="flex flex-col min-w-0">
                <span className="truncate font-medium">{m.email}</span>
                <span className="text-[10px] text-current/60">{m.provider} · {m.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill ok={m.authStatus === "connected"} label={m.authStatus} />
                <TestSendDialog mailbox={m} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
