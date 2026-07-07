/**
 * SMS Revenue Engine — One-button cockpit focused on the next $1 activation.
 * Reuses sms_sprint_* tables + sms-sprint-{test,scrape,send,followups} edge functions.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Rocket, Trophy, Circle } from "lucide-react";
import { toast } from "sonner";

const DAILY_SMS_CAP = 50;

const SMS_REVENUE_VARIANTS = [
  {
    key: "recommendation",
    label: "Recommandation IA",
    body:
      "Bonjour {{first_name}}. Votre entreprise pourrait être recommandée par l'IA d'UNPRO. Activation aujourd'hui : 1 $. unpro.ca",
  },
  {
    key: "chasing",
    label: "Courir après les soumissions",
    body:
      "Est-ce que vous acceptez encore de courir après les soumissions ? Découvrez comment l'IA peut plutôt vous recommander. unpro.ca",
  },
  {
    key: "would_it_be_you",
    label: "Serait-ce vous ?",
    body:
      "Question rapide. Si l'IA recommandait un entrepreneur dans votre secteur aujourd'hui… serait-ce vous ? unpro.ca",
  },
  {
    key: "not_most_visible",
    label: "Pas les plus visibles",
    body:
      "Les meilleurs entrepreneurs ne sont pas toujours les plus visibles. Voyez si UNPRO peut vous recommander. Activation : 1 $. unpro.ca",
  },
  {
    key: "profile_ready",
    label: "Votre fiche est prête",
    body:
      "Votre fiche est prête. Activez-la pour 1 $ et voyez si votre entreprise peut être recommandée aux propriétaires. unpro.ca",
  },
  {
    key: "identified",
    label: "Identifié dans votre secteur",
    body:
      "Vous avez été identifié comme entrepreneur dans votre secteur. Voulez-vous voir votre potentiel IA ? Activation 1 $. unpro.ca",
  },
];

type FeedEvent = {
  id: string;
  ts: number;
  label: string;
  detail?: string;
  tone: "sent" | "delivered" | "clicked" | "checkout" | "paid";
};

export default function PageAdminSmsSprint() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [campaign, setCampaign] = useState<any>(null);
  const [test, setTest] = useState<any>(null);
  const [prospects, setProspects] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const pollRef = useRef<number | null>(null);

  async function load() {
    const { data: camp } = await supabase
      .from("sms_sprint_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setCampaign(camp);
    if (camp) {
      const [{ data: t }, { data: p }, { data: m }, { data: e }] = await Promise.all([
        supabase
          .from("sms_sprint_test_runs")
          .select("*")
          .eq("campaign_id", camp.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("sms_sprint_prospects").select("*").eq("campaign_id", camp.id),
        supabase
          .from("sms_sprint_messages")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("sms_sprint_link_events")
          .select("*")
          .order("occurred_at", { ascending: false })
          .limit(300),
      ]);
      setTest(t);
      setProspects(p ?? []);
      setMessages(m ?? []);
      setEvents(e ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("sms-revenue-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "sms_sprint_messages" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "sms_sprint_link_events" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "sms_sprint_prospects" }, () => load())
      .subscribe();
    pollRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 15000);
    return () => {
      supabase.removeChannel(ch);
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Derived state ────────────────────────────────────────────────
  const qualified = useMemo(
    () => prospects.filter((p) => p.qualification_status === "qualified"),
    [prospects]
  );
  const mobiles = useMemo(
    () => qualified.filter((p) => p.phone_type === "mobile" || p.phone_type == null),
    [qualified]
  );
  const highScore = useMemo(() => qualified.filter((p) => (p.roi_score ?? 0) >= 70), [qualified]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sentToday = messages.filter(
    (m) => (m.status === "sent" || m.status === "delivered") && new Date(m.created_at).getTime() >= today.getTime()
  ).length;
  const remainingToday = Math.max(0, DAILY_SMS_CAP - sentToday);

  const activations = prospects.filter((p) => p.activation_status === "activated");
  const activationsToday = activations.filter(
    (p) => p.activated_at && new Date(p.activated_at).getTime() >= today.getTime()
  ).length;
  const goalTarget = activations.length > 0 ? 5 : 1;
  const goalProgress = Math.min(activationsToday, goalTarget);

  const testOk = !!test && (!!test.delivered_at || test.status === "sent");
  const clicks = events.filter((e) => e.event === "click");
  const firstBatchAt = campaign?.first_batch_sent_at ? new Date(campaign.first_batch_sent_at).getTime() : 0;

  // Variant win-rates from real data
  const variantStats = useMemo(() => {
    const map = new Map<string, { sent: number; activated: number }>();
    for (const p of qualified) {
      if (!p.variant) continue;
      const s = map.get(p.variant) ?? { sent: 0, activated: 0 };
      s.sent += 1;
      if (p.activation_status === "activated") s.activated += 1;
      map.set(p.variant, s);
    }
    return map;
  }, [qualified]);
  const winningKey = useMemo(() => {
    let best: [string, number] | null = null;
    for (const [k, v] of variantStats) {
      const rate = v.activated / (v.sent || 1);
      if (!best || rate > best[1]) best = [k, rate];
    }
    return best?.[0];
  }, [variantStats]);

  // Status pill
  let statusPill: { label: string; tone: string } = { label: "🟢 Prêt à envoyer", tone: "emerald" };
  if (!testOk) statusPill = { label: "🟡 Test SMS requis", tone: "amber" };
  else if (remainingToday === 0) statusPill = { label: "🔴 Quota atteint", tone: "rose" };

  // Live feed
  const feed = useMemo<FeedEvent[]>(() => {
    const items: FeedEvent[] = [];
    const findCompany = (pid?: string) =>
      prospects.find((p) => p.id === pid)?.company_name ?? "un entrepreneur";
    const findBySlug = (slug?: string) =>
      prospects.find((p) => p.tracking_slug === slug)?.company_name ?? "un entrepreneur";

    for (const m of messages) {
      if (m.sent_at || m.status === "sent" || m.status === "delivered") {
        items.push({
          id: `m-sent-${m.id}`,
          ts: new Date(m.sent_at ?? m.created_at).getTime(),
          label: "SMS envoyé",
          detail: findCompany(m.sprint_prospect_id),
          tone: "sent",
        });
      }
      if (m.delivered_at) {
        items.push({
          id: `m-del-${m.id}`,
          ts: new Date(m.delivered_at).getTime(),
          label: "Livré",
          detail: findCompany(m.sprint_prospect_id),
          tone: "delivered",
        });
      }
    }
    for (const e of events) {
      if (e.event === "click") {
        items.push({
          id: `e-${e.id}`,
          ts: new Date(e.occurred_at).getTime(),
          label: "Lien cliqué",
          detail: findBySlug(e.tracking_slug),
          tone: "clicked",
        });
      } else if (e.event === "checkout_started") {
        items.push({
          id: `e-${e.id}`,
          ts: new Date(e.occurred_at).getTime(),
          label: "Onboarding démarré",
          detail: findBySlug(e.tracking_slug),
          tone: "checkout",
        });
      }
    }
    for (const p of activations) {
      items.push({
        id: `a-${p.id}`,
        ts: p.activated_at ? new Date(p.activated_at).getTime() : Date.now(),
        label: "Payé 1 $ 🎉",
        detail: p.company_name ?? "",
        tone: "paid",
      });
    }
    return items.sort((a, b) => b.ts - a.ts).slice(0, 30);
  }, [messages, events, activations, prospects]);

  // ─── Action orchestration ────────────────────────────────────────
  async function invoke(name: string, body: any = {}) {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) throw error;
    if (data?.ok === false || data?.error) throw new Error(data?.error ?? "failed");
    return data;
  }

  async function findMyFirstDollar() {
    if (busy) return;
    setBusy(true);
    try {
      if (!testOk) {
        await invoke("sms-sprint-test");
        toast.success("Test SMS envoyé — clique le lien reçu, puis relance.");
        await load();
        return;
      }
      if (remainingToday === 0) {
        toast("Quota SMS atteint pour aujourd'hui. On reprend demain.");
        return;
      }
      if (qualified.length < 5) {
        toast("Je cherche de nouveaux prospects qualifiés…");
        await invoke("sms-sprint-scrape", { limit: 25 });
      }
      const canSend20 =
        firstBatchAt > 0 && Date.now() - firstBatchAt >= 30 * 60 * 1000 && clicks.length > 0;
      if (firstBatchAt === 0) {
        await invoke("sms-sprint-send", { batch: 5 });
        toast.success("Premier lot de 5 SMS envoyé.");
      } else if (canSend20) {
        await invoke("sms-sprint-send", { batch: 20 });
        toast.success("Lot de 20 SMS envoyé.");
      } else {
        await invoke("sms-sprint-followups");
        toast.success("Follow-ups déclenchés.");
      }
      await load();
    } catch (e: any) {
      console.error("[find-first-dollar]", e);
      toast.error("Impossible pour l'instant — je réessaie automatiquement.");
    } finally {
      setBusy(false);
    }
  }

  // Button disabled copy
  let buttonHint: string | null = null;
  if (!testOk) buttonHint = "Un test SMS est requis avant d'envoyer aux prospects.";
  else if (remainingToday === 0) buttonHint = "Quota SMS atteint — on reprend demain.";
  else if (qualified.length === 0) buttonHint = "Aucun prospect qualifié — je vais en chercher.";

  if (loading) {
    return (
      <div className="admin-theme min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin opacity-70" />
      </div>
    );
  }

  return (
    <div className="admin-theme min-h-screen bg-[#050816] text-white">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        {/* Header */}
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Acquisition</div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
            <Rocket className="w-6 h-6" /> SMS Revenue Engine
          </h1>
        </div>

        {/* Goal Today */}
        <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-white/[0.02] border-white/10 text-white">
          <div className="text-xs uppercase tracking-wider text-white/60">Objectif du jour</div>
          <div className="text-xl font-semibold mt-1">
            🎯 Prochain entrepreneur qui active à 1 $
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full ${goalProgress > 0 ? "bg-emerald-400" : "bg-white/30"} transition-all`}
                style={{ width: `${(goalProgress / goalTarget) * 100}%` }}
              />
            </div>
            <div className="text-sm font-mono tabular-nums text-white/80">
              {goalProgress} / {goalTarget}
            </div>
          </div>
          <div className="mt-3 text-sm">
            Revenu aujourd'hui :{" "}
            <span className={activationsToday > 0 ? "text-emerald-300 font-semibold" : "text-white/60"}>
              {activationsToday} $ CA
            </span>
          </div>
        </Card>

        {/* Campaign Status */}
        <Card className="p-5 bg-white/[0.03] border-white/10 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">État de la campagne</div>
            <Badge
              className={
                statusPill.tone === "emerald"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : statusPill.tone === "amber"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : "bg-rose-500/20 text-rose-300 border-rose-500/30"
              }
            >
              {statusPill.label}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="Prospects prêts" value={qualified.length} />
            <Stat label="Numéros mobiles" value={mobiles.length} />
            <Stat label="Score IA élevé" value={highScore.length} />
            <Stat label="SMS restants aujourd'hui" value={remainingToday} />
          </div>
        </Card>

        {/* Current Experiment */}
        <Card className="p-5 bg-white/[0.03] border-white/10 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold">Expérience en cours</div>
              <div className="text-xs text-white/50">L'IA fait tourner automatiquement les messages.</div>
            </div>
            <Badge className="bg-white/[0.06] border-white/10 text-white/70">Lecture seule</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {SMS_REVENUE_VARIANTS.map((v) => {
              const s = variantStats.get(v.key) ?? { sent: 0, activated: 0 };
              const rate = s.sent > 0 ? Math.round((s.activated / s.sent) * 100) : 0;
              const isWinner = winningKey === v.key && s.sent > 0;
              return (
                <div
                  key={v.key}
                  className={`p-4 rounded-xl border ${
                    isWinner ? "border-emerald-400/40 bg-emerald-500/[0.06]" : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs uppercase tracking-wider text-white/60">{v.label}</div>
                    {isWinner && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-300">
                        <Trophy className="w-3 h-3" /> Champion
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap">{v.body}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-white/50">
                      {s.sent} envoi{s.sent > 1 ? "s" : ""} · {s.activated} activation{s.activated > 1 ? "s" : ""}
                    </span>
                    <span
                      className={`font-mono tabular-nums ${
                        rate > 0 ? "text-emerald-300" : "text-white/50"
                      }`}
                    >
                      {rate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* One Button */}
        <Card className="p-6 bg-white/[0.03] border-white/10 text-white text-center">
          <Button
            onClick={findMyFirstDollar}
            disabled={busy || remainingToday === 0}
            className="w-full h-16 text-lg bg-white text-[#050816] hover:bg-white/90 font-semibold"
          >
            {busy ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>🚀 Trouver mon premier dollar</>
            )}
          </Button>
          <p className="mt-3 text-xs text-white/60 max-w-xl mx-auto leading-relaxed">
            L'IA choisit le meilleur message, envoie aux numéros mobiles validés, surveille les réponses,
            met en pause sur STOP, et apprend automatiquement de la meilleure version.
          </p>
          {buttonHint && (
            <p className="mt-2 text-xs text-amber-300/80">{buttonHint}</p>
          )}
        </Card>

        {/* Live Feed */}
        <Card className="p-5 bg-white/[0.03] border-white/10 text-white">
          <div className="text-sm font-semibold mb-3">Fil en direct</div>
          {feed.length === 0 ? (
            <div className="text-sm text-white/50 py-6 text-center">
              Aucune activité pour l'instant. Clique sur « Trouver mon premier dollar » pour lancer.
            </div>
          ) : (
            <ol className="relative space-y-3">
              {feed.map((f) => (
                <li key={f.id} className="flex items-start gap-3">
                  <div className="mt-1.5">
                    <Circle
                      className={`w-2.5 h-2.5 ${
                        f.tone === "paid"
                          ? "fill-emerald-400 text-emerald-400"
                          : f.tone === "checkout"
                          ? "fill-blue-400 text-blue-400"
                          : f.tone === "clicked"
                          ? "fill-amber-400 text-amber-400"
                          : f.tone === "delivered"
                          ? "fill-white/60 text-white/60"
                          : "fill-white/30 text-white/30"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className={`text-sm ${
                          f.tone === "paid" ? "text-emerald-300 font-semibold" : "text-white/90"
                        }`}
                      >
                        {f.label}
                      </div>
                      <div className="text-[11px] text-white/40 font-mono tabular-nums">
                        {formatTime(f.ts)}
                      </div>
                    </div>
                    {f.detail && <div className="text-xs text-white/60 truncate">{f.detail}</div>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
      <div className="text-xl font-semibold mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
