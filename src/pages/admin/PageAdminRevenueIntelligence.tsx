import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, ShieldAlert, Smartphone, Star, Globe2 } from "lucide-react";

type Summary = {
  total: number; eligible: number; suppressed: number;
  aggregator_emails: number; mobile_numbers: number; landlines: number;
  no_website: number; reviews_25_plus: number; ready_to_activate: number;
  queue_a: number; queue_b: number; queue_c: number; queue_d: number;
};

type Row = {
  id: string;
  business_name: string | null;
  category_slug: string | null;
  city: string | null;
  review_count: number | null;
  review_rating: number | null;
  has_website: boolean;
  website_quality_score: number;
  phone_type: string | null;
  email: string | null;
  email_quality: string | null;
  aggregator_email: boolean;
  acquisition_priority_score: number;
  outreach_channel: string | null;
  outreach_eligible: boolean;
  suppression_reason: string | null;
  queue_tier: string;
};

type FilterKey =
  | "all" | "mobile_only" | "no_website" | "reviews_25" | "no_web_with_reviews"
  | "eligible_only" | "suppressed_only" | "queue_a" | "queue_b" | "queue_c" | "queue_d";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "eligible_only", label: "Eligible only" },
  { key: "suppressed_only", label: "Suppressed only" },
  { key: "mobile_only", label: "Mobile only" },
  { key: "no_website", label: "No website" },
  { key: "reviews_25", label: "25+ reviews" },
  { key: "no_web_with_reviews", label: "No website + reviews" },
  { key: "queue_a", label: "Queue A · Ready" },
  { key: "queue_b", label: "Queue B · High" },
  { key: "queue_c", label: "Queue C · Medium" },
  { key: "queue_d", label: "Queue D · Ignore" },
];

