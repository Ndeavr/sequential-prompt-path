import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Rocket, Send, TestTube2, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Prospect = {
  id: string; company_name: string | null; owner_name: string | null;
  city: string | null; category: string | null; roi_score: number;
  phone_e164: string | null; phone_type: string | null;
  variant: string | null; tracking_slug: string | null;
  qualification_status: string; rejection_reason: string | null;
  activation_status: string;
};

type TestRun = {
  id: string; phone: string; status: string; provider_id: string | null;
  sent_at: string | null; delivered_at: string | null;
  link_clicked_at: string | null; checkout_completed_at: string | null;
  tracking_slug: string | null; status_reason: string | null;
};

export default function PageAdminSmsSprint() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<any>(null);
  const [test, setTest] = useState<TestRun | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  async function load() {
    const { data: camp } = await supabase
      .from("sms_sprint_campaigns")
      .select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
    setCampaign(camp);
    if (camp) {
      const [{ data: t }, { data: p }, { data: m }, { data: e }] = await Promise.all([
        supabase.from("sms_sprint_test_runs").select("*")
          .eq("campaign_id", camp.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("sms_sprint_prospects").select("*")
          .eq("campaign_id", camp.id).order("created_at", { ascending: false }),
        supabase.from("sms_sprint_messages").select("*")
          .order("created_at", { ascending: false }).limit(200),
        supabase.from("sms_sprint_link_events").select("*")
          .order("occurred_at", { ascending: false }).limit(200),
      ]);
      setTest(t as any);
      setProspects((p ?? []) as any);
      setMessages(m ?? []);
      setEvents(e ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function call(name: string, body: any = {}) {
    setBusy(name);
    try {
      const { data, error } = await supabase.functions.invoke(name, { body });
      if (error) throw error;
      if (data?.ok === false || data?.error) throw new Error(data?.error ?? "failed");
      toast.success(`${name} ✓`);
      await load();
      return data;
    } catch (e: any) {
      toast.error(`${name}: ${e?.message ?? "error"}`);
    } finally { setBusy(null); }
  }

  const qualified = prospects.filter((p) => p.qualification_status === "qualified");
  const rejected = prospects.filter((p) => p.qualification_status === "rejected");
  const sentMsgs = messages.filter((m) => m.status === "sent" || m.status === "delivered");
  const delivered = messages.filter((m) => m.status === "delivered" || m.delivered_at);
  const failed = messages.filter((m) => m.status === "failed");
  const clicks = events.filter((e) => e.event === "click");
  const checkoutStarted = events.filter((e) => e.event === "checkout_started");
  const activations = prospects.filter((p) => p.activation_status === "activated");

  const testOk = !!test && !!test.delivered_at && !!test.link_clicked_at;
  const canSendFirst5 = testOk || test?.status === "sent"; // relax for founder mode
  const firstBatchAt = campaign?.first_batch_sent_at ? new Date(campaign.first_batch_sent_at).getTime() : 0;
  const canSend20 = firstBatchAt > 0 && Date.now() - firstBatchAt >= 30 * 60 * 1000 && clicks.length > 0;

  // Winning variant by activation rate
  const variantStats = new Map<string, { sent: number; activated: number }>();
  for (const p of qualified) {
    if (!p.variant) continue;
    const s = variantStats.get(p.variant) ?? { sent: 0, activated: 0 };
    s.sent += 1;
    if (p.activation_status === "activated") s.activated += 1;
    variantStats.set(p.variant, s);
  }
  const winning = Array.from(variantStats.entries())
    .sort((a, b) => (b[1].activated / (b[1].sent || 1)) - (a[1].activated / (a[1].sent || 1)))[0];

  const rejectionBreakdown = new Map<string, number>();
  for (const r of rejected) {
    const k = r.rejection_reason ?? "unknown";
    rejectionBreakdown.set(k, (rejectionBreakdown.get(k) ?? 0) + 1);
  }

  if (loading) {
    return <div className="admin-theme min-h-screen bg-[#050816] text-white flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin opacity-70" />
    </div>;
  }

  return (
    <div className="admin-theme min-h-screen bg-[#050816] text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Acquisition</div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
              <Rocket className="w-6 h-6" /> SMS Founder Sprint
            </h1>
            <div className="text-sm text-white/60 mt-1">
              {campaign ? `Campaign: ${campaign.name} · status: ${campaign.status}` : "No campaign yet"}
            </div>
          </div>
          <Button variant="outline" onClick={load} className="border-white/10 bg-white/[0.03]">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Test SMS card */}
        <Card className="mb-6 p-6 bg-white/[0.03] border-white/10 text-white">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <TestTube2 className="w-5 h-5" />
                <div className="font-semibold">Internal Test SMS → +1 (514) 249-9522</div>
                {testOk && <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">TEST OK</Badge>}
                {test && !testOk && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">{test.status}</Badge>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Kpi label="Sent" v={test?.sent_at ? "✓" : "—"} />
                <Kpi label="Delivered" v={test?.delivered_at ? "✓" : "—"} />
                <Kpi label="Clicked" v={test?.link_clicked_at ? "✓" : "—"} />
                <Kpi label="Checkout" v={test?.checkout_completed_at ? "✓" : "—"} />
              </div>
              {test?.status_reason && <div className="mt-3 text-xs text-red-400">{test.status_reason}</div>}
            </div>
            <Button
              disabled={busy === "sms-sprint-test"}
              onClick={() => call("sms-sprint-test")}
              className="bg-white text-[#050816] hover:bg-white/90"
            >
              {busy === "sms-sprint-test" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Test"}
            </Button>
          </div>
        </Card>

        {/* Controls */}
        <Card className="mb-6 p-6 bg-white/[0.03] border-white/10 text-white">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={busy === "sms-sprint-scrape"}
              onClick={() => call("sms-sprint-scrape", { limit: 25 })}
              variant="outline"
              className="border-white/10 bg-white/[0.03]"
            >
              {busy === "sms-sprint-scrape" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Scrape 25 qualified
            </Button>
            <Button
              disabled={busy === "sms-sprint-send" || !canSendFirst5 || qualified.length === 0}
              onClick={() => call("sms-sprint-send", { batch: 5 })}
              className="bg-white text-[#050816] hover:bg-white/90"
            >
              <Send className="w-4 h-4 mr-2" /> Send first 5
            </Button>
            <Button
              disabled={busy === "sms-sprint-send" || !canSend20}
              onClick={() => call("sms-sprint-send", { batch: 20 })}
              variant="outline"
              className="border-white/10 bg-white/[0.03]"
              title={canSend20 ? "" : "Requires 30 min elapsed since first batch AND ≥1 click"}
            >
              Send remaining 20
            </Button>
            <Button
              disabled={busy === "sms-sprint-followups"}
              onClick={() => call("sms-sprint-followups")}
              variant="outline"
              className="border-white/10 bg-white/[0.03]"
            >
              Run follow-ups
            </Button>
            {!testOk && (
              <div className="flex items-center gap-2 text-xs text-amber-300 ml-auto">
                <AlertTriangle className="w-4 h-4" /> Send Test SMS + click link first
              </div>
            )}
          </div>
        </Card>

        {/* KPI grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          <Kpi label="Qualified" v={qualified.length} />
          <Kpi label="Rejected" v={rejected.length} />
          <Kpi label="Queued" v={messages.filter((m) => m.status === "queued").length} />
          <Kpi label="Sent" v={sentMsgs.length} />
          <Kpi label="Delivered" v={delivered.length} />
          <Kpi label="Failed" v={failed.length} />
          <Kpi label="Clicked" v={clicks.length} />
          <Kpi label="$1 activations" v={activations.length} accent />
        </div>

        {winning && (
          <Card className="mb-6 p-4 bg-white/[0.03] border-white/10 text-white flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-emerald-300" />
            <div className="text-sm">
              Winning variant so far: <span className="font-semibold">{winning[0]}</span>
              {" · "}activation {(winning[1].activated / (winning[1].sent || 1) * 100).toFixed(0)}%
              {" · "}checkouts started {checkoutStarted.length}
            </div>
          </Card>
        )}

        {rejectionBreakdown.size > 0 && (
          <Card className="mb-6 p-4 bg-white/[0.03] border-white/10 text-white">
            <div className="text-sm font-semibold mb-2">Rejection reasons</div>
            <div className="flex flex-wrap gap-2 text-xs">
              {Array.from(rejectionBreakdown.entries()).map(([k, v]) => (
                <Badge key={k} className="bg-white/[0.06] border-white/10 text-white/80">{k}: {v}</Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Prospect table */}
        <Card className="p-0 bg-white/[0.03] border-white/10 text-white overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 text-sm font-semibold">Prospects ({prospects.length})</div>
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-xs">
              <thead className="bg-white/[0.04] text-white/60 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2">Company</th>
                  <th className="text-left px-3 py-2">City</th>
                  <th className="text-left px-3 py-2">Cat</th>
                  <th className="text-left px-3 py-2">ROI</th>
                  <th className="text-left px-3 py-2">Phone</th>
                  <th className="text-left px-3 py-2">Var</th>
                  <th className="text-left px-3 py-2">SMS</th>
                  <th className="text-left px-3 py-2">Click</th>
                  <th className="text-left px-3 py-2">Pay</th>
                  <th className="text-left px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((p) => {
                  const msg = messages.find((m) => m.sprint_prospect_id === p.id && m.phase === "initial");
                  const click = events.find((e) => e.tracking_slug === p.tracking_slug && e.event === "click");
                  return (
                    <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <td className="px-3 py-2">{p.company_name ?? "—"}</td>
                      <td className="px-3 py-2">{p.city ?? "—"}</td>
                      <td className="px-3 py-2">{p.category ?? "—"}</td>
                      <td className="px-3 py-2">{p.roi_score}</td>
                      <td className="px-3 py-2 font-mono">{p.phone_e164 ?? "—"}</td>
                      <td className="px-3 py-2">{p.variant ?? "—"}</td>
                      <td className="px-3 py-2">{msg?.status ?? "—"}</td>
                      <td className="px-3 py-2">{click ? "✓" : "—"}</td>
                      <td className="px-3 py-2">{p.activation_status}</td>
                      <td className="px-3 py-2 text-white/50">{p.rejection_reason ?? ""}</td>
                    </tr>
                  );
                })}
                {prospects.length === 0 && (
                  <tr><td colSpan={10} className="px-3 py-8 text-center text-white/50">No prospects yet. Click "Scrape 25 qualified".</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, v, accent }: { label: string; v: any; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/[0.03] border-white/10"}`}>
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
      <div className="text-lg font-semibold mt-0.5">{v}</div>
    </div>
  );
}
