import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Eye, MousePointerClick, Flame, Ban, Activity, Play, Pause, Square } from "lucide-react";
import { useCampaignKpis, useCampaignLiveFeed, useCampaignContacts, useCampaignHotLeads, useLaunchCampaign, useEligibleProspectsCount } from "@/hooks/useCampaignCenter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const SEGMENTS = [
  { key: "all", label: "Tous", color: "bg-foreground/20" },
  { key: "A", label: "A · Ghost", color: "bg-red-500/20 text-red-400" },
  { key: "B", label: "B · Incomplete", color: "bg-amber-500/20 text-amber-400" },
  { key: "C", label: "C · Established", color: "bg-indigo-500/20 text-indigo-400" },
];

function KpiCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm p-4 min-w-[120px]">
      <Icon className={`w-4 h-4 mb-2 ${color}`} />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

const STATUS_ICON: Record<string, string> = {
  sent: "✉️", delivered: "📬", opened: "👁️", clicked: "🔗",
  replied: "🔥", failed: "⚠️", bounced: "↩️", queued: "⏳",
};
const STATUS_COLOR: Record<string, string> = {
  sent: "text-foreground/70", opened: "text-yellow-400",
  clicked: "text-blue-400", replied: "text-red-400 font-bold animate-pulse",
  failed: "text-red-500/70", bounced: "text-amber-500/70", queued: "text-muted-foreground",
};

