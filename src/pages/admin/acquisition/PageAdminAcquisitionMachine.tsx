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
      // Structured error returned with HTTP 200 → data.ok === false
      if (data && data.ok === false) {
        const missing = Array.isArray(data.missing) && data.missing.length
          ? ` · Manquant: ${data.missing.join(", ")}`
          : "";
        const next = data.next_action ? ` · ${data.next_action}` : "";
        toast.error(`${label} bloqué — ${data.error_code ?? "ERROR"}`, {
          description: `${data.message ?? "Erreur inconnue"}${missing}${next}`,
          duration: 12000,
        });
        return data;
      }
      // Raw non-2xx (legacy) → surface body
      if (error) {
        const ctx = (error as any)?.context;
        let detail = error.message;
        try {
          if (ctx && typeof ctx.text === "function") {
            const txt = await ctx.text();
            try {
              const j = JSON.parse(txt);
              detail = j.message || j.error || txt.slice(0, 300);
            } catch { detail = txt.slice(0, 300); }
          }
        } catch { /* ignore */ }
        toast.error(`${label} échoué`, { description: detail, duration: 12000 });
        return null;
      }
      toast.success(`${label} ✓`, { description: JSON.stringify(data).slice(0, 160) });
      await loadProspects();
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`${label} échoué`, { description: msg, duration: 10000 });
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

          {/* Pipeline Control Bar — 8 stages officielles */}
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-zinc-400 uppercase tracking-wider">Pipeline officiel</div>
              <div className="text-[10px] text-zinc-500 hidden md:block">
                Discovery → Enrichment → Scoring → Messages → Approval → Outreach → Stripe → Activation
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <ControlButton
                step={1}
                icon={<Search className="w-4 h-4" />}
                label="Discovery"
                title="acq-cascade-scrape — Google Places + Firecrawl"
                running={running === "discovery"}
                onClick={() => {
                  const trade = prompt("Métier (ex: plombier)") ?? "";
                  const city = prompt("Ville (ex: Montréal)") ?? "";
                  if (!trade || !city) return;
                  const limit = Number(prompt("Nombre max (1-60)", "20") ?? 20);
                  callEdge("acq-cascade-scrape", { trade, city, limit, enrich: false }, "discovery");
                }}
              />
              <ControlButton
                step={2}
                icon={<Zap className="w-4 h-4" />}
                label="Enrichment"
                title="acq-enrich-contractor — Firecrawl batch (website + email + RBQ/NEQ)"
                running={running === "enrichment"}
                onClick={() => callEdge("acq-enrich-contractor", { batch: true, limit: 20 }, "enrichment")}
              />
              <ControlButton
                step={3}
                icon={<Brain className="w-4 h-4" />}
                label="Scoring"
                title="acq-generate-score — déterministe 37 signaux (no LLM)"
                running={running === "scoring"}
                onClick={async () => {
                  const targets = prospects.filter((p) => p.aipp_score == null).slice(0, 20);
                  if (!targets.length) {
                    toast.info("Aucun prospect à scorer", {
                      description: "Tous les prospects chargés ont déjà un score AIPP.",
                    });
                    return;
                  }
                  setRunning("scoring");
                  try {
                    const results = await Promise.allSettled(
                      targets.map((p) =>
                        supabase.functions.invoke("acq-generate-score", { body: { contractor_id: p.id } }),
                      ),
                    );
                    const ok = results.filter(
                      (r) => r.status === "fulfilled" && !(r as any).value?.error,
                    ).length;
                    const ko = results.length - ok;
                    toast.success(`Scoring ✓ ${ok}/${results.length}`, {
                      description: ko ? `${ko} échecs (voir Logs)` : "Déterministe (37 signaux)",
                    });
                    await loadProspects();
                  } finally {
                    setRunning(null);
                  }
                }}
              />
              <ControlButton
                step={4}
                icon={<Sparkles className="w-4 h-4" />}
                label="Messages"
                title="acq-generate-test-variants — drafts email + SMS (prospect sélectionné)"
                running={running === "messages"}
                onClick={() => {
                  if (!selectedProspect) return toast.error("Sélectionne un prospect d'abord");
                  callEdge(
                    "acq-generate-test-variants",
                    { prospect_id: selectedProspect.id, force_regenerate: true },
                    "messages",
                  );
                }}
              />
              <Link
                to="/admin/acquisition/duplicates"
                className="inline-flex items-center gap-2 text-xs px-3 h-9 rounded-md bg-amber-600/20 border border-amber-500/30 text-amber-100 hover:bg-amber-600/30 transition-colors"
                title="File d'approbation — doublons probables + drafts à valider"
              >
                <span className="font-mono text-amber-300">5.</span>
                <Eye className="w-4 h-4" /> Approval
              </Link>
              <ControlButton
                step={6}
                icon={<Send className="w-4 h-4" />}
                label="Outreach"
                title="acq-send-outreach — batch LIVE (drafts approuvés uniquement)"
                running={running === "outreach"}
                onClick={() => {
                  if (!confirm("Lancer l'outreach LIVE sur les drafts approuvés ?")) return;
                  callEdge(
                    "acq-send-outreach",
                    { batch: true, dry_run: false, require_approval: true },
                    "outreach",
                  );
                }}
              />
              <ControlButton
                step={7}
                icon={<DollarSign className="w-4 h-4" />}
                label="Checkout"
                title="acq-create-checkout — Stripe Checkout pour le prospect sélectionné"
                running={running === "checkout"}
                onClick={async () => {
                  if (!selectedProspect) return toast.error("Sélectionne un prospect d'abord");
                  const plan = (
                    prompt(
                      "Plan (recrue / pro / premium / elite / signature)",
                      selectedProspect.recommended_plan ?? "pro",
                    ) ?? ""
                  ).toLowerCase();
                  if (!plan) return;
                  const res = await callEdge(
                    "acq-create-checkout",
                    { prospect_id: selectedProspect.id, plan_id: plan },
                    "checkout",
                  );
                  const url = (res as any)?.url ?? (res as any)?.checkout_url;
                  if (url) {
                    toast.success("Checkout prêt", {
                      description: "Cliquer pour ouvrir Stripe",
                      action: { label: "Ouvrir", onClick: () => window.open(url, "_blank") },
                      duration: 15000,
                    });
                  }
                }}
              />
              <Link
                to="/admin/contractor-activation"
                className="inline-flex items-center gap-2 text-xs px-3 h-9 rounded-md bg-emerald-600/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-600/30 transition-colors"
                title="activate-contractor-plan — validation post-paiement (admin)"
              >
                <span className="font-mono text-emerald-300">8.</span>
                <ExternalLink className="w-4 h-4" /> Activation
              </Link>
            </div>

            {/* Secondary actions: tests + pause */}
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
              <ControlButton
                icon={<Mail className="w-4 h-4" />}
                label="Test email"
                title="acq-send-outreach — dry-run vers admin"
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
                label="Test SMS"
                title="acq-send-outreach — dry-run vers admin"
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
                icon={<Pause className="w-4 h-4" />}
                label="Pause campagne"
                title="acq-send-outreach — pause globale"
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