export default function PageAdminRevenueIntelligence() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("queue_a");
  const [search, setSearch] = useState("");

  async function loadSummary() {
    const { data, error } = await supabase.rpc("rpc_acquisition_intelligence_summary");
    if (error) { toast.error("Summary load failed"); return; }
    setSummary(data as unknown as Summary);
  }

  async function loadRows() {
    setLoading(true);
    let q = supabase
      .from("v_acquisition_queues")
      .select("id,business_name,category_slug,city,review_count,review_rating,has_website,website_quality_score,phone_type,email,email_quality,aggregator_email,acquisition_priority_score,outreach_channel,outreach_eligible,suppression_reason,queue_tier")
      .order("acquisition_priority_score", { ascending: false })
      .limit(200);

    switch (filter) {
      case "eligible_only":       q = q.eq("outreach_eligible", true); break;
      case "suppressed_only":     q = q.not("suppression_reason", "is", null); break;
      case "mobile_only":         q = q.eq("phone_type", "mobile"); break;
      case "no_website":          q = q.eq("has_website", false); break;
      case "reviews_25":          q = q.gte("review_count", 25); break;
      case "no_web_with_reviews": q = q.eq("has_website", false).gte("review_count", 25); break;
      case "queue_a":             q = q.eq("queue_tier", "A_ready"); break;
      case "queue_b":             q = q.eq("queue_tier", "B_high"); break;
      case "queue_c":             q = q.eq("queue_tier", "C_medium"); break;
      case "queue_d":             q = q.eq("queue_tier", "D_ignore"); break;
    }
    if (search.trim()) q = q.ilike("business_name", `%${search.trim()}%`);
    const { data, error } = await q;
    if (error) { toast.error("Prospects load failed"); setLoading(false); return; }
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadSummary(); }, []);
  useEffect(() => { loadRows(); /* eslint-disable-next-line */ }, [filter]);

  async function runRecompute(all: boolean) {
    setRecomputing(true);
    try {
      const { data, error } = await supabase.functions.invoke("acquisition-recalculate-priority", {
        body: all ? { only_missing: false, batch_size: 500 } : { ids: rows.slice(0, 100).map(r => r.id) },
      });
      if (error) throw error;
      toast.success(`Recomputed ${(data as any)?.counters?.updated ?? 0} prospects`);
      await Promise.all([loadSummary(), loadRows()]);
    } catch (e: any) {
      toast.error(`Recompute failed: ${e.message ?? e}`);
    } finally {
      setRecomputing(false);
    }
  }

  const kpi = useMemo(() => summary ? [
    { label: "Total prospects",    value: summary.total },
    { label: "Eligible",           value: summary.eligible, tone: "emerald" },
    { label: "Suppressed",         value: summary.suppressed, tone: "rose" },
    { label: "Aggregator emails",  value: summary.aggregator_emails, tone: "rose" },
    { label: "Mobile numbers",     value: summary.mobile_numbers, tone: "emerald" },
    { label: "Landlines",          value: summary.landlines, tone: "amber" },
    { label: "No website",         value: summary.no_website, tone: "emerald" },
    { label: "25+ reviews",        value: summary.reviews_25_plus, tone: "emerald" },
    { label: "Ready to activate",  value: summary.ready_to_activate, tone: "sky" },
  ] : [], [summary]);

  return (
    <div className="admin-theme mx-auto max-w-7xl space-y-6 p-4 pb-24 md:p-8">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-readable">Revenue Intelligence</h1>
          <p className="text-sm text-readable-muted">
            Contractor Activation Engine — suppress waste, prioritize revenue.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={recomputing || rows.length === 0}
            onClick={() => runRecompute(false)}>
            {recomputing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Recompute visible
          </Button>
          <Button disabled={recomputing} onClick={() => runRecompute(true)}
            data-cta-canonical="admin">
            {recomputing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Recompute all (batch 500)
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {kpi.map((k) => (
          <Card key={k.label} className="glass-strong p-4">
            <div className="text-xs uppercase tracking-wide text-readable-muted">{k.label}</div>
            <div className="mt-1 text-2xl font-semibold text-readable">{k.value.toLocaleString()}</div>
          </Card>
        ))}
      </section>

      <section className="flex flex-wrap items-center gap-2">
        {FILTERS.map(f => (
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}>{f.label}</Button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Input placeholder="Search company…" value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadRows()} className="w-56" />
          <Button size="sm" variant="secondary" onClick={loadRows}>Search</Button>
        </div>
      </section>

      <Card className="glass-strong overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-readable-muted">
              <tr>
                <th className="p-3">Company</th>
                <th className="p-3">Category</th>
                <th className="p-3">City</th>
                <th className="p-3 text-right"><Star className="mr-1 inline h-3 w-3" />Reviews</th>
                <th className="p-3">Rating</th>
                <th className="p-3"><Globe2 className="mr-1 inline h-3 w-3" />Website</th>
                <th className="p-3"><Smartphone className="mr-1 inline h-3 w-3" />Phone</th>
                <th className="p-3">Email</th>
                <th className="p-3 text-right">Priority</th>
                <th className="p-3">Status</th>
                <th className="p-3">Channel</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={11} className="p-8 text-center text-readable-muted">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={11} className="p-8 text-center text-readable-muted">
                  No prospects in this segment yet.</td></tr>
              )}
              {!loading && rows.map(r => (
                <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3 font-medium text-readable">{r.business_name ?? "—"}</td>
                  <td className="p-3 text-readable-body">{r.category_slug ?? "—"}</td>
                  <td className="p-3 text-readable-body">{r.city ?? "—"}</td>
                  <td className="p-3 text-right text-readable-body">{r.review_count ?? 0}</td>
                  <td className="p-3 text-readable-body">{r.review_rating?.toFixed(1) ?? "—"}</td>
                  <td className="p-3">
                    {r.has_website
                      ? <Badge variant="secondary">{r.website_quality_score >= 20 ? "None" : r.website_quality_score >= 10 ? "Weak" : r.website_quality_score <= -10 ? "Agency" : "Strong"}</Badge>
                      : <Badge className="bg-emerald-600/20 text-emerald-300">No site</Badge>}
                  </td>
                  <td className="p-3">
                    <Badge variant={r.phone_type === "mobile" ? "default" : "outline"}>
                      {r.phone_type ?? "unknown"}
                    </Badge>
                  </td>
                  <td className="p-3 max-w-[220px] truncate text-readable-body" title={r.email ?? ""}>
                    {r.aggregator_email
                      ? <span className="inline-flex items-center gap-1 text-rose-300"><ShieldAlert className="h-3 w-3" /> aggregator</span>
                      : r.email ?? "—"}
                  </td>
                  <td className="p-3 text-right font-semibold text-readable">{r.acquisition_priority_score}</td>
                  <td className="p-3">
                    {r.suppression_reason
                      ? <Badge className="bg-rose-600/20 text-rose-200">{r.suppression_reason}</Badge>
                      : r.outreach_eligible
                        ? <Badge className="bg-emerald-600/20 text-emerald-300">{r.queue_tier}</Badge>
                        : <Badge variant="outline">off</Badge>}
                  </td>
                  <td className="p-3 text-readable-body">{r.outreach_channel ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