export default function PageCampaignCenter() {
  const [confirm, setConfirm] = useState("");
  const [segment, setSegment] = useState<string>("all");
  const kpis = useCampaignKpis();
  const feed = useCampaignLiveFeed();
  const contacts = useCampaignContacts();
  const hot = useCampaignHotLeads();
  const eligible = useEligibleProspectsCount();
  const launch = useLaunchCampaign();

  const eligibleCount = eligible.data?.[segment as "all" | "A" | "B" | "C"] ?? 0;

  const onLaunch = async () => {
    if (confirm !== "CONFIRMER") { toast.error("Tapez CONFIRMER pour déverrouiller."); return; }
    try {
      const r: any = await launch.mutateAsync({ action: "start", segment });
      toast.success(`Campagne lancée: ${r?.inserted ?? 0} contacts ajoutés`);
      setConfirm("");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    }
  };

  const PIPELINE_COLS = [
    { key: "pending", label: "Pending", filter: (c: any) => c.status === "pending" },
    { key: "day0_sent", label: "Day 0 Sent", filter: (c: any) => c.day_0_email_sent_at || c.day_0_sms_sent_at },
    { key: "opened", label: "Opened", filter: (c: any) => c.day_0_email_opened_at || c.day_2_email_opened_at },
    { key: "clicked", label: "Clicked", filter: (c: any) => c.link_clicked_at },
    { key: "replied", label: "🔥 Replied", filter: (c: any) => c.status === "replied" },
    { key: "completed", label: "Completed", filter: (c: any) => c.status === "completed" },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-foreground p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-2xl md:text-3xl tracking-tight">Campaign Control Center</h1>
        <Badge variant="outline" className="border-[#E8321A]/40 text-[#E8321A]">OPS · LIVE</Badge>
      </div>

      {/* KPI strip */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        <KpiCard icon={Activity} label="Active" value={kpis.data?.active ?? 0} color="text-green-400" />
        <KpiCard icon={Send} label="Sent today" value={kpis.data?.sentToday ?? 0} color="text-foreground/70" />
        <KpiCard icon={Eye} label="Opens" value={kpis.data?.opens ?? 0} color="text-yellow-400" />
        <KpiCard icon={MousePointerClick} label="Clicks" value={kpis.data?.clicks ?? 0} color="text-blue-400" />
        <KpiCard icon={Flame} label="Replies" value={kpis.data?.replied ?? 0} color="text-red-400" />
        <KpiCard icon={Ban} label="Opt-out" value={kpis.data?.optedOut ?? 0} color="text-muted-foreground" />
      </div>

      <Tabs defaultValue="launch" className="space-y-4">
        <TabsList className="bg-card/30 border border-border/20">
          <TabsTrigger value="launch">Launch</TabsTrigger>
          <TabsTrigger value="feed">Live Feed</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="hot">🔥 Hot Leads</TabsTrigger>
        </TabsList>

        {/* LAUNCH */}
        <TabsContent value="launch" className="space-y-4">
          <div className="rounded-xl border border-border/20 bg-card/30 p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {SEGMENTS.map((s) => (
                <button key={s.key} onClick={() => setSegment(s.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${segment === s.key ? "border-[#E8321A] bg-[#E8321A]/10" : "border-border/30"} ${s.color}`}>
                  {s.label} · {eligible.data?.[s.key as "all" | "A" | "B" | "C"] ?? 0}
                </button>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              Cette campagne ciblera <span className="text-foreground font-semibold">{eligibleCount}</span> entrepreneurs · séquence Jour 0 / 2 / 5 (email + SMS)
            </div>
            <div className="text-xs text-muted-foreground">Coût estimé : ~{Math.ceil(eligibleCount * 0.03)}$ (Twilio SMS) + 0$ (Lovable Email)</div>
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center pt-2">
              <Input placeholder='Tapez "CONFIRMER" pour déverrouiller' value={confirm} onChange={(e) => setConfirm(e.target.value)} className="max-w-xs bg-background/40" />
              <Button onClick={onLaunch} disabled={confirm !== "CONFIRMER" || launch.isPending}
                className="bg-[#E8321A] hover:bg-[#E8321A]/90 text-white">
                <Play className="w-4 h-4 mr-2" /> Launch Campaign
              </Button>
              <Button variant="outline" onClick={() => launch.mutate({ action: "pause_all" })}>
                <Pause className="w-4 h-4 mr-2" /> Pause All
              </Button>
              <Button variant="outline" onClick={() => launch.mutate({ action: "resume_all" })}>
                <Square className="w-4 h-4 mr-2" /> Resume All
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* LIVE FEED */}
        <TabsContent value="feed">
          <div className="rounded-xl border border-border/20 bg-card/30 max-h-[60vh] overflow-y-auto divide-y divide-border/10">
            {(feed.data ?? []).length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Aucune activité.</div>}
            {(feed.data ?? []).map((e) => (
              <motion.div key={e.id} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                className="px-4 py-2 flex items-center gap-3 text-xs font-mono">
                <span className="text-muted-foreground w-12">{relativeTime(e.sent_at)}</span>
                <span>{STATUS_ICON[e.status] ?? "•"}</span>
                <span className={STATUS_COLOR[e.status] ?? "text-foreground"}>{e.channel.toUpperCase()} · {e.status}</span>
                <span className="text-foreground/80">→ {e.company_name ?? "—"}</span>
                <span className="text-muted-foreground ml-auto">{e.day}</span>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* PIPELINE */}
        <TabsContent value="pipeline">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {PIPELINE_COLS.map((col) => {
              const items = (contacts.data ?? []).filter(col.filter);
              return (
                <div key={col.key} className="flex-shrink-0 min-w-[200px] rounded-xl border border-border/20 bg-card/30 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{col.label}</div>
                  <div className="text-xl font-bold mb-2">{items.length}</div>
                  <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                    {items.slice(0, 30).map((c) => (
                      <div key={c.id} className="rounded-md border border-border/15 bg-background/30 p-2 text-xs">
                        <div className="font-medium truncate">{c.company_name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[9px] py-0">{c.segment}</Badge>
                          {c.lost_revenue_monthly && <span className="text-muted-foreground text-[10px]">{c.lost_revenue_monthly}$/mo</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* HOT LEADS */}
        <TabsContent value="hot">
          <div className="rounded-xl border border-border/20 bg-card/30 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-3 text-left">Entreprise</th><th className="p-3">Canal</th><th className="p-3 text-left">Aperçu</th><th className="p-3">Reçu</th><th className="p-3">Statut</th></tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {(hot.data ?? []).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucune réponse encore.</td></tr>}
                {(hot.data ?? []).map((l) => (
                  <tr key={l.id} className="hover:bg-background/20">
                    <td className="p-3 font-medium">{l.company_name}</td>
                    <td className="p-3 text-center">{l.reply_channel === "sms" ? "📱" : "✉️"}</td>
                    <td className="p-3 text-xs text-muted-foreground max-w-md truncate">{l.reply_text}</td>
                    <td className="p-3 text-xs text-muted-foreground">{relativeTime(l.replied_at)}</td>
                    <td className="p-3"><Badge variant="outline">{l.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
