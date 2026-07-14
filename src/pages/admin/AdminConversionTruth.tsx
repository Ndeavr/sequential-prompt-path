import { useState } from "react";
import { useConversionTruth, TruthStep } from "@/hooks/useConversionTruth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, XCircle, MinusCircle, Play, RefreshCw } from "lucide-react";
import TestFunnelModal from "@/components/admin/funnel/TestFunnelModal";

const STEP_LABEL: Record<TruthStep, string> = {
  scraped: "Scraped",
  mobile_valid: "Mobile",
  sms_sent: "SMS Sent",
  sms_delivered: "SMS Delivered",
  link_clicked: "Link Clicked",
  landing_view: "Landing",
  landing_visible_3s: "Vis. >3s",
  cta_clicked: "CTA",
  alex_started: "Alex",
  signup_started: "Signup Start",
  signup_completed: "Signup OK",
  checkout_opened: "Checkout",
  stripe_success: "Stripe OK",
  account_activated: "Activated",
};

function Cell({ ok, at, error }: { ok: boolean; at: string | null; error?: string | null }) {
  if (at && ok) {
    return (
      <div className="flex items-center gap-1 text-emerald-500 text-[10px]" title={at}>
        <CheckCircle2 className="h-3 w-3" />
        <span>{new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-1 text-rose-500 text-[10px]" title={error}>
        <XCircle className="h-3 w-3" />
        <span className="truncate max-w-[80px]">{error}</span>
      </div>
    );
  }
  return <MinusCircle className="h-3 w-3 text-muted-foreground/40" />;
}

export default function AdminConversionTruth() {
  const [days] = useState(30);
  const [testOpen, setTestOpen] = useState(false);
  const { data, isLoading, refetch, isFetching } = useConversionTruth(days);

  return (
    <div className="min-h-screen bg-background admin-theme p-4 md:p-8 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-readable">Conversion Truth</h1>
          <p className="text-sm text-readable-muted">
            Vérité brute du funnel — objectif : premier entrepreneur payé 1$
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
          <Button size="sm" onClick={() => setTestOpen(true)}>
            <Play className="h-4 w-4 mr-2" />
            Tester Funnel Réel
          </Button>
        </div>
      </header>

      {/* Blocker banner */}
      {data?.blocker && (
        <Card className="border-rose-500/40 bg-rose-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="h-5 w-5" />
              Blocage principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-readable">{data.blocker.label}</p>
            <p className="text-xs text-readable-muted mt-1">
              {data.blocker.from} leads atteignent l'étape précédente, {data.blocker.to} passent l'étape "{data.blocker.step}".
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {data && [
          ["Leads", data.kpi.leads],
          ["SMS Delivered", data.kpi.sms_delivered],
          ["Landing", data.kpi.landing_views],
          ["Alex Starts", data.kpi.alex_starts],
          ["Signups", data.kpi.signups],
          ["Checkouts", data.kpi.checkouts],
          ["Paid Activations", data.kpi.paid_activations],
        ].map(([label, value], i) => (
          <Card key={label as string} className={i === 6 ? "border-emerald-500/40 bg-emerald-500/5" : ""}>
            <CardContent className="p-3">
              <div className="text-xs text-readable-muted">{label}</div>
              <div className={`text-2xl font-bold ${i === 6 ? "text-emerald-500" : "text-readable"}`}>{value as number}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tracking mismatch */}
      {data?.mismatch && (data.mismatch.delivered_no_click > 0 || data.mismatch.click_no_view > 0 || data.mismatch.view_no_session > 0) && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-500 text-base">Incohérences de tracking</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 text-sm">
            <Badge variant="outline">Delivered sans clic : {data.mismatch.delivered_no_click}</Badge>
            <Badge variant="outline">Clic sans landing_view : {data.mismatch.click_no_view}</Badge>
            <Badge variant="outline">Landing_view sans session : {data.mismatch.view_no_session}</Badge>
          </CardContent>
        </Card>
      )}

      {/* Variant stats */}
      {data?.variant_stats && Object.keys(data.variant_stats).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Variantes SMS</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm">
            {Object.entries(data.variant_stats).map(([k, v]) => (
              <div key={k} className="p-2 rounded bg-muted/20">
                <div className="font-semibold">{k}</div>
                <div className="text-xs text-readable-muted">
                  Sent: {v.sent} · Delivered: {v.delivered} · {v.sent > 0 ? Math.round((v.delivered / v.sent) * 100) : 0}%
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Truth table */}
      <Card>
        <CardHeader>
          <CardTitle>Vérité par lead ({data?.leads.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-readable-muted text-sm">Chargement…</p>
          ) : (
            <table className="w-full text-xs min-w-[1400px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 sticky left-0 bg-background">Lead</th>
                  {data?.steps.map((s) => (
                    <th key={s} className="text-left p-2 min-w-[90px]">{STEP_LABEL[s]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.leads.map((l) => (
                  <tr key={l.lead_id} className={`border-b border-border/40 hover:bg-muted/10 ${l.first_break ? "" : "bg-emerald-500/5"}`}>
                    <td className="p-2 sticky left-0 bg-background">
                      <div className="font-semibold text-readable">{l.company_name || "—"}</div>
                      <div className="text-[10px] text-readable-muted">
                        {l.category} · {l.city} · {l.phone}
                      </div>
                      {l.first_break && (
                        <div className="text-[10px] text-rose-500 mt-1">⚠ {l.first_break.reason}</div>
                      )}
                    </td>
                    {data.steps.map((s) => (
                      <td key={s} className={`p-2 ${l.first_break?.step === s ? "bg-rose-500/10" : ""}`}>
                        <Cell ok={l.steps[s].ok} at={l.steps[s].at} error={l.steps[s].error} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {testOpen && <TestFunnelModal onClose={() => setTestOpen(false)} />}
    </div>
  );
}
