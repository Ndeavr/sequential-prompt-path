import { useEmailDomainHealth } from "@/hooks/useEmailProductionControl";
import { useSendingHealth } from "@/hooks/useOutboundProspects";
import { useAutomationJobs } from "@/hooks/useOutboundOpsData";
import { Mail, Activity, AlertTriangle, Clock, Inbox, RefreshCw } from "lucide-react";

export default function PanelLiveKPIs() {
  const { data: domain } = useEmailDomainHealth();
  const { data: sending, refetch, isFetching, dataUpdatedAt } = useSendingHealth();
  const { data: jobs } = useAutomationJobs(50);

  const totalSentToday = sending?.mailboxes?.reduce((s: number, m: any) => s + (m.sent_today ?? 0), 0) ?? 0;
  const totalCap = sending?.mailboxes?.reduce((s: number, m: any) => s + (m.daily_limit ?? 0), 0) ?? 0;
  const activeMailboxes = sending?.activeMailboxes ?? sending?.mailboxes?.filter((m: any) => m.mailbox_status === "active")?.length ?? 0;
  const queuedJobs = jobs?.filter((j: any) => j.status === "queued" || j.status === "running")?.length ?? 0;
  const secondsSinceSync = dataUpdatedAt ? Math.max(0, Math.floor((Date.now() - dataUpdatedAt) / 1000)) : null;
  const providerConnected = sending?.providerConnected ?? "—";

  const kpis = [
    { label: "Envoyés aujourd'hui", value: `${totalSentToday}/${totalCap}`, icon: Mail },
    { label: "Mailboxes actives", value: `${activeMailboxes}+`, icon: Inbox },
    { label: "Réputation", value: (domain as any)?.overall_score ?? "—", icon: Activity },
    { label: "Jobs en file", value: queuedJobs, icon: Clock },
    { label: "Statut domaine", value: (domain as any)?.status ?? "—", icon: AlertTriangle },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-[10px] text-current/70">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>Vérité backend · {activeMailboxes} mailbox{activeMailboxes > 1 ? "s" : ""} active{activeMailboxes > 1 ? "s" : ""}</span>
          <span>Provider · {providerConnected}</span>
          <span>Dernier sync · {secondsSinceSync === null ? "—" : `${secondsSinceSync}s`}</span>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-current/20 px-2 text-[10px] font-medium hover:bg-current/10 disabled:opacity-60"
          disabled={isFetching}
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-md bg-background/10 border border-current/10 px-2 py-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-current/70 uppercase tracking-wide">
              <k.icon className="h-3 w-3" /> {k.label}
            </div>
            <div className="text-sm font-bold mt-0.5">{k.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
