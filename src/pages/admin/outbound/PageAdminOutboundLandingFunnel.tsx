/**
 * /admin/outbound/landing-funnel — Real-time funnel cockpit.
 * Reads v_outbound_funnel + outbound_landing_pages.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface FunnelRow { day: string; trade: string; city: string; leads_total: number; leads_sent: number; landing_viewed: number; checkout_started: number; paid: number; published: number; }
interface LandingRow { id: string; page_slug: string; landing_token: string; view_count: number; first_viewed_at: string | null; last_viewed_at: string | null; checkout_started_at: string | null; paid_at: string | null; publish_status: string; published_contractor_id: string | null; company_id: string; lead_id: string | null; }

export default function PageAdminOutboundLandingFunnel() {
  const [funnel, setFunnel] = useState<FunnelRow[]>([]);
  const [landings, setLandings] = useState<LandingRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: f }, { data: l }] = await Promise.all([
      supabase.from("v_outbound_funnel").select("*").order("day", { ascending: false }).limit(30) as any,
      supabase.from("outbound_landing_pages").select("*").order("created_at", { ascending: false }).limit(100) as any,
    ]);
    setFunnel((f as any) ?? []);
    setLandings((l as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const totals = funnel.reduce((acc, r) => ({
    leads: acc.leads + (r.leads_total || 0),
    sent: acc.sent + (r.leads_sent || 0),
    viewed: acc.viewed + (r.landing_viewed || 0),
    checkout: acc.checkout + (r.checkout_started || 0),
    paid: acc.paid + (r.paid || 0),
    published: acc.published + (r.published || 0),
  }), { leads: 0, sent: 0, viewed: 0, checkout: 0, paid: 0, published: 0 });

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Funnel landing outbound</h1>
            <p className="text-muted-foreground text-sm mt-1">Suivi temps réel des leads scrapés → vus → payés → publiés.</p>
          </div>
          <Link to="/admin/autopilot-mvp" className="text-sm text-primary hover:underline">→ Autopilot MVP</Link>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Leads", value: totals.leads },
            { label: "Envoyés", value: totals.sent },
            { label: "Vus", value: totals.viewed },
            { label: "Checkout", value: totals.checkout },
            { label: "Payés", value: totals.paid },
            { label: "Publiés", value: totals.published },
          ].map(k => (
            <div key={k.label} className="rounded-2xl border bg-card p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Funnel by day */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Funnel par jour / métier / ville</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Jour</th>
                  <th className="text-left p-3">Métier</th>
                  <th className="text-left p-3">Ville</th>
                  <th className="text-right p-3">Leads</th>
                  <th className="text-right p-3">Vus</th>
                  <th className="text-right p-3">Checkout</th>
                  <th className="text-right p-3">Payés</th>
                  <th className="text-right p-3">Publiés</th>
                </tr>
              </thead>
              <tbody>
                {funnel.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3">{r.day}</td>
                    <td className="p-3">{r.trade || "—"}</td>
                    <td className="p-3">{r.city || "—"}</td>
                    <td className="text-right p-3 tabular-nums">{r.leads_total}</td>
                    <td className="text-right p-3 tabular-nums">{r.landing_viewed}</td>
                    <td className="text-right p-3 tabular-nums">{r.checkout_started}</td>
                    <td className="text-right p-3 tabular-nums text-cyan-600">{r.paid}</td>
                    <td className="text-right p-3 tabular-nums text-green-600 font-semibold">{r.published}</td>
                  </tr>
                ))}
                {funnel.length === 0 && !loading && (
                  <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Aucune donnée. Lance un run depuis /admin/autopilot-mvp.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Landings */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">Landings récentes ({landings.length})</h2>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground sticky top-0">
                <tr>
                  <th className="text-left p-3">Slug</th>
                  <th className="text-right p-3">Vues</th>
                  <th className="text-left p-3">Dernière vue</th>
                  <th className="text-left p-3">Statut</th>
                  <th className="text-left p-3">Lien</th>
                </tr>
              </thead>
              <tbody>
                {landings.map(l => {
                  const status = l.publish_status === "published" ? "✅ Publié"
                    : l.paid_at ? "💰 Payé"
                    : l.checkout_started_at ? "🛒 Checkout"
                    : l.first_viewed_at ? "👁 Vu"
                    : "📨 Envoyé";
                  return (
                    <tr key={l.id} className="border-t">
                      <td className="p-3 font-mono text-xs">{l.page_slug}</td>
                      <td className="text-right p-3 tabular-nums">{l.view_count}</td>
                      <td className="p-3 text-xs text-muted-foreground">{l.last_viewed_at ? new Date(l.last_viewed_at).toLocaleString("fr-CA") : "—"}</td>
                      <td className="p-3">{status}</td>
                      <td className="p-3">
                        <a href={`/pro/diagnostic/${l.page_slug}?t=${l.landing_token}`} target="_blank" rel="noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1">
                          Ouvrir <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
