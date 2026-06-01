/**
 * PageAdminAcquisitionMachine — Cockpit unifié /admin/acquisition-machine
 *
 * Orchestre les edge functions existantes (acq-scrape-contractors,
 * acq-enrich-contractor, acq-generate-aipp, acq-generate-outreach,
 * acq-send-outreach, acq-generate-test-variants, compute-pricing-quote)
 * sans dupliquer la logique métier.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  RefreshCw, Search, Zap, Mail, MessageSquare, Send, Pause,
  Brain, Sparkles, ExternalLink, Eye, DollarSign, Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ProspectMasterTable } from "@/components/admin/acquisition/ProspectMasterTable";
import { MessageTestingPanel } from "@/components/admin/acquisition/MessageTestingPanel";
import { PlanProposalPanel } from "@/components/admin/acquisition/PlanProposalPanel";

type Prospect = {
  id: string;
  business_name: string;
  trade: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  aipp_score: number | null;
  recommended_plan: string | null;
  enrichment_status: string;
  outreach_status: string;
  payment_status: string;
  activation_status: string;
  last_action_at: string | null;
  next_action: string | null;
  review_count: number | null;
  review_rating: number | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-zinc-700 text-zinc-200",
  queued: "bg-blue-700 text-blue-100",
  scraping: "bg-blue-700 text-blue-100",
  data_extracted: "bg-indigo-700 text-indigo-100",
  scored: "bg-purple-700 text-purple-100",
  message_testing: "bg-amber-700 text-amber-100",
  outreach_ready: "bg-emerald-700 text-emerald-100",
  sent: "bg-emerald-700 text-emerald-100",
  paid: "bg-green-700 text-green-100",
  activated: "bg-green-700 text-green-100",
  blocked: "bg-red-700 text-red-100",
  failed: "bg-red-700 text-red-100",
  not_started: "bg-zinc-700 text-zinc-200",
  enriched: "bg-indigo-700 text-indigo-100",
};

export default function PageAdminAcquisitionMachine() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0, scored: 0, outreach_ready: 0, paid: 0, blocked: 0,
  });

  const loadProspects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contractor_prospects")
      .select(
        "id,business_name,trade,city,phone,email,website_url,aipp_score,recommended_plan,enrichment_status,outreach_status,payment_status,activation_status,last_action_at,next_action,review_count,review_rating",
      )
      .order("aipp_score", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) {
      toast.error(`Chargement échoué: ${error.message}`);
    } else {
      setProspects((data as Prospect[]) ?? []);
      const s = (data as Prospect[]) ?? [];
      setStats({
        total: s.length,
        scored: s.filter((p) => p.aipp_score != null).length,
        outreach_ready: s.filter((p) => p.outreach_status === "outreach_ready" || p.outreach_status === "sent").length,
        paid: s.filter((p) => p.payment_status === "paid").length,
        blocked: s.filter((p) => p.activation_status === "blocked").length,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProspects();
  }, [loadProspects]);

  const callEdge = async (fn: string, body: Record<string, unknown>, label: string) => {
    setRunning(label);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error) throw error;
      toast.success(`${label} ✓`, { description: JSON.stringify(data).slice(0, 100) });
      await loadProspects();
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`${label} échoué`, { description: msg });
    } finally {
      setRunning(null);
    }
  };

  const filtered = prospects.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.business_name?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.trade?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <Helmet>
        <title>Acquisition Machine — UNPRO Admin</title>
      </Helmet>
      <div className="min-h-screen bg-[#050816] text-white p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Acquisition Machine</h1>
              <p className="text-zinc-400 mt-1 text-sm">
                Pipeline unifié scrape → enrich → score → outreach → checkout → activation.
              </p>
            </div>
            <Button variant="outline" onClick={loadProspects} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Rafraîchir
            </Button>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Prospects", val: stats.total },
              { label: "Scorés AIPP", val: stats.scored },
              { label: "Outreach prêt", val: stats.outreach_ready },
              { label: "Payés", val: stats.paid },
              { label: "Bloqués", val: stats.blocked },
            ].map((k) => (
              <Card key={k.label} className="bg-white/5 border-white/10 p-4">
                <div className="text-xs text-zinc-400 uppercase tracking-wider">{k.label}</div>
                <div className="text-2xl font-semibold mt-1">{k.val}</div>
              </Card>
            ))}
          </div>

          {/* Pipeline Control Bar */}
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="text-xs text-zinc-400 uppercase tracking-wider mb-3">Pipeline Control</div>
            <div className="flex flex-wrap gap-2">
              <ControlButton
                icon={<Search className="w-4 h-4" />}
                label="Force scrape"
                running={running === "scrape"}
                onClick={() => {
                  const trade = prompt("Métier (ex: plombier)") ?? "";
                  const city = prompt("Ville (ex: Montréal)") ?? "";
                  if (trade && city) {
                    callEdge("acq-scrape-contractors", { trade, city, limit: 25, dry_run: false }, "scrape");
                  }
                }}
              />
              <ControlButton
                icon={<Sparkles className="w-4 h-4" />}
                label="Cascade (Google+Firecrawl)"
                running={running === "cascade"}
                onClick={() => {
                  const trade = prompt("Métier (ex: plombier)") ?? "";
                  const city = prompt("Ville (ex: Montréal)") ?? "";
                  if (!trade || !city) return;
                  const limit = Number(prompt("Nombre max (1-60)", "20") ?? 20);
                  callEdge("acq-cascade-scrape", { trade, city, limit, enrich: true }, "cascade");
                }}
              />
              <ControlButton
                icon={<Zap className="w-4 h-4" />}
                label="Extract data"
                running={running === "extract"}
                onClick={() => callEdge("acq-enrich-contractor", { batch: true, limit: 20 }, "extract")}
              />
              <ControlButton
                icon={<Brain className="w-4 h-4" />}
                label="Score AIPP"
                running={running === "score"}
                onClick={() => callEdge("acq-generate-aipp", { batch: true, limit: 20 }, "score")}
              />
              <ControlButton
                icon={<Sparkles className="w-4 h-4" />}
                label="Generate messages"
                running={running === "generate"}
                onClick={() => {
                  if (!selectedProspect) {
                    toast.error("Sélectionne un prospect d'abord");
                    return;
                  }
                  callEdge(
                    "acq-generate-test-variants",
                    { prospect_id: selectedProspect.id, force_regenerate: true },
                    "generate",
                  );
                }}
              />
              <ControlButton
                icon={<Mail className="w-4 h-4" />}
                label="Send test email"
                running={running === "test_email"}
                onClick={() => {
                  if (!selectedProspect) return toast.error("Sélectionne un prospect");
                  callEdge(
                    "acq-send-outreach",
                    { prospect_id: selectedProspect.id, channel: "email", dry_run: true, test_to_admin: true },
                    "test_email",
                  );
                }}
              />
              <ControlButton
                icon={<MessageSquare className="w-4 h-4" />}
                label="Send test SMS"
                running={running === "test_sms"}
                onClick={() => {
                  if (!selectedProspect) return toast.error("Sélectionne un prospect");
                  callEdge(
                    "acq-send-outreach",
                    { prospect_id: selectedProspect.id, channel: "sms", dry_run: true, test_to_admin: true },
                    "test_sms",
                  );
                }}
              />
              <ControlButton
                icon={<Send className="w-4 h-4" />}
                label="Launch outreach"
                running={running === "launch"}
                onClick={() => {
                  if (!confirm("Lancer l'outreach LIVE sur tous les prospects approuvés ?")) return;
                  callEdge("acq-send-outreach", { batch: true, dry_run: false, require_approval: true }, "launch");
                }}
              />
              <ControlButton
                icon={<Pause className="w-4 h-4" />}
                label="Pause campagne"
                variant="destructive"
                running={running === "pause"}
                onClick={() => callEdge("acq-send-outreach", { pause: true }, "pause")}
              />
            </div>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="prospects" className="w-full">
            <TabsList className="bg-white/5">
              <TabsTrigger value="prospects">Prospects ({filtered.length})</TabsTrigger>
              <TabsTrigger value="messages" disabled={!selectedProspect}>
                Message Testing {selectedProspect ? `(${selectedProspect.business_name})` : ""}
              </TabsTrigger>
              <TabsTrigger value="plan" disabled={!selectedProspect}>
                Plan Proposal
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prospects" className="mt-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Rechercher entreprise, ville, métier, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <ProspectMasterTable
                prospects={filtered}
                onSelect={setSelectedProspect}
                selectedId={selectedProspect?.id}
                statusColors={STATUS_COLORS}
              />
            </TabsContent>

            <TabsContent value="messages" className="mt-4">
              {selectedProspect && (
                <MessageTestingPanel
                  prospect={selectedProspect}
                  onRefresh={loadProspects}
                />
              )}
            </TabsContent>

            <TabsContent value="plan" className="mt-4">
              {selectedProspect && (
                <PlanProposalPanel
                  prospect={selectedProspect}
                  onRefresh={loadProspects}
                />
              )}
            </TabsContent>
          </Tabs>

          <div className="text-xs text-zinc-500 pt-4 border-t border-white/5">
            Tables: <code>contractor_prospects</code> · <code>contractor_outreach_tests</code> · <code>contractor_pricing_quotes</code>
            <br />Edge: acq-scrape-contractors · acq-enrich-contractor · acq-generate-aipp · acq-generate-test-variants · acq-send-outreach · compute-pricing-quote · create-contractor-checkout
            <br />Liens: <Link to="/admin/sniper" className="underline">Sniper</Link> · <Link to="/admin/outbound/ops-center" className="underline">Outbound Ops</Link> · <Link to="/admin/pricing-intelligence" className="underline">Pricing Intelligence</Link>
          </div>
        </div>
      </div>
    </>
  );
}

function ControlButton({
  icon, label, running, onClick, variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  running: boolean;
  onClick: () => void;
  variant?: "default" | "destructive";
}) {
  return (
    <Button
      size="sm"
      variant={variant === "destructive" ? "destructive" : "secondary"}
      onClick={onClick}
      disabled={running}
      className="gap-2"
    >
      {running ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </Button>
  );
}
