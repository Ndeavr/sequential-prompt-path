/**
 * AdminSolicitationPage — /admin/solicitation
 * Live funnel of the SMS acquisition engine + variant CTR/activation, controls.
 */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface QueueRow {
  id: string;
  company_name: string;
  city: string | null;
  category: string | null;
  status: string;
  message_variant: string | null;
  sent_at: string | null;
  clicked_at: string | null;
  registered_at: string | null;
  activated_at: string | null;
}

export default function AdminSolicitationPage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [showTest, setShowTest] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin-solicitation", showTest],
    refetchInterval: 10_000,
    queryFn: async () => {
      let queueQ = supabase.from("contractor_outreach_queue" as any).select("*").order("created_at", { ascending: false }).limit(200);
      if (!showTest) queueQ = queueQ.eq("is_test", false);
      const [rowsRes, variantsRes, winsRes, milestonesRes, deliveredRes, flagRes] = await Promise.all([
        queueQ,
        supabase.from("solicitation_message_variants" as any).select("*").order("code"),
        supabase.from("solicitation_first_wins" as any).select("*").order("created_at", { ascending: false }).limit(1),
        supabase.from("first_dollar_milestones" as any).select("*"),
        supabase.from("outreach_delivery_logs" as any).select("status", { count: "exact", head: true }).eq("status", "sent").eq("is_test", showTest ? true : false),
        supabase.from("system_flags" as any).select("*").eq("key", "OUTREACH_ENABLED").maybeSingle(),
      ]);
      const milestones = ((milestonesRes.data ?? []) as any[]).reduce((acc, m) => {
        acc[m.event] = m; return acc;
      }, {} as Record<string, any>);
      return {
        rows: ((rowsRes.data ?? []) as unknown) as QueueRow[],
        variants: ((variantsRes.data ?? []) as unknown) as any[],
        firstWin: (((winsRes.data ?? [])[0] ?? null) as unknown) as any,
        milestones,
        deliveredCount: deliveredRes.count ?? 0,
        outreachEnabled: !!(flagRes.data as any)?.value,
      };
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-solicitation-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "contractor_outreach_queue" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-solicitation"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "outreach_delivery_logs" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-solicitation"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const rows = data?.rows ?? [];
  const milestones = data?.milestones ?? {};
  const delivered = data?.deliveredCount ?? 0;
  const funnel = {
    prospects: rows.length,
    sent: rows.filter((r) => r.sent_at).length,
    clicked: rows.filter((r) => r.clicked_at).length,
    registered: rows.filter((r) => r.registered_at).length,
    activated: rows.filter((r) => r.activated_at).length,
    revenue: rows.filter((r) => r.activated_at).length * 1,
  };

  const perVariant = ["A", "B", "C", "D", "E"].map((code) => {
    const vRows = rows.filter((r) => r.message_variant === code);
    const sent = vRows.filter((r) => r.sent_at).length;
    const clicked = vRows.filter((r) => r.clicked_at).length;
    const activated = vRows.filter((r) => r.activated_at).length;
    return { code, sent, clicked, activated, ctr: sent ? (clicked / sent) * 100 : 0, activationRate: sent ? (activated / sent) * 100 : 0 };
  });

  async function callFn(name: string, body: unknown, label: string) {
    setBusy(name);
    try {
      const { data: res, error } = await supabase.functions.invoke(name, { body });
      if (error) throw error;
      toast.success(`${label}: ${JSON.stringify(res).slice(0, 120)}`);
      qc.invalidateQueries({ queryKey: ["admin-solicitation"] });
    } catch (e: any) {
      toast.error(`${label} failed: ${e?.message ?? e}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Solicitation Engine</h1>
            <p className="text-sm text-muted-foreground mt-1">SMS acquisition funnel — target first $1 activation today.</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={showTest} onChange={(e) => setShowTest(e.target.checked)} />
              Show test data
            </label>
            <a href="/admin/provider-health" className="text-xs underline opacity-80">Provider Health →</a>
            <a href="/admin/outreach-errors" className="text-xs underline opacity-80">Failure Command Center →</a>
            <Button variant="outline" disabled={busy !== null} onClick={() => callFn("solicitation-build-queue", { target: 25 }, "Build queue")}>
              Build queue (25)
            </Button>
            <Button disabled={busy !== null} onClick={() => callFn("solicitation-send-sms", { batch: 25 }, "Send batch")}>
              Send next batch (25)
            </Button>
            <Button variant="outline" disabled={busy !== null} onClick={() => callFn("solicitation-send-sms", { batch: 3, dry_run: true }, "Dry-run")}>
              Dry-run
            </Button>
          </div>
        </header>

        {/* Production Health Banner */}
        <Card className="border-border">
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 lg:grid-cols-9 gap-3 text-center text-xs">
            {(() => {
              const scraped = funnel.prospects;
              const queued = rows.filter((r) => r.status === "queued").length;
              const sent = funnel.sent;
              const clicked = funnel.clicked;
              const activated = funnel.activated;
              const paid = activated;
              const revenue = funnel.revenue;
              const cell = (label: string, v: number | string, red = false) => (
                <div key={label} className={`rounded-md py-2 px-1 ${red ? "bg-red-500/15 text-red-300" : "bg-white/5"}`}>
                  <div className="uppercase tracking-wider opacity-70">{label}</div>
                  <div className="text-lg font-semibold mt-0.5">{v}</div>
                </div>
              );
              return [
                cell("Scraped", scraped),
                cell("Queued", queued),
                cell("Sent", sent),
                cell("Delivered", delivered, delivered === 0),
                cell("Clicked", clicked),
                cell("Activated", activated, activated === 0),
                cell("Paid", paid, paid === 0),
                cell("Revenue", `$${revenue}`, revenue === 0),
                cell("Test?", showTest ? "ON" : "OFF"),
              ];
            })()}
          </CardContent>
        </Card>

        {/* First Dollar Status */}
        <Card className={milestones.first_payment ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/5"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {milestones.first_payment
                ? `🏆 FIRST DOLLAR ACHIEVED — ${new Date(milestones.first_payment.achieved_at).toLocaleString("fr-CA")}`
                : "First Dollar Status"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-2 text-sm">
            {[
              ["Delivery", "first_delivery"],
              ["Click", "first_click"],
              ["Activation", "first_activation"],
              ["Payment", "first_payment"],
            ].map(([label, key]) => (
              <div key={key} className="flex items-center gap-2">
                <span>{milestones[key] ? "✅" : "❌"}</span>
                <span className="opacity-80">{label}</span>
              </div>
            ))}
          </CardContent>
        </Card>


        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            ["Prospects", funnel.prospects],
            ["SMS Sent", funnel.sent],
            ["Clicked", funnel.clicked],
            ["Registered", funnel.registered],
            ["Activated", funnel.activated],
            ["Revenue $", funnel.revenue],
          ].map(([label, val]) => (
            <Card key={label as string}>
              <CardContent className="p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
                <div className="text-2xl font-semibold mt-1">{val}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {data?.firstWin && (
          <Card className="border-primary/40 bg-primary/5">
            <CardHeader><CardTitle className="text-lg">🏆 First paid activation</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div><strong>{data.firstWin.company_name}</strong> · {data.firstWin.city} · {data.firstWin.category}</div>
              <div>Variant <strong>{data.firstWin.message_variant}</strong> · time-to-pay {Math.round((data.firstWin.time_to_pay_seconds ?? 0) / 60)} min</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Per-variant performance</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs uppercase">
                <tr><th className="text-left py-2">Variant</th><th>Sent</th><th>Clicked</th><th>CTR</th><th>Activated</th><th>Act rate</th></tr>
              </thead>
              <tbody>
                {perVariant.map((v) => (
                  <tr key={v.code} className="border-t border-border">
                    <td className="py-2 font-medium">{v.code}</td>
                    <td className="text-center">{v.sent}</td>
                    <td className="text-center">{v.clicked}</td>
                    <td className="text-center">{v.ctr.toFixed(1)}%</td>
                    <td className="text-center">{v.activated}</td>
                    <td className="text-center">{v.activationRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent activity (200)</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground uppercase">
                <tr><th className="text-left py-2">Company</th><th className="text-left">City</th><th className="text-left">Category</th><th className="text-left">Variant</th><th className="text-left">Status</th><th className="text-left">Sent</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, 60).map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2">{r.company_name}</td>
                    <td>{r.city ?? "—"}</td>
                    <td>{r.category ?? "—"}</td>
                    <td>{r.message_variant ?? "—"}</td>
                    <td><span className="px-2 py-0.5 rounded bg-secondary text-xs">{r.status}</span></td>
                    <td>{r.sent_at ? new Date(r.sent_at).toLocaleString("fr-CA") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
